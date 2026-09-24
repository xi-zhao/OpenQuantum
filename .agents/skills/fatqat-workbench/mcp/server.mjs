#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { preparedPythonLaunch } from "../../../../src/lib/prepared-python.mjs";
import { runLocalJsonProcess } from "../../../../src/lib/local-json-process.mjs";
import { localComputeEnvironment, localComputeProcessOptions } from "../../../../src/lib/local-compute-policy.mjs";
import { TOOLS, normalizeRequest, validateOutput } from "./contracts.mjs";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const projectRoot = path.resolve(skillRoot, "../../..");
const dependencyLockSha256 = createHash("sha256").update(await readFile(path.join(skillRoot, "uv.lock"))).digest("hex");
const environmentNames = ["HOME", "PATH", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY", "SSL_CERT_FILE", "SSL_CERT_DIR", "UV_CACHE_DIR", "UV_PYTHON_INSTALL_DIR", "SYSTEMROOT", "TEMP", "TMP", "TMPDIR", "WINDIR"];
const environment = {
  ...Object.fromEntries(environmentNames.filter((key) => process.env[key]).map((key) => [key, process.env[key]])),
  UV_PROJECT_ENVIRONMENT: path.join(projectRoot, ".openquantum/python-envs/fatqat-workbench"),
  MPLCONFIGDIR: path.join(projectRoot, ".openquantum/cache/fatqat-matplotlib"),
  PYTHONNOUSERSITE: "1", PYTHONDONTWRITEBYTECODE: "1", MPLBACKEND: "Agg",
  NUMBA_DISABLE_JIT: "1", OMP_NUM_THREADS: "1", OPENBLAS_NUM_THREADS: "1", MKL_NUM_THREADS: "1",
};
const server = new Server({ name: "openquantum-fatqat-local", version: "0.1.0" }, { capabilities: { tools: {} } });
const active = new Set();
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...TOOLS] }));
server.setRequestHandler(CallToolRequestSchema, async (request, { signal }) => {
  const controller = new AbortController();
  try {
    const input = normalizeRequest(request.params.name, request.params.arguments);
    if (active.size >= 2) throw new Error("FatQat is busy; wait for an existing experiment to finish");
    active.add(controller);
    const result = await runLocalJsonProcess({
      ...await preparedPythonLaunch({ skillRoot, dependencyLockSha256 }),
      cwd: skillRoot, env: localComputeEnvironment(environment),
      input: { tool: request.params.name, input, dependencyLockSha256 },
      signal: AbortSignal.any([signal, controller.signal].filter(Boolean)),
      ...localComputeProcessOptions(),
      label: "FatQat local experiment",
    });
    const { plotPng, ...structuredContent } = result;
    if (!validateOutput(structuredContent)) throw new Error("FatQat bridge returned an invalid result contract");
    if (typeof plotPng !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(plotPng) || !plotPng.startsWith("iVBORw0KGgo")) {
      throw new Error("FatQat bridge returned an invalid plot");
    }
    return {
      content: [
        { type: "text", text: JSON.stringify(structuredContent) },
        { type: "image", mimeType: "image/png", data: plotPng },
      ],
      structuredContent,
    };
  } catch (error) {
    return { isError: true, content: [{ type: "text", text: `FatQat tool error: ${error.message}` }] };
  } finally {
    active.delete(controller);
  }
});
const abortComputations = () => { for (const controller of active) controller.abort(); };
server.onclose = abortComputations;
process.stdin.once("end", abortComputations);
for (const event of ["SIGTERM", "SIGINT"]) {
  process.once(event, () => { abortComputations(); void server.close(); });
}
await server.connect(new StdioServerTransport());
