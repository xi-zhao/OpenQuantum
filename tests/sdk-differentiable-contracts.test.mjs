import assert from "node:assert/strict";
import test from "node:test";
import { DIFFERENTIABLE_TOOLS } from "./fixtures/sdk-differentiable.mjs";
import { registerScienceProtocolTests } from "./helpers/science-protocol.mjs";

registerScienceProtocolTests(DIFFERENTIABLE_TOOLS, { cancellationId: "pennylane-differentiable" });

for (const descriptor of DIFFERENTIABLE_TOOLS) {
  const { definition } = await import(`../.agents/skills/${descriptor.id}/mcp/contracts.mjs`);
  test(`${descriptor.id}: rejects ambiguous parameters, nonfinite angles and unsupported execution paths`, () => {
    for (const override of [
      { numQubits: 0 }, { numQubits: 1.5 },
      { gates: [{ gate: "H", targets: [0, 1] }] },
      { gates: [{ gate: "H", targets: [2] }] },
      { gates: [{ gate: "CX", targets: [0, 0] }] },
      { gates: [{ gate: "CZ", targets: [0] }] },
      { gates: [{ gate: "SWAP", targets: [0, 1], angle: 1 }] },
      { gates: [{ gate: "RX", targets: [0] }] },
      { gates: [{ gate: "RY", targets: [0], angle: NaN }] },
      { gates: [{ gate: "RY", targets: [0], angle: Infinity }] },
      { gates: [{ gate: "QASM", targets: [0] }] },
      { trainableGateIndices: [1] }, { trainableGateIndices: [0, 0] },
      { trainableGateIndices: [-1] }, { trainableGateIndices: [7] },
      { observables: [] }, { observables: ["XYZ"] }, { observables: ["Z0"] },
      { code: "print(1)" }, { cloud: true }, { shots: 100 }, { backend: "qpu" },
    ]) assert.throws(() => definition.normalize(descriptor.tool, { ...descriptor.input, ...override }), undefined, JSON.stringify(override));
  });

  test(`${descriptor.id}: preserves parameter order and leaves computational scale to the caller`, () => {
    const normalized = definition.normalize(descriptor.tool, {});
    assert.deepEqual(normalized.trainableGateIndices, [0]);
    const wide = { numQubits: 40, gates: [{ gate: "RX", targets: [39], angle: 1 }, { gate: "RY", targets: [0], angle: 2 }], observables: ["I".repeat(39) + "Z"], trainableGateIndices: [1, 0] };
    assert.deepEqual(definition.normalize(descriptor.tool, wide).trainableGateIndices, [1, 0]);
    const empty = definition.normalize(descriptor.tool, { numQubits: 1, gates: [], observables: ["I"], trainableGateIndices: [] });
    assert.equal(empty.gates.length, 0);
    assert.equal(empty.trainableGateIndices.length, 0);
  });
}
