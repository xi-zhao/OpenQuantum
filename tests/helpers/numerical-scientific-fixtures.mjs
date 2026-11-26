import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { preparePythonFixture } from "./prepared-python.mjs";
import { QEC_MEMORY_TOOL, HAMILTONIAN_SIMULATION_TOOL } from "../../runtime/openquantum/agent-presets/openquantum/scientific-result-protocol.mjs";

export const numericalFixtures = [
  { id: "qec-memory-experiment", tool: QEC_MEMORY_TOOL, bare: "run_qec_memory_experiment", server: "mcp-qec-memory-experiment", key: "facts", names: ["noisy", "zero-noise"] },
  { id: "hamiltonian-simulation", tool: HAMILTONIAN_SIMULATION_TOOL, bare: "simulate_hamiltonian", server: "mcp-hamiltonian-simulation", key: "result", names: ["trotter-2", "qdrift", "identity", "zero-time"] },
].map(spec => ({ ...spec, cases: spec.names.map(name => JSON.parse(readFileSync(
  new URL(`../../.agents/skills/${spec.id}/evals/fixtures/${name}.json`, import.meta.url), "utf8"))) }));

export function numericalCanonical(spec, input = spec.cases[0]) {
  return { content: [{ type: "text", text: "Recorded numerical protocol fixture; not a fresh SDK run." }], structuredContent: {
    schemaVersion: "1.0", scientificValidation: "observations_available", [spec.key]: structuredClone(input[spec.key]),
    validation: { schemaVersion: "1.0", observations: [{ id: "provenance.complete", status: "not_checked", detail: "Execution only." }] },
  } };
}

// Deterministic protocol fixture, deliberately distinct from live SDK verification.
// Match the original request before returning any reference; never trust Tool facts.
export async function prepareNumericalFixtures(root, sandbox) {
  let environment;
  for (const spec of numericalFixtures) {
    const executable = path.join(sandbox, `fixture-${spec.id}`);
    await writeFile(executable, `#!${process.execPath}
const {isDeepStrictEqual}=require('node:util');
const cases=${JSON.stringify(spec.cases)};
let input=''; process.stdin.on('data', c=>input+=c);
process.stdin.on('end',()=>{
  const envelope=JSON.parse(input), request=envelope.request ?? envelope.input ?? envelope;
  const fixture=cases.find(item=>isDeepStrictEqual(item.request,request));
  if(!fixture) throw new Error('Request outside recorded protocol fixture');
  if (envelope.action === 'experiment') process.stdout.write(JSON.stringify(fixture.facts));
  else if (envelope.input) process.stdout.write(JSON.stringify({...envelope, schemaVersion:'1.0', result:fixture.result, scientificValidation:'not_evaluated', limitations:['Recorded protocol fixture only.']}));
  else process.stdout.write(JSON.stringify(fixture.reference));
});
`);
    environment = await preparePythonFixture({ root, sandbox, id: spec.id, executable });
  }
  return environment;
}
