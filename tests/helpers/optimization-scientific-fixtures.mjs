import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { preparePythonFixture } from "./prepared-python.mjs";
import { QUBO_SOLVE_TOOL, QUBO_MODEL_TOOL, LDPC_DECODING_TOOL } from "../../runtime/openquantum/agent-presets/openquantum/scientific-result-adapters.mjs";

export const numericalFixtures = [
  { id: "qpanda-qubo", tool: QUBO_SOLVE_TOOL, bare: "solve_qpanda_qubo", server: "mcp-qpanda-qubo", key: "result", artifact: "qubo-result", names: ["raw"] },
  { id: "qpanda-qubo", tool: QUBO_MODEL_TOOL, bare: "model_and_solve_qpanda_qubo", server: "mcp-qpanda-qubo", key: "result", artifact: "qubo-result", names: ["model", "maximize"] },
  { id: "ldpc-decoding", tool: LDPC_DECODING_TOOL, bare: "decode_ldpc_syndromes", server: "mcp-ldpc-decoding", key: "result", artifact: "ldpc-result", names: ["parity", "logical"], reference: true },
].map(spec => ({ ...spec, cases: spec.names.map(name => JSON.parse(readFileSync(
  new URL(`../../.agents/skills/${spec.id}/evals/fixtures/${name}.json`, import.meta.url), "utf8"))) }));

export function numericalCanonical(spec, input = spec.cases[0]) {
  const result = structuredClone(input.result);
  return { content: [{ type: "text", text: "Recorded protocol fixture; not a fresh SDK run." }], structuredContent: {
    ...(spec.id === "qpanda-qubo" ? result : { schemaVersion: "1.0", result }), scientificValidation: "observations_available",
    validation: { schemaVersion: "1.0", observations: [{ id: "provenance.complete", status: "not_checked", detail: "Execution only." }] },
  } };
}

export async function prepareNumericalFixtures(root, sandbox) {
  let environment;
  for (const id of new Set(numericalFixtures.map(s => s.id))) {
    const cases = numericalFixtures.filter(s => s.id === id).flatMap(s => s.cases).map(f => {
      if (id !== "qpanda-qubo") return { ...f, request: { execution: {}, ...f.request } };
      const q = f.result.modeling?.qubo;
      return { request: q ? { quadratic: q.quadratic, linear: q.linear, constant: q.constant, method: f.request.method, referenceMode: "auto" }
        : { ...f.request, referenceMode: "auto" }, result: f.result.solver ?? f.result };
    });
    const executable = path.join(sandbox, `fixture-${id}`);
    await writeFile(executable, `#!${process.execPath}
const {isDeepStrictEqual}=require('node:util');
const cases=${JSON.stringify(cases)};
let text=''; process.stdin.on('data', c=>text+=c);
process.stdin.on('end',()=>{
  const envelope=JSON.parse(text), input=envelope.request ?? envelope.input ?? envelope;
  const fixture=cases.find(item=>isDeepStrictEqual(item.request,input));
  if(!fixture) throw new Error('Request outside recorded fixture');
  const value=envelope.action==='solve' ? fixture.result : envelope.input
    ? {...envelope, schemaVersion:'1.0', result:fixture.result, scientificValidation:'not_evaluated', limitations:['Recorded protocol fixture.']}
    : fixture.reference;
  process.stdout.write(JSON.stringify(value));
});
`);
    environment = await preparePythonFixture({ root, sandbox, id, executable });
  }
  return environment;
}
