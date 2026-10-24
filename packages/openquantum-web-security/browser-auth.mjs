// Adapted from @deepseek-ai/dsh-client-connection 0.1.5-rc.1, browser-auth.
// Copyright DeepSeek. MIT; see THIRD_PARTY_NOTICES.md and upstream LICENSE.
// The 2.0.0 adapter uses a process-only secret: no credential schema migration.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
/** Browser-session authentication for the Host Connection carrier. */
const DAY_MILLISECONDS = 1440 * 60 * 1e3;
const SECRET_BYTES = 32;
const TOKEN_QUERY = "token";
const COOKIE_PREFIX = "dsh-auth-";
const COOKIE_PAYLOAD_VERSION = 1;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/;
const PROCESS_LAUNCH_TOKENS = /* @__PURE__ */ new WeakMap();
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}
function decodeBase64Url(value) {
  if (!BASE64URL_PATTERN.test(value) || value.length % 4 === 1) return void 0;
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const decoded = Buffer.from(value.replaceAll("-", "+").replaceAll("_", "/") + padding, "base64");
  return encodeBase64Url(decoded) === value ? decoded : void 0;
}
function processLaunchToken(owner) {
  const existing = PROCESS_LAUNCH_TOKENS.get(owner);
  if (existing !== void 0) return existing;
  const created = encodeBase64Url(randomBytes(SECRET_BYTES));
  PROCESS_LAUNCH_TOKENS.set(owner, created);
  return created;
}
function header(headers, name) {
  if (headers instanceof Headers) return headers.get(name) ?? void 0;
  const value = headers[name];
  return typeof value === "string" ? value : void 0;
}
/** Canonical request authority used as the cookie name and signed audience. */
function requestAuthority(headers) {
  const host = header(headers, "host");
  if (host === void 0) return void 0;
  try {
    return new URL(`http://${host}`).host;
  } catch {
    return;
  }
}
function tokenMatches(actual, expected) {
  const actualBytes = Buffer.from(actual, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return actualBytes.byteLength === expectedBytes.byteLength && timingSafeEqual(actualBytes, expectedBytes);
}
function cookieName(authority) {
  return COOKIE_PREFIX + encodeBase64Url(createHash("sha256").update(authority).digest());
}
/** Read the exact generated cookie without implementing general Cookie decoding. */
function cookieValue(headerValue, name) {
  for (const segment of headerValue.split(";")) {
    const at = segment.indexOf("=");
    if (at === -1 || segment.slice(0, at).trim() !== name) continue;
    return segment.slice(at + 1).trim();
  }
}
/** Serialize the fixed browser-session attributes; generated names and values are cookie-safe base64url. */
function sessionCookie(name, value, expiresAt, maxAgeSeconds) {
  return `${name}=${value}; Max-Age=${String(maxAgeSeconds)}; Path=/; Expires=${new Date(expiresAt).toUTCString()}; HttpOnly; SameSite=Strict`;
}
function signature(secret, body) {
  return createHmac("sha256", secret).update(body).digest();
}
function encodeCookie(payload, secret) {
  const body = encodeBase64Url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `v1.${body}.${encodeBase64Url(signature(secret, body))}`;
}
function decodeCookie(value, secret) {
  const parts = value.split(".");
  const [version, body, encodedSignature] = parts;
  if (parts.length !== 3 || version !== "v1" || body === void 0 || encodedSignature === void 0) return;
  const actualSignature = decodeBase64Url(encodedSignature);
  if (actualSignature === void 0) return void 0;
  const expectedSignature = signature(secret, body);
  if (actualSignature.byteLength !== expectedSignature.byteLength || !timingSafeEqual(actualSignature, expectedSignature)) return void 0;
  let decoded;
  try {
    const bodyBytes = decodeBase64Url(body);
    if (bodyBytes === void 0) return void 0;
    decoded = JSON.parse(bodyBytes.toString("utf8"));
  } catch {
    return;
  }
  if (!isRecord(decoded) || decoded.version !== COOKIE_PAYLOAD_VERSION || typeof decoded.authority !== "string" || !Number.isSafeInteger(decoded.issuedAt) || !Number.isSafeInteger(decoded.expiresAt)) return void 0;
  return decoded;
}
// Preserve only the two fixed Desktop display hints. Never accept a return URL.
function cleanRoot(url) {
  const clean = new URL("http://dsh.invalid/");
  for (const [name, values] of [
    ["dsh-desktop-mode", ["compatibility", "advanced"]],
    ["dsh-desktop-platform", ["darwin", "win32", "linux"]],
  ]) {
    const value = url.searchParams.get(name);
    if (values.includes(value)) clean.searchParams.set(name, value);
  }
  return clean.pathname + clean.search;
}

export class BrowserAuth {
  secret;
  launchToken;
  maxAgeMilliseconds;
  constructor(processOwner, secret, maxAgeDays) {
    this.secret = secret;
    this.launchToken = processLaunchToken(processOwner);
    this.maxAgeMilliseconds = maxAgeDays * DAY_MILLISECONDS;
    if (!Number.isSafeInteger(this.maxAgeMilliseconds) || !Number.isSafeInteger(Date.now() + this.maxAgeMilliseconds)) throw new Error("client-connection: cookieMaxAgeDays exceeds the safe timestamp range");
  }
  /**
  * Add this process's launch token to the ordinary application root URL.
  * @param baseUrl - canonical browser origin without credentials.
  * @returns root URL carrying the process token as its sole authentication input.
  */
  authenticatedUrl(baseUrl) {
    const url = new URL(baseUrl);
    url.pathname = "/";
    url.search = new URL(cleanRoot(url), url).search;
    url.hash = "";
    url.searchParams.set(TOKEN_QUERY, this.launchToken);
    return url.href;
  }
  /**
  * Authenticate an index request. A valid root query token mints the cookie
  * and redirects to clean `/`; a valid cookie lets the caller serve the
  * index; every other request receives the same minimal 401 response.
  * @param req - incoming root or configured-index request.
  * @param res - response owned when this method returns false.
  * @returns true only when the caller may serve index.html.
  */
  authorizeIndex(req, res) {
    /* v8 ignore next -- node:http always supplies url on server requests. */
    const url = new URL(req.url ?? "/", "http://dsh.invalid");
    const tokens = url.searchParams.getAll(TOKEN_QUERY);
    if (tokens.length > 0) {
      const authority = requestAuthority(req.headers);
      if (req.method === "GET" && url.pathname === "/" && tokens.length === 1 && authority !== void 0 && tokenMatches(tokens.join(""), this.launchToken)) {
        const issuedAt = Date.now();
        const expiresAt = issuedAt + this.maxAgeMilliseconds;
        const value = encodeCookie({
          version: COOKIE_PAYLOAD_VERSION,
          authority,
          issuedAt,
          expiresAt
        }, this.secret);
        res.writeHead(303, {
          "cache-control": "no-store",
          "location": cleanRoot(url),
          "referrer-policy": "no-referrer",
          "set-cookie": sessionCookie(cookieName(authority), value, expiresAt, Math.floor(this.maxAgeMilliseconds / 1e3))
        });
        res.end();
        return false;
      }
      if (req.method === "GET" && url.pathname === "/" && this.isAuthenticated(req)) {
        res.writeHead(303, {
          "cache-control": "no-store",
          "location": cleanRoot(url),
          "referrer-policy": "no-referrer"
        });
        res.end();
        return false;
      }
      this.writeUnauthorized(req, res);
      return false;
    }
    if (this.isAuthenticated(req)) return true;
    this.writeUnauthorized(req, res);
    return false;
  }
  /**
  * Verify the authority-bound browser cookie on a Host request.
  * @param request - request headers carrying Host and Cookie.
  * @returns true only for an unexpired cookie signed by this activation's loaded secret.
  */
  isAuthenticated(request) {
    const authority = requestAuthority(request.headers);
    const rawCookie = header(request.headers, "cookie");
    if (authority === void 0 || rawCookie === void 0) return false;
    const value = cookieValue(rawCookie, cookieName(authority));
    if (value === void 0) return false;
    const payload = decodeCookie(value, this.secret);
    if (payload === void 0 || payload.authority !== authority) return false;
    const now = Date.now();
    return payload.issuedAt <= now && payload.expiresAt > now && payload.expiresAt > payload.issuedAt && payload.expiresAt - payload.issuedAt <= this.maxAgeMilliseconds;
  }
  writeUnauthorized(req, res) {
    res.writeHead(401, {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8"
    });
    res.end(req.method === "HEAD" ? void 0 : "dsh web authentication required; reopen the URL printed by dsh web.\n");
  }
}
