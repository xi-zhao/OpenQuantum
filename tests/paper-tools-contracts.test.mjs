import assert from "node:assert/strict";
import test from "node:test";
import { PAPER_TOOLS } from "./fixtures/paper-tools.mjs";
import { registerScienceProtocolTests } from "./helpers/science-protocol.mjs";

registerScienceProtocolTests(PAPER_TOOLS, { cancellationId: "ldpc-decoding" });

test("paper tool resource and cross-field boundaries reject unsupported requests", async () => {
  const bad = {
    "sqd-chemistry": [{ bondLengthAngstrom: 0.1 }, { counts: { "01010": 2 } }, { counts: { "0101": -1 } }],
    "tjm-dynamics": [{ numQubits: 1 }, { trajectories: 0, steps: 80 }],
    "ldpc-decoding": [{ parityCheck: [[1],[1,0]], syndromes: [[1,0]] }, { parityCheck: [[1,0]], syndromes: [[1,0]] }, { parityCheck: [[0]], syndromes: [[1]] }, { parityCheck: [[1,0],[1,0]], syndromes: [[1,0]] }],
    "flow-vqe": [{ numQubits: 3, terms: [{ pauli: "XX", coefficient: 1 }] }, { terms: [{ pauli: "XX", coefficient: 1 }, { pauli: "XX", coefficient: 2 }] }, { terms: [{ pauli: "ZZ", coefficient: 1 }], epochs: 0, batchSize: 64 }],
    "tenpy-ground-state": [{ numSites: 2 }, { numSites: 3.5 }],
    "randomized-measurements": [{ numQubits: 2, subsystem: [2] }, { subsystem: [0,0] }, { settings: 0, shotsPerSetting: 256 }],
  };
  for (const { id, tool } of PAPER_TOOLS) {
    const { definition } = await import(`../.agents/skills/${id}/mcp/contracts.mjs`);
    for (const input of bad[id]) assert.throws(() => definition.normalize(tool, input), undefined, `${id}: ${JSON.stringify(input)}`);
  }
});
