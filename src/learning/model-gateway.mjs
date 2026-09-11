import { createServer } from "node:http";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createUserMessage, createAssistantMessage, createToolResultMessage } from "@deepseek-ai/dsh-llm";

export const GATEWAY_MODEL = "harness-default";
const MAX_BYTES = 32 * 1024 * 1024;
class RequestError extends TypeError {}
const json = (res, status, value) => { res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(value)); };
const failure = (message, code = "model_request_failed") => ({ error: { message, type: "api_error", code } });

/** Translate the upstream application protocol, without owning an agent loop. */
export async function modelRequest(body, selection, attachments) {
  if (body?.model !== GATEWAY_MODEL || !Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 2000) throw new RequestError("无效的课堂模型请求。");
  async function content(value) {
    if (value == null) return [];
    if (typeof value === "string") return [{ type: "text", text: value }];
    if (!Array.isArray(value)) throw new RequestError("无效的消息内容。");
    const blocks = [];
    for (const part of value) {
      if (part.type === "text" && typeof part.text === "string") blocks.push({ type: "text", text: part.text });
      else if (part.type === "image_url" && attachments) {
        const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/.exec(part.image_url?.url || "");
        // OpenMAIC material extraction sends inline images. Never fetch arbitrary
        // caller-controlled URLs from this credentialed gateway.
        if (!match) throw new RequestError("图片需由课堂材料处理为内嵌图片后发送。");
        blocks.push({ type: "image", attachment: await attachments.saveImage({ mediaType: match[1], data: Buffer.from(match[2], "base64") }) });
      } else throw new RequestError("当前消息类型无法由已配置模型处理。");
    }
    return blocks;
  }
  const messages = [], system = [];
  for (const item of body.messages) {
    const blocks = await content(item.content);
    if (["system", "developer"].includes(item.role)) {
      if (blocks.some((part) => part.type !== "text")) throw new RequestError("系统消息只接受文本。");
      system.push(blocks.map((part) => part.text).join("\n"));
    } else if (item.role === "user") messages.push(createUserMessage({ source: { kind: "user" }, content: blocks }));
    else if (item.role === "tool") {
      if (typeof item.tool_call_id !== "string" || !item.tool_call_id) throw new RequestError("工具结果缺少调用编号。");
      messages.push(createToolResultMessage({ callId: item.tool_call_id, content: blocks, isError: false }));
    } else if (item.role === "assistant") {
      if (typeof item.reasoning_content === "string") blocks.unshift({ type: "reasoning", text: item.reasoning_content });
      for (const call of item.tool_calls || []) {
        if (call.type !== "function" || typeof call.id !== "string" || typeof call.function?.name !== "string" || typeof call.function?.arguments !== "string") throw new RequestError("无效的工具调用历史。");
        blocks.push({ type: "tool-call", id: call.id, name: call.function.name, arguments: call.function.arguments });
      }
      messages.push(createAssistantMessage({ source: { provider: selection.provider, model: selection.model }, content: blocks }));
    } else throw new RequestError("未知的消息角色。");
  }
  const tools = body.tools?.map((tool) => {
    if (tool.type !== "function" || typeof tool.function?.name !== "string" || !tool.function?.parameters) throw new RequestError("无效的工具定义。");
    return { name: tool.function.name, description: tool.function.description || "", parameters: tool.function.parameters };
  });
  const maxTokens = body.max_completion_tokens ?? body.max_tokens;
  if (maxTokens !== undefined && (!Number.isInteger(maxTokens) || maxTokens < 1)) throw new RequestError("无效的模型输出限制。");
  if (body.n !== undefined && body.n !== 1) throw new RequestError("每次课堂请求只生成一个回答。");
  if (body.response_format?.type === "json_object") system.push("Return a valid JSON object only.");
  else if (body.response_format?.type === "json_schema") system.push(`Return JSON matching this schema: ${JSON.stringify(body.response_format.json_schema?.schema)}`);
  return { ...selection, messages, system: system.join("\n\n"), ...(tools?.length ? { tools } : {}), ...(maxTokens ? { maxTokens } : {}), ...(typeof body.temperature === "number" ? { temperature: body.temperature } : {}), ...(body.stop ? { stop: Array.isArray(body.stop) ? body.stop : [body.stop] } : {}) };
}

/** Private loopback transport: only the owned OpenMAIC server has this token.
 * Model routing and credentials remain owned by the injected Harness service.
 * OpenMAIC retains its own classroom workflow, tool execution and durable jobs.
 */
