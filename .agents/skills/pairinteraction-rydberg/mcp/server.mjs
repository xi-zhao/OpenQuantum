import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { runLocalJsonProcess } from "../../../../src/lib/local-json-process.mjs";
import { sha256 } from "../../../../src/lib/bounded-science-mcp.mjs";
import { definition } from "./contracts.mjs";
import { preparedPythonLaunch } from "../../../../src/lib/prepared-python.mjs";
import { localComputeEnvironment, localComputeProcessOptions } from "../../../../src/lib/local-compute-policy.mjs";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const root = path.resolve(skillRoot, "../../..");
const dependencyLockSha256 = sha256(await readFile(path.join(skillRoot, "uv.lock")));
const databaseLock = await readFile(path.join(skillRoot, "database-lock.json"));
const databaseSpec = JSON.parse(databaseLock);
const database = {
  release: databaseSpec.release, manifestSha256: sha256(databaseLock),
  files: databaseSpec.archives.flatMap(archive => Object.entries(archive.files).map(([name, sha256]) => ({ name, sha256 }))).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
};
const names = ["HOME", "PATH", "SYSTEMROOT", "TEMP", "TMP", "TMPDIR", "WINDIR"];
const env = { ...Object.fromEntries(names.filter(key => process.env[key]).map(key => [key, process.env[key]])),
  PYTHONNOUSERSITE: "1", PYTHONDONTWRITEBYTECODE: "1", MPLBACKEND: "Agg",
  MPLCONFIGDIR: path.join(root, ".openquantum/cache/pairinteraction-matplotlib"),
  PAIRINTERACTION_CONFIG_DIR: path.join(root, ".openquantum/pairinteraction-config"),
  PAIRINTERACTION_CACHE_DIR: path.join(root, ".openquantum/cache/pairinteraction"),
};
const server = new Server({ name: "openquantum-pairinteraction", version: "0.1.0" }, { capabilities: { tools: {} } });
let active;
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [definition.tool] }));
server.setRequestHandler(CallToolRequestSchema, async (request, { signal }) => {
  let controller;
  try {
    const input = definition.normalize(request.params.name, request.params.arguments);
    if (active) throw new Error("PairInteraction is busy; wait for the current calculation");
    controller = new AbortController(); active = controller;
    const inputSha256 = sha256(JSON.stringify(input));
    const value = await runLocalJsonProcess({
      ...await preparedPythonLaunch({ skillRoot, id: "pairinteraction-rydberg", dependencyLockSha256 }),
      cwd: skillRoot, env: localComputeEnvironment(env, input.execution),
      input: { input, inputSha256, dependencyLockSha256, source: definition.source },
      signal: AbortSignal.any([signal, controller.signal].filter(Boolean)), ...localComputeProcessOptions(input.execution),
      label: "PairInteraction",
    });
    const count = input.channel === "ss" ? 1 : 2;
    if (!definition.validateOutput(value) || value.inputSha256 !== inputSha256
      || value.dependencyLockSha256 !== dependencyLockSha256 || !isDeepStrictEqual(value.input, input)
      || !isDeepStrictEqual(value.result.database, database)
      || value.result.model.targetStates.length !== count || value.result.model.targetBasisWeights.length !== count
      || value.result.points.length !== input.distancesUm.length
      || value.result.points.some((point, i) => point.distanceUm !== input.distancesUm[i]
        || point.effectiveHamiltonianMHz.length !== count || point.effectiveHamiltonianMHz.some(row => row.length !== count)
        || [point.effectiveEigenvaluesMHz, point.exactEigenvaluesMHz, point.exactTargetWeights, point.secondOrderShiftsMHz].some(values => values.length !== count))) {
      throw new Error("PairInteraction returned an invalid result or mismatched provenance");
    }
    return { content: [{ type: "text", text: JSON.stringify(value) }], structuredContent: value };
  } catch (error) {
    return { isError: true, content: [{ type: "text", text: `PairInteraction: ${error.message}` }] };
  } finally {
    if (controller === active) active = undefined;
  }
});
const abort = () => active?.abort();
server.onclose = abort;
process.stdin.once("end", abort);
for (const event of ["SIGTERM", "SIGINT"]) process.once(event, () => { abort(); void server.close(); });
await server.connect(new StdioServerTransport());
