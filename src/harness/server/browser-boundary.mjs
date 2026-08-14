const MAX_REQUEST_BYTES = 1024 * 1024;
const LOOPBACK_HOST = /^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d{1,5})?$/i;

export class HarnessRequestTooLargeError extends Error {
  constructor() {
    super("Harness RPC request is too large");
    this.name = "HarnessRequestTooLargeError";
  }
}

/**
 * Browser-facing Harness routes share one fail-closed origin boundary.
 * Matching Origin and Host alone is insufficient because DNS rebinding can
 * make an attacker-controlled hostname resolve to loopback.
 * @param {Request} request
 * @returns {Response | undefined}
 */
export function harnessBrowserBoundaryError(request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const mediaType = contentType.split(";", 1)[0]?.trim();
  if (mediaType !== "application/json") {
    return Response.json(
      { error: "Harness RPC requires application/json" },
      { status: 415 },
    );
  }

  const host = request.headers.get("host");
  const originValue = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!host || !originValue || (fetchSite && fetchSite !== "same-origin")) {
    return Response.json(
      { error: "Harness RPC requires a same-origin browser request" },
      { status: 403 },
    );
  }

  const trustedPublicHost = process.env.OPENQUANTUM_TRUSTED_HOST?.toLowerCase();
  if (!LOOPBACK_HOST.test(host) && host.toLowerCase() !== trustedPublicHost) {
    return Response.json(
      { error: "Harness RPC host is not trusted" },
      { status: 403 },
    );
  }

  try {
    const origin = new URL(originValue);
    if (
      (origin.protocol !== "http:" && origin.protocol !== "https:") ||
      origin.host.toLowerCase() !== host.toLowerCase()
    ) {
      throw new Error("origin authority does not match host");
    }
  } catch {
    return Response.json(
      { error: "Harness RPC origin is not trusted" },
      { status: 403 },
    );
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return Response.json(
      { error: "Harness RPC request is too large" },
      { status: 413 },
    );
  }

  return undefined;
}

/** @param {Request} request */
export async function readBoundedHarnessJson(request) {
  if (request.body === null) {
    throw new SyntaxError("request body is empty");
  }

  const reader = request.body.getReader();
  const chunks = [];
  let receivedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      receivedBytes += value.byteLength;
      if (receivedBytes > MAX_REQUEST_BYTES) {
        throw new HarnessRequestTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(body));
}

export function harnessBaseUrl() {
  return (process.env.HARNESS_BASE_URL ?? "http://127.0.0.1:3080").replace(
    /\/$/,
    "",
  );
}

/** @param {string} rpcId */
export function harnessUnavailableResponse(rpcId) {
  return Response.json(
    {
      type: "server-response",
      rpcId,
      result: {
        ok: false,
        error: {
          code: "internal",
          message: "Harness Runtime 不可用，请先运行 npm run harness:dev。",
          details: {},
        },
      },
    },
    {
      status: 503,
      headers: {
        "cache-control": "no-store",
        "x-openquantum-rpc-outcome": "unknown-after-send",
      },
    },
  );
}

/** @param {Request} request */
export async function parseHarnessRequest(request) {
  const boundaryError = harnessBrowserBoundaryError(request);
  if (boundaryError) {
    return { error: boundaryError };
  }

  try {
    return { body: await readBoundedHarnessJson(request) };
  } catch (error) {
    if (error instanceof HarnessRequestTooLargeError) {
      return {
        error: Response.json(
          { error: "Harness RPC request is too large" },
          { status: 413 },
        ),
      };
    }
    return {
      error: Response.json(
        { error: "Request body must be JSON" },
        { status: 400 },
      ),
    };
  }
}