export async function createModelGateway({ llm, selection, attachments, record = async () => {} }) {
  const token = randomBytes(32).toString("hex");
  const controllers = new Set();
  const server = createServer(async (req, res) => {
    const expected = Buffer.from(`Bearer ${token}`), actual = Buffer.from(req.headers.authorization || "");
    if (req.headers.origin || !["127.0.0.1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress) || actual.length !== expected.length || !timingSafeEqual(actual, expected)) { json(res, 403, failure("Forbidden", "forbidden")); return; }
    if (req.url === "/v1/models" && req.method === "GET") { json(res, 200, { object: "list", data: [{ id: GATEWAY_MODEL, object: "model", owned_by: "OpenQuantum" }] }); return; }
    if (req.url !== "/v1/chat/completions" || req.method !== "POST") { json(res, 404, failure("Unknown model endpoint", "not_found")); return; }
    if (controllers.size >= 6) { json(res, 429, failure("课堂模型请求正在排队，请稍后重试。", "busy")); return; }
    const controller = new AbortController(); controllers.add(controller);
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(600_000)]);
    const abort = () => { if (!res.writableEnded) controller.abort(); };
    res.once("close", abort);
    const id = `chatcmpl-${randomUUID()}`, started = Date.now();
    let route, usage, failureCode, finish = "error";
    try {
      let bytes = 0; const chunks = [];
      for await (const chunk of req) { bytes += chunk.length; if (bytes > MAX_BYTES) throw new RequestError("课堂模型请求超过 32 MB。"); chunks.push(chunk); }
      route = selection();
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const options = await modelRequest(body, route, attachments);
      const streamed = body.stream === true;
      const created = Math.floor(started / 1000);
      const write = (delta, reason = null, extra = {}) => {
        if (streamed && !res.destroyed) res.write(`data: ${JSON.stringify({ id, object: "chat.completion.chunk", created, model: GATEWAY_MODEL, choices: [{ index: 0, delta, finish_reason: reason }], ...extra })}\n\n`);
      };
      if (streamed) { res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", "x-accel-buffering": "no" }); write({ role: "assistant" }); }
      let text = "", reasoning = ""; const calls = new Map();
      for await (const chunk of llm.stream({ ...options, signal })) {
        signal.throwIfAborted();
        if (chunk.type === "text-delta") { text += chunk.text; write({ content: chunk.text }); }
        else if (chunk.type === "reasoning-delta") { reasoning += chunk.text; write({ reasoning_content: chunk.text }); }
        else if (chunk.type === "tool-call-delta") {
          let call = calls.get(chunk.index);
          const first = !call;
          if (!call) { call = { index: calls.size, id: chunk.id, type: "function", function: { name: "", arguments: "" } }; calls.set(chunk.index, call); }
          if (chunk.name) call.function.name = chunk.name;
          call.function.arguments += chunk.argumentsDelta || "";
          write({ tool_calls: [{ index: call.index, ...(first ? { id: call.id, type: "function" } : {}), function: { ...(chunk.name ? { name: chunk.name } : {}), arguments: chunk.argumentsDelta || "" } }] });
        } else if (chunk.type === "usage") {
          const u = chunk.usage; const input = u.inputTokens + (u.cacheReadTokens || 0) + (u.cacheWriteTokens || 0);
          usage = { prompt_tokens: input, completion_tokens: u.outputTokens, total_tokens: input + u.outputTokens, ...(u.cacheReadTokens ? { prompt_tokens_details: { cached_tokens: u.cacheReadTokens } } : {}) };
        } else if (chunk.type === "finish") {
          if (!["stop", "tool-calls", "max-tokens"].includes(chunk.reason.kind)) {
            const code = chunk.reason.failure?.code;
            if (["TIMEOUT", "ABORTED", "NETWORK_ERROR", "AUTHENTICATION_ERROR", "RATE_LIMIT", "MODEL_UNAVAILABLE", "UNSUPPORTED_INPUT_MODALITY"].includes(code)) failureCode = code;
            throw new Error("provider-failure");
          }
          finish = ({ stop: "stop", "tool-calls": "tool_calls", "max-tokens": "length" })[chunk.reason.kind];
        }
      }
      if (finish === "error") throw new Error("incomplete-model-response");
      if (streamed) { write({}, finish, usage ? { usage } : {}); res.end("data: [DONE]\n\n"); }
      else json(res, 200, { id, object: "chat.completion", created, model: GATEWAY_MODEL, choices: [{ index: 0, message: { role: "assistant", content: text || null, ...(reasoning ? { reasoning_content: reasoning } : {}), ...(calls.size ? { tool_calls: [...calls.values()].map(({ index: _index, ...call }) => call) } : {}) }, finish_reason: finish }], ...(usage ? { usage } : {}) });
    } catch (error) {
      finish = signal.aborted ? "cancelled" : "error";
      const invalid = error instanceof RequestError || error instanceof SyntaxError;
      const message = error instanceof RequestError ? error.message : error instanceof SyntaxError ? "无效的模型请求正文。" : failureCode === "TIMEOUT" ? "OpenQuantum 当前模型连接超时，请检查模型设置后重试。" : "OpenQuantum 当前模型连接未完成，请检查模型设置后重试。";
      const value = failure(message);
      if (!res.headersSent) json(res, invalid ? 400 : 502, value);
      else if (!res.destroyed) res.end(`data: ${JSON.stringify(value)}\n\ndata: [DONE]\n\n`);
    } finally {
      controllers.delete(controller); res.removeListener("close", abort);
      // Metadata only: no prompts, material, provider URL, credentials or raw errors.
      await record({ id, at: new Date(started).toISOString(), provider: route?.provider, model: route?.model, finish, failureCode, durationMs: Date.now() - started, usage }).catch(() => {});
    }
  });
  server.requestTimeout = 600_000;
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return { url: `http://127.0.0.1:${server.address().port}/v1`, token, dispose() { for (const controller of controllers) controller.abort(); server.close(); server.closeAllConnections(); } };
}
