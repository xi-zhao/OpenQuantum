import path from "node:path";
import { pathToFileURL } from "node:url";
const { capabilityRequestBoundary } = await import(pathToFileURL(path.join(process.cwd(), "runtime/openquantum/web-capabilities/index.mjs")).href);

export const inject = ["webServer"];
const MAX_BYTES = 128 * 1024;

const json = (response, status, value) => {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(value));
};

export function createLearningHandler({ dispatch }) {
  return async (request, response) => {
    const rejected = capabilityRequestBoundary(request, { surface: "Quantum Learning", maxBytes: MAX_BYTES });
    if (rejected) { json(response, rejected.status, { error: rejected.error }); return; }
    try {
      let bytes = 0;
      const chunks = [];
      for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > MAX_BYTES) { json(response, 413, { error: "建课材料超过大小限制" }); return; }
        chunks.push(chunk);
      }
      const result = await dispatch(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      json(response, 200, result);
    } catch (error) {
      const badRequest = error instanceof TypeError || error instanceof SyntaxError;
      json(response, badRequest ? 400 : 500, { error: badRequest ? error.message : "课堂存储暂时不可用" });
    }
  };
}

export function apply(ctx) {
  const application = import(pathToFileURL(path.join(process.cwd(), "src/learning/application.mjs")).href)
    .then((module) => module.learningApplication(process.cwd()));
  ctx.effect(() => ctx.webServer.register({
    path: "/openquantum/api/learning", exact: true,
    handler: createLearningHandler({ dispatch: async (command) => (await application).dispatch(command) }),
  }), "openquantum: quantum learning API");
}
