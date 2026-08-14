import type {
  ApprovalResponsePayload,
  ClientResponse,
  MuxFrame,
  QuestionResponsePayload,
  RpcId,
  RpcResponse,
  SessionSummary,
} from "@deepseek-ai/dsh-host-apiproxy/api";
import type { IApiClient } from "@deepseek-ai/dsh-host-apiproxy/client";

import {
  parseScientificToolResult,
  scientificToolDescriptor,
} from "../../runtime/openquantum/agent-presets/openquantum/scientific-result-protocol.mjs";
import { OpenQuantumWebApiClient } from "./web-api-client";

export type HarnessSessionId = SessionSummary["sessionId"];
export type HarnessApiClient = Pick<
  IApiClient,
  "sessions" | "events" | "respond"
> &
  Partial<
    Pick<OpenQuantumWebApiClient, "startPrompt">
  >;

export interface HarnessSessionSummary {
  readonly id: HarnessSessionId;
  readonly title: string;
  readonly updatedAt: number;
  readonly running: boolean;
  readonly blank: boolean;
}

export interface HarnessConversationMessage {
  readonly id: string;
  readonly seq: number;
  readonly role: "user" | "assistant";
  readonly text: string;
  readonly sourceRpcId?: RpcId;
}

export interface HarnessScientificActivity {
  readonly id: string;
  readonly toolName: string;
  readonly capabilityId: string;
  readonly operation: string;
  readonly title: string;
  readonly summary: string;
  readonly runtimeStatus: "running" | "completed" | "failed";
  readonly scientificStatus:
    | "not_available"
    | "not_evaluated"
    | "observations_available"
    | "acceptance_available";
  readonly acceptanceStatus?: "passed" | "conditional" | "failed";
  readonly details: readonly {
    readonly label: string;
    readonly value: string;
  }[];
  readonly sequence: number;
}

export interface HarnessConversationSnapshot {
  readonly sessionId: HarnessSessionId;
  readonly messages: readonly HarnessConversationMessage[];
  readonly scientificActivities: readonly HarnessScientificActivity[];
  readonly lastSeq: number;
  readonly running: boolean;
}

export type HarnessUiEvent =
  | {
      readonly type: "session-changed";
      readonly sessionId: HarnessSessionId;
      readonly eventType: string;
      readonly seq?: number;
      readonly gapDetected?: boolean;
    }
  | {
      readonly type: "session-status";
      readonly sessionId: HarnessSessionId;
      readonly running: boolean;
    }
  | {
      readonly type: "connection-state";
      readonly status: "online" | "reconnecting";
    }
  | {
      readonly type: "session-directory-changed";
      readonly sessionId: HarnessSessionId;
      readonly change: "added" | "removed" | "updated";
    }
  | {
      readonly type: "interaction-requested";
      readonly sessionId: HarnessSessionId;
      readonly rpcId: RpcId;
      readonly request: Extract<
        MuxFrame,
        { type: "approval/requested" | "question/requested" }
      >;
    }
  | {
      readonly type: "interaction-resolved";
      readonly sessionId: HarnessSessionId;
      readonly resolution:
        | {
            readonly kind: "approval";
            readonly approvalId: Extract<
              MuxFrame,
              { type: "approval/resolved" }
            >["approvalId"];
          }
        | {
            readonly kind: "questions";
            readonly rpcId: RpcId;
          };
    }
  | {
      readonly type: "agent-error";
      readonly sessionId: HarnessSessionId;
      readonly message: string;
    }
  | {
      readonly type: "transport-error";
      readonly message: string;
    };

export interface HarnessTransport {
  listSessions(signal?: AbortSignal): Promise<readonly HarnessSessionSummary[]>;
  createSession(
    sessionId: HarnessSessionId,
    signal?: AbortSignal,
  ): Promise<HarnessSessionId>;
  getSnapshot(
    sessionId: HarnessSessionId,
    signal?: AbortSignal,
  ): Promise<HarnessConversationSnapshot>;
  startPrompt(
    sessionId: HarnessSessionId,
    text: string,
    signal?: AbortSignal,
  ): {
    readonly rpcId: RpcId;
    readonly completion: Promise<void>;
  };
  cancel(sessionId: HarnessSessionId, signal?: AbortSignal): Promise<void>;
  respondToInteraction(
    response: HarnessInteractionResponse,
    signal?: AbortSignal,
  ): Promise<void>;
  events(signal: AbortSignal): AsyncIterable<HarnessUiEvent>;
}

