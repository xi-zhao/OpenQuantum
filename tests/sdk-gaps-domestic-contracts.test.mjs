import assert from "node:assert/strict";
import test from "node:test";
import { SDK_GAPS_DOMESTIC } from "./fixtures/sdk-gaps-domestic.mjs";
import { registerScienceProtocolTests } from "./helpers/science-protocol.mjs";

registerScienceProtocolTests(SDK_GAPS_DOMESTIC, { cancellationId: "simqn-network" });
for (const capability of SDK_GAPS_DOMESTIC) {
  const { definition } = await import(`../.agents/skills/${capability.id}/mcp/contracts.mjs`);
  const normalize = input => definition.normalize(capability.tool, input);
  test(`${capability.id}: rejects malformed scientific inputs and accepts caller-selected sizes`, () => {
    assert.doesNotThrow(() => normalize(capability.input));
    for (const input of [{ code: "import os" }, { apiKey: "secret" }, { token: "secret" }, { url: "https://example.com" }, { path: "/tmp/a" }, { execution: { threads: 0 } }]) assert.throws(() => normalize(input));
    if (capability.id === "simqn-network") {
      for (const input of [{ attempts: 0 }, { delaySeconds: -1 }, { intervalSeconds: NaN }, { dropProbability: 1.1 }, { initialFidelity: -1 }, { seed: 4294967296 }, { timeSlotsPerSecond: 0 }, { lengthMeters: Number.MAX_VALUE, decoherencePerMeter: 2 }]) assert.throws(() => normalize(input));
      assert.doesNotThrow(() => normalize({ attempts: 10000000, intervalSeconds: 0 }));
    }
    if (capability.id === "qcover-optimization") {
      for (const input of [{ fields: [] }, { gammas: [] }, { gammas: [0, 1] }, { edges: [{ source: 0, target: 0, coupling: 1 }] }, { edges: [{ source: 0, target: 2, coupling: 1 }] }, { edges: [{ source: 0, target: 1, coupling: 1 }, { source: 1, target: 0, coupling: 2 }] }, { betas: [Infinity] }]) assert.throws(() => normalize(input));
      assert.doesNotThrow(() => normalize({ fields: Array(1000).fill(0), edges: [] }));
    }
    if (capability.id === "vqnet-learning") {
      for (const input of [{ numQubits: 0 }, { gates: [] }, { gates: [{ gate: "CX", targets: [0, 0] }] }, { gates: [{ gate: "RY", targets: [0], angle: NaN }] }, { terms: [{ pauli: "Z", coefficient: 1 }] }]) assert.throws(() => normalize(input));
      assert.doesNotThrow(() => normalize({ numQubits: 1000, terms: [{ pauli: "I".repeat(1000), coefficient: 1 }] }));
    }
    if (capability.id === "pychemiq-chemistry") {
      for (const input of [{ numModes: 0 }, { terms: [] }, { terms: [{ operators: [{ mode: 2, action: "create" }] }] }, { terms: [{ operators: [{ mode: 0, action: "code" }] }] }, { terms: [{ operators: [], coefficient: { real: NaN } }] }]) assert.throws(() => normalize(input));
      assert.doesNotThrow(() => normalize({ numModes: 100000 }));
    }
  });
}
