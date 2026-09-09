import assert from "node:assert/strict";
import test from "node:test";
import { createModelGateway, modelRequest, GATEWAY_MODEL } from "../src/learning/model-gateway.mjs";

const selection = { provider: "configured-provider", model: "configured-model", reasoningEffort: "high" };
const body = { model: GATEWAY_MODEL, messages: [{ role: "user", content: "Explain a qubit." }] };

test("the application model transport retains history, tools, inline images and the Harness selection", async () => {
  const calls = [];
  const request = await modelRequest({ ...body, messages: [
    { role: "system", content: "Teach quantum physics" },
    { role: "user", content: [{ type: "text", text: "Read this" }, { type: "image_url", image_url: { url: "data:image/png;base64,AQID" } }] },
    { role: "assistant", content: null, reasoning_content: "Check the material", tool_calls: [{ id: "call-1", type: "function", function: { name: "read_material", arguments: '{"id":"m1"}' } }] },
    { role: "tool", tool_call_id: "call-1", content: "Material contents" },
  ], tools: [{ type: "function", function: { name: "read_material", description: "Read", parameters: { type: "object" } } }], max_tokens: 10000 }, selection, { async saveImage(input) { calls.push(input); return { attachmentId: "image-ref" }; } });
  assert.equal(request.model, selection.model);
  assert.equal(request.reasoningEffort, "high");
  assert.equal(request.maxTokens, 10000);
  assert.equal(request.system, "Teach quantum physics");
  assert.equal(request.messages[0].content[1].attachment.attachmentId, "image-ref");
  assert.equal(calls[0].data.length, 3);
  assert.equal(request.messages[1].content[1].type, "tool-call");
  assert.equal(request.messages[2].content[0].toolCallId, "call-1");
  assert.equal(request.tools[0].name, "read_material");
  await assert.rejects(modelRequest({ ...body, model: "arbitrary-model" }, selection), /无效/);
  await assert.rejects(modelRequest({ ...body, messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: "http://127.0.0.1/private" } }] }] }, selection, { saveImage() { assert.fail(); } }), /内嵌图片/);
});

test("the private gateway supports streaming tool calls, JSON replies, credential isolation and provider errors", async () => {
  const requests = [], records = [];
  let failing = false;
  const gateway = await createModelGateway({ selection: () => selection, record: async (r) => records.push(r), llm: { async *stream(options) {
    requests.push(options);
    if (failing) { yield { type: "finish", reason: { kind: "error", failure: { message: "secret endpoint and credential" } } }; return; }
    yield { type: "text-delta", text: "A qubit" };
    yield { type: "tool-call-delta", index: 2, id: "call-1", name: "read_material", argumentsDelta: '{"id":' };
    yield { type: "tool-call-delta", index: 2, id: "call-1", argumentsDelta: '"m1"}' };
    yield { type: "usage", usage: { inputTokens: 3, cacheReadTokens: 2, outputTokens: 4 } };
    yield { type: "finish", reason: { kind: "tool-calls" } };
  } } });
  try {
    const post = (value, extra = {}) => fetch(`${gateway.url}/chat/completions`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${gateway.token}`, ...extra }, body: JSON.stringify(value) });
    assert.equal((await post(body, { authorization: "Bearer invalid" })).status, 403);
    assert.equal((await post(body, { origin: "http://localhost:3037" })).status, 403);
    assert.equal(requests.length, 0);
    const response = await (await post(body)).json();
    assert.equal(response.choices[0].message.tool_calls[0].function.arguments, '{"id":"m1"}');
    assert.equal(response.choices[0].finish_reason, "tool_calls");
    assert.deepEqual(response.usage, { prompt_tokens: 5, completion_tokens: 4, total_tokens: 9, prompt_tokens_details: { cached_tokens: 2 } });
    const stream = await (await post({ ...body, stream: true })).text();
    assert.match(stream, /chat.completion.chunk/);
    assert.match(stream, /\[DONE\]/);
    assert.match(stream, /read_material/);
    failing = true;
    const failed = await post(body);
    assert.equal(failed.status, 502);
    assert.doesNotMatch(await failed.text(), /secret endpoint|credential/);
    const failedStream = await (await post({ ...body, stream: true })).text();
    assert.match(failedStream, /model_request_failed/);
    assert.doesNotMatch(failedStream, /secret endpoint|credential/);
    assert.equal(records.filter((r) => r.finish === "error").length, 2);
    assert.equal(requests[0].provider, selection.provider);
    assert.doesNotMatch(JSON.stringify(records), /Explain a qubit/);
  } finally { gateway.dispose(); }
});

test("closing an upstream request cancels its actual Harness model stream", async () => {
  let aborted;
  const ended = new Promise((resolve) => { aborted = resolve; });
  const gateway = await createModelGateway({ selection: () => selection, llm: { async *stream({ signal }) {
    yield { type: "text-delta", text: "Starting" };
    await new Promise((resolve) => signal.addEventListener("abort", resolve, { once: true }));
    aborted(true);
  } } });
  try {
    const response = await fetch(`${gateway.url}/chat/completions`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${gateway.token}` }, body: JSON.stringify({ ...body, stream: true }) });
    await response.body.cancel();
    assert.equal(await Promise.race([ended, new Promise((resolve) => setTimeout(() => resolve(false), 1500))]), true);
  } finally { gateway.dispose(); }
});
