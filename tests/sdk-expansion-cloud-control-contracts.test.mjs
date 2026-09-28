import assert from "node:assert/strict";
import test from "node:test";
import { SDK_EXPANSION_CLOUD_CONTROL } from "./fixtures/sdk-expansion-cloud-control.mjs";
import { registerScienceProtocolTests } from "./helpers/science-protocol.mjs";

registerScienceProtocolTests(SDK_EXPANSION_CLOUD_CONTROL, { cancellationId: "qua-programs" });

test("cloud/control contracts reject credentials, executable code and invalid physical/structural inputs", async () => {
  for (const item of SDK_EXPANSION_CLOUD_CONTROL) {
    const { definition } = await import(`../.agents/skills/${item.id}/mcp/contracts.mjs`);
    for (const extra of [{ apiKey: "forbidden" }, { code: "print(1)" }, { endpoint: "https://example.invalid" }]) {
      assert.throws(() => definition.normalize(item.tool, { ...item.input, ...extra }));
    }
    assert.ok(definition.normalize(item.tool, item.input));
  }
  const { definition: qua } = await import("../.agents/skills/qua-programs/mcp/contracts.mjs");
  for (const p of [{ amplitudeVolts: 0.5, durationNs: 40 }, { amplitudeVolts: -0.6, durationNs: 40 }, { amplitudeVolts: 0.2, durationNs: 18 }]) {
    assert.throws(() => qua.normalize(qua.tool.name, { pulses: [{ ...p, waitAfterNs: 0 }] }));
  }
  for (const waitAfterNs of [4, 8, 12]) assert.throws(() => qua.normalize(qua.tool.name, { pulses: [{ amplitudeVolts: 0.2, durationNs: 40, waitAfterNs }] }), /at least 16 ns/);
  for (const waitAfterNs of [0, 16, 20]) assert.ok(qua.normalize(qua.tool.name, { pulses: [{ amplitudeVolts: 0.2, durationNs: 40, waitAfterNs }] }));
  const { definition: labone } = await import("../.agents/skills/laboneq-control/mcp/contracts.mjs");
  assert.throws(() => labone.normalize(labone.tool.name, { snippetLengthSeconds: 0 }));
  assert.throws(() => labone.normalize(labone.tool.name, { pulses: [{ shape: "constant", amplitude: 2, lengthSeconds: 1e-6 }] }));
  const { synthesisDefinition } = await import("../.agents/skills/classiq-synthesis/mcp/contracts.mjs");
  assert.equal(synthesisDefinition.tool.annotations.idempotentHint, false);
  assert.throws(() => synthesisDefinition.normalize(synthesisDefinition.tool.name, { requestTimeoutSeconds: 0 }));
  const { statusDefinition } = await import("../.agents/skills/qctrl-workbench/mcp/contracts.mjs");
  assert.throws(() => statusDefinition.normalize(statusDefinition.tool.name, { product: "fire-opal", jobId: "123/../cancel" }));
});