export type HarnessInteractionResponse =
  | {
      readonly type: "approval";
      readonly rpcId: RpcId;
      readonly value: ApprovalResponsePayload;
    }
  | {
      readonly type: "question";
      readonly rpcId: RpcId;
      readonly value: QuestionResponsePayload;
    }
  | {
      readonly type: "question-cancel";
      readonly rpcId: RpcId;
    };

export class HarnessTransportError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "HarnessTransportError";
    this.code = code;
  }
}

export class HarnessTransportOutcomeUnknownError extends Error {
  readonly code = "unknown-after-send";

  constructor(cause?: unknown) {
    super("Harness RPC outcome is unknown after send", { cause });
    this.name = "HarnessTransportOutcomeUnknownError";
  }
}

function normalizeMutationFailure(error: unknown): never {
  // Only a parsed Harness business-error envelope is definite rejection.
  // Network/abort/HTTP/JSON/schema/rpc mismatch all happen after send and are
  // conservatively unknown to prevent blind replay of side effects.
  if (error instanceof HarnessTransportError) throw error;
  throw new HarnessTransportOutcomeUnknownError(error);
}

function unwrap<T>(response: RpcResponse<T>): T {
  if (response.result.ok) {
    return response.result.value;
  }

  throw new HarnessTransportError(
    response.result.error.code,
    response.result.error.message,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function textFromContent(value: unknown): string {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .filter(
      (block): block is { type: "text"; text: string } =>
        isRecord(block) && block.type === "text" && typeof block.text === "string",
    )
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function messageFromEvent(event: {
  readonly type: string;
  readonly seq: number;
  readonly data: unknown;
}): HarnessConversationMessage | undefined {
  if (event.type !== "user/message" && event.type !== "assistant/message") {
    return undefined;
  }

  if (!isRecord(event.data)) {
    return undefined;
  }

  const message =
    event.type === "assistant/message" && isRecord(event.data.message)
      ? event.data.message
      : event.data;
  const source = isRecord(message.source) ? message.source : undefined;

  if (event.type === "user/message" && source?.kind !== "user") {
    return undefined;
  }

  const text = textFromContent(message.content);

  if (!text) {
    return undefined;
  }

  return {
    id: typeof message.id === "string" ? message.id : String(event.seq),
    seq: event.seq,
    role: event.type === "user/message" ? "user" : "assistant",
    text,
    ...(typeof source?.rpcId === "string"
      ? { sourceRpcId: source.rpcId as RpcId }
      : {}),
  };
}

function boundedSummary(text: string, fallback: string): string {
  const normalized = text.trim();
  if (!normalized) return fallback;
  return normalized.length <= 500
    ? normalized
    : `${normalized.slice(0, 497)}…`;
}

function toolResultFromEvent(event: {
  readonly type: string;
  readonly data: unknown;
}):
  | {
      readonly callId: string;
      readonly text: string;
      readonly isError: boolean;
    }
  | undefined {
  if (event.type !== "tool/result" || !isRecord(event.data)) {
    return undefined;
  }
  const message = event.data.message;
  if (!isRecord(message) || !isRecord(message.source)) return undefined;
  if (message.source.kind !== "tool" || typeof message.source.callId !== "string") {
    return undefined;
  }
  const callId = message.source.callId;
  if (!Array.isArray(message.content)) return undefined;
  const block = message.content.find(
    (candidate) =>
      isRecord(candidate) &&
      candidate.type === "tool-result" &&
      candidate.toolCallId === callId,
  );
  if (!isRecord(block)) return undefined;
  return {
    callId,
    text: textFromContent(block.content),
    isError: block.isError === true || isRecord(event.data.error),
  };
}

function scientificActivitiesFromEvents(
  events: readonly {
    readonly type: string;
    readonly seq: number;
    readonly data: unknown;
  }[],
): HarnessScientificActivity[] {
  const activities = new Map<string, HarnessScientificActivity>();

  for (const event of [...events].sort((left, right) => left.seq - right.seq)) {
    if (event.type === "tool/call" && isRecord(event.data)) {
      const callId = event.data.callId;
      const toolName = event.data.name;
      if (typeof callId !== "string" || typeof toolName !== "string") continue;
      const descriptor = scientificToolDescriptor(toolName);
      if (!descriptor) continue;
      activities.set(callId, {
        id: callId,
        toolName,
        capabilityId: descriptor.capabilityId,
        operation: descriptor.operation,
        title: descriptor.title,
        summary: "Harness 已接收科学工具调用，正在等待确定性结果。",
        runtimeStatus: "running",
        scientificStatus: "not_available",
        details: [],
        sequence: event.seq,
      });
      continue;
    }

    const result = toolResultFromEvent(event);
    if (!result) continue;
    const activity = activities.get(result.callId);
    if (!activity) continue;
    if (result.isError) {
      activities.set(result.callId, {
        ...activity,
        summary: boundedSummary(result.text, "科学工具执行失败。"),
        runtimeStatus: "failed",
        scientificStatus: "not_available",
        details: [],
        sequence: event.seq,
      });
      continue;
    }

    const presentation = parseScientificToolResult(
      activity.toolName,
      result.text,
    );
    activities.set(result.callId, {
      ...activity,
      ...(presentation
        ? {
            title: presentation.title,
            summary: presentation.summary,
            scientificStatus: presentation.scientificStatus,
            ...(presentation.acceptanceStatus
              ? { acceptanceStatus: presentation.acceptanceStatus }
              : {}),
            details: presentation.details,
          }
        : {
            summary: boundedSummary(
              result.text,
              "科学工具已完成，但没有可展示的结构化科学投影。",
            ),
            scientificStatus: "not_available" as const,
            details: [],
          }),
      runtimeStatus: "completed",
      sequence: event.seq,
    });
  }

  return [...activities.values()].sort(
    (left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id),
  );
}

function titleFromProjections(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.title !== "string") {
    return undefined;
  }

  const title = value.title.trim();
  return title.length > 0 ? title : undefined;
}

function streamFailure(error: {
  readonly code: string;
  readonly message: string;
}): HarnessTransportError {
  return new HarnessTransportError(error.code, error.message);
}

const MAX_PENDING_UI_EVENTS = 500;

function enqueueBounded(
  queue: HarnessUiEvent[],
  event: HarnessUiEvent,
): boolean {
  if (queue.length >= MAX_PENDING_UI_EVENTS) {
    return false;
  }
  queue.push(event);
  return true;
}

export class DeepSeekHarnessTransport implements HarnessTransport {
  private readonly client: HarnessApiClient;

  constructor(client: HarnessApiClient = new OpenQuantumWebApiClient()) {
    this.client = client;
  }

  async listSessions(
    signal?: AbortSignal,
  ): Promise<readonly HarnessSessionSummary[]> {
    const value = unwrap(await this.client.sessions.list({}, signal));

    return value.items.map((session) => ({
      id: session.sessionId,
      title: titleFromProjections(session.projections?.values) ?? "新对话",
      updatedAt: session.updatedAt,
      running: session.running,
      blank: session.blank,
    }));
  }

  async createSession(
    sessionId: HarnessSessionId,
    signal?: AbortSignal,
  ): Promise<HarnessSessionId> {
    try {
      const value = unwrap(
        await this.client.sessions.create({ sessionId }, signal),
      );
      return value.sessionId;
    } catch (error) {
      return normalizeMutationFailure(error);
    }
  }

  async getSnapshot(
    sessionId: HarnessSessionId,
    signal?: AbortSignal,
  ): Promise<HarnessConversationSnapshot> {
    const value = unwrap(
      await this.client.sessions.history(
        { sessionId, maxMessages: 200 },
        signal,
      ),
    );
    const events = value.events.map((entry) => entry.event);
    const messages = events
      .map(messageFromEvent)
      .filter((message): message is HarnessConversationMessage => Boolean(message));
    const lastSeq = events.at(-1)?.seq ?? -1;
    const lastTurnStart = events.findLast(
      (event) => event.type === "turn/start",
    )?.seq;
    const lastTurnEnd = events.findLast((event) => event.type === "turn/end")?.seq;

    return {
      sessionId,
      messages,
      scientificActivities: scientificActivitiesFromEvents(events),
      lastSeq,
      running:
        lastTurnStart !== undefined &&
        (lastTurnEnd === undefined || lastTurnStart > lastTurnEnd),
    };
  }

  startPrompt(
    sessionId: HarnessSessionId,
    text: string,
    signal?: AbortSignal,
  ): { readonly rpcId: RpcId; readonly completion: Promise<void> } {
    const payload = {
      sessionId,
      mode: "queue" as const,
      content: [{ type: "text" as const, text }],
      clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    if (this.client.startPrompt) {
      const started = this.client.startPrompt(payload, signal);
      return {
        rpcId: started.rpcId,
        completion: started.completion
          .then((response) => {
            unwrap(response);
          })
          .catch(normalizeMutationFailure),
      };
    }

    throw new HarnessTransportError(
      "prompt-correlation-unavailable",
      "Prompt client cannot expose correlation before completion.",
    );
  }

  async cancel(
    sessionId: HarnessSessionId,
    signal?: AbortSignal,
  ): Promise<void> {
    try {
      unwrap(await this.client.sessions.cancel({ sessionId }, signal));
    } catch (error) {
      normalizeMutationFailure(error);
    }
  }

  async respondToInteraction(
    response: HarnessInteractionResponse,
    signal?: AbortSignal,
  ): Promise<void> {
    const message: ClientResponse = {
      type: "client-response",
      rpcId: response.rpcId,
      result:
        response.type === "question-cancel"
          ? {
              ok: false,
              error: {
                code: "cancelled",
                message: "用户取消了问题批次。",
                details: {},
              },
            }
          : { ok: true, value: response.value },
    };
    let receipt;
    try {
      receipt = await this.client.respond(message, signal);
    } catch (error) {
      return normalizeMutationFailure(error);
    }
    if (!receipt.accepted) {
      throw new HarnessTransportError(
        receipt.reason,
        receipt.reason === "not-pending"
          ? "该交互已处理或不再等待回答。"
          : "Harness 拒绝了无效的交互回答。",
      );
    }
  }

  async *events(signal: AbortSignal): AsyncIterable<HarnessUiEvent> {
    if (!signal.aborted) {
      const generationController = new AbortController();
      const combinedSignal = AbortSignal.any([
        signal,
        generationController.signal,
      ]);
      const queue: HarnessUiEvent[] = [];
      let wake: (() => void) | undefined;
      let muxOpen = false;
      let hostOpen = false;
      let activePumps = 2;
      let generationFailed = false;
      const wakeConsumer = () => {
        wake?.();
        wake = undefined;
      };
      const failGeneration = (message: string) => {
        if (generationFailed) {
          return;
        }

        generationFailed = true;
        queue.length = 0;
        queue.push({ type: "transport-error", message });
        generationController.abort();
        wakeConsumer();
      };
      const openTimeout = globalThis.setTimeout(() => {
        if (!muxOpen || !hostOpen) {
          failGeneration("Harness event streams did not open within 3 seconds");
        }
      }, 3_000);

      const enqueue = (event: HarnessUiEvent) => {
        if (generationFailed) {
          return false;
        }
        if (!enqueueBounded(queue, event)) {
          failGeneration(
            "Harness event consumer fell behind; reconnecting from a fresh snapshot.",
          );
          return false;
        }
        wakeConsumer();
        return true;
      };
      const markOpen = (stream: "mux" | "host") => {
        if (stream === "mux") muxOpen = true;
        if (stream === "host") hostOpen = true;
        if (muxOpen && hostOpen) {
          globalThis.clearTimeout(openTimeout);
          enqueue({ type: "connection-state", status: "online" });
        }
      };
      const finishPump = (error?: unknown) => {
        activePumps -= 1;
        globalThis.clearTimeout(openTimeout);
        if (error && !combinedSignal.aborted) {
          failGeneration(error instanceof Error ? error.message : String(error));
        } else {
          generationController.abort();
          wakeConsumer();
        }
      };

      void (async () => {
        try {
          for await (const message of this.client.events.mux(
            {},
            combinedSignal,
            () => markOpen("mux"),
          )) {
            const payload = message.payload;

            if (payload.type === "stream/error") {
              throw streamFailure(payload.error);
            }

            if (payload.type === "session/subscribed") {
              // subscribed.lastSeq is the stream-open cut. Even the first
              // subscription must refresh because the prior HTTP baseline may
              // have ended just before this cut.
              enqueue({
                type: "session-changed",
                sessionId: payload.sessionId,
                eventType: "session/rebaseline",
                seq: payload.lastSeq,
                gapDetected: true,
              });
              continue;
            }

            if (payload.type === "session/event") {
              enqueue({
                type: "session-changed",
                sessionId: payload.sessionId,
                eventType: payload.event.type,
                seq: payload.event.seq,
              });
              continue;
            }

            if (
              payload.type === "approval/requested" ||
              payload.type === "question/requested"
            ) {
              enqueue({
                type: "interaction-requested",
                sessionId: payload.sessionId,
                rpcId: message.rpcId,
                request: payload,
              });
              continue;
            }

            if (
              payload.type === "approval/resolved" ||
              payload.type === "question/resolved"
            ) {
              enqueue({
                type: "interaction-resolved",
                sessionId: payload.sessionId,
                resolution:
                  payload.type === "approval/resolved"
                    ? {
                        kind: "approval",
                        approvalId: payload.approvalId,
                      }
                    : {
                        kind: "questions",
                        rpcId: payload.questionRpcId,
                      },
              });
              continue;
            }

            if (payload.type === "session/projection") {
              enqueue({
                type: "session-directory-changed",
                sessionId: payload.sessionId,
                change: "updated",
              });
              continue;
            }

            if (
              payload.type === "session/queue" ||
              payload.type === "session/jobs"
            ) {
              enqueue({
                type: "session-changed",
                sessionId: payload.sessionId,
                eventType: payload.type,
              });
            }
          }
          finishPump();
        } catch (error) {
          finishPump(error);
        }
      })();

      void (async () => {
        try {
          for await (const message of this.client.events.host(
            {},
            combinedSignal,
            () => markOpen("host"),
          )) {
            const payload = message.payload;

            if (payload.type === "stream/error") {
              throw streamFailure(payload.error);
            }

            if (payload.type === "host/session-status") {
              enqueue({
                type: "session-status",
                sessionId: payload.sessionId,
                running: payload.running,
              });
              continue;
            }

            if (
              payload.type === "host/session-added" ||
              payload.type === "host/session-removed"
            ) {
              enqueue({
                type: "session-directory-changed",
                sessionId: payload.sessionId,
                change:
                  payload.type === "host/session-added" ? "added" : "removed",
              });
              continue;
            }

            if (payload.type === "host/agent-error") {
              enqueue({
                type: "agent-error",
                sessionId: payload.sessionId,
                message: payload.message,
              });
            }
          }
          finishPump();
        } catch (error) {
          finishPump(error);
        }
      })();

      while (!signal.aborted && (activePumps > 0 || queue.length > 0)) {
        while (queue.length > 0) {
          const event = queue.shift();
          if (event) yield event;
        }

        if (activePumps > 0 && queue.length === 0) {
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
        }
      }

      if (signal.aborted) return;
      // A transport iterable owns exactly one Host generation. Recovery,
      // backoff and fresh baselining belong to the Adapter so stale I/O from
      // this generation cannot cross into the next one.
      return;
    }
  }
}
