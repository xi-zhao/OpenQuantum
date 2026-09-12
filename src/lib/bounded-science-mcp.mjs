import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import Ajv from "ajv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { runLocalJsonProcess } from "./local-json-process.mjs";

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export const objectSchema = (properties, required = Object.keys(properties)) => ({ type: "object", properties, required, additionalProperties: false });
export const numberSchema = (minimum, maximum, defaultValue) => ({ type: "number", minimum, maximum, ...(defaultValue === undefined ? {} : { default: defaultValue }) });
export const integerSchema = (minimum, maximum, defaultValue) => ({ ...numberSchema(minimum, maximum, defaultValue), type: "integer" });
export const arraySchema = (items, minItems, maxItems) => ({ type: "array", items, minItems, maxItems });

// Only a stdio boundary around one bounded local action; Harness owns registration and lifecycle.
export function defineScienceTool({ name, description, source, inputSchema, resultSchema, checkInput = () => {} }) {
  const ajv = new Ajv({ allErrors: true, useDefaults: true, strict: false });
  const validateInput = ajv.compile(inputSchema);
  const outputSchema = objectSchema({
    schemaVersion: { const: "1.0" },
    source: objectSchema(Object.fromEntries(Object.entries(source).map(([key, value]) => [key, { const: value }]))),
    input: inputSchema,
    inputSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    dependencyLockSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    result: resultSchema,
    scientificValidation: { const: "not_evaluated" },
    limitations: arraySchema({ type: "string", minLength: 1 }, 1, 12),
  });
  const validateOutput = new Ajv({ strict: false, allErrors: true }).compile(outputSchema);
  return {
    source, validateOutput,
    tool: { name, description, inputSchema, outputSchema, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true } },
    normalize(nameToCall, args) {
      if (nameToCall !== name) throw new Error(`Unknown tool: ${nameToCall}`);
      const value = structuredClone(args ?? {});
      if (!validateInput(value)) throw new Error(`Invalid input: ${ajv.errorsText(validateInput.errors)}`);
      checkInput(value);
      return value;
    },
  };
}

export async function serveScienceTool({ entrypoint, id, definition, runtime = "python" }) {
  const skillRoot = fileURLToPath(new URL("..", entrypoint));
  const projectRoot = path.resolve(skillRoot, "../../..");
  const lockFile = runtime === "julia" ? "Manifest.toml" : "uv.lock";
  const dependencyLockSha256 = sha256(await readFile(path.join(skillRoot, lockFile)));
  const allowed = ["HOME", "PATH", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY", "SSL_CERT_FILE", "SSL_CERT_DIR", "UV_CACHE_DIR", "UV_PYTHON_INSTALL_DIR", "SYSTEMROOT", "TEMP", "TMP", "TMPDIR", "WINDIR"];
  const env = {
    ...Object.fromEntries(allowed.filter((key) => process.env[key]).map((key) => [key, process.env[key]])),
    UV_PROJECT_ENVIRONMENT: path.join(projectRoot, ".openquantum/python-envs", id),
    MPLCONFIGDIR: path.join(projectRoot, ".openquantum/cache", `${id}-matplotlib`),
    PYTHONNOUSERSITE: "1", PYTHONDONTWRITEBYTECODE: "1", MPLBACKEND: "Agg",
    OMP_NUM_THREADS: "1", OPENBLAS_NUM_THREADS: "1", MKL_NUM_THREADS: "1", NUMBA_NUM_THREADS: "1",
    JULIA_NUM_THREADS: "1", JULIA_NUM_PRECOMPILE_TASKS: "2", JULIA_PKG_PRECOMPILE_AUTO: "0",
  };
  const server = new Server({ name: `openquantum-${id}`, version: "0.1.0" }, { capabilities: { tools: {} } });
  let active;
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [definition.tool] }));
  server.setRequestHandler(CallToolRequestSchema, async (request, { signal }) => {
    let controller;
    try {
      const input = definition.normalize(request.params.name, request.params.arguments);
      if (active) throw new Error("This local capability is busy; retry when its current call completes");
      controller = new AbortController(); active = controller;
      const inputSha256 = sha256(JSON.stringify(input));
      const value = await runLocalJsonProcess({
        command: runtime === "julia" ? "julia" : "uv",
        args: runtime === "julia"
          ? ["--startup-file=no", "--threads=1", `--project=${skillRoot}`, path.join(skillRoot, "mcp/bridge.jl")]
          : ["run", "--quiet", "--frozen", "--project", skillRoot, "--python", "3.12", "python", path.join(skillRoot, "mcp/bridge.py")],
        cwd: skillRoot, env, input: { input, inputSha256, dependencyLockSha256, source: definition.source },
        signal: AbortSignal.any([signal, controller.signal].filter(Boolean)),
        timeoutMs: 180_000, maxOutputBytes: 2 * 1024 * 1024,
        label: id,
        notFoundMessage: runtime === "julia" ? "需要 Julia；请先运行 npm run capability:paper-tools:setup" : "需要 uv；请先运行 npm run capability:paper-tools:setup",
      });
      if (!definition.validateOutput(value)
        || value.inputSha256 !== inputSha256 || value.dependencyLockSha256 !== dependencyLockSha256
        || !isDeepStrictEqual(value.input, input)) {
        throw new Error("Scientific bridge returned an invalid result or mismatched provenance");
      }
      return { content: [{ type: "text", text: JSON.stringify(value) }], structuredContent: value };
    } catch (error) {
      return { isError: true, content: [{ type: "text", text: `${id}: ${error.message}` }] };
    } finally {
      if (controller === active) active = undefined;
    }
  });
  const abort = () => active?.abort();
  server.onclose = abort;
  process.stdin.once("end", abort);
  for (const event of ["SIGTERM", "SIGINT"]) process.once(event, () => { abort(); void server.close(); });
  await server.connect(new StdioServerTransport());
}
