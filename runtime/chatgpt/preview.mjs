import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { settingsRequest } from "./server.mjs";

// Local preview is an explicit developer entry, never a public MCP deployment.
export async function startPreview(context) {
  const token = randomBytes(32).toString("hex");
  let origin;
  const server = createServer(async (request, response) => {
    const send = (status, body, type = "application/json") => { response.writeHead(status, { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" }); response.end(type === "application/json" ? JSON.stringify(body) : body); };
    if (request.headers.host !== new URL(origin).host) return send(403, { error: "Forbidden" });
    if (request.method === "GET" && request.url === "/") return send(200, context.html, "text/html; charset=utf-8");
    if (request.method !== "POST" || request.url !== "/settings" || request.headers.origin !== origin || request.headers.authorization !== `Bearer ${token}` || !request.headers["content-type"]?.startsWith("application/json")) return send(403, { error: "Forbidden" });
    try {
      let body = "";
      for await (const chunk of request) { body += chunk; if (Buffer.byteLength(body) > 32768) return send(413, { error: "Request too large" }); }
      send(200, await settingsRequest(context, JSON.parse(body)));
    } catch (error) { send(400, { error: error.message }); }
  });
  server.requestTimeout = 15000;
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
  return { url: `${origin}/#preview=${token}`, close() { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); } };
}
