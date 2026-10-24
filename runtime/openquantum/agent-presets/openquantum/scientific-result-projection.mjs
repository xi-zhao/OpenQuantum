/**
 * Harness-native Host Plugin for scientific Tool results.
 *
 * The Tool implementation owns deterministic computation, Harness owns execution and
 * Session identity, ctx.fs owns atomic workspace writes, the Scientific
 * Validator owns observations, the Profile owns rules, and only the central
 * Acceptance Builder derives Acceptance. This trusted Host Plugin owns the
 * lifecycle hook and delegates capability mapping to the internal Scientific
 * Result Adapter Registry.
 */

import { scientificResultAdapter } from "./scientific-result-adapters.mjs";
import {
  encodeScientificToolResult,
  projectMaterializedScientificResult,
  projectScientificToolResult,
} from "./scientific-result-protocol.mjs";

export * from "./scientific-result-protocol.mjs";

export const name = "openquantum-scientific-result-projection";
export const inject = ["tools", "fs"];

function flattenText(content) {
  if (!Array.isArray(content) || content.some((block) => block?.type !== "text")) {
    return undefined;
  }
  return content.map((block) => block.text).join("\n").trim();
}

function matchingCallEvent(session, exec) {
  return session.events.findLast(
    (event) =>
      event.type === "tool/call" &&
      event.data.callId === exec.callId &&
      event.data.name === exec.name,
  );
}

async function materialize(ctx, exec, canonicalValue) {
  const adapter = scientificResultAdapter(exec.name);
  if (typeof adapter?.materialize !== "function" || !exec.agent) {
    return undefined;
  }
  const { session } = exec.agent;
  const workspaceRoot = session.header.cwd;
  const callEvent = matchingCallEvent(session, exec);
  if (typeof workspaceRoot !== "string" || !callEvent) return undefined;

  return adapter.materialize({
    fileSystem: ctx.fs,
    workspaceRoot,
    sessionId: session.id,
    callId: exec.callId,
    eventRange: {
      from: callEvent.seq,
      // AgentLoop appends the paired tool/result synchronously immediately
      // after this final post-execute promise settles.
      to: session.seq,
    },
    arguments: exec.arguments,
    canonicalValue,
    signal: exec.signal,
  });
}

export function apply(ctx) {
  ctx.on(
    "tools/post-execute",
    async (exec, result, next) => {
      const downstream = await next();
      if (
        downstream.kind !== "accept" ||
        Object.hasOwn(downstream, "value") ||
        result.isError ||
        exec.parent !== undefined
      ) {
        return downstream;
      }

      const computational = projectScientificToolResult(exec.name, result.value);
      if (!computational) return downstream;
      let presentation = computational;
      try {
        const materialized = await materialize(ctx, exec, result.value);
        if (materialized) {
          presentation =
            projectMaterializedScientificResult(
              exec.name,
              result.value,
              materialized,
            ) ??
            computational;
        }
      } catch (error) {
        ctx.logger?.warn?.(
          `scientific result materialization failed for ${exec.callId ?? exec.name}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      const content = downstream.content ?? result.content;
      const originalText = flattenText(content);
      if (originalText === undefined) return downstream;
      const text = [originalText, encodeScientificToolResult(presentation)]
        .filter(Boolean)
        .join("\n");
      return {
        kind: "accept",
        content: [{ type: "text", text }],
        ...(downstream.additionalContexts
          ? { additionalContexts: downstream.additionalContexts }
          : {}),
      };
    },
    { prepend: true },
  );
}
