import assert from "node:assert/strict";
import test from "node:test";
import { CANDIDATE_TOOLS } from "./fixtures/candidate-tools.mjs";
import { registerScienceProtocolTests } from "./helpers/science-protocol.mjs";

registerScienceProtocolTests(CANDIDATE_TOOLS, { cancellationId: "compact-optimization" });

test("Candidate contracts reject invalid physics and preserve caller resource choices", async () => {
  const bad = {
    "qcut-knitting": [{gates:[]}, { observables: ["Z"] }, { strategy: "explicit", gateCuts: [0] }, { gates: [{ gate: "CX", targets: [1,1] }] }, { shots: 0 }, { wireCuts: [0] }],
    "compact-optimization": [{ gates: [{ gate: "ECR", targets: [0,1] }] }, { gates: [{ gate: "RX", targets: [0] }] }, { gates: [{ gate: "H", targets: [0], angle: 1 }] }, { referenceMode: "certified" }],
    "openqarp-excited-states": [{ terms: [{pauli:"YY",coefficient:1}] }, { states: 3 }, { maxIterations: 0 }, { terms: [{pauli:"Y",coefficient:1},{pauli:"Y",coefficient:2}] }],
    "cqlib-kernel": [{ trainY: [0,0,0,0] }, { trainY: [0,1] }, { testX: [[1]] }, { encoder: "amplitude" }, { regularization: 0 }],
  };
  for (const c of CANDIDATE_TOOLS) {
    const { definition } = await import(`../.agents/skills/${c.id}/mcp/contracts.mjs`);
    assert.deepEqual(definition.normalize(c.tool, c.input).execution, {});
    for (const input of bad[c.id]) assert.throws(() => definition.normalize(c.tool, {...c.input,...input}), undefined, `${c.id}: ${JSON.stringify(input)}`);
    const input = definition.normalize(c.tool, {...c.input, execution: {timeoutMs: 0, threads: 8, maxOutputBytes: 10000000}});
    assert.equal(input.execution.timeoutMs, 0);
    assert.equal(input.execution.threads, 8);
    if (c.id === "compact-optimization") assert.equal(definition.normalize(c.tool, {...c.input, numQubits: 30, referenceMode: "skip"}).numQubits, 30);
  }
});
