import path from "node:path";
import { pathToFileURL } from "node:url";
import { createUserMessage } from "@deepseek-ai/dsh-llm";

const { learningApplication, requireCourseId } = await import(
  pathToFileURL(path.join(process.cwd(), "src/learning/application.mjs")).href
);

export const inject = ["tools", "llm"];

/** SDK model requests use the route captured by the owning Harness step. */
export function createHarnessAiCall({ llm, agent, signal }) {
  const config = agent.session.events.findLast((event) => event.type === "request/header")?.data.header.config;
  if (!config?.provider || !config?.model) throw new TypeError("当前会话尚未记录可用的模型，请从建课入口重试");
  const model = {
    provider: config.provider, model: config.model,
    ...(config.reasoningEffort ? { reasoningEffort: config.reasoningEffort } : {}),
  };
  let calls = 0;
  return {
    model,
    async aiCall(system, user) {
      signal.throwIfAborted();
      if (++calls > 15) throw new TypeError("本次建课已达到模型请求上限");
      let result = "";
      let finished = false;
      try {
        for await (const chunk of llm.stream({
          ...model, system, sessionId: agent.id, signal, maxTokens: 8192,
          messages: [createUserMessage({ source: { kind: "user" }, content: [{ type: "text", text: user }] })],
        })) {
          signal.throwIfAborted();
          if (chunk.type === "text-delta") result += chunk.text;
          if (result.length > 160_000) throw new Error("output-limit");
          if (chunk.type === "finish") {
            if (chunk.reason?.kind !== "stop") throw new Error("model-did-not-complete");
            finished = true;
          }
        }
      } catch {
        signal.throwIfAborted();
        // Provider diagnostics can carry URLs/credentials; never put them in a
        // tool error, persisted course or client response.
        throw new TypeError("模型请求失败或输出被截断，请检查当前会话的模型设置后重试");
      }
      if (!finished || !result.trim()) throw new TypeError("模型未完整返回课程内容");
      return result;
    },
  };
}

export function classroomTool({ llm, application = learningApplication(process.cwd()) }) {
  const failedAttempts = new WeakMap();
  return {
    name: "generate_quantum_classroom",
    description: "Generate and save one requested Quantum Learning classroom using the OpenMAIC SDK and this Harness session's model. Requires a classroom UUID created in 量子学习通 and bound to this session. Sends the user-provided topic/material to the configured model provider and writes the completed classroom under .openquantum/learning. Up to 15 model calls, no web search, hardware, shell, package installation or external publishing. Errors leave the request available for an explicit retry; a completed request is idempotent.",
    parameters: {
      type: "object", properties: { courseId: { type: "string", description: "Existing classroom UUID from the user's creation request" } },
      required: ["courseId"], additionalProperties: false,
    },
    timeoutMs: 600_000,
    output: {
      schema: {
        type: "object", properties: {
          id: { type: "string" }, title: { type: "string" }, level: { type: "string" },
          createdAt: { type: "string" }, sessionId: { type: "string" }, hasClassroom: { type: "boolean" }, sceneCount: { type: "number" },
        },
        required: ["id", "title", "level", "createdAt", "sessionId", "hasClassroom", "sceneCount"], additionalProperties: false,
      },
      render(_args, value) {
        return [{ type: "text", text: `课堂《${value.title}》已保存，共 ${value.sceneCount} 页。请从侧栏“量子学习通”打开。内容为 AI 生成草稿，尚未完成教学与科学审阅。课堂编号：${value.id}` }];
      },
    },
    async execute(args, exec) {
      if (!args || Object.keys(args).some((key) => key !== "courseId")) throw new TypeError("只接受课堂编号");
      requireCourseId(args.courseId);
      if (!exec.agent) throw new TypeError("建课必须在 Harness 会话中执行");
      const turn = exec.agent.session.events.findLast((event) => event.type === "turn/start")?.data.turn;
      if (!Number.isInteger(turn)) throw new TypeError("建课必须在已开始的 Harness Turn 中执行");
      const attempt = `${turn}:${args.courseId}`;
      if (failedAttempts.get(exec.agent) === attempt) throw new TypeError("本轮建课已失败，请等待用户明确重试，不自动重复模型请求");
      const signal = AbortSignal.any([exec.signal, AbortSignal.timeout(600_000)]);
      const bridge = createHarnessAiCall({ llm, agent: exec.agent, signal });
      let result;
      try { result = await application.generate(args.courseId, { ...bridge, signal, sessionId: exec.agent.id }); }
      catch (error) { failedAttempts.set(exec.agent, attempt); throw error; }
      // No extra model turn is needed to paraphrase a saved classroom.
      exec.concludeTurn();
      return result;
    },
  };
}

export function apply(ctx) {
  ctx.tools.register(classroomTool({ llm: ctx.llm }));
}
