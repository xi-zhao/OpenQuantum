import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { buildHomepage } from "./build-homepage.mjs";

const args = process.argv.slice(2);
const portIndex = args.indexOf("--port");
const port = Number(portIndex >= 0 ? args[portIndex + 1] : 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("Use --port with an integer from 1 to 65535.");
}
const root = await buildHomepage();
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json; charset=utf-8" };
const server = createServer(async (request, response) => {
  try {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { allow: "GET, HEAD" });
      response.end();
      return;
    }
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const file = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
    if (!file.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end();
      return;
    }
    const info = await stat(file);
    if (!info.isFile() || !types[path.extname(file)]) {
      response.writeHead(404).end();
      return;
    }
    const body = request.method === "HEAD" ? null : await readFile(file);
    response.writeHead(200, { "content-type": types[path.extname(file)], "content-length": info.size, "cache-control": "no-store", "x-content-type-options": "nosniff" });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});
server.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
server.listen(port, "127.0.0.1", () => console.log(`OpenQuantum homepage: http://127.0.0.1:${port}`));
