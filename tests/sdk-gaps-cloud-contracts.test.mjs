import assert from "node:assert/strict";
import test from "node:test";
import { SDK_GAPS_CLOUD, SDK_GAPS_CLOUD_AUTH } from "./fixtures/sdk-gaps-cloud.mjs";
import { registerScienceProtocolTests } from "./helpers/science-protocol.mjs";
registerScienceProtocolTests(SDK_GAPS_CLOUD, { cancellationId: "aqt-workbench" });
test("Cloud SDK inputs never accept credentials, code or arbitrary URLs; writes declare maximum effect", async () => {
  for (const c of [...SDK_GAPS_CLOUD, ...SDK_GAPS_CLOUD_AUTH]) {
    const { definition, definitions } = await import(`../.agents/skills/${c.id}/mcp/contracts.mjs`);
    const d = (definitions ?? [definition]).find(d => d.tool.name === c.tool);
    for (const input of [{ token: "secret" }, { url: "https://example.com" }, { code: "import os" }, { requestTimeoutSeconds: -1 }, { execution: { threads: 0 } }]) assert.throws(() => d.normalize(c.tool, { ...c.input, ...input }));
    assert.doesNotThrow(() => d.normalize(c.tool, c.input));
    if (c.tool === "submit_oqc_task") assert.equal(d.tool.annotations.idempotentHint, false);
  }
  const { queryDefinition } = await import("../.agents/skills/oqc-cloud/mcp/contracts.mjs");
  for (const input of [{ action: "task_status" }, { action: "devices", taskId: "../secret" }, { action: "task_status", taskId: "x", qpuId: "../a" }]) assert.throws(() => queryDefinition.normalize(queryDefinition.tool.name, input));
  const { definition } = await import("../.agents/skills/quantuminspire-cloud/mcp/contracts.mjs");
  for (const input of [{ action: "job_status" }, { pageSize: 101 }, { jobId: 2 }]) assert.throws(() => definition.normalize(definition.tool.name, input));
});
