/**
 * Harness-native adapter for scientific MCP results.
 *
 * The MCP server owns deterministic computation, Harness owns execution and
 * Session identity, ctx.fs owns atomic workspace writes, the Skill Validator
 * owns scientific checks, and the central contract builder owns Acceptance.
 * This plugin only joins those existing seams for one completed root call.
 */

import { materializeGroundStateResult } from "./scientific-result-materializer.mjs";
import {
  encodeScientificToolResult,
  projectMaterializedScientificResult,
  projectScientificToolResult,
  SOLVE_AND_VALIDATE_TOOL,
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
  if (exec.name !== SOLVE_AND_VALIDATE_TOOL || !exec.agent) return undefined;
  const { session } = exec.agent;
  const workspaceRoot = session.header.cwd;
  const callEvent = matchingCallEvent(session, exec);
  if (typeof workspaceRoot !== "string" || !callEvent) return undefined;

  return materializeGroundStateResult({
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
    request: exec.arguments?.request,
    facts: canonicalValue.structuredContent?.facts,
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
            projectMaterializedScientificResult(result.value, materialized) ??
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
