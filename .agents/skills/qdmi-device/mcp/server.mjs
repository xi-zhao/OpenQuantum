import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, access } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { runLocalJsonProcess } from "../../../../src/lib/local-json-process.mjs";
import { sha256 } from "../../../../src/lib/bounded-science-mcp.mjs";
import { definition } from "./contracts.mjs";
const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const root = path.resolve(skillRoot, "../../..");
const python = path.join(root, ".openquantum/python-envs/qdmi-device", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
const lockHash = sha256(await readFile(path.join(skillRoot, "uv.lock")));
const server = new Server({ name: "openquantum-qdmi-device", version: "0.1.0" }, { capabilities: { tools: {} } });
let active;
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [definition.tool] }));
server.setRequestHandler(CallToolRequestSchema, async (request, { signal }) => {
  let controller;
  try {
    const input = definition.normalize(request.params.name, request.params.arguments);
    if (active) throw new Error("QDMI query is busy");
    try { await access(python); await access(path.join(root, ".openquantum/qdmi/driver.json")); }
    catch { throw new Error("QDMI is not configured; run npm run capability:qdmi:setup for the local example driver, or configure a reviewed QDMI client driver"); }
    controller = new AbortController(); active = controller;
    const inputSha256 = sha256(JSON.stringify(input));
    // Deliberately no user credentials, loader overrides or QDMI_CONF from the host environment.
    const env = { PYTHONDONTWRITEBYTECODE: "1", PYTHONNOUSERSITE: "1",
      ...Object.fromEntries(["PATH", "SYSTEMROOT", "WINDIR"].filter(key => process.env[key]).map(key => [key, process.env[key]])) };
    const output = await runLocalJsonProcess({
      command: python, args: [path.join(skillRoot, "mcp/bridge.py")], cwd: root, env,
      input: { input, inputSha256, dependencyLockSha256: lockHash, source: definition.source },
      signal: AbortSignal.any([signal, controller.signal].filter(Boolean)),
      timeoutMs: input.execution.timeoutMs ?? 30000, maxOutputBytes: input.execution.maxOutputBytes ?? 2097152,
      label: "qdmi-device", notFoundMessage: "Prepare the QDMI environment explicitly before querying",
    });
    if (!definition.validateOutput(output) || output.inputSha256 !== inputSha256
        || output.dependencyLockSha256 !== lockHash || !isDeepStrictEqual(output.input, input))
      throw new Error("QDMI worker returned invalid data or mismatched provenance");
    return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
  } catch (error) {
    return { isError: true, content: [{ type: "text", text: error.message }] };
  } finally {
    if (active === controller) active = undefined;
  }
});
const stop = async () => { active?.abort(); await server.close(); };
process.on("SIGTERM", stop); process.on("SIGINT", stop);
await server.connect(new StdioServerTransport());
