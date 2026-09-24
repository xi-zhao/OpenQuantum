import assert from "node:assert/strict";
import test from "node:test";
import { UNITARY_TOOLS } from "./fixtures/unitary-tools.mjs";
import { registerScienceProtocolTests } from "./helpers/science-protocol.mjs";

registerScienceProtocolTests(UNITARY_TOOLS, { cancellationId: "clifft-sampling" });

test("Unitary tool scope rejects arbitrary code and inconsistent physics/resource inputs", async () => {
  const bad = {
    "dynamiqs-dynamics": [{ drives: [] }, { drives: [Infinity] }, { dampingRate: -0.1 }, { initialState: "thermal" }, { steps: 1 }],
    "clifft-sampling": [{ gates: [{ gate: "LOSS", targets: [0] }] }, { numQubits: 1 }, { gates: [{ gate: "CX", targets: [0, 0] }] }, { gates: [{ gate: "H", targets: [0, 1] }] }, { gates: [{ gate: "T", targets: [5] }] }, { shots: 0 }],
    "oqupy-dynamics": [{ steps: 8, memorySteps: 12 }, { temperature: -1 }, { alpha: -1 }, { bathFile: "/tmp/bath" }],
    "deltakit-qec": [{ width: 4 }, { shots: 0 }, { basis: "Y" }, { cloud: true }, { noiseProbability: 1.1 }],
  };
  for (const { id, tool } of UNITARY_TOOLS) {
    const { definition } = await import(`../.agents/skills/${id}/mcp/contracts.mjs`);
    for (const input of bad[id]) assert.throws(() => definition.normalize(tool, input), undefined, `${id}: ${JSON.stringify(input)}`);
  }
});
