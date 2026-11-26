import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { preparePythonFixture } from "./prepared-python.mjs";
import {
  PYZX_OPTIMIZATION_TOOL,
  SYMMER_TAPERING_TOOL,
  PAULIE_ALGEBRA_TOOL,
  GRAPHIX_MBQC_TOOL,
} from "../../runtime/openquantum/agent-presets/openquantum/scientific-result-adapters.mjs";

function loadFixture(id, name) {
  return JSON.parse(readFileSync(
    new URL(`../../.agents/skills/${id}/evals/fixtures/${name}.json`, import.meta.url),
    "utf8",
  ));
}

export const unitaryFixtures = [
  {
    id: "pyzx-optimization",
    tool: PYZX_OPTIMIZATION_TOOL,
    bare: "optimize_pyzx_circuit",
    server: "mcp-pyzx-optimization",
    key: "result",
    artifact: "numerical-result",
    names: ["default", "phase", "identity"],
    conditionalNames: ["skip", "large"],
  },
  {
    id: "symmer-tapering",
    tool: SYMMER_TAPERING_TOOL,
    bare: "taper_symmer_hamiltonian",
    server: "mcp-symmer-tapering",
    key: "result",
    artifact: "numerical-result",
    names: ["default", "negative", "scalar", "signed"],
    conditionalNames: ["skip"],
    reference: true,
  },
  {
    id: "paulie-algebra",
    tool: PAULIE_ALGEBRA_TOOL,
    bare: "analyze_paulie_algebra",
    server: "mcp-paulie-algebra",
    key: "result",
    artifact: "numerical-result",
    names: ["default", "center", "local", "single"],
    conditionalNames: ["skip", "large"],
  },
  {
    id: "graphix-mbqc",
    tool: GRAPHIX_MBQC_TOOL,
    bare: "simulate_graphix_pattern",
    server: "mcp-graphix-mbqc",
    key: "result",
    artifact: "numerical-result",
    names: ["default", "identity", "rotation"],
    conditionalNames: ["skip", "generated"],
  },
].map(spec => ({
  ...spec,
  cases: spec.names.map(name => loadFixture(spec.id, name)),
  conditionalCases: spec.conditionalNames.map(name => ({ name, ...loadFixture(spec.id, name) })),
}));

export function unitaryCanonical(spec, input = spec.cases[0]) {
  const result = structuredClone(input.result);
  return {
    content: [{ type: "text", text: "Recorded protocol fixture; not a fresh SDK run." }],
    structuredContent: {
      schemaVersion: "1.0",
      result,
      scientificValidation: "observations_available",
      validation: {
        schemaVersion: "1.0",
        observations: [{ id: "provenance.complete", status: "not_checked", detail: "Execution only." }],
      },
    },
  };
}

export async function prepareUnitaryFixtures(root, sandbox) {
  let environment;
  for (const spec of unitaryFixtures) {
    const allCases = [...spec.cases, ...spec.conditionalCases];
    const executable = path.join(sandbox, `fixture-${spec.id}`);
    await writeFile(executable, `#!${process.execPath}
const { isDeepStrictEqual } = require('node:util');
const cases = ${JSON.stringify(allCases)};
const normalize = value => ({ execution: {}, ...value });
let text = '';
process.stdin.on('data', chunk => { text += chunk; });
process.stdin.on('end', () => {
  const envelope = JSON.parse(text);
  const input = envelope.request ?? envelope.input ?? envelope;
  const fixture = cases.find(item => isDeepStrictEqual(normalize(item.request), normalize(input)));
  if (!fixture) throw new Error('Request outside recorded fixture');
  const value = envelope.input
    ? { ...envelope, schemaVersion: '1.0', result: fixture.result, scientificValidation: 'not_evaluated', limitations: ['Recorded protocol fixture.'] }
    : { ...fixture.reference, request: input };
  process.stdout.write(JSON.stringify(value));
});
`);
    environment = await preparePythonFixture({ root, sandbox, id: spec.id, executable });
  }
  return environment;
}
