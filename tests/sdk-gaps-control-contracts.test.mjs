import assert from "node:assert/strict";
import test from "node:test";
import { SDK_GAPS_CONTROL } from "./fixtures/sdk-gaps-control.mjs";
import { registerScienceProtocolTests } from "./helpers/science-protocol.mjs";

registerScienceProtocolTests(SDK_GAPS_CONTROL, { cancellationId: "guppy-programs" });

test("control SDKs reject code, credentials, destinations and invalid physical inputs", async () => {
  for (const item of SDK_GAPS_CONTROL) {
    const { definition } = await import(`../.agents/skills/${item.id}/mcp/contracts.mjs`);
    for (const extra of [{ code: "print(1)" }, { apiKey: "forbidden" }, { endpoint: "https://example.invalid" }, { hardware: true }]) {
      assert.throws(() => definition.normalize(item.tool, { ...item.input, ...extra }));
    }
    assert.ok(definition.normalize(item.tool, item.input));
    assert.ok(definition.normalize(item.tool, {}));
  }
  const { definition: qblox } = await import("../.agents/skills/qblox-scheduling/mcp/contracts.mjs");
  assert.throws(() => qblox.normalize(qblox.tool.name, { sampleRateHz: 0 }));
  assert.throws(() => qblox.normalize(qblox.tool.name, { pulses: [{ amplitude: 1, durationSeconds: 0 }] }));
  assert.ok(qblox.normalize(qblox.tool.name, { repetitions: 1000000 }));
  const { definition: qililab } = await import("../.agents/skills/qililab-control/mcp/contracts.mjs");
  for (const pulse of [{ iAmplitude: 1.1, durationNs: 4 }, { iAmplitude: 0.1, durationNs: 3 }, { iAmplitude: 0.1, durationNs: 4, waitAfterNs: 1 }]) {
    assert.throws(() => qililab.normalize(qililab.tool.name, { pulses: [pulse] }));
  }
  assert.ok(qililab.normalize(qililab.tool.name, { pulses: [{ iAmplitude: -1, qAmplitude: 1, durationNs: 4 }] }));
  const { definition: qat } = await import("../.agents/skills/oqc-qat/mcp/contracts.mjs");
  assert.throws(() => qat.normalize(qat.tool.name, { pulses: [{ amplitude: 1, durationNs: 0 }] }));
  assert.throws(() => qat.normalize(qat.tool.name, { pulses: [{ amplitude: 1, durationNs: 4, sigmaNs: 0 }] }));
});

test("Guppy schema enforces linear program structure and earlier classical dependencies", async () => {
  const { definition } = await import("../.agents/skills/guppy-programs/mcp/contracts.mjs");
  const normalize = input => definition.normalize(definition.tool.name, input);
  for (const operations of [
    [{ gate: "CX", targets: [0, 0] }], [{ gate: "H", targets: [2] }],
    [{ gate: "H", targets: [0], angleRadians: 1 }], [{ gate: "X", targets: [0], conditionMeasurement: 0 }],
    [{ gate: "MEASURE_RESET", targets: [0] }, { gate: "MEASURE_RESET", targets: [0], conditionMeasurement: 0 }],
    [{ gate: "__import__('os')", targets: [0] }],
  ]) assert.throws(() => normalize({ operations }));
  assert.ok(normalize({ numQubits: 10000, operations: [], shots: 1000000 }));
  assert.equal(normalize({ operations: [] }).operations.length, 0);
});
