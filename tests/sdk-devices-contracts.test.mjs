import assert from "node:assert/strict";
import test from "node:test";
import { SDK_DEVICE_TOOLS } from "./fixtures/sdk-devices.mjs";
import { registerScienceProtocolTests } from "./helpers/science-protocol.mjs";

registerScienceProtocolTests(SDK_DEVICE_TOOLS, { cancellationId: "perceval-photonics" });

const invalid = {
  "perceval-photonics": [
    { inputOccupation: [] }, { inputOccupation: [-1, 0] }, { inputOccupation: [1.5, 0] },
    { operations: [{ gate: "BS", modes: [0], angleRad: 1 }] },
    { operations: [{ gate: "BS", modes: [0, 0], angleRad: 1 }] },
    { operations: [{ gate: "PS", modes: [2], angleRad: 1 }] },
    { operations: [{ gate: "PS", modes: [0], angleRad: Infinity }] },
  ],
  "iqm-circuit-workbench": [
    { backend: "remote" }, { simulationMode: "cloud" }, { seed: 4294967296 }, { shots: 0 },
    { operations: [{ gate: "cx", qubits: [0], angleRad: 0 }] },
    { operations: [{ gate: "x", qubits: [0], angleRad: 1 }] },
    { operations: [{ gate: "rx", qubits: [0], angleRad: NaN }] },
  ],
  "alicebob-cat-circuits": [
    { initialStates: ["0"] }, { modelParameters: { distance: 3 } },
    { model: "logical", modelParameters: { distance: 4 } },
    { model: "logical-noiseless", modelParameters: { kappa1Hz: 100 } },
    { modelParameters: { kappa1Hz: 10, kappa2Hz: 1 } },
    { operations: [{ gate: "h", qubits: [0], angleRad: 0 }] },
    { operations: [{ gate: "cry", qubits: [0, 1], angleRad: 0 }] },
    { model: "logical", operations: [{ gate: "rz", qubits: [0], angleRad: 0.2 }] },
  ],
  "pulser-dynamics": [
    { atomPositionsUm: [[0, 0], [0, 0]] }, { atomPositionsUm: [[Infinity, 0]] },
    { pulses: [{ durationNs: 1, amplitudeRadPerUs: [0, 1], detuningRadPerUs: [0, 0], phaseRad: 0 }] },
    { pulses: [{ durationNs: 4.1, amplitudeRadPerUs: [0, 1], detuningRadPerUs: [0, 0], phaseRad: 0 }] },
    { atol: 0 }, { solverMaxStepNs: 0 }, { maxSolverSteps: 0 },
  ],
  "qoolqit-workbench": [
    { atomPositions: [[0, 0], [0, 0]] }, { durations: [0] }, { durations: [Infinity] },
    { rabiAmplitude: [1, 2] }, { energyScaleRadPerUs: 0 }, { detuning: [0, 0] }, { phaseRad: [0] },
  ],
};

for (const fixture of SDK_DEVICE_TOOLS) {
  const { definition } = await import(`../.agents/skills/${fixture.id}/mcp/contracts.mjs`);
  test(`${fixture.id}: defaults, unsupported actions and physical/structural failures`, () => {
    assert.ok(definition.normalize(fixture.tool, {}));
    for (const value of [...invalid[fixture.id], { code: "print(1)" }, { file: "private.json" }, { cloud: true }, { credential: "x" }, { execution: { threads: 0 } }]) {
      assert.throws(() => definition.normalize(fixture.tool, value), undefined, JSON.stringify(value));
    }
  });
}

test("SDK device problem sizes remain caller controlled", async () => {
  for (const [id, value] of [
    ["perceval-photonics", { inputOccupation: Array(64).fill(3), operations: [] }],
    ["iqm-circuit-workbench", { numQubits: 500, shots: 1000000, operations: [] }],
    ["alicebob-cat-circuits", { numQubits: 500, initialStates: Array(500).fill("0"), operations: [] }],
    ["pulser-dynamics", { atomPositionsUm: Array.from({ length: 100 }, (_, i) => [i, 0]), timeSteps: 100000 }],
    ["qoolqit-workbench", { atomPositions: Array.from({ length: 100 }, (_, i) => [i, 0]), timeSteps: 100000 }],
  ]) {
    const { definition } = await import(`../.agents/skills/${id}/mcp/contracts.mjs`);
    assert.ok(definition.normalize(definition.tool.name, value));
  }
});
