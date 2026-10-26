import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const tool = "solve_and_validate_ground_state";

test("the real quantum probe reads the current scientific surface but cites the original result event", { timeout: 90000 }, async t => {
  const request = JSON.parse(await readFile(new URL("../.agents/skills/quantum-ground-state/evals/fixtures/requests/protocol-fixture.json", import.meta.url), "utf8"));
  let scientificReply = false;
  const server = createServer(async (incoming, response) => {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks));
    const agent = body.tools?.some(item => item.function?.name === tool);
    const result = body.messages.findLast(message => message.role === "tool" && message.tool_call_id === "probe-native-call");
    if (agent && result) scientificReply = String(result.content).includes('"acceptanceStatus":"passed"');
    const delta = agent && !result
      ? { role: "assistant", tool_calls: [{ index: 0, id: "probe-native-call", type: "function", function: { name: tool, arguments: JSON.stringify({ request }) } }] }
      : { role: "assistant", content: "OPENQUANTUM_QGS_E2E_OK" };
    response.writeHead(200, { "content-type": "text/event-stream" });
    for (const choice of [{ delta, finish_reason: null }, { delta: {}, finish_reason: delta.tool_calls ? "tool_calls" : "stop" }]) {
      response.write(`data: ${JSON.stringify({ id: "local-probe", object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, ...choice }] })}\n\n`);
    }
    response.end("data: [DONE]\n\n");
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const { stdout } = await run(process.execPath, [path.resolve("scripts/probe-quantum-harness-e2e.mjs"), "--timeout-ms", "45000"], {
    cwd: process.cwd(), timeout: 75000, maxBuffer: 1024 * 1024,
    env: { ...process.env, OPENQUANTUM_PUBLIC_API_KEY: "local-probe-fixture-only", OPENQUANTUM_PUBLIC_BASE_URL: `http://127.0.0.1:${server.address().port}/v1`, OPENQUANTUM_PRIVATE_API_KEY: "", OPENQUANTUM_PRIVATE_BASE_URL: "" },
  });
  const report = JSON.parse(stdout);
  assert.equal(report.status, "passed");
  assert.equal(report.evidence.acceptanceStatus, "passed");
  assert.equal(report.evidence.resultCommitValidated, true);
  assert.equal(report.evidence.completionMarkerObserved, true);
  assert.equal(scientificReply, true, "the next model request must see the replaced scientific result");
  assert.ok(report.evidence.toolResultSeq > report.evidence.toolCallSeq);
});
