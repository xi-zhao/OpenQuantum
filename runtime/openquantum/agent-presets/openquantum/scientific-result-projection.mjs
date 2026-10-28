/**
 * Harness-native Host Plugin for scientific Tool results.
 *
 * The Tool implementation owns deterministic computation, Harness owns execution and
 * Session identity, ctx.fs owns atomic workspace writes, the Scientific
 * Validator owns observations, the Profile owns rules, and only the central
 * Acceptance Builder derives Acceptance. This trusted Host Plugin owns the
 * lifecycle hooks and delegates capability mapping to the internal Scientific
 * Result Adapter Registry.
 */

import { isDeepStrictEqual } from "node:util";
import { scientificResultAdapter } from "./scientific-result-adapters.mjs";
import {
  encodeScientificToolResult,
  projectMaterializedScientificResult,
  projectScientificToolResult,
} from "./scientific-result-protocol.mjs";

export * from "./scientific-result-protocol.mjs";

export const name = "openquantum-scientific-result-projection";
export const inject = ["tools", "fs", "sandboxPolicy"];

function flattenText(content) {
  if (!Array.isArray(content) || content.some((block) => block?.type !== "text")) {
    return undefined;
  }
  return content.map((block) => block.text).join("\n").trim();
}

function presentationContent(originalText, presentation) {
  return [{ type: "text", text: [originalText, encodeScientificToolResult(presentation)].filter(Boolean).join("\n") }];
}

function matchingCallEvent(session, exec) {
  return session.events.findLast(
    (event) =>
      event.type === "tool/call" &&
      event.data.callId === exec.callId &&
      event.data.name === exec.name,
  );
}

function matchesResult(event, candidate) {
  const message = event.data.message;
  const block = message?.content?.[0];
  return candidate.finalized && !candidate.exec.signal?.aborted
    && event.surfaceOp === "append"
    && isDeepStrictEqual(event.sourceEventSeqs, [candidate.callEvent.seq])
    && event.seq > candidate.callEvent.seq
    && event.data.turn === candidate.callEvent.data.turn
    && event.data.step === candidate.callEvent.data.step
    && !event.data.error
    && message?.source?.kind === "tool" && message.source.callId === candidate.exec.callId
    && message.content.length === 1 && block?.type === "tool-result"
    && block.toolCallId === candidate.exec.callId && block.isError === false
    && isDeepStrictEqual(block.content, candidate.content);
}

