import assert from "node:assert/strict";
import test from "node:test";
import { SDK_EXPANSION_CIRCUITS } from "./fixtures/sdk-expansion-circuits.mjs";
import { registerScienceProtocolTests } from "./helpers/science-protocol.mjs";

registerScienceProtocolTests(SDK_EXPANSION_CIRCUITS, { cancellationId: "qibo-simulation" });
for (const c of SDK_EXPANSION_CIRCUITS) {
  const { definition } = await import(`../.agents/skills/${c.id}/mcp/contracts.mjs`);
  const normalize = v => definition.normalize(c.tool, v);
  test(`${c.id}: strict inputs and caller-selected size`, () => {
    for (const extra of [{ token: "forbidden" }, { code: "arbitrary Python" }, { backend: "cloud" }, { path: "/tmp/data" }]) assert.throws(() => normalize({ ...c.input, ...extra }));
    if (c.id === "qrisp-arithmetic") {
      for (const input of [{ bitWidth: 0 }, { initialBits: "12" }, { bitWidth: 1, initialBits: "11" }, { preparation: "uniform", initialBits: "1" }]) assert.throws(() => normalize(input));
      assert.doesNotThrow(() => normalize({ bitWidth: 200, initialBits: "0", addendBits: "1" }));
    } else if (c.id === "lightworks-photonics") {
      for (const input of [{ inputOccupation: [-1, 1] }, { operations: [{ gate: "BS", modes: [0, 0], reflectivity: 0.5 }] }, { operations: [{ gate: "PS", modes: [0], reflectivity: 0.5 }] }, { operations: [{ gate: "BS", modes: [0, 1], reflectivity: 1.1 }] }, { operations: [{ gate: "PS", modes: [0], phaseRad: Infinity }] }]) assert.throws(() => normalize(input));
      assert.doesNotThrow(() => normalize({ inputOccupation: Array(100).fill(1), operations: [] }));
    } else {
      for (const input of [{ numQubits: 0 }, { gates: [{ gate: "CX", targets: [0, 0] }] }, { gates: [{ gate: "RX", targets: [0] }] }, { gates: [{ gate: "H", targets: [0], angle: 1 }] }, { gates: [{ gate: "RZ", targets: [0], angle: NaN }] }]) assert.throws(() => normalize(input));
      assert.doesNotThrow(() => normalize({ numQubits: 100, gates: [{ gate: "X", targets: [99] }], execution: { threads: 2 } }));
      if (c.id === "quairkit-information") {
        for (const ch of [{ channel: "depolarizing", target: 2, strength: 0.2 }, { channel: "amplitude_damping", target: 0, strength: -0.1 }, { channel: "depolarizing", target: 0, strength: 1.01 }, { channel: "unknown", target: 0, strength: 0.5 }]) assert.throws(() => normalize({ channels: [ch] }));
      }
    }
  });
}
