import assert from "node:assert/strict";
import test from "node:test";
import { SDK_GAPS_SIMULATION } from "./fixtures/sdk-gaps-simulation.mjs";
import { registerScienceProtocolTests } from "./helpers/science-protocol.mjs";

registerScienceProtocolTests(SDK_GAPS_SIMULATION, { cancellationId: "mimiq-simulation" });
for (const c of SDK_GAPS_SIMULATION) {
  const { definition } = await import(`../.agents/skills/${c.id}/mcp/contracts.mjs`);
  const normalize = input => definition.normalize(c.tool, input);
  test(`${c.id}: reject invalid physics, arbitrary execution and credentials`, () => {
    for (const input of [{ code: "import os" }, { token: "forbidden" }, { path: "/tmp/out" }, { url: "https://example.com" }, { execution: { threads: 0 } }]) assert.throws(() => normalize(input));
    assert.doesNotThrow(() => normalize(c.input));
    assert.doesNotThrow(() => normalize({}));
    if (["mimiq-simulation", "myqlm-simulation"].includes(c.id)) {
      for (const input of [{ numQubits: 0 }, { gates: [] }, { gates: [{ gate: "CX", targets: [0, 0] }] }, { gates: [{ gate: "RY", targets: [0], angle: NaN }] }, { gates: [{ gate: "H", targets: [0], angle: 1 }] }]) assert.throws(() => normalize(input));
      assert.doesNotThrow(() => normalize({ numQubits: 200 }));
    }
    if (c.id === "mimiq-simulation") {
      for (const input of [{ shots: -1 }, { seed: -1 }, { seed: 0.5 }]) assert.throws(() => normalize(input));
      assert.doesNotThrow(() => normalize({ shots: 100000000 }));
    }
    if (c.id === "mrmustard-optics") {
      for (const input of [{ cutoff: 0 }, { numModes: 0 }, { operations: [{ operation: "D", modes: [0], x: 1 }] }, { operations: [{ operation: "R", modes: [0], theta: 1, r: 0 }] }, { operations: [{ operation: "LOSS", modes: [0], transmissivity: 1.1 }] }, { operations: [{ operation: "BS", modes: [0, 0], theta: 1, phi: 0 }] }, { operations: [{ operation: "D", modes: [1], x: 0, y: 1 }] }]) assert.throws(() => normalize(input));
      assert.doesNotThrow(() => normalize({ numModes: 100, cutoff: 1000, operations: [] }));
    }
    if (c.id === "merlin-learning") {
      for (const input of [{ phases: [[1, 2]] }, { phases: [[NaN]] }, { occupation: [1] }, { occupation: [0, 0], targetOccupation: [0, 0] }, { targetOccupation: [2, 0] }, { operations: [{ operation: "BS", modes: [0, 1], theta: 1 }] }, { operations: [{ operation: "PS", modes: [0], theta: 1 }] }, { operations: [{ operation: "PS", modes: [2] }] }]) assert.throws(() => normalize(input));
      assert.doesNotThrow(() => normalize({ numModes: 100, occupation: [1, ...Array(99).fill(0)], targetOccupation: [1, ...Array(99).fill(0)], phases: [[0]], operations: [{ operation: "PS", modes: [0] }] }));
    }
  });
}