export function apply(ctx) {
  const sessions = new WeakMap();
  const executions = new WeakMap();
  const warn = () => ctx.logger?.warn?.("Scientific result materialization failed; original observations retained");
  function stateFor(session) {
    if (!sessions.has(session)) sessions.set(session, { candidates: new Map(), jobs: new Map() });
    return sessions.get(session);
  }
  async function drain(session) {
    const state = sessions.get(session);
    if (!state) return;
    while (state.jobs.size) await Promise.all([...state.jobs.values()].map(job => job.promise));
    // Native step boundaries follow all scheduled result commits. An unmatched
    // candidate cannot be promoted by a later, unrelated event or reused call id.
    state.candidates.clear();
  }
  function cancel(state) {
    state.candidates.clear();
    for (const job of state.jobs.values()) job.abort.abort();
  }

  ctx.on("tools/post-execute", async (exec, result, next) => {
    const downstream = await next();
    if (downstream.kind !== "accept" || Object.hasOwn(downstream, "value") || result.isError || exec.parent !== undefined) {
      return downstream;
    }
    const computational = projectScientificToolResult(exec.name, result.value);
    const originalText = flattenText(downstream.content ?? result.content);
    if (!computational || originalText === undefined) return downstream;
    const content = presentationContent(originalText, computational);
    try {
      const session = exec.agent?.session;
      const adapter = scientificResultAdapter(exec.name);
      if (session && typeof adapter?.materialize === "function" && !exec.signal?.aborted) {
        const callEvent = matchingCallEvent(session, exec);
        if (callEvent && typeof session.header.cwd === "string") {
          const recordedArguments = typeof callEvent.data.arguments === "string"
            ? JSON.parse(callEvent.data.arguments) : callEvent.data.arguments;
          if (!isDeepStrictEqual(recordedArguments, exec.arguments)) throw new Error("Recorded scientific input differs");
          const candidate = { exec, adapter, callEvent, originalText, content: structuredClone(content),
            canonicalValue: structuredClone(result.value), arguments: structuredClone(exec.arguments), finalized: false };
          stateFor(session).candidates.set(callEvent.seq, candidate);
          executions.set(exec, candidate);
        }
      }
    } catch { warn(); }
    return { kind: "accept", content,
      ...(downstream.additionalContexts ? { additionalContexts: downstream.additionalContexts } : {}) };
  }, { prepend: true });

  // Definition-owned finalizers and outer policies run after post-execute. Only
  // the identical successful final value and content may form an audit candidate.
  ctx.on("tools/result", (exec, result) => {
    const candidate = executions.get(exec);
    if (!candidate) return;
    executions.delete(exec);
    candidate.finalized = !result.isError && !exec.signal?.aborted
      && isDeepStrictEqual(result.value, candidate.canonicalValue)
      && isDeepStrictEqual(result.content, candidate.content);
    if (!candidate.finalized) sessions.get(exec.agent.session)?.candidates.delete(candidate.callEvent.seq);
  });

  ctx.on("session/event", (session, event) => {
    const state = sessions.get(session);
    if (!state) return;
    if (event.type === "turn/end" || event.type === "sandbox/mode" && ctx.sandboxPolicy.resolve({ session }).mode === "read-only") {
      cancel(state);
      return;
    }
    if (event.surfaceOp?.op === "replace") {
      for (const seq of event.sourceEventSeqs ?? []) {
        const job = state.jobs.get(seq);
        if (job && !job.publishing) job.abort.abort();
      }
    }
    if (event.type !== "tool/result" || event.surfaceOp !== "append") return;
    const candidate = state.candidates.get(event.sourceEventSeqs?.[0]);
    if (!candidate) return;
    state.candidates.delete(candidate.callEvent.seq);
    if (!matchesResult(event, candidate)) return;
    const abort = new AbortController();
    const signal = candidate.exec.signal ? AbortSignal.any([candidate.exec.signal, abort.signal]) : abort.signal;
    const job = { abort, publishing: false };
    state.jobs.set(event.seq, job);
    // session/event is a synchronous observer: defer work until append returns.
    // Native awaited hooks below drain it before model input or turn completion.
    job.promise = Promise.resolve().then(async () => {
      signal.throwIfAborted();
      if (!session.surface.nodes.includes(event.seq)) return;
      const materialized = await candidate.adapter.materialize({
        sandboxPolicy: ctx.sandboxPolicy.resolve({ session }), fileSystem: ctx.fs,
        workspaceRoot: session.header.cwd, sessionId: session.id, callId: candidate.exec.callId,
        eventRange: { from: candidate.callEvent.seq, to: event.seq },
        arguments: candidate.arguments, canonicalValue: candidate.canonicalValue, signal,
      });
      signal.throwIfAborted();
      if (!session.surface.nodes.includes(event.seq)) return;
      const presentation = projectMaterializedScientificResult(candidate.exec.name, candidate.canonicalValue, materialized);
      if (!presentation) return;
      const message = event.data.message;
      job.publishing = true;
      session.append("tool/result", {
        ...event.data,
        message: { ...message, content: [{ ...message.content[0], content: presentationContent(candidate.originalText, presentation) }] },
      }, { surfaceOp: { op: "replace", start: event.seq, end: event.seq }, sourceEventSeqs: [event.seq] });
    }).catch(warn).finally(() => state.jobs.delete(event.seq));
  });

  ctx.on("agent/pre-step", async ({ agent }, next) => {
    await drain(agent.session);
    return next();
  }, { prepend: true });
  ctx.on("agent/turn-stopping", ({ agent }) => drain(agent.session));
  ctx.on("session/disposed", session => {
    const state = sessions.get(session);
    if (state) cancel(state);
  });
}
