import { Context } from "@deepseek-ai/cordis";
import { LocalFileSystem } from "@deepseek-ai/dsh-fs-local";
import { createToolResultMessage } from "@deepseek-ai/dsh-llm";
import { SessionStore } from "@deepseek-ai/dsh-session";
import { apply, parseScientificToolResult } from "../../runtime/openquantum/agent-presets/openquantum/scientific-result-projection.mjs";

// Real native append/surface semantics, with explicit tool lifecycle boundaries.
// Numerical fixtures belong to each capability's tests, not this Host fixture.
export function scientificProjectionFixture({ workspaceRoot, sessionId = "scientific-fixture", fileSystem }) {
  const context = new Context();
  const store = new SessionStore(context);
  const hooks = new Map(), warnings = [];
  const ctx = {
    fs: fileSystem ?? new LocalFileSystem(new Context(), { cwd: workspaceRoot, diffBasisMaxBytes: 1048576 }),
    sandboxPolicy: { resolve: () => ({ mode: "workspace-write", workspaceRoot }) },
    logger: { warn: message => warnings.push(message) },
    on(name, callback) { hooks.set(name, callback); },
  };
  apply(ctx);
  for (const event of ["session/event", "session/disposed"]) context.on(event, (...args) => hooks.get(event)?.(...args));
  const session = store.create(sessionId, { meta: { cwd: workspaceRoot } });
  const agent = { session };
  async function drain(hook = "agent/pre-step") {
    return hooks.get(hook)({ agent }, async () => ({ kind: "enter", messages: [] }));
  }
  return {
    ctx, session, warnings, drain,
    async execute({ tool, request, value, callId = "scientific-call", seq = session.seq,
      recorded = request, signal = new AbortController().signal, downstream = { kind: "accept" },
      finalize = result => result, beforeResult, afterResult, resultOptions, drainHook } = {}) {
      while (session.seq < seq) session.append("command/run", { command: "fixture-gap" });
      const callEvent = session.append("tool/call", { turn: 1, step: 1, callId, name: tool, arguments: JSON.stringify(recorded) });
      const exec = { name: tool, callId, arguments: request, agent, signal };
      const decision = await hooks.get("tools/post-execute")(exec,
        { value, content: value.content, isError: false }, async () => downstream);
      const finalResult = finalize({
        value: Object.hasOwn(decision, "value") ? decision.value : value,
        content: decision.content ?? value.content, isError: decision.kind !== "accept",
      });
      hooks.get("tools/result")(exec, finalResult);
      await beforeResult?.({ session, callEvent, exec, finalResult, decision });
      const resultEvent = session.append("tool/result", {
        turn: 1, step: 1, message: createToolResultMessage({ callId, content: finalResult.content, isError: finalResult.isError }),
      }, resultOptions ?? { surfaceOp: "append", sourceEventSeqs: [callEvent.seq] });
      await afterResult?.({ session, callEvent, resultEvent, exec });
      await drain(drainHook);
      const projectedEvent = session.events.findLast(event => event.type === "tool/result"
        && event.data.message.source.callId === callId && session.surface.nodes.includes(event.seq));
      const content = projectedEvent?.data.message.content[0].content;
      return { decision, resultEvent, projectedEvent, content,
        presentation: parseScientificToolResult(tool, content?.[0]?.text ?? "") };
    },
  };
}
