import { randomBytes } from "node:crypto";
import { BrowserAuth } from "./browser-auth.mjs";

export const inject = ["webServer", "loader"];

export function originRejection(request) {
  const { host, origin } = request.headers;
  if (typeof host !== "string" || request.headers["sec-fetch-site"] === "cross-site") return 403;
  try {
    const authority = new URL(`http://${host}`);
    if (authority.username || authority.password || authority.pathname !== "/" || authority.search || authority.hash) return 403;
    if (origin !== undefined) {
      const source = new URL(origin);
      if (!["http:", "https:"].includes(source.protocol) || source.host !== authority.host) return 403;
    }
  } catch { return 403; }
}

/** Protect the original carrier through its public registration API. All HTTP
 * producers in the pinned composition wait for openquantumWebSecurity. This
 * preserves the Desktop launcher's loopback/random-port invariant and lifecycle.
 */
export function protectWebServer(server, auth) {
  const requestRejection = request => !auth.isAuthenticated(request) ? 401 : originRejection(request);
  const authorize = (request, response) => {
    if (originRejection(request) !== undefined) {
      response.writeHead(403, { "cache-control": "no-store" });
      response.end("forbidden");
      return false;
    }
    return auth.authorizeIndex(request, response);
  };
  const originals = Object.fromEntries(["register", "registerFallback", "registerUpgrade"].map(name => [name, server[name]]));
  const methods = {
    register(route) {
      return originals.register.call(server, { ...route, handler: (request, response) => {
        if (authorize(request, response)) return route.handler(request, response);
      } });
    },
    registerFallback(handler) {
      return originals.registerFallback.call(server, (request, response) => {
        if (authorize(request, response)) return handler(request, response);
      });
    },
    registerUpgrade(route) {
      return originals.registerUpgrade.call(server, { ...route, handler: (request, socket, head) => {
        const status = requestRejection(request);
        if (status !== undefined) {
          socket.end(`HTTP/1.1 ${status} ${status === 401 ? "Unauthorized" : "Forbidden"}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
          return;
        }
        return route.handler(request, socket, head);
      } });
    },
  };
  Object.assign(server, methods);
  return {
    requestRejection,
    authenticatedUrl: url => auth.authenticatedUrl(url),
    dispose() {
      for (const name of Object.keys(methods)) if (server[name] === methods[name]) server[name] = originals[name];
    },
  };
}

export function apply(ctx) {
  const auth = new BrowserAuth(ctx.root, randomBytes(32), 1);
  const guard = protectWebServer(ctx.webServer, auth);
  ctx.effect(() => () => guard.dispose());
  ctx.provide("openquantumWebSecurity", guard);
  if (!process.env.OPENQUANTUM_DESKTOP_DATA_DIR) {
    // Advertise readiness only after all routes have mounted. Do not await this
    // from apply: Loader is also waiting for this plugin to finish activating.
    let disposed = false;
    const pending = setImmediate(() => {
      ctx.loader.await().then(() => {
        if (!disposed) console.log(`dsh web: ${guard.authenticatedUrl(`http://127.0.0.1:${ctx.webServer.port}`)}`);
      }).catch(error => ctx.logger.error(error));
    });
    ctx.effect(() => () => { disposed = true; clearImmediate(pending); });
  }
}
