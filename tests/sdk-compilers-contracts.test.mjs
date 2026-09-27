import assert from "node:assert/strict";
import test from "node:test";
import { SDK_COMPILER_TOOLS } from "./fixtures/sdk-compilers.mjs";
import { registerScienceProtocolTests } from "./helpers/science-protocol.mjs";

registerScienceProtocolTests(SDK_COMPILER_TOOLS, { cancellationId: "pytket-compilation" });

for (const capability of SDK_COMPILER_TOOLS) {
  const { definition } = await import(`../.agents/skills/${capability.id}/mcp/contracts.mjs`);
  const normalize = value => definition.normalize(capability.tool, value);
  test(`${capability.id}: rejects nonfinite, malformed and remote inputs`, () => {
    const circuits = capability.id.includes("compilation") || capability.id.includes("simulation");
    const invalid = circuits ? [
      { numQubits: 0 }, { numQubits: 1, gates: [{ gate: "CX", targets: [0, 0] }] },
      { gates: [{ gate: "H", targets: [2] }] }, { gates: [{ gate: "RX", targets: [0] }] },
      { gates: [{ gate: "H", targets: [0], angle: 1 }] }, { gates: [{ gate: "RX", targets: [0], angle: Infinity }] },
      { gates: [{ gate: "MEASURE", targets: [0] }] }, { gates: [] },
    ] : [
      { linear: [NaN] }, { linear: [] }, { quadratic: [{ i: 0, j: 0, bias: 1 }] },
      { quadratic: [{ i: 0, j: 3, bias: 1 }] }, { quadratic: [{ i: 0, j: 1, bias: 1 }, { i: 1, j: 0, bias: 2 }] },
    ];
    for (const input of [...invalid, { backend: "cloud" }, { token: "forbidden" }, { code: "arbitrary Python" }]) assert.throws(() => normalize(input));
    if (capability.id === "kaiwu-qubo") {
      for (const input of [{ assignments: [[0]] }, { assignments: [[0, -1]] }, { constraints: [{ coefficients: [1], rhs: 0, penalty: 1 }] }, { constraints: [{ coefficients: [1, 1], rhs: 0, penalty: 0 }] }]) assert.throws(() => normalize(input));
    }
  });
  test(`${capability.id}: leaves model size and execution policy to caller`, () => {
    const input = capability.id.includes("compilation") || capability.id.includes("simulation")
      ? { numQubits: 100, gates: [{ gate: "X", targets: [99] }] }
      : { linear: Array.from({ length: 200 }, () => 0), quadratic: [] };
    assert.doesNotThrow(() => normalize({ ...input, execution: { threads: 3 } }));
  });
}
