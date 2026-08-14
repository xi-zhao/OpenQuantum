import type { RpcId } from "@deepseek-ai/dsh-host-apiproxy/api";

import {
  COMMAND_REPLAY_WINDOW,
  validateQuestionAnswers,
  type AnswerInteractionCommand,
  type CommandFailureCode,
  type CommandReceipt,
  type HarnessUiPort,
  type HarnessUiSessionId,
  type PendingInteraction,
  type UiCommand,
  type UiEvent,
  type UiEventCause,
  type WorkspaceConnection,
  type WorkspaceConnectionStatus,
  type WorkspaceMessage,
  type WorkspaceRevision,
  type WorkspaceRuntimeError,
  type WorkspaceScientificActivity,
  type WorkspaceSessionSnapshot,
  type WorkspaceSessionSummary,
  type WorkspaceSnapshot,
} from "./interface";
import type {
  HarnessConversationSnapshot,
  HarnessInteractionResponse,
  HarnessScientificActivity,
  HarnessSessionId,
  HarnessTransport,
  HarnessUiEvent,
} from "./transport";
import {
  HarnessTransportError,
  HarnessTransportOutcomeUnknownError,
} from "./transport";

interface MutableDurableMessage {
  id: string;
  rawId: string;
  role: "user" | "assistant";
  text: string;
  sequence: number;
  createdAt: number;
  sourceRpcId?: RpcId;
}

interface PendingPrompt {
  readonly commandId: string;
  readonly clientMessageId: string;
  readonly text: string;
  readonly displayAfterSequence: number;
  readonly createdAt: number;
  readonly ordinal: number;
  transportRpcId?: RpcId;
  state: "staged" | "visible" | "durable";
  uncertain?: boolean;
  uncertainAt?: number;
}

interface SessionRefreshTask {
  readonly generation: EventGeneration;
  readonly promise: Promise<void>;
}

interface DirectoryRefreshTask {
  readonly generation: EventGeneration;
  readonly directoryGeneration: number;
  readonly dirtyEpoch: number;
  readonly promise: Promise<void>;
}

interface MutableSession {
  id: HarnessUiSessionId;
  title: string;
  updatedAt: number;
  running: boolean;
  runtimeError?: WorkspaceRuntimeError;
  blank: boolean;
  directoryConfirmed: boolean;
  createdDirectoryGeneration: number;
  loaded: boolean;
  lastSequence: number;
  targetSequence: number;
  statusEpoch: number;
  stateVersion: number;
  titleEpoch: number;
  updatedAtEpoch: number;
  blankEpoch: number;
  detachedCold?: boolean;
  detachedOrder?: number;
  lifecycle: number;
  refreshTask?: SessionRefreshTask;
  durableMessages: MutableDurableMessage[];
  scientificActivities: HarnessScientificActivity[];
  pendingPrompts: PendingPrompt[];
}

interface CommandLedgerEntry {
  readonly fingerprint: string;
  readonly receipt: CommandReceipt;
  readonly promptOutcome?: PromptOutcome;
}

interface PromptOutcome {
  readonly sessionId: HarnessUiSessionId;
  readonly messageId: string;
  readonly rpcId: RpcId;
  readonly createdAt: number;
  durable: boolean;
}

interface UnresolvedPromptReservation {
  readonly commandId: string;
  readonly fingerprint: string;
  readonly sessionId: HarnessUiSessionId;
  readonly clientMessageId: string;
  readonly text: string;
  readonly pending: PendingPrompt;
  readonly session: MutableSession;
  readonly sessionLifecycle: number;
  outcome?: PromptOutcome;
  receipt?: CommandReceipt;
}

interface PendingCreateAttempt {
  readonly sessionId: HarnessUiSessionId;
  removed: boolean;
}

interface DirectoryRemoval {
  readonly removalGeneration: number;
}

interface DurablePromptMatch {
  readonly commandId: string;
  readonly outcome: PromptOutcome;
  readonly pending?: PendingPrompt;
  readonly preserveRawIdentity?: boolean;
}

interface EventSubscriber {
  readonly queue: UiEvent[];
  closed: boolean;
  ready: boolean;
  wake?: () => void;
}

interface EventPump {
  readonly id: number;
  readonly controller: AbortController;
  readonly started: Promise<void>;
  readonly resolveStarted: () => void;
  readonly ready: Promise<void>;
  readonly resolveReady: () => void;
  isReady: boolean;
  bootstrapEvent?: UiEvent;
  generation?: EventGeneration;
}

type EventGenerationPhase = "opening" | "baselining" | "live";

interface BufferedSessionStatus {
  readonly running: boolean;
  readonly order: number;
}

interface RuntimeErrorOccurrence extends WorkspaceRuntimeError {
  readonly order: number;
}

interface EventGeneration {
  readonly id: number;
  readonly pump: EventPump;
  readonly controller: AbortController;
  readonly opened: Promise<void>;
  readonly resolveOpened: () => void;
  openedObserved: boolean;
  phase: EventGenerationPhase;
  ended: boolean;
  readonly preLiveEvents: HarnessUiEvent[];
  readonly bufferedInteractions: Map<string, BufferedInteraction>;
  readonly bufferedApprovalKeys: Map<string, string>;
  readonly interactionCutoffs: Map<HarnessUiSessionId, number>;
  readonly bufferedStatuses: Map<HarnessUiSessionId, BufferedSessionStatus>;
  readonly bufferedSessionTargets: Map<HarnessUiSessionId, number>;
  baselineDirectoryGeneration?: number;
  baselineDirtyEpoch?: number;
  failure?: unknown;
}

interface BufferedInteraction {
  readonly event: Extract<
    HarnessUiEvent,
    { type: "interaction-requested" }
  >;
  readonly fingerprint: string;
  readonly wireKey: string;
  readonly approvalKey?: string;
  readonly order: number;
}

interface InFlightCommand {
  readonly fingerprint: string;
  readonly promise: Promise<CommandReceipt>;
  readonly resolve: (receipt: CommandReceipt) => void;
  promptOutcome?: PromptOutcome;
}

type CommandStart =
  | { readonly kind: "immediate"; readonly receipt: CommandReceipt }
  | { readonly kind: "wait"; readonly promise: Promise<CommandReceipt> }
  | { readonly kind: "execute"; readonly entry: InFlightCommand };

const MAX_EVENT_HISTORY = 64;
const MAX_PENDING_INTERACTIONS = 128;
const MAX_PRELIVE_EVENTS = 256;
const MAX_DETACHED_SESSIONS = 128;
const MAX_UNCERTAIN_PROMPTS_PER_SESSION = COMMAND_REPLAY_WINDOW;
/**
 * Remote Prompt outcomes are not safely replayable until exact source.rpcId
 * evidence arrives. Unlike the completed-command LRU, these reservations are
 * never evicted to admit unrelated work: capacity exhaustion fails before a
 * new Prompt is sent.
 */
export const MAX_UNRESOLVED_PROMPT_RESERVATIONS = COMMAND_REPLAY_WINDOW;
const MAX_INTERACTION_QUESTIONS = 20;
const MAX_INTERACTION_OPTIONS_PER_QUESTION = 50;
const MAX_INTERACTION_TEXT_LENGTH = 8_000;

interface RawInteraction {
  readonly sessionId: HarnessUiSessionId;
  readonly rpcId: RpcId;
  readonly fingerprint: string;
  readonly projection: PendingInteraction;
  readonly request: Extract<
    HarnessUiEvent,
    { type: "interaction-requested" }
  >["request"];
}

interface InteractionRegistry {
  readonly byUiId: Map<string, RawInteraction>;
  readonly byWireKey: Map<string, string>;
  readonly byApprovalKey: Map<string, string>;
}

interface ApplyConversationResult {
  readonly durablePromptIds: readonly string[];
  readonly assistantMessageIds: readonly string[];
  readonly runningChanged: boolean;
  readonly durableCommandIds: readonly string[];
}

export interface DeepSeekHarnessAdapterCoreOptions {
  readonly transport: HarnessTransport;
  readonly clock?: () => number;
  /** 内部 event generation 失败后的退避；仅用于可重复测试和运行时调优。 */
  readonly retryDelay?: (attempt: number) => number;
  /** mux+host 双流建立 live cut 的最大等待时间。 */
  readonly openingTimeoutMs?: number;
  /** undefined 选中最近会话；null 明确保持未选择状态。 */
  readonly initialSessionId?: HarnessUiSessionId | null;
}

function abortError(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("The operation was aborted", "AbortError");
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw abortError(signal);
  }
}

async function waitWithSignal<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) {
    return promise;
  }
  throwIfAborted(signal);

  return new Promise<T>((resolve, reject) => {
    const handleAbort = () => reject(abortError(signal));
    signal.addEventListener("abort", handleAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", handleAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", handleAbort);
        reject(error);
      },
    );
  });
}

function normalizeText(text: string): string {
  return text.trim();
}

function transportSessionId(sessionId: HarnessUiSessionId): HarnessSessionId {
  // Harness 用 branded string 防止服务端内部 ID 混用；UI 合同刻意只暴露可序列化
  // string。这个 Adapter seam 是二者唯一允许互转的位置。
  return sessionId as HarnessSessionId;
}

async function preallocatedSessionId(
  commandId: string,
): Promise<HarnessSessionId> {
  const input = new TextEncoder().encode(
    `openquantum:new-session:v1:${commandId}`,
  );
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", input));
  const hex = [...digest]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return transportSessionId(`session-${hex}`);
}

function commandFingerprint(command: UiCommand): string {
  switch (command.type) {
    case "new-session":
      return JSON.stringify([command.type, command.title ?? null]);
    case "open-session":
      return JSON.stringify([command.type, command.sessionId]);
    case "prompt":
      return JSON.stringify([
        command.type,
        command.sessionId,
        command.clientMessageId,
        command.text,
      ]);
    case "cancel":
      return JSON.stringify([command.type, command.sessionId]);
    case "answer-interaction":
      return JSON.stringify([
        command.type,
        command.sessionId,
        command.interactionId,
        command.response,
      ]);
    default:
      return JSON.stringify(command);
  }
}

function successReceipt(
  commandId: string,
  revision: WorkspaceRevision,
  result: Extract<CommandReceipt, { accepted: true }>["result"],
): CommandReceipt {
  return Object.freeze({
    accepted: true as const,
    commandId,
    revision,
    result: Object.freeze({ ...result }),
  });
}

function failureReceipt(
  commandId: string,
  revision: WorkspaceRevision,
  code: CommandFailureCode,
  message: string,
): CommandReceipt {
  return Object.freeze({
    accepted: false as const,
    commandId,
    revision,
    error: Object.freeze({ code, message }),
  });
}

function freezeConnection(
  status: WorkspaceConnectionStatus,
  detail?: string,
): WorkspaceConnection {
  return Object.freeze(detail ? { status, detail } : { status });
}

function freezeCause(cause: UiEventCause): UiEventCause {
  return Object.freeze({ ...cause });
}

function transportMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isSessionNotFound(error: unknown): boolean {
  if (!(error instanceof Error) || !("code" in error)) {
    return false;
  }

  const normalizedCode = String(error.code)
    .toLowerCase()
    .replaceAll(/[-_]/g, "");
  return (
    normalizedCode === "sessionnotfound" ||
    /session.+not found|找不到会话/i.test(error.message)
  );
}

function isHarnessTransportError(
  error: unknown,
  code: string,
): error is HarnessTransportError {
  return (
    error instanceof Error &&
    "code" in error &&
    String(error.code) === code
  );
}

function requestFingerprint(
  request: Extract<
    HarnessUiEvent,
    { type: "interaction-requested" }
  >["request"],
): string {
  return JSON.stringify(request);
}

function wireInteractionKey(
  kind: "approval" | "questions",
  rpcId: RpcId,
): string {
  return `${kind}:${String(rpcId)}`;
}

function wireApprovalKey(
  sessionId: HarnessUiSessionId,
  approvalId: unknown,
): string {
  return `${sessionId}:${String(approvalId)}`;
}

function freezePendingInteraction(
  interaction: PendingInteraction,
): PendingInteraction {
  if (interaction.kind === "approval") {
    return Object.freeze({ ...interaction });
  }

  return Object.freeze({
    ...interaction,
    questions: Object.freeze(
      interaction.questions.map((question) =>
        Object.freeze({
          ...question,
          options: Object.freeze(
            question.options.map((option) => Object.freeze({ ...option })),
          ),
        }),
      ),
    ),
  });
}

function opaqueId(
  scope: "interaction" | "question" | "option" | "runtime-error",
  seed: string,
): string {
  // Two independent 32-bit hashes give deterministic, non-embedding browser
  // identities without pulling Node crypto into the client bundle. Collisions
  // are checked against the private registry and fail closed.
  let left = 0x811c9dc5;
  let right = 0x9e3779b9;
  for (let index = 0; index < seed.length; index += 1) {
    const code = seed.charCodeAt(index);
    left = Math.imul(left ^ code, 0x01000193);
    right = Math.imul(right ^ (code + index), 0x85ebca6b);
  }
  return `${scope}-${(left >>> 0).toString(36)}${(right >>> 0).toString(36)}`;
}

function unresolvedPromptClientKey(
  sessionId: HarnessUiSessionId,
  clientMessageId: string,
): string {
  return JSON.stringify([sessionId, clientMessageId]);
}

function unresolvedPromptRpcKey(
  sessionId: HarnessUiSessionId,
  rpcId: RpcId,
): string {
  return JSON.stringify([sessionId, rpcId]);
}

/**
 * DeepSeek Harness 的生产 Adapter。
 *
 * Harness HTTP/WebSocket、事件缺口恢复、optimistic 消息对账和 UI revision
 * 全部收敛在这里。UI 只接触 HarnessUiPort 的三个操作。
 */
export class DeepSeekHarnessAdapterCore implements HarnessUiPort {
  private readonly transport: HarnessTransport;
  private readonly clock: () => number;
  private readonly retryDelay: (attempt: number) => number;
  private readonly openingTimeoutMs: number;
  private readonly requestedInitialSessionId:
    | HarnessUiSessionId
    | null
    | undefined;
  private readonly sessions = new Map<HarnessUiSessionId, MutableSession>();
  /** Persisted-directory membership is distinct from the retained active view. */
  private readonly directoryMembers = new Set<HarnessUiSessionId>();
  private readonly commandLedger = new Map<string, CommandLedgerEntry>();
  private readonly inFlightCommands = new Map<string, InFlightCommand>();
  private readonly unresolvedPrompts = new Map<
    string,
    UnresolvedPromptReservation
  >();
  private readonly unresolvedPromptByClient = new Map<string, string>();
  private readonly unresolvedPromptByRpc = new Map<string, string>();
  // host/session-removed detaches live runtime state; it does not necessarily
  // delete the persisted session. The removal generation only rejects list
  // cuts captured before the detach. A later authoritative list decides
  // whether the session remains available as a cold session.
  private readonly directoryRemovals = new Map<
    HarnessUiSessionId,
    DirectoryRemoval
  >();
  private readonly pendingCreates = new Map<
    HarnessUiSessionId,
    PendingCreateAttempt
  >();
  private readonly eventHistory: UiEvent[] = [];
  private readonly subscribers = new Set<EventSubscriber>();
  /** Host does not replay agent-error, so unknown-session occurrences survive
   * transport generations until a post-cut directory baseline assigns or
   * rejects them. The map is latest-per-session and globally bounded. */
  private readonly runtimeErrorQuarantine = new Map<
    HarnessUiSessionId,
    RuntimeErrorOccurrence
  >();

  // Host interactions are transient. Raw IDs and wire payloads live only in this
  // generation-scoped private registry; snapshots expose opaque local identities.
  private interactionRegistry: InteractionRegistry = {
    byUiId: new Map(),
    byWireKey: new Map(),
    byApprovalKey: new Map(),
  };

  private activeSessionId: HarnessUiSessionId | null = null;
  private connectionStatus: WorkspaceConnectionStatus = "reconnecting";
  private connectionDetail: string | undefined;
  private revision = 0;
  private historyFloorRevision = 0;
  private promptOrdinal = 0;
  private interactionGeneration = 0;
  private activeIntentOrder = 0;
  private eventPumpOrder = 0;
  private eventFoldGeneration = 0;
  private runtimeEventOrder = 0;
  private runtimeErrorOccurrence = 0;
  private detachedOrder = 0;
  private sessionLifecycle = 0;
  private directoryGeneration = 0;
  private directoryDirtyEpoch = 0;
  private directoryBaselineOrder = 0;
  private baselineAuthorityEpoch = 0;
  private initialization: Promise<void> | undefined;
  private mutationTail: Promise<void> = Promise.resolve();
  private eventPump: EventPump | undefined;
  private directoryRefreshTask: DirectoryRefreshTask | undefined;

  constructor(options: DeepSeekHarnessAdapterCoreOptions) {
    this.transport = options.transport;
    this.clock = options.clock ?? (() => Date.now());
    this.retryDelay =
      options.retryDelay ??
      ((attempt) => Math.min(10_000, 500 * 2 ** Math.max(0, attempt - 1)));
    this.openingTimeoutMs = options.openingTimeoutMs ?? 3_000;
    this.requestedInitialSessionId = options.initialSessionId;
  }

  async snapshot(signal?: AbortSignal): Promise<WorkspaceSnapshot> {
    const pump = await this.runMutation(() => this.eventPump);
    if (pump && !pump.controller.signal.aborted) {
      await waitWithSignal(pump.ready, signal);
    } else {
      await waitWithSignal(this.ensureInitialized(), signal);
    }
    throwIfAborted(signal);
    return this.buildSnapshot();
  }

  async command(
    command: UiCommand,
    signal?: AbortSignal,
  ): Promise<CommandReceipt> {
    throwIfAborted(signal);

    return this.executeCommandTwoPhase(command, signal);
  }

  private async executeCommandTwoPhase(
    command: UiCommand,
    signal?: AbortSignal,
  ): Promise<CommandReceipt> {
    const fingerprint = commandFingerprint(command);
    const start = await this.runMutation(() =>
      this.beginCommand(command, fingerprint),
    );
    if (start.kind === "immediate") return start.receipt;
    if (start.kind === "wait") return waitWithSignal(start.promise, signal);

    let receipt: CommandReceipt;
    try {
      receipt = await this.applyCommand(command, signal);
    } catch (error) {
      if (signal?.aborted) {
        receipt = failureReceipt(
          command.commandId,
          this.revision,
          "COMMAND_OUTCOME_UNKNOWN",
          "命令在完成前被取消，远端结果未知。",
        );
      } else {
        receipt = this.transportFailure(command.commandId, error);
      }
    }

    await this.runMutation(() => {
      const outcome = start.entry.promptOutcome;
      if (command.type === "prompt" && outcome?.durable) {
        receipt = successReceipt(command.commandId, this.revision, {
          type: "prompt-queued",
          sessionId: outcome.sessionId,
          messageId: outcome.messageId,
        });
      }
      const reservation = this.unresolvedPrompts.get(command.commandId);
      if (reservation && reservation.fingerprint === fingerprint) {
        reservation.receipt = receipt;
        if (outcome) reservation.outcome = outcome;
      }
      if (
        receipt.accepted ||
        (receipt.error.code !== "RUNTIME_UNAVAILABLE" &&
          receipt.error.code !== "COMMAND_OUTCOME_UNKNOWN")
      ) {
        this.rememberCommand(command.commandId, fingerprint, receipt, outcome);
      } else if (receipt.error.code === "COMMAND_OUTCOME_UNKNOWN") {
        // Unknown outcome is cached so replaying the same id does not duplicate
        // a possibly accepted remote command.
        this.rememberCommand(command.commandId, fingerprint, receipt, outcome);
      }
      if (command.type === "prompt" && outcome?.durable) {
        this.releaseUnresolvedPrompt(command.commandId);
      }
      this.inFlightCommands.delete(command.commandId);
      start.entry.resolve(receipt);
    });
    return receipt;
  }

  async *events(
    afterRevision: WorkspaceRevision | null,
    signal: AbortSignal,
  ): AsyncIterable<UiEvent> {
    if (
      afterRevision !== null &&
      (!Number.isSafeInteger(afterRevision) || afterRevision < 0)
    ) {
      throw new RangeError("afterRevision must be a non-negative safe integer");
    }
    let subscriber: EventSubscriber | undefined;
    let owningPump: EventPump | undefined;
    const unregister = async (): Promise<void> => {
      const target = subscriber;
      if (!target) return;
      target.closed = true;
      target.wake?.();
      target.wake = undefined;
      await this.runMutation(() => {
        if (!this.subscribers.delete(target)) return;
        const pump = this.eventPump;
        if (this.subscribers.size === 0 && pump) {
          const before = this.projectionFingerprint();
          this.resetInteractionGeneration();
          if (pump.generation) {
            this.clearBufferedInteractions(pump.generation);
          }
          pump.controller.abort();
          pump.generation?.controller.abort();
          pump.isReady = false;
          this.connectionStatus = "offline";
          this.connectionDetail = "实时事件订阅已关闭。";
          this.directoryRemovals.clear();
          this.publishIfChanged(before, {
            type: "connection-changed",
            status: "offline",
          });
        }
      });
    };
    const handleAbort = () => {
      if (!subscriber) return;
      subscriber.closed = true;
      subscriber.wake?.();
      subscriber.wake = undefined;
      // An async generator may be paused at `yield` forever and never enter its
      // finally block. Abort therefore owns active, idempotent deregistration.
      void unregister();
    };
    signal.addEventListener("abort", handleAbort, { once: true });

    await this.runMutation(() => {
      if (signal.aborted) return;
      subscriber = {
        queue: [],
        closed: false,
        ready: false,
      };
      this.subscribers.add(subscriber);
      owningPump = this.ensureEventPumpLocked();
    });
    if (!subscriber) {
      signal.removeEventListener("abort", handleAbort);
      return;
    }
    const registeredSubscriber = subscriber;

    try {
      await this.waitForEventPumpReady(owningPump!, signal);
      await this.runMutation(() => {
        if (registeredSubscriber.closed || signal.aborted) return;
        if (afterRevision !== null && afterRevision > this.revision) {
          throw new RangeError(
            `afterRevision ${afterRevision} is ahead of current revision ${this.revision}`,
          );
        }
        registeredSubscriber.ready = true;
        registeredSubscriber.queue.splice(
          0,
          registeredSubscriber.queue.length,
          ...(afterRevision === null || afterRevision < this.historyFloorRevision
            ? [
                // The pump may have published post-cut frames between becoming
                // ready and this subscriber entering the projection queue.
                // Capture the full projection under the same short mutation
                // commit that marks the subscriber ready; a cached bootstrap
                // event would reopen that tiny subscription vacuum.
                this.projectionRebaseEvent(),
              ]
            : this.eventHistory.filter(
                (event) => event.revision > afterRevision,
              )),
        );
        registeredSubscriber.wake?.();
        registeredSubscriber.wake = undefined;
      });
      while (!registeredSubscriber.closed) {
        const event = registeredSubscriber.queue.shift();
        if (event) {
          yield event;
          continue;
        }

        await new Promise<void>((resolve) => {
          registeredSubscriber.wake = resolve;
        });
        registeredSubscriber.wake = undefined;
      }
    } finally {
      signal.removeEventListener("abort", handleAbort);
      await unregister();
    }
  }

  private runMutation<T>(work: () => T): Promise<T> {
    const execution = this.mutationTail.then(work);
    this.mutationTail = execution.then(
      () => undefined,
      () => undefined,
    );
    return execution;
  }

  private ensureInitialized(
    signal?: AbortSignal,
    generation?: EventGeneration,
  ): Promise<void> {
    if (!this.initialization) {
      this.initialization = this.initialize(signal, generation).finally(() => {
        if (this.connectionStatus !== "online") this.initialization = undefined;
      });
    }
    return this.initialization;
  }

  private async initialize(
    signal?: AbortSignal,
    generation?: EventGeneration,
  ): Promise<void> {
    try {
      const committed = await this.rebaselineWorkspace(signal, generation);
      if (!committed) {
        throw new Error("Harness directory changed during initial baseline.");
      }
      // A point-in-time HTTP snapshot never proves that the live Host streams
      // are open. Only an events-owned generation may transition online.
    } catch (error) {
      // 首屏仍返回一个可展示的离线投影；事件通道恢复后会重新基线。
      await this.runMutation(() => {
        if (generation && !this.isCurrentGeneration(generation)) return;
        if (
          !generation &&
          this.eventPump &&
          !this.eventPump.controller.signal.aborted
        ) {
          // A stream-owned generation superseded this point-in-time read while
          // its list request was in flight. The stale read has no authority to
          // overwrite the runtime connection projection.
          return;
        }
        const before = this.projectionFingerprint();
        this.connectionStatus = "offline";
        this.connectionDetail = transportMessage(error);
        this.publishIfChanged(before, {
          type: "connection-changed",
          status: "offline",
        });
      });
    }
  }

  private beginCommand(command: UiCommand, fingerprint: string): CommandStart {
    const unresolved = this.unresolvedPrompts.get(command.commandId);
    if (unresolved) {
      if (unresolved.fingerprint !== fingerprint) {
        return {
          kind: "immediate",
          receipt: failureReceipt(
            command.commandId,
            this.revision,
            "COMMAND_ID_CONFLICT",
            "同一个 commandId 不能表示两个不同的用户意图。",
          ),
        };
      }
      if (unresolved.receipt) {
        return { kind: "immediate", receipt: unresolved.receipt };
      }
    }
    const prior = this.commandLedger.get(command.commandId);
    if (prior) {
      if (prior.fingerprint === fingerprint) {
        // LRU touch keeps active retries within the bounded replay horizon.
        this.commandLedger.delete(command.commandId);
        this.commandLedger.set(command.commandId, prior);
        return { kind: "immediate", receipt: prior.receipt };
      }
      return {
        kind: "immediate",
        receipt: failureReceipt(
          command.commandId,
          this.revision,
          "COMMAND_ID_CONFLICT",
          "同一个 commandId 不能表示两个不同的用户意图。",
        ),
      };
    }
    const inFlight = this.inFlightCommands.get(command.commandId);
    if (inFlight) {
      return inFlight.fingerprint === fingerprint
        ? { kind: "wait", promise: inFlight.promise }
        : {
            kind: "immediate",
            receipt: failureReceipt(
              command.commandId,
              this.revision,
              "COMMAND_ID_CONFLICT",
              "同一个 commandId 不能表示两个不同的用户意图。",
            ),
          };
    }
    if (unresolved) {
      return {
        kind: "immediate",
        receipt: failureReceipt(
          command.commandId,
          this.revision,
          "COMMAND_OUTCOME_UNKNOWN",
          "该 Prompt 正在等待远端结果确认，不能重复发送。",
        ),
      };
    }
    if (!this.runtimeIsLive()) {
      return {
        kind: "immediate",
        receipt: failureReceipt(
          command.commandId,
          this.revision,
          "RUNTIME_UNAVAILABLE",
          "Harness 实时连接尚未就绪，请等待工作区恢复后重试。",
        ),
      };
    }
    let resolve!: (receipt: CommandReceipt) => void;
    const promise = new Promise<CommandReceipt>((settle) => {
      resolve = settle;
    });
    const entry = { fingerprint, promise, resolve };
    this.inFlightCommands.set(command.commandId, entry);
    return { kind: "execute", entry };
  }

  /** Must be read from the short mutation queue. */
  private runtimeIsLive(): boolean {
    const pump = this.eventPump;
    const generation = pump?.generation;
    return Boolean(
      pump &&
        this.subscribers.size > 0 &&
        !pump.controller.signal.aborted &&
        generation &&
        generation.phase === "live" &&
        this.isCurrentGeneration(generation) &&
        this.connectionStatus === "online",
    );
  }

  private rememberCommand(
    commandId: string,
    fingerprint: string,
    receipt: CommandReceipt,
    promptOutcome?: PromptOutcome,
  ): void {
    this.commandLedger.delete(commandId);
    this.commandLedger.set(commandId, {
      fingerprint,
      receipt,
      ...(promptOutcome ? { promptOutcome } : {}),
    });
    while (this.commandLedger.size > COMMAND_REPLAY_WINDOW) {
      const oldest = this.commandLedger.keys().next().value;
      if (oldest === undefined) break;
      this.commandLedger.delete(oldest);
    }
  }

  private pruneUncertainPrompts(session: MutableSession): void {
    const uncertain = session.pendingPrompts
      .filter(
        (pending) =>
          pending.state === "staged" &&
          pending.uncertain &&
          pending.uncertainAt !== undefined,
      )
      .sort(
        (left, right) =>
          left.uncertainAt! - right.uncertainAt! ||
          left.ordinal - right.ordinal,
      );
    const excess = uncertain.length - MAX_UNCERTAIN_PROMPTS_PER_SESSION;
    if (excess <= 0) return;
    const evicted = new Set(uncertain.slice(0, excess));
    session.pendingPrompts = session.pendingPrompts.filter(
      (pending) => !evicted.has(pending),
    );
  }

  /** Must be called from the short mutation queue. */
  private releaseUnresolvedPrompt(commandId: string): void {
    const reservation = this.unresolvedPrompts.get(commandId);
    if (!reservation) return;
    this.unresolvedPrompts.delete(commandId);
    const clientKey = unresolvedPromptClientKey(
      reservation.sessionId,
      reservation.clientMessageId,
    );
    if (this.unresolvedPromptByClient.get(clientKey) === commandId) {
      this.unresolvedPromptByClient.delete(clientKey);
    }
    if (reservation.outcome) {
      const rpcKey = unresolvedPromptRpcKey(
        reservation.sessionId,
        reservation.outcome.rpcId,
      );
      if (this.unresolvedPromptByRpc.get(rpcKey) === commandId) {
        this.unresolvedPromptByRpc.delete(rpcKey);
      }
    }
  }

  /** A successful authoritative directory absence may retire unresolved work. */
  private releaseUnresolvedPromptsForSession(
    sessionId: HarnessUiSessionId,
  ): void {
    for (const [commandId, reservation] of this.unresolvedPrompts) {
      if (reservation.sessionId === sessionId) {
        this.releaseUnresolvedPrompt(commandId);
      }
    }
  }

  /**
   * A lower authoritative sequence cut proves that the Host reused the same
   * session id for a different runtime lifecycle. Correlation owned by the old
   * lifecycle must not rename or mutate messages that later arrive for the new
   * one. Keep the command receipt for bounded replay, but strip every prompt
   * correlation that could cross that lifecycle boundary.
   */
  private clearPromptCorrelationsForFreshLifecycle(
    sessionId: HarnessUiSessionId,
  ): void {
    this.releaseUnresolvedPromptsForSession(sessionId);
    for (const [commandId, record] of this.commandLedger) {
      if (record.promptOutcome?.sessionId !== sessionId) continue;
      this.commandLedger.set(commandId, {
        fingerprint: record.fingerprint,
        receipt: record.receipt,
      });
    }
    for (const entry of this.inFlightCommands.values()) {
      if (entry.promptOutcome?.sessionId === sessionId) {
        entry.promptOutcome = undefined;
      }
    }
  }

  private async applyCommand(
    command: UiCommand,
    signal?: AbortSignal,
  ): Promise<CommandReceipt> {
    switch (command.type) {
      case "new-session":
        return this.createSession(command, signal);
      case "open-session":
        return this.openSession(command, signal);
      case "prompt":
        return this.prompt(command, signal);
      case "cancel":
        return this.cancel(command, signal);
      case "answer-interaction":
        return this.answerInteraction(command, signal);
      default:
        return failureReceipt(
          (command as UiCommand).commandId,
          this.revision,
          "RUNTIME_UNAVAILABLE",
          `当前生产 Adapter 尚不支持命令 ${(command as { type: string }).type}。`,
        );
    }
  }

  private async createSession(
    command: Extract<UiCommand, { type: "new-session" }>,
    signal?: AbortSignal,
  ): Promise<CommandReceipt> {
    let lifecycle:
      | {
          readonly sessionId: HarnessSessionId;
          readonly attempt: PendingCreateAttempt;
        }
      | undefined;
    try {
      const intentOrder = await this.runMutation(
        () => ++this.activeIntentOrder,
      );
      const requestedSessionId = await preallocatedSessionId(command.commandId);
      const attempt = await this.runMutation(() => {
        const created: PendingCreateAttempt = {
          sessionId: requestedSessionId,
          removed: false,
        };
        this.pendingCreates.set(requestedSessionId, created);
        return created;
      });
      lifecycle = { sessionId: requestedSessionId, attempt };
      const sessionId = await this.transport.createSession(
        requestedSessionId,
        signal,
      );
      const now = this.clock();
      return await this.runMutation(() => {
        const existing = this.sessions.get(sessionId);
        if (
          attempt.removed &&
          (!existing || !existing.directoryConfirmed)
        ) {
          this.pendingCreates.delete(requestedSessionId);
          this.directoryDirtyEpoch += 1;
          return failureReceipt(
            command.commandId,
            this.revision,
            "SESSION_NOT_FOUND",
            "会话在创建回执返回前已被 Host 删除。",
          );
        }
        if (!existing) {
          this.sessions.set(sessionId, {
            id: sessionId,
            title: command.title?.trim() || "新对话",
            updatedAt: now,
            running: false,
            blank: true,
            directoryConfirmed: false,
            createdDirectoryGeneration: this.directoryGeneration + 1,
            loaded: true,
            lastSequence: -1,
            targetSequence: -1,
            statusEpoch: 0,
            stateVersion: 0,
            titleEpoch: 0,
            updatedAtEpoch: 0,
            blankEpoch: 0,
            lifecycle: ++this.sessionLifecycle,
            durableMessages: [],
            scientificActivities: [],
            pendingPrompts: [],
          });
        }
        this.directoryMembers.add(sessionId);
        this.pendingCreates.delete(requestedSessionId);
        this.directoryRemovals.delete(sessionId);
        this.directoryGeneration += 1;
        this.directoryDirtyEpoch += 1;
        if (intentOrder === this.activeIntentOrder) {
          this.activeSessionId = sessionId;
          this.releaseDetachedResidentsExcept(sessionId);
        }
        const generation = this.eventPump?.generation;
        if (generation && this.isCurrentGeneration(generation)) {
          this.flushBufferedInteractions(generation, sessionId);
          this.flushRuntimeErrorQuarantine(sessionId);
        }
        const revision = this.publish({
          type: "session-created",
          sessionId,
          commandId: command.commandId,
        });
        return successReceipt(command.commandId, revision, {
          type: "session-created",
          sessionId,
        });
      });
    } catch (error) {
      await this.runMutation(() => {
        if (
          lifecycle &&
          this.pendingCreates.get(lifecycle.sessionId) === lifecycle.attempt
        ) {
          this.pendingCreates.delete(lifecycle.sessionId);
        }
      });
      throwIfAborted(signal);
      return this.transportFailure(command.commandId, error);
    }
  }

  private async openSession(
    command: Extract<UiCommand, { type: "open-session" }>,
    signal?: AbortSignal,
  ): Promise<CommandReceipt> {
    const target = await this.runMutation(() => {
      const session = this.eligibleSession(command.sessionId);
      return session
        ? {
            session,
            statusEpoch: session.statusEpoch,
            targetSequence: session.targetSequence,
            intentOrder: ++this.activeIntentOrder,
          }
        : undefined;
    });
    if (!target) {
      return failureReceipt(
        command.commandId,
        this.revision,
        "SESSION_NOT_FOUND",
        `找不到会话 ${command.sessionId}。`,
      );
    }

    try {
      const conversation = await this.getSnapshotAtLeast(
        command.sessionId,
        target.targetSequence,
        signal,
      );
      return await this.runMutation(() => {
        const session = this.eligibleSession(command.sessionId);
        if (!session || session !== target.session) {
          return failureReceipt(
            command.commandId,
            this.revision,
            "SESSION_NOT_FOUND",
            `找不到会话 ${command.sessionId}。`,
          );
        }
        const before = this.projectionFingerprint();
        const changes = this.applyConversationIfFresh(
          session,
          conversation,
          target.statusEpoch,
        );
        if (
          target.intentOrder === this.activeIntentOrder &&
          this.activeSessionId !== command.sessionId
        ) {
          this.activeSessionId = command.sessionId;
          this.releaseDetachedResidentsExcept(command.sessionId);
        }
        this.publishIfChanged(before, {
          type: "session-opened",
          sessionId: command.sessionId,
          commandId: command.commandId,
        });
        this.upgradeDurablePromptReceipts(
          session,
          changes.durableCommandIds,
          this.revision,
        );
        return successReceipt(command.commandId, this.revision, {
          type: "session-opened",
          sessionId: command.sessionId,
        });
      });
    } catch (error) {
      throwIfAborted(signal);
      await this.removeDefinitivelyMissingSession(
        command.sessionId,
        error,
        target.session,
      );
      return this.transportFailure(command.commandId, error);
    }
  }

  private async prompt(
    command: Extract<UiCommand, { type: "prompt" }>,
    signal?: AbortSignal,
  ): Promise<CommandReceipt> {
    const promptFingerprint = commandFingerprint(command);
    const text = normalizeText(command.text);
    if (!text) {
      return failureReceipt(
        command.commandId,
        this.revision,
        "EMPTY_PROMPT",
        "消息内容不能为空。",
      );
    }
    const clientMessageId = command.clientMessageId.trim();
    if (!clientMessageId) {
      return failureReceipt(
        command.commandId,
        this.revision,
        "CLIENT_MESSAGE_ID_CONFLICT",
        "clientMessageId 不能为空。",
      );
    }

    const intentOrder = await this.runMutation(() => ++this.activeIntentOrder);

    const preloadTarget = await this.runMutation(() => {
      const session = this.eligibleSession(command.sessionId);
      return session
        ? {
            session,
            unloaded: !session.loaded,
            statusEpoch: session.statusEpoch,
            targetSequence: session.targetSequence,
          }
        : undefined;
    });
    if (!preloadTarget) {
      return failureReceipt(
        command.commandId,
        this.revision,
        "SESSION_NOT_FOUND",
        `找不到会话 ${command.sessionId}。`,
      );
    }
    if (preloadTarget.unloaded) {
      try {
        const conversation = await this.getSnapshotAtLeast(
          command.sessionId,
          preloadTarget.targetSequence,
          signal,
        );
        const applied = await this.runMutation(() => {
          const session = this.eligibleSession(command.sessionId);
          if (session !== preloadTarget.session) return false;
          const before = this.projectionFingerprint();
          const changes = this.applyConversationIfFresh(
            session,
            conversation,
            preloadTarget.statusEpoch,
          );
          this.publishIfChanged(before, {
            type: "session-refreshed",
            sessionId: command.sessionId,
          });
          this.upgradeDurablePromptReceipts(
            session,
            changes.durableCommandIds,
            this.revision,
          );
          return true;
        });
        if (!applied) {
          return failureReceipt(
            command.commandId,
            this.revision,
            "SESSION_NOT_FOUND",
            `会话 ${command.sessionId} 在加载期间已被替换。`,
          );
        }
      } catch (error) {
        throwIfAborted(signal);
        await this.removeDefinitivelyMissingSession(
          command.sessionId,
          error,
          preloadTarget.session,
        );
        return this.transportFailure(command.commandId, error);
      }
    }

    // staged 状态供并发到达的 Harness durable echo 对账，但在 RPC 成功之前不进入
    // UI 投影。这样失败的 prompt 不会留下虚假的 optimistic 消息。
    const staged = await this.runMutation(() => {
      const session = this.eligibleSession(command.sessionId);
      if (!session) {
        return failureReceipt(
          command.commandId,
          this.revision,
          "SESSION_NOT_FOUND",
          `找不到会话 ${command.sessionId}。`,
        );
      }
      const clientKey = unresolvedPromptClientKey(
        command.sessionId,
        clientMessageId,
      );
      const reservedCommandId = this.unresolvedPromptByClient.get(clientKey);
      if (reservedCommandId) {
        const reservation = this.unresolvedPrompts.get(reservedCommandId);
        return failureReceipt(
          command.commandId,
          this.revision,
          reservation?.text === text
            ? "COMMAND_OUTCOME_UNKNOWN"
            : "CLIENT_MESSAGE_ID_CONFLICT",
          reservation?.text === text
            ? "相同 clientMessageId 的上一条 Prompt 仍在等待远端确认。"
            : "同一个 clientMessageId 不能表示两条不同的消息。",
        );
      }
      const existingPending = session.pendingPrompts.find(
        (pending) => pending.clientMessageId === clientMessageId,
      );
      const existingDurable = session.durableMessages.find(
        (message) => message.id === clientMessageId,
      );
      const existing = existingPending ?? existingDurable;
      if (existing) {
        if (
          "state" in existing &&
          existing.state === "staged" &&
          existing.uncertain
        ) {
          return failureReceipt(
            command.commandId,
            this.revision,
            "COMMAND_OUTCOME_UNKNOWN",
            "相同 clientMessageId 的上一条 Prompt 结果仍未知。",
          );
        }
        return existing.text !== text ||
          ("role" in existing && existing.role !== "user")
          ? failureReceipt(
              command.commandId,
              this.revision,
              "CLIENT_MESSAGE_ID_CONFLICT",
              "同一个 clientMessageId 不能表示两条不同的消息。",
            )
          : successReceipt(command.commandId, this.revision, {
              type: "prompt-queued",
              sessionId: command.sessionId,
              messageId: clientMessageId,
            });
      }
      if (
        this.unresolvedPrompts.size >=
        MAX_UNRESOLVED_PROMPT_RESERVATIONS
      ) {
        return failureReceipt(
          command.commandId,
          this.revision,
          "RUNTIME_UNAVAILABLE",
          "尚有过多 Prompt 等待 Harness 确认；为避免重复发送，暂不接受新 Prompt。",
        );
      }
      const pending: PendingPrompt = {
        commandId: command.commandId,
        clientMessageId,
        text,
        displayAfterSequence: session.lastSequence,
        createdAt: this.clock(),
        ordinal: ++this.promptOrdinal,
        state: "staged",
      };
      session.pendingPrompts.push(pending);
      const reservation: UnresolvedPromptReservation = {
        commandId: command.commandId,
        fingerprint: promptFingerprint,
        sessionId: command.sessionId,
        clientMessageId,
        text,
        pending,
        session,
        sessionLifecycle: session.lifecycle,
      };
      this.unresolvedPrompts.set(command.commandId, reservation);
      this.unresolvedPromptByClient.set(clientKey, command.commandId);
      return { pending, intentOrder, reservation };
    });
    if ("accepted" in staged) return staged;
    const pending = staged.pending;

    let started: ReturnType<HarnessTransport["startPrompt"]>;
    try {
      started = this.transport.startPrompt(
        transportSessionId(command.sessionId),
        text,
        signal,
      );
      await this.runMutation(() => {
        const session = this.eligibleSession(command.sessionId);
        const reservation = this.unresolvedPrompts.get(command.commandId);
        if (
          reservation !== staged.reservation
        ) {
          return;
        }
        const outcome: PromptOutcome = {
          sessionId: command.sessionId,
          messageId: clientMessageId,
          rpcId: started.rpcId,
          createdAt: pending.createdAt,
          durable: false,
        };
        const rpcKey = unresolvedPromptRpcKey(
          command.sessionId,
          started.rpcId,
        );
        const priorCommandId = this.unresolvedPromptByRpc.get(rpcKey);
        if (priorCommandId && priorCommandId !== command.commandId) {
          throw new Error(
            "Harness reused a Prompt rpcId for two unresolved commands.",
          );
        }
        reservation.outcome = outcome;
        this.unresolvedPromptByRpc.set(rpcKey, command.commandId);
        if (
          session === staged.reservation.session &&
          session.lifecycle === staged.reservation.sessionLifecycle &&
          session.pendingPrompts.includes(pending)
        ) {
          pending.transportRpcId = started.rpcId;
        }
        const inFlight = this.inFlightCommands.get(command.commandId);
        if (!inFlight) return;
        inFlight.promptOutcome = outcome;
      });
      await started.completion;
    } catch (error) {
      if (
        error instanceof HarnessTransportError &&
        error.code !== "internal"
      ) {
        await this.runMutation(() => {
          const session = this.eligibleSession(command.sessionId);
          if (session) {
            session.pendingPrompts = session.pendingPrompts.filter(
              (candidate) => candidate !== pending,
            );
          }
          const inFlight = this.inFlightCommands.get(command.commandId);
          if (inFlight) inFlight.promptOutcome = undefined;
          this.releaseUnresolvedPrompt(command.commandId);
        });
        await this.removeDefinitivelyMissingSession(
          command.sessionId,
          error,
          staged.reservation.session,
        );
        return this.transportFailure(command.commandId, error);
      }
      const durable = await this.runMutation(() => {
        const session = this.eligibleSession(command.sessionId);
        if (!session) return false;
        const before = this.projectionFingerprint();
        this.reconcilePendingByRpcId(session, pending);
        if (pending.state === "durable") {
          this.publishIfChanged(before, {
            type: "prompt-durable",
            sessionId: command.sessionId,
            messageId: clientMessageId,
          });
          return true;
        }
        pending.uncertain = true;
        pending.uncertainAt = this.clock();
        this.pruneUncertainPrompts(session);
        // Keep exact correlation for a later history event; uncertain staged
        // prompts remain hidden and are bounded with the prompt list.
        return false;
      });
      if (durable) {
        return successReceipt(command.commandId, this.revision, {
          type: "prompt-queued",
          sessionId: command.sessionId,
          messageId: clientMessageId,
        });
      }
      return failureReceipt(
        command.commandId,
        this.revision,
        "COMMAND_OUTCOME_UNKNOWN",
        `Prompt 结果未知：${transportMessage(error)}`,
      );
    }

    return this.runMutation(() => {
      const session = this.eligibleSession(command.sessionId);
      if (
        session !== staged.reservation.session ||
        session.lifecycle !== staged.reservation.sessionLifecycle ||
        !session.pendingPrompts.includes(pending)
      ) {
        return successReceipt(command.commandId, this.revision, {
          type: "prompt-queued",
          sessionId: command.sessionId,
          messageId: clientMessageId,
        });
      }
      const before = this.projectionFingerprint();
      this.reconcilePendingByRpcId(session, pending);
      if (staged.intentOrder === this.activeIntentOrder) {
        this.activeSessionId = command.sessionId;
        this.releaseDetachedResidentsExcept(command.sessionId);
      }
        if (pending.state === "staged") {
          pending.state = "visible";
          this.setSessionRunning(session, true);
          session.blank = false;
          session.blankEpoch += 1;
          session.updatedAt = this.clock();
          session.updatedAtEpoch += 1;
          session.stateVersion += 1;
      }
      this.publishIfChanged(before, {
        type: pending.state === "visible" ? "prompt-pending" : "prompt-durable",
        sessionId: command.sessionId,
        ...(pending.state === "visible"
          ? { commandId: command.commandId }
          : {}),
        messageId: clientMessageId,
      } as UiEventCause);
      return successReceipt(command.commandId, this.revision, {
        type: "prompt-queued",
        sessionId: command.sessionId,
        messageId: clientMessageId,
      });
    });
  }

  private async cancel(
    command: Extract<UiCommand, { type: "cancel" }>,
    signal?: AbortSignal,
  ): Promise<CommandReceipt> {
    if (!this.eligibleSession(command.sessionId)) {
      return failureReceipt(
        command.commandId,
        this.revision,
        "SESSION_NOT_FOUND",
        `找不到会话 ${command.sessionId}。`,
      );
    }

    try {
      await this.transport.cancel(transportSessionId(command.sessionId), signal);
      return await this.runMutation(() => {
        if (!this.eligibleSession(command.sessionId)) {
          return failureReceipt(
            command.commandId,
            this.revision,
            "SESSION_NOT_FOUND",
            `找不到会话 ${command.sessionId}。`,
          );
        }
        // 接收 cancel 不等于 Harness 已经停止；running 只随 Host 权威事件改变。
        const revision = this.publish({
          type: "cancel-requested",
          sessionId: command.sessionId,
          commandId: command.commandId,
        });
        return successReceipt(command.commandId, revision, {
          type: "cancel-requested",
          sessionId: command.sessionId,
        });
      });
    } catch (error) {
      throwIfAborted(signal);
      await this.removeDefinitivelyMissingSession(command.sessionId, error);
      return this.transportFailure(command.commandId, error);
    }
  }

  private async answerInteraction(
    command: AnswerInteractionCommand,
    signal?: AbortSignal,
  ): Promise<CommandReceipt> {
    const prepared = await this.runMutation(() => {
      if (!this.eligibleSession(command.sessionId)) {
        return {
          receipt: failureReceipt(
            command.commandId,
            this.revision,
            "SESSION_NOT_FOUND",
            `找不到会话 ${command.sessionId}。`,
          ),
        };
      }
      const raw = this.interactionRegistry.byUiId.get(command.interactionId);
      if (!raw || raw.sessionId !== command.sessionId) {
        return {
          receipt: failureReceipt(
            command.commandId,
            this.revision,
            "INTERACTION_NOT_PENDING",
            "该交互已处理或不再等待回答。",
          ),
        };
      }
      return { raw, generation: this.interactionGeneration };
    });
    if (prepared.receipt) return prepared.receipt;
    if (prepared.raw.projection.kind !== command.response.kind) {
      return failureReceipt(
        command.commandId,
        this.revision,
        "INTERACTION_TYPE_MISMATCH",
        "回答类型与当前交互不匹配。",
      );
    }
    if (
      command.response.kind === "approval" &&
      command.response.decision === "allow-once"
    ) {
      return failureReceipt(
        command.commandId,
        this.revision,
        "APPROVAL_CONTEXT_UNAVAILABLE",
        "当前审批卡缺少完整操作参数，不能安全放行；你仍可拒绝该操作。",
      );
    }

    const response = this.buildInteractionResponse(
      prepared.raw,
      command.response,
    );
    if ("error" in response) {
      return failureReceipt(
        command.commandId,
        this.revision,
        "INVALID_INTERACTION_ANSWER",
        response.error,
      );
    }

    try {
      await this.transport.respondToInteraction(response.value, signal);
      // Carrier acceptance is not Host resolution. Keep the card until the
      // matching resolved frame arrives so the UI never invents settled state.
      // A resolved frame may legitimately win the race with this HTTP receipt;
      // carrier success remains success even when the card is already gone.
      return await this.runMutation(() =>
        successReceipt(command.commandId, this.revision, {
          type: "interaction-response-accepted",
          sessionId: command.sessionId,
          interactionId: command.interactionId,
        }),
      );
    } catch (error) {
      if (
        signal?.aborted ||
        error instanceof HarnessTransportOutcomeUnknownError
      ) {
        return failureReceipt(
          command.commandId,
          this.revision,
          "COMMAND_OUTCOME_UNKNOWN",
          "交互回答已发出，但 Harness 接收结果未知。",
        );
      }
      if (isHarnessTransportError(error, "not-pending")) {
        return this.runMutation(() => {
          if (
            this.interactionGeneration === prepared.generation &&
            this.interactionRegistry.byUiId.get(command.interactionId) ===
              prepared.raw
          ) {
            this.removeInteraction(command.interactionId);
          }
          return failureReceipt(
            command.commandId,
            this.revision,
            "INTERACTION_NOT_PENDING",
            "该交互已处理或不再等待回答。",
          );
        });
      }
      if (isHarnessTransportError(error, "bad-response")) {
        // Keep the pending card; the human can correct and resubmit.
        return failureReceipt(
          command.commandId,
          this.revision,
          "INVALID_INTERACTION_ANSWER",
          transportMessage(error),
        );
      }
      return this.transportFailure(command.commandId, error);
    }
  }

  private buildInteractionResponse(
    raw: RawInteraction,
    response: AnswerInteractionCommand["response"],
  ):
    | { readonly value: HarnessInteractionResponse }
    | { readonly error: string } {
    if (raw.request.type === "approval/requested") {
      if (response.kind !== "approval") {
        return { error: "回答类型与当前交互不匹配。" };
      }
      return {
        value: {
          type: "approval",
          rpcId: raw.rpcId,
          value: {
            sessionId: raw.request.sessionId,
            approvalId: raw.request.approvalId,
            outcome:
              response.decision === "allow-once" ? "allowed-once" : "rejected",
          },
        },
      };
    }

    if (response.kind !== "questions") {
      return { error: "回答类型与当前交互不匹配。" };
    }
    if (response.action === "cancel") {
      return { value: { type: "question-cancel", rpcId: raw.rpcId } };
    }

    const questionRequest = raw.request;
    const projected = raw.projection;
    if (projected.kind !== "questions") {
      return { error: "回答类型与当前交互不匹配。" };
    }
    const validation = validateQuestionAnswers(projected, response.answers);
    if (!validation.valid) {
      return { error: validation.message };
    }

    const questionsByLocalId = new Map(
      projected.questions.map((question, index) => [question.id, index]),
    );
    const wireAnswers = validation.answers.map((answer) => {
      const questionIndex = questionsByLocalId.get(answer.questionId)!;
      const wireQuestion = questionRequest.questions[questionIndex]!;
      const projectedQuestion = projected.questions[questionIndex]!;
      const optionsByLocalId = new Map(
        projectedQuestion.options.map((option, index) => [option.id, index]),
      );
      return {
        id: wireQuestion.id,
        selected: answer.optionIds.map(
          (optionId) =>
            wireQuestion.options?.[optionsByLocalId.get(optionId)!]?.label ?? "",
        ),
        ...(answer.custom === undefined ? {} : { custom: answer.custom }),
      };
    });

    return {
      value: {
        type: "question",
        rpcId: raw.rpcId,
        value: {
          sessionId: questionRequest.sessionId,
          answer: { answers: wireAnswers },
        },
      },
    };
  }

  private transportFailure(commandId: string, error: unknown): CommandReceipt {
    return failureReceipt(
      commandId,
      this.revision,
      isSessionNotFound(error) ? "SESSION_NOT_FOUND" : "RUNTIME_UNAVAILABLE",
      transportMessage(error),
    );
  }

  private async removeDefinitivelyMissingSession(
    sessionId: HarnessUiSessionId,
    error: unknown,
    expected?: MutableSession,
  ): Promise<void> {
    if (!isSessionNotFound(error)) return;
    await this.runMutation(() => {
      const current = this.sessions.get(sessionId);
      if (!current || (expected && current !== expected)) return;
      this.removeSessionFromDirectory(sessionId);
      const generation = this.eventPump?.generation;
      if (generation && this.isCurrentGeneration(generation)) {
        this.startDirectoryRefreshLocked(generation);
      }
    });
  }

  private async rebaselineWorkspace(
    signal?: AbortSignal,
    generation?: EventGeneration,
    awaitActive = false,
  ): Promise<boolean> {
    const baseline = await this.runMutation(() => {
      if (generation && !this.isCurrentGeneration(generation)) return undefined;
      return {
        authorityEpoch: this.baselineAuthorityEpoch,
        cutOrder: ++this.directoryBaselineOrder,
        directoryGeneration: this.directoryGeneration,
        dirtyEpoch: this.directoryDirtyEpoch,
        fieldEpochs: new Map(
          [...this.sessions].map(([sessionId, session]) => [
            sessionId,
            {
              status: session.statusEpoch,
              title: session.titleEpoch,
              updatedAt: session.updatedAtEpoch,
              blank: session.blankEpoch,
            },
          ]),
        ),
      };
    });
    if (baseline === undefined) return false;
    const {
      authorityEpoch,
      cutOrder,
      directoryGeneration,
      dirtyEpoch,
      fieldEpochs,
    } = baseline;
    const summaries = await this.transport.listSessions(signal);
    const activeTarget = await this.runMutation(() => {
      if (
        directoryGeneration !== this.directoryGeneration ||
        dirtyEpoch !== this.directoryDirtyEpoch ||
        authorityEpoch !== this.baselineAuthorityEpoch ||
        cutOrder !== this.directoryBaselineOrder ||
        (generation && !this.isCurrentGeneration(generation))
      ) {
        return undefined;
      }
      const before = this.projectionFingerprint();
      const retained = new Set<HarnessUiSessionId>();
      for (const summary of summaries) {
        const removal = this.directoryRemovals.get(summary.id);
        const confirmsDetached =
          removal !== undefined &&
          directoryGeneration >= removal.removalGeneration;
        retained.add(summary.id);
        this.directoryMembers.add(summary.id);
        let existing = this.sessions.get(summary.id);
        if (existing) {
          if (confirmsDetached || existing.detachedCold) {
            existing = this.reattachSession(existing, summary.running);
            this.sessions.set(summary.id, existing);
          }
          // Each projected field owns its own local-authority epoch. History or
          // a subscribed target cannot accidentally suppress a newer title;
          // conversely, a Host status after this list started fences only
          // summary.running.
          const epochs = fieldEpochs.get(summary.id);
          if (!epochs || epochs.title === existing.titleEpoch) {
            existing.title = summary.title;
          }
          if (!epochs || epochs.updatedAt === existing.updatedAtEpoch) {
            existing.updatedAt = summary.updatedAt;
          }
          if (!epochs || epochs.status === existing.statusEpoch) {
            this.setSessionRunning(existing, summary.running);
          }
          if (!epochs || epochs.blank === existing.blankEpoch) {
            existing.blank = summary.blank;
          }
          existing.stateVersion += 1;
          existing.directoryConfirmed = true;
        } else {
          this.sessions.set(summary.id, {
            id: summary.id,
            title: summary.title,
            updatedAt: summary.updatedAt,
            running: summary.running,
            blank: summary.blank,
            directoryConfirmed: true,
            createdDirectoryGeneration: directoryGeneration,
            loaded: false,
            lastSequence: -1,
            targetSequence: -1,
            statusEpoch: 0,
            stateVersion: 0,
            titleEpoch: 0,
            updatedAtEpoch: 0,
            blankEpoch: 0,
            lifecycle: ++this.sessionLifecycle,
            durableMessages: [],
            scientificActivities: [],
            pendingPrompts: [],
          });
        }
      }
      for (const sessionId of this.sessions.keys()) {
        const session = this.sessions.get(sessionId)!;
        if (
          !retained.has(sessionId) &&
          (session.directoryConfirmed ||
            session.createdDirectoryGeneration <= directoryGeneration)
        ) {
          const removal = this.directoryRemovals.get(sessionId);
          this.directoryMembers.delete(sessionId);
          if (
            this.activeSessionId === sessionId &&
            (removal !== undefined || session.detachedCold)
          ) {
            // A live detach is not durable deletion. Keep the active projection
            // frozen until the user explicitly moves away; sidebar membership
            // and command eligibility are already removed.
            continue;
          }
          this.releaseUnresolvedPromptsForSession(sessionId);
          this.sessions.delete(sessionId);
          this.discardInteractionsForSession(sessionId);
          this.runtimeErrorQuarantine.delete(sessionId);
        }
      }
      if (this.activeSessionId && !this.sessions.has(this.activeSessionId)) {
        this.activeSessionId = null;
      }
      if (this.activeSessionId === null) {
        const requested = this.requestedInitialSessionId;
        this.activeSessionId =
          requested === null
              ? null
              : requested && this.sessions.has(requested)
                ? requested
              : (retained.values().next().value ?? null);
      }
      // A successfully committed list was captured after these removals. Its
      // presence/absence is now the authoritative persisted-directory answer.
      const rawSummaryIds = new Set<HarnessUiSessionId>(
        summaries.map((summary) => summary.id),
      );
      for (const sessionId of this.runtimeErrorQuarantine.keys()) {
        if (!rawSummaryIds.has(sessionId) && !this.sessions.has(sessionId)) {
          this.runtimeErrorQuarantine.delete(sessionId);
        }
      }
      for (const [sessionId, removal] of this.directoryRemovals) {
        if (removal.removalGeneration <= directoryGeneration) {
          if (rawSummaryIds.has(sessionId)) {
            this.directoryRemovals.delete(sessionId);
          } else if (!this.sessions.has(sessionId)) {
            this.directoryRemovals.delete(sessionId);
          }
          if (generation && !rawSummaryIds.has(sessionId) && !this.sessions.has(sessionId)) {
            this.discardBufferedInteractionsForSession(generation, sessionId);
            generation.bufferedStatuses.delete(sessionId);
            generation.bufferedSessionTargets.delete(sessionId);
            this.runtimeErrorQuarantine.delete(sessionId);
          }
        }
      }
      if (generation) {
        this.applyBufferedSessionFacts(generation);
        this.flushBufferedInteractions(generation);
        this.flushRuntimeErrorQuarantine();
      }
      this.publishIfChanged(before, {
        type: "connection-changed",
        status: this.connectionStatus,
      });
      const active = this.activeSessionId
        ? this.sessions.get(this.activeSessionId)
        : undefined;
      return active
        ? {
            id: active.id,
            session: active,
            statusEpoch: active.statusEpoch,
            directoryGeneration,
          }
        : null;
    });

    if (activeTarget) {
      if (awaitActive && generation && signal) {
        await this.refreshSessionUntilCurrent(
          activeTarget.session,
          generation,
          signal,
        );
      } else {
        void this.refreshBaselineSession(activeTarget, signal, generation);
      }
    }
    return (
      activeTarget !== undefined &&
      (!generation || this.isCurrentGeneration(generation))
    );
  }

  private async refreshBaselineSession(
    target: {
      readonly id: HarnessUiSessionId;
      readonly session: MutableSession;
      readonly statusEpoch: number;
      readonly directoryGeneration: number;
    },
    signal?: AbortSignal,
    generation?: EventGeneration,
  ): Promise<void> {
    try {
      const conversation = await this.transport.getSnapshot(
        transportSessionId(target.id),
        signal,
      );
      await this.runMutation(() => {
        const active = this.sessions.get(target.id);
        if (
          active !== target.session ||
          this.directoryGeneration !== target.directoryGeneration ||
          (generation && !this.isCurrentGeneration(generation))
        ) {
          return;
        }
        const before = this.projectionFingerprint();
        const changes = this.applyConversationIfFresh(
          active,
          conversation,
          target.statusEpoch,
        );
        this.publishIfChanged(before, {
          type: "session-refreshed",
          sessionId: active.id,
        });
        this.upgradeDurablePromptReceipts(
          active,
          changes.durableCommandIds,
          this.revision,
        );
      });
    } catch (error) {
      await this.runMutation(() => {
        if (generation && this.isCurrentGeneration(generation)) {
          this.failGenerationLocked(generation, error);
        }
      });
    }
  }

  /** Host removal authoritatively detaches live state until a newer list cut. */
  private removeSessionFromDirectory(sessionId: HarnessUiSessionId): void {
    const before = this.projectionFingerprint();
    this.directoryGeneration += 1;
    this.directoryDirtyEpoch += 1;
    this.directoryRemovals.set(sessionId, {
      removalGeneration: this.directoryGeneration,
    });
    this.directoryMembers.delete(sessionId);
    const pendingCreate = this.pendingCreates.get(sessionId);
    if (pendingCreate) pendingCreate.removed = true;
    const current = this.sessions.get(sessionId);
    if (current && this.activeSessionId === sessionId) {
      this.sessions.set(sessionId, {
        ...current,
        running: false,
        detachedCold: true,
        detachedOrder: ++this.detachedOrder,
        statusEpoch: current.statusEpoch + 1,
        stateVersion: current.stateVersion + 1,
        pendingPrompts: [],
        refreshTask: undefined,
        lifecycle: ++this.sessionLifecycle,
      });
    } else if (current) {
      this.sessions.delete(sessionId);
      this.runtimeErrorQuarantine.delete(sessionId);
    }
    this.discardInteractionsForSession(sessionId);
    const generation = this.eventPump?.generation;
    if (generation && this.isCurrentGeneration(generation)) {
      generation.interactionCutoffs.set(
        sessionId,
        ++this.runtimeEventOrder,
      );
      this.discardBufferedInteractionsForSession(generation, sessionId);
      generation.bufferedStatuses.delete(sessionId);
      generation.bufferedSessionTargets.delete(sessionId);
      if (this.directoryRemovals.size > MAX_DETACHED_SESSIONS) {
        this.failGenerationLocked(
          generation,
          new Error("Harness detached-session overlay exceeded its safe bound."),
        );
      }
    }
    this.pruneDetachedSessions();
    this.publishIfChanged(before, { type: "session-refreshed", sessionId });
  }

  private reattachSession(
    session: MutableSession,
    running: boolean,
  ): MutableSession {
    return {
      ...session,
      running,
      detachedCold: false,
      detachedOrder: undefined,
      lifecycle: ++this.sessionLifecycle,
      loaded: false,
      lastSequence: -1,
      targetSequence: -1,
      refreshTask: undefined,
      pendingPrompts: [],
      statusEpoch: session.statusEpoch + 1,
      stateVersion: session.stateVersion + 1,
    };
  }

  /** A lower subscribed watermark proves same-id runtime reuse, not a resume. */
  private replaceProvenFreshLifecycle(
    session: MutableSession,
    running: boolean,
  ): MutableSession {
    this.runtimeErrorQuarantine.delete(session.id);
    this.discardInteractionsForSession(session.id);
    this.clearPromptCorrelationsForFreshLifecycle(session.id);
    return {
      ...this.reattachSession(session, running),
      runtimeError: undefined,
      durableMessages: [],
      scientificActivities: [],
      pendingPrompts: [],
    };
  }

  private releaseDetachedResidentsExcept(
    retainedSessionId: HarnessUiSessionId,
  ): void {
    for (const [sessionId, session] of this.sessions) {
      if (sessionId === retainedSessionId || !session.detachedCold) continue;
      this.sessions.delete(sessionId);
      this.directoryRemovals.delete(sessionId);
      this.runtimeErrorQuarantine.delete(sessionId);
      this.discardInteractionsForSession(sessionId);
    }
  }

  /** Keeps resident detached projections bounded across repeated failed cuts. */
  private pruneDetachedSessions(): void {
    const detached = [...this.sessions.values()]
      .filter(
        (session) =>
          session.detachedCold && session.id !== this.activeSessionId,
      )
      .sort(
        (left, right) =>
          (left.detachedOrder ?? 0) - (right.detachedOrder ?? 0),
      );
    for (const session of detached.slice(0, -MAX_DETACHED_SESSIONS)) {
      this.sessions.delete(session.id);
      this.directoryRemovals.delete(session.id);
      this.runtimeErrorQuarantine.delete(session.id);
      this.discardInteractionsForSession(session.id);
    }
  }

  private applyConversation(
    session: MutableSession,
    conversation: HarnessConversationSnapshot,
  ): ApplyConversationResult {
    const previousMessages = new Map(
      session.durableMessages.map((message) => [
        `${message.role}:${message.sequence}:${message.rawId}`,
        message,
      ]),
    );
    const previousAssistantIds = new Set(
      session.durableMessages
        .filter((message) => message.role === "assistant")
        .map((message) => message.id),
    );
    const runningChanged = session.running !== conversation.running;
    const durablePromptIds: string[] = [];
    const durableCommandIds: string[] = [];

    const durableMessages = [...conversation.messages]
      .sort((left, right) => left.seq - right.seq)
      .map((message): MutableDurableMessage => {
        const match =
          message.role === "user"
            ? this.pendingForDurableMessage(session, message)
            : undefined;
        if (match) {
          if (match.pending) match.pending.state = "durable";
          if (!match.outcome.durable) {
            match.outcome.durable = true;
            durablePromptIds.push(match.outcome.messageId);
            durableCommandIds.push(match.commandId);
          }
        }

        const key = `${message.role}:${message.seq}:${message.id}`;
        const prior = previousMessages.get(key);
        const logicalId = match?.outcome.messageId ?? prior?.id ?? message.id;
        const logicalCreatedAt =
          match && !match.preserveRawIdentity
            ? match.outcome.createdAt
            : prior?.createdAt ?? this.clock();
        return {
          id: match?.preserveRawIdentity ? message.id : logicalId,
          rawId: message.id,
          role: message.role,
          text: message.text,
          sequence: message.seq,
          createdAt: logicalCreatedAt,
          ...(message.sourceRpcId
            ? { sourceRpcId: message.sourceRpcId }
            : {}),
        };
      });

    const previousBlank = session.blank;
    session.durableMessages = durableMessages;
    session.scientificActivities = (conversation.scientificActivities ?? []).map(
      (activity) => ({
        ...activity,
        details: activity.details.map((item) => ({ ...item })),
      }),
    );
    session.lastSequence = conversation.lastSeq;
    session.running = conversation.running;
    session.loaded = true;
    session.blank =
      durableMessages.length === 0 &&
      !session.pendingPrompts.some((pending) => pending.state === "visible");
    if (session.blank !== previousBlank) session.blankEpoch += 1;

    // The logical id has now been folded into durableMessages. Keeping a
    // second durable alias forever would leak one entry per prompt.
    session.pendingPrompts = session.pendingPrompts.filter(
      (pending) => pending.state !== "durable",
    );
    session.stateVersion += 1;

    return {
      durablePromptIds,
      durableCommandIds,
      assistantMessageIds: durableMessages
        .filter(
          (message) =>
            message.role === "assistant" &&
            !previousAssistantIds.has(message.id),
        )
        .map((message) => message.id),
      runningChanged,
    };
  }

  /** Non-history authoritative/optimistic running writes invalidate stale reads. */
  private setSessionRunning(session: MutableSession, running: boolean): void {
    session.detachedCold = false;
    session.detachedOrder = undefined;
    const clearsRuntimeError = running && session.runtimeError !== undefined;
    if (session.running === running && !clearsRuntimeError) return;
    session.running = running;
    if (clearsRuntimeError) session.runtimeError = undefined;
    session.statusEpoch += 1;
    session.stateVersion += 1;
  }

  private applyConversationIfFresh(
    session: MutableSession,
    conversation: HarnessConversationSnapshot,
    expectedStatusEpoch?: number,
  ): ApplyConversationResult {
    if (session.loaded && conversation.lastSeq < session.lastSequence) {
      return {
        durablePromptIds: [],
        assistantMessageIds: [],
        runningChanged: false,
        durableCommandIds: [],
      };
    }
    const authoritativeRunning = session.running;
    const result = this.applyConversation(session, conversation);
    if (session.detachedCold) {
      session.running = authoritativeRunning;
      return { ...result, runningChanged: false };
    }
    if (
      expectedStatusEpoch !== undefined &&
      session.statusEpoch !== expectedStatusEpoch
    ) {
      session.running = authoritativeRunning;
      return { ...result, runningChanged: false };
    }
    return result;
  }

  private upgradeDurablePromptReceipts(
    session: MutableSession,
    commandIds: readonly string[],
    revision: WorkspaceRevision,
  ): void {
    for (const commandId of commandIds) {
      const ledger = this.commandLedger.get(commandId);
      const reservation = this.unresolvedPrompts.get(commandId);
      const outcome = reservation?.outcome ?? ledger?.promptOutcome;
      const fingerprint = reservation?.fingerprint ?? ledger?.fingerprint;
      if (!outcome?.durable || !fingerprint) continue;
      const success = successReceipt(commandId, revision, {
        type: "prompt-queued",
        sessionId: session.id,
        messageId: outcome.messageId,
      });
      this.rememberCommand(commandId, fingerprint, success, outcome);
      this.releaseUnresolvedPrompt(commandId);
    }
  }

  private pendingForDurableMessage(
    session: MutableSession,
    message: HarnessConversationSnapshot["messages"][number],
  ): DurablePromptMatch | undefined {
    if (!message.sourceRpcId) return undefined;
    const reservedCommandId = this.unresolvedPromptByRpc.get(
      unresolvedPromptRpcKey(session.id, message.sourceRpcId),
    );
    if (reservedCommandId) {
      const reservation = this.unresolvedPrompts.get(reservedCommandId);
      if (
        reservation?.sessionId === session.id &&
        reservation.outcome?.rpcId === message.sourceRpcId
      ) {
        const sameLifecycle =
          reservation.session === session &&
          reservation.sessionLifecycle === session.lifecycle;
        return {
          commandId: reservation.commandId,
          outcome: reservation.outcome,
          ...(!sameLifecycle ? { preserveRawIdentity: true } : {}),
          ...(sameLifecycle && session.pendingPrompts.includes(reservation.pending)
            ? { pending: reservation.pending }
            : {}),
        };
      }
    }
    const exactRpc = session.pendingPrompts.filter(
      (pending) =>
        pending.transportRpcId !== undefined &&
        pending.transportRpcId === message.sourceRpcId,
    );
    if (exactRpc.length === 1) {
      const pending = exactRpc[0];
      const inFlight = this.inFlightCommands.get(pending.commandId);
      const ledger = this.commandLedger.get(pending.commandId);
      const reservation = this.unresolvedPrompts.get(pending.commandId);
      const outcome =
        reservation?.outcome ??
        inFlight?.promptOutcome ??
        ledger?.promptOutcome;
      if (outcome?.rpcId === message.sourceRpcId) {
        return { commandId: pending.commandId, outcome, pending };
      }
    }

    const matches: DurablePromptMatch[] = [];
    for (const pending of session.pendingPrompts) {
      if (pending.transportRpcId !== message.sourceRpcId) continue;
      const outcome: PromptOutcome = {
        sessionId: session.id,
        messageId: pending.clientMessageId,
        rpcId: message.sourceRpcId,
        createdAt: pending.createdAt,
        durable: true,
      };
      matches.push({ commandId: pending.commandId, outcome, pending });
    }
    for (const [commandId, record] of this.commandLedger) {
      if (
        record.promptOutcome?.sessionId === session.id &&
        record.promptOutcome.rpcId === message.sourceRpcId
      ) {
        matches.push({ commandId, outcome: record.promptOutcome });
      }
    }
    for (const [commandId, record] of this.inFlightCommands) {
      if (
        record.promptOutcome?.sessionId === session.id &&
        record.promptOutcome.rpcId === message.sourceRpcId
      ) {
        matches.push({ commandId, outcome: record.promptOutcome });
      }
    }
    const unique = new Map(
      matches.map((match) => [
        `${match.commandId}:${match.outcome.messageId}`,
        match,
      ]),
    );
    if (unique.size === 1) return unique.values().next().value;

    // No heuristic correlation: equal text from another tab is not causal
    // evidence. Durable source.rpcId is the only transport-owned identity.
    return undefined;
  }

  private reconcilePendingByRpcId(
    session: MutableSession,
    pending: PendingPrompt,
  ): void {
    if (!pending.transportRpcId) return;
    const message = session.durableMessages.find(
      (candidate) => candidate.sourceRpcId === pending.transportRpcId,
    );
    if (!message) return;
    message.id = pending.clientMessageId;
    const outcome =
      this.unresolvedPrompts.get(pending.commandId)?.outcome ??
      this.inFlightCommands.get(pending.commandId)?.promptOutcome ??
      this.commandLedger.get(pending.commandId)?.promptOutcome;
    if (outcome?.rpcId === pending.transportRpcId) outcome.durable = true;
    session.pendingPrompts = session.pendingPrompts.filter(
      (candidate) => candidate !== pending,
    );
    pending.state = "durable";
  }

  /** Must be called from the short mutation queue. */
  private ensureEventPumpLocked(): EventPump {
    if (this.eventPump && !this.eventPump.controller.signal.aborted) {
      return this.eventPump;
    }

    const controller = new AbortController();
    let resolveStarted!: () => void;
    let resolveReady!: () => void;
    const started = new Promise<void>((resolve) => {
      resolveStarted = resolve;
    });
    const ready = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });
    const pump: EventPump = {
      id: ++this.eventPumpOrder,
      controller,
      started,
      resolveStarted,
      ready,
      resolveReady,
      isReady: false,
    };
    this.eventPump = pump;
    void this.runEventPump(pump)
      .finally(() => {
        pump.resolveStarted();
        pump.resolveReady();
        void this.runMutation(() => {
          if (this.eventPump !== pump) return;
          this.eventPump = undefined;
          if (this.subscribers.size > 0) {
            this.ensureEventPumpLocked();
          }
        });
      });
    return pump;
  }

  private async waitForEventPumpReady(
    initialPump: EventPump,
    signal: AbortSignal,
  ): Promise<void> {
    let pump = initialPump;
    while (!signal.aborted) {
      await waitWithSignal(pump.started, signal);
      await waitWithSignal(pump.ready, signal);
      const current = await this.runMutation(() => {
        if (this.eventPump === pump && pump.isReady) return pump;
        return this.eventPump ?? this.ensureEventPumpLocked();
      });
      if (current === pump && pump.isReady) return;
      pump = current;
    }
    throwIfAborted(signal);
  }

  private async runEventPump(pump: EventPump): Promise<void> {
    let attempt = 0;

    while (!pump.controller.signal.aborted) {
      const generation = await this.runMutation(() => {
        if (
          this.eventPump !== pump ||
          pump.controller.signal.aborted ||
          this.subscribers.size === 0
        ) {
          return undefined;
        }
        let resolveOpened!: () => void;
        const opened = new Promise<void>((resolve) => {
          resolveOpened = resolve;
        });
        const next: EventGeneration = {
          id: ++this.eventFoldGeneration,
          pump,
          controller: new AbortController(),
          opened,
          resolveOpened,
          openedObserved: false,
          phase: "opening",
          ended: false,
          preLiveEvents: [],
          bufferedInteractions: new Map(),
          bufferedApprovalKeys: new Map(),
          interactionCutoffs: new Map(),
          bufferedStatuses: new Map(),
          bufferedSessionTargets: new Map(),
        };
        this.baselineAuthorityEpoch += 1;
        if (pump.generation) {
          this.clearBufferedInteractions(pump.generation);
          pump.generation.controller.abort();
        }
        pump.generation = next;
        for (const session of this.sessions.values()) {
          if (session.refreshTask?.generation !== next) {
            session.refreshTask = undefined;
          }
        }
        this.directoryRefreshTask = undefined;
        for (const sessionId of this.directoryRemovals.keys()) {
          if (
            !this.sessions.has(sessionId) &&
            !this.pendingCreates.has(sessionId)
          ) {
            this.directoryRemovals.delete(sessionId);
          }
        }
        this.resetInteractionGeneration();
        this.setConnection("reconnecting");
        return next;
      });
      if (!generation) return;
      const signal = AbortSignal.any([
        pump.controller.signal,
        generation.controller.signal,
      ]);
      // Establish the live transport cut before any first baseline I/O. Frames
      // arriving during that baseline are folded or held in generation-scoped
      // bounded buffers, closing the snapshot -> subscription vacuum.
      const consumption = this.consumeTransportEvents(generation, signal).then(
        () => ({ ok: true as const }),
        (error: unknown) => ({ ok: false as const, error }),
      );
      pump.resolveStarted();
      try {
        // `connection-state: online` is the Transport's mux+host-open cut.
        // No HTTP baseline started before that cut may define a live projection.
        await this.waitForGenerationOpening(generation, signal);
        await this.runMutation(() => {
          if (!this.isCurrentGeneration(generation)) return;
          generation.phase = "baselining";
          generation.baselineDirectoryGeneration = this.directoryGeneration;
          generation.baselineDirtyEpoch = this.directoryDirtyEpoch;
        });

        let ready = false;
        const openingCutSize = await this.runMutation(() =>
          this.isCurrentGeneration(generation)
            ? generation.preLiveEvents.length
            : 0,
        );
        await this.flushPreLiveEvents(generation, false, openingCutSize);
        for (let baselineAttempt = 0; baselineAttempt < 8; baselineAttempt += 1) {
          const committed = await this.rebaselineWorkspace(
            signal,
            generation,
            true,
          );
          if (!committed) continue;
          ready = await this.runMutation(() => {
            if (
              !this.isCurrentGeneration(generation) ||
              generation.ended ||
              generation.failure
            ) {
              return false;
            }
            const before = this.projectionFingerprint();
            generation.phase = "live";
            this.connectionStatus = "online";
            this.connectionDetail = undefined;
            this.publishIfChanged(before, {
              type: "connection-changed",
              status: "online",
            });
            pump.isReady = true;
            pump.bootstrapEvent = this.projectionRebaseEvent();
            pump.resolveReady();
            for (const [sessionId, session] of this.sessions) {
              if (
                this.eligibleSession(sessionId) === session &&
                session.lastSequence < session.targetSequence
              ) {
                this.startSessionRefreshLocked(sessionId, generation);
              }
            }
            return true;
          });
          if (ready) break;
        }
        if (!ready) {
          throw new Error("Harness baseline did not reach a stable live cut.");
        }
        await this.flushPreLiveEvents(generation, true);
        attempt = 0;
        const consumed = await consumption;
        if (!consumed.ok) throw consumed.error;
        if (generation.failure) {
          throw generation.failure;
        }
        if (!pump.controller.signal.aborted) {
          throw new Error("Harness event stream ended unexpectedly.");
        }
      } catch (error) {
        if (pump.controller.signal.aborted) {
          return;
        }

        await this.runMutation(() => {
          if (this.eventPump !== pump) return;
          if (this.isCurrentGeneration(generation)) {
            generation.controller.abort(error);
          }
          this.setConnection("offline", transportMessage(error));
          if (!pump.isReady) {
            pump.isReady = true;
            pump.bootstrapEvent = this.projectionRebaseEvent();
            pump.resolveReady();
          }
        });
        attempt += 1;
        await this.waitForRetry(
          this.retryDelay(attempt),
          pump.controller.signal,
        );
        if (!pump.controller.signal.aborted) {
          const shouldContinue = await this.runMutation(() => {
            if (this.eventPump !== pump || this.subscribers.size === 0) {
              return false;
            }
            this.setConnection("reconnecting");
            return true;
          });
          if (!shouldContinue) return;
        }
      }
    }
  }

  private async flushPreLiveEvents(
    generation: EventGeneration,
    allowDeferredEffects = true,
    maximum = Number.POSITIVE_INFINITY,
  ): Promise<void> {
    let folded = 0;
    while (folded < maximum) {
      const event = await this.runMutation(() => {
        if (!this.isCurrentGeneration(generation)) return undefined;
        return generation.preLiveEvents.shift();
      });
      if (!event) return;
      folded += 1;
      await this.foldLiveTransportEvent(
        event,
        generation,
        allowDeferredEffects,
      );
    }
  }

  private async waitForGenerationOpening(
    generation: EventGeneration,
    signal: AbortSignal,
  ): Promise<void> {
    let timeout: ReturnType<typeof globalThis.setTimeout> | undefined;
    try {
      await waitWithSignal(
        Promise.race([
          generation.opened,
          new Promise<void>((_, reject) => {
            timeout = globalThis.setTimeout(
              () => reject(new Error("Harness event streams did not open in time.")),
              Math.max(1, this.openingTimeoutMs),
            );
          }),
        ]),
        signal,
      );
    } finally {
      if (timeout !== undefined) globalThis.clearTimeout(timeout);
    }
  }

  private isCurrentGeneration(generation: EventGeneration): boolean {
    return (
      this.eventPump === generation.pump &&
      generation.pump.generation === generation &&
      !generation.pump.controller.signal.aborted &&
      !generation.controller.signal.aborted
    );
  }

  /** Must be called from the short mutation queue. */
  private failGenerationLocked(
    generation: EventGeneration,
    error: unknown,
  ): void {
    if (!this.isCurrentGeneration(generation) || generation.failure) return;
    generation.failure = error;
    generation.controller.abort(error);
  }

  private async waitForRetry(
    delay: number,
    signal: AbortSignal,
  ): Promise<void> {
    if (signal.aborted) return;
    const safeDelay = Number.isFinite(delay) ? Math.max(0, delay) : 10_000;

    await new Promise<void>((resolve) => {
      const finish = () => {
        globalThis.clearTimeout(timeout);
        signal.removeEventListener("abort", finish);
        resolve();
      };
      const timeout = globalThis.setTimeout(finish, safeDelay);
      signal.addEventListener("abort", finish, { once: true });
    });
  }

  private async consumeTransportEvents(
    generation: EventGeneration,
    signal: AbortSignal,
  ): Promise<void> {
    for await (const event of this.transport.events(signal)) {
      await this.foldTransportEvent(event, generation);
    }

    if (!signal.aborted) {
      await this.runMutation(() => {
        if (!this.isCurrentGeneration(generation)) return;
        generation.ended = true;
        this.failGenerationLocked(
          generation,
          new Error("Harness event stream ended unexpectedly."),
        );
      });
    }
  }

  private async foldTransportEvent(
    event: HarnessUiEvent,
    generation: EventGeneration,
  ): Promise<void> {
    if (event.type === "transport-error") {
      await this.foldLiveTransportEvent(event, generation);
      return;
    }
    if (event.type === "agent-error") {
      // Host does not replay agent-error. Persist the occurrence in the
      // adapter-level bounded quarantine before any generation-local buffer can
      // overflow or be reset.
      await this.runMutation(() => {
        if (!this.isCurrentGeneration(generation)) return;
        this.acceptRuntimeError(event, generation);
      });
      return;
    }
    if (event.type === "connection-state" && event.status === "online") {
      await this.runMutation(() => {
        if (!this.isCurrentGeneration(generation)) return;
        if (!generation.openedObserved) {
          generation.openedObserved = true;
          generation.resolveOpened();
        } else if (generation.phase === "live") {
          this.startDirectoryRefreshLocked(generation);
        }
      });
      return;
    }
    const buffered = await this.runMutation(() => {
      if (!this.isCurrentGeneration(generation)) return true;
      if (generation.phase === "live") return false;
      if (generation.preLiveEvents.length >= MAX_PRELIVE_EVENTS) {
        this.failGenerationLocked(
          generation,
          new Error("Harness pre-live event buffer exceeded its safe bound."),
        );
        return true;
      }
      generation.preLiveEvents.push(event);
      return true;
    });
    if (buffered) return;
    await this.foldLiveTransportEvent(event, generation);
  }

  private async foldLiveTransportEvent(
    event: HarnessUiEvent,
    generation: EventGeneration,
    allowDeferredEffects = true,
  ): Promise<void> {
    switch (event.type) {
      case "connection-state": {
        if (event.status === "reconnecting") {
          await this.runMutation(() => {
            if (!this.isCurrentGeneration(generation)) return;
            if (allowDeferredEffects && generation.phase === "live") {
              this.clearBufferedInteractions(generation);
              this.resetInteractionGeneration();
              this.setConnection("reconnecting");
            }
          });
          return;
        }

        // Online is consumed as the generation opening cut by
        // foldTransportEvent; it never directly publishes a live state.
        return;
      }
      case "transport-error":
        await this.runMutation(() => {
          if (!this.isCurrentGeneration(generation)) return;
          this.failGenerationLocked(generation, new Error(event.message));
        });
        return;
      case "session-status": {
        await this.runMutation(() => {
          if (!this.isCurrentGeneration(generation)) return;
          const session = this.eligibleSession(event.sessionId);
          if (!session) {
            if (
              !generation.bufferedStatuses.has(event.sessionId) &&
              generation.bufferedStatuses.size >= MAX_PENDING_INTERACTIONS
            ) {
              this.failGenerationLocked(
                generation,
                new Error("Harness session-status buffer exceeded its safe bound."),
              );
              return;
            }
            generation.bufferedStatuses.set(event.sessionId, {
              running: event.running,
              order: ++this.runtimeEventOrder,
            });
            this.directoryDirtyEpoch += 1;
            if (allowDeferredEffects && generation.phase === "live") {
              this.startDirectoryRefreshLocked(generation);
            }
            return;
          }
          const before = this.projectionFingerprint();
          this.setSessionRunning(session, event.running);
          session.updatedAt = this.clock();
          session.updatedAtEpoch += 1;
          session.stateVersion += 1;
          this.publishIfChanged(before, {
            type: "running-changed",
            sessionId: event.sessionId,
            running: event.running,
          });
        });
        return;
      }
      case "session-directory-changed": {
        // 目录重基线失败必须抛给统一 event generation recovery loop；本地吞掉
        // 错误会让一个仍在等待的订阅永久停在 offline。
        await this.runMutation(() => {
          if (!this.isCurrentGeneration(generation)) return;
          if (event.change === "removed") {
            this.removeSessionFromDirectory(event.sessionId);
          } else if (event.change === "added") {
            const before = this.projectionFingerprint();
            this.directoryGeneration += 1;
            this.directoryDirtyEpoch += 1;
            this.directoryRemovals.delete(event.sessionId);
            const session = this.sessions.get(event.sessionId);
            if (session) {
              const attached = session.detachedCold
                ? this.reattachSession(session, false)
                : session;
              this.sessions.set(event.sessionId, attached);
              this.directoryMembers.add(event.sessionId);
            }
            this.applyBufferedSessionFacts(generation, event.sessionId);
            this.flushBufferedInteractions(generation, event.sessionId);
            this.flushRuntimeErrorQuarantine(event.sessionId);
            this.publishIfChanged(before, {
              type: "session-refreshed",
              sessionId: event.sessionId,
            });
          } else {
            this.directoryDirtyEpoch += 1;
          }
          if (allowDeferredEffects && generation.phase === "live") {
            this.startDirectoryRefreshLocked(generation);
          }
        });
        return;
      }
      case "session-changed": {
        const target = await this.runMutation(() => {
          if (!this.isCurrentGeneration(generation)) return undefined;
          let session = this.eligibleSession(event.sessionId);
          if (!session) {
            if (event.seq !== undefined) {
              if (
                !generation.bufferedSessionTargets.has(event.sessionId) &&
                generation.bufferedSessionTargets.size >=
                  MAX_PENDING_INTERACTIONS
              ) {
                this.failGenerationLocked(
                  generation,
                  new Error(
                    "Harness session target buffer exceeded its safe bound.",
                  ),
                );
                return undefined;
              }
              generation.bufferedSessionTargets.set(
                event.sessionId,
                Math.max(
                  generation.bufferedSessionTargets.get(event.sessionId) ?? -1,
                  event.seq,
                ),
              );
            }
            this.directoryDirtyEpoch += 1;
            if (allowDeferredEffects && generation.phase === "live") {
              this.startDirectoryRefreshLocked(generation);
            }
            return undefined;
          }
          if (event.seq !== undefined) {
            if (
              event.gapDetected === true &&
              event.eventType === "session/rebaseline" &&
              event.seq < session.lastSequence
            ) {
              const before = this.projectionFingerprint();
              session = this.replaceProvenFreshLifecycle(
                session,
                session.running,
              );
              this.sessions.set(event.sessionId, session);
              this.publishIfChanged(before, {
                type: "session-refreshed",
                sessionId: event.sessionId,
              });
            }
            session.targetSequence = Math.max(
              session.targetSequence,
              event.seq,
            );
            session.stateVersion += 1;
          }
          return {
            session,
            statusEpoch: session.statusEpoch,
            targetSequence: session.targetSequence,
          };
        });
        if (!target) return;
        await this.runMutation(() => {
          if (!this.isCurrentGeneration(generation)) return;
          if (allowDeferredEffects && generation.phase === "live") {
            this.startSessionRefreshLocked(event.sessionId, generation);
          }
        });
        return;
      }
      case "interaction-requested": {
        await this.runMutation(() => {
          if (!this.isCurrentGeneration(generation)) return;
          this.acceptInteractionRequest(event, generation);
        });
        return;
      }
      case "interaction-resolved": {
        await this.runMutation(() => {
          if (!this.isCurrentGeneration(generation)) return;
          this.discardBufferedInteractionResolution(generation, event);
          const uiId =
            event.resolution.kind === "approval"
              ? this.interactionRegistry.byApprovalKey.get(
                  wireApprovalKey(
                    event.sessionId,
                    event.resolution.approvalId,
                  ),
                )
              : this.interactionRegistry.byWireKey.get(
                  wireInteractionKey("questions", event.resolution.rpcId),
                );
          if (uiId) this.removeInteraction(uiId);
        });
        return;
      }
      case "agent-error":
        await this.runMutation(() => {
          if (!this.isCurrentGeneration(generation)) return;
          this.acceptRuntimeError(event, generation);
        });
        return;
    }
  }

  /** Must be called from the short mutation queue. */
  private startDirectoryRefreshLocked(generation: EventGeneration): void {
    if (!this.isCurrentGeneration(generation)) return;
    if (generation.phase !== "live") return;
    if (this.directoryRefreshTask?.generation === generation) return;
    const directoryGeneration = this.directoryGeneration;
    const dirtyEpoch = this.directoryDirtyEpoch;
    const signal = AbortSignal.any([
      generation.pump.controller.signal,
      generation.controller.signal,
    ]);
    const refresh = this.rebaselineWorkspace(signal, generation)
      .then(() => undefined)
      .catch((error) => {
        void this.runMutation(() => {
          if (!this.isCurrentGeneration(generation)) return;
          this.failGenerationLocked(generation, error);
        });
      })
      .finally(() => {
        void this.runMutation(() => {
          if (this.directoryRefreshTask?.promise !== refresh) return;
          this.directoryRefreshTask = undefined;
          if (!this.isCurrentGeneration(generation)) return;
          if (
            this.directoryGeneration !== directoryGeneration ||
            this.directoryDirtyEpoch !== dirtyEpoch
          ) {
            this.startDirectoryRefreshLocked(generation);
          }
        });
      });
    this.directoryRefreshTask = {
      generation,
      directoryGeneration,
      dirtyEpoch,
      promise: refresh,
    };
  }

  /** Must be called from the short mutation queue. */
  private startSessionRefreshLocked(
    sessionId: HarnessUiSessionId,
    generation: EventGeneration,
  ): void {
    const session = this.sessions.get(sessionId);
    if (
      !session ||
      !this.isCurrentGeneration(generation) ||
      generation.phase !== "live"
    ) {
      return;
    }
    if (session.refreshTask?.generation === generation) return;

    const refresh = this.refreshSessionUntilCurrent(
      session,
      generation,
      AbortSignal.any([
        generation.pump.controller.signal,
        generation.controller.signal,
      ]),
    )
      .catch((error) => {
        void this.runMutation(() => {
          if (!this.isCurrentGeneration(generation)) return;
          this.failGenerationLocked(generation, error);
        });
      })
      .finally(() => {
        void this.runMutation(() => {
          if (session.refreshTask?.promise !== refresh) return;
          session.refreshTask = undefined;
          if (!this.isCurrentGeneration(generation)) return;
          if (session.lastSequence < session.targetSequence) {
            this.startSessionRefreshLocked(sessionId, generation);
          }
        });
      });
    session.refreshTask = { generation, promise: refresh };
  }

  private async refreshSessionUntilCurrent(
    expectedSession: MutableSession,
    generation: EventGeneration,
    signal: AbortSignal,
  ): Promise<void> {
    const target = await this.runMutation(() => ({
      current: this.isCurrentGeneration(generation),
      targetSequence: expectedSession.targetSequence,
      statusEpoch: expectedSession.statusEpoch,
    }));
    if (!target.current) return;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const conversation = await this.transport.getSnapshot(
        transportSessionId(expectedSession.id),
        signal,
      );
      const caughtUp = await this.runMutation(() => {
        if (!this.isCurrentGeneration(generation)) return true;
        const session = this.sessions.get(expectedSession.id);
        if (!session || session !== expectedSession) return true;
        if (conversation.lastSeq < target.targetSequence) return false;

        const before = this.projectionFingerprint();
        const changes = this.applyConversationIfFresh(
          session,
          conversation,
          target.statusEpoch,
        );
        const cause: UiEventCause =
          changes.durablePromptIds.length > 0
            ? {
                type: "prompt-durable",
                sessionId: session.id,
                messageId: changes.durablePromptIds.at(-1)!,
              }
            : changes.assistantMessageIds.length > 0
              ? {
                  type: "assistant-message",
                  sessionId: session.id,
                  messageId: changes.assistantMessageIds.at(-1)!,
                }
              : changes.runningChanged
                ? {
                    type: "running-changed",
                    sessionId: session.id,
                    running: session.running,
                  }
                : { type: "session-refreshed", sessionId: session.id };
        this.publishIfChanged(before, cause);
        this.upgradeDurablePromptReceipts(
          session,
          changes.durableCommandIds,
          this.revision,
        );
        return true;
      });
      if (caughtUp) return;
      await this.waitForRetry(25 * (attempt + 1), signal);
    }

    throw new Error(
      `Harness history for ${expectedSession.id} did not reach sequence ${target.targetSequence}.`,
    );
  }

  /**
   * User commands capture a finite sequence cut before I/O. They wait for that
   * cut, while newer targets are handled by the normal single-flight refresh.
   */
  private async getSnapshotAtLeast(
    sessionId: HarnessUiSessionId,
    targetSequence: number,
    signal?: AbortSignal,
  ): Promise<HarnessConversationSnapshot> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const conversation = await this.transport.getSnapshot(
        transportSessionId(sessionId),
        signal,
      );
      if (conversation.lastSeq >= targetSequence) return conversation;
      if (attempt < 2) {
        if (signal) {
          await this.waitForRetry(25 * (attempt + 1), signal);
        } else {
          await new Promise<void>((resolve) =>
            globalThis.setTimeout(resolve, 25 * (attempt + 1)),
          );
        }
      }
    }
    throw new Error(
      `Harness history for ${sessionId} did not reach sequence ${targetSequence}.`,
    );
  }

  private resetInteractionGeneration(): void {
    this.interactionGeneration += 1;
    const hadInteractions = this.interactionRegistry.byUiId.size > 0;
    this.interactionRegistry = {
      byUiId: new Map(),
      byWireKey: new Map(),
      byApprovalKey: new Map(),
    };
    if (hadInteractions) {
      this.publish({ type: "interactions-rebased" });
    }
  }

  /**
   * Mux and Host directory frames are separate streams with no cross-stream
   * ordering guarantee. A request for an unknown session is therefore
   * generation-scoped pending evidence, not proof of an invalid session.
   */
  private acceptInteractionRequest(
    event: Extract<HarnessUiEvent, { type: "interaction-requested" }>,
    generation: EventGeneration,
  ): void {
    const kind =
      event.request.type === "approval/requested" ? "approval" : "questions";
    const wireKey = wireInteractionKey(kind, event.rpcId);
    const fingerprint = requestFingerprint(event.request);
    const buffered = generation.bufferedInteractions.get(wireKey);
    if (buffered) {
      if (
        buffered.event.sessionId !== event.sessionId ||
        buffered.fingerprint !== fingerprint
      ) {
        throw new Error(
          "Harness replayed a buffered interaction with changed payload.",
        );
      }
      if (this.eligibleSession(event.sessionId)) {
        this.deleteBufferedInteraction(generation, wireKey);
        this.upsertRawInteraction(event, generation.bufferedInteractions.size);
      }
      return;
    }

    if (
      this.eligibleSession(event.sessionId) ||
      this.interactionRegistry.byWireKey.has(wireKey)
    ) {
      this.upsertRawInteraction(event, generation.bufferedInteractions.size);
      return;
    }

    this.validateRawInteractionBounds(event);
    const approvalKey =
      event.request.type === "approval/requested"
        ? wireApprovalKey(event.sessionId, event.request.approvalId)
        : undefined;
    if (
      approvalKey &&
      (generation.bufferedApprovalKeys.has(approvalKey) ||
        this.interactionRegistry.byApprovalKey.has(approvalKey))
    ) {
      throw new Error(
        "Harness reused an approval correlation for multiple requests.",
      );
    }
    if (
      this.interactionRegistry.byUiId.size +
        generation.bufferedInteractions.size >=
      MAX_PENDING_INTERACTIONS
    ) {
      this.failGenerationLocked(
        generation,
        new Error("Harness interaction buffer exceeded its safe bound."),
      );
      return;
    }

    generation.bufferedInteractions.set(wireKey, {
      event,
      fingerprint,
      wireKey,
      ...(approvalKey ? { approvalKey } : {}),
      order: ++this.runtimeEventOrder,
    });
    if (approvalKey) {
      generation.bufferedApprovalKeys.set(approvalKey, wireKey);
    }
    this.startDirectoryRefreshLocked(generation);
  }

  private flushBufferedInteractions(
    generation: EventGeneration,
    sessionId?: HarnessUiSessionId,
  ): void {
    if (!this.isCurrentGeneration(generation)) return;
    for (const [wireKey, buffered] of [
      ...generation.bufferedInteractions,
    ]) {
      if (sessionId && buffered.event.sessionId !== sessionId) continue;
      if (
        buffered.order <=
        (generation.interactionCutoffs.get(buffered.event.sessionId) ?? -1)
      ) {
        this.deleteBufferedInteraction(generation, wireKey);
        continue;
      }
      if (!this.eligibleSession(buffered.event.sessionId)) continue;
      this.deleteBufferedInteraction(generation, wireKey);
      this.upsertRawInteraction(
        buffered.event,
        generation.bufferedInteractions.size,
      );
    }
  }

  /** Applies generation-scoped facts only after directory eligibility exists. */
  private applyBufferedSessionFacts(
    generation: EventGeneration,
    sessionId?: HarnessUiSessionId,
  ): void {
    if (!this.isCurrentGeneration(generation)) return;
    const ids = new Set<HarnessUiSessionId>([
      ...generation.bufferedStatuses.keys(),
      ...generation.bufferedSessionTargets.keys(),
    ]);
    for (const bufferedSessionId of ids) {
      if (sessionId && bufferedSessionId !== sessionId) continue;
      const session = this.eligibleSession(bufferedSessionId);
      if (!session) continue;
      const status = generation.bufferedStatuses.get(bufferedSessionId);
      if (status) {
        this.setSessionRunning(session, status.running);
        session.updatedAt = this.clock();
        session.updatedAtEpoch += 1;
        session.stateVersion += 1;
        generation.bufferedStatuses.delete(bufferedSessionId);
      }
      const target = generation.bufferedSessionTargets.get(bufferedSessionId);
      if (target !== undefined) {
        session.targetSequence = Math.max(session.targetSequence, target);
        session.stateVersion += 1;
        generation.bufferedSessionTargets.delete(bufferedSessionId);
      }
    }
  }

  private discardBufferedInteractionResolution(
    generation: EventGeneration,
    event: Extract<HarnessUiEvent, { type: "interaction-resolved" }>,
  ): void {
    const wireKey =
      event.resolution.kind === "approval"
        ? generation.bufferedApprovalKeys.get(
            wireApprovalKey(event.sessionId, event.resolution.approvalId),
          )
        : wireInteractionKey("questions", event.resolution.rpcId);
    if (wireKey) this.deleteBufferedInteraction(generation, wireKey);
  }

  private discardBufferedInteractionsForSession(
    generation: EventGeneration,
    sessionId: HarnessUiSessionId,
  ): void {
    for (const [wireKey, buffered] of generation.bufferedInteractions) {
      if (buffered.event.sessionId === sessionId) {
        this.deleteBufferedInteraction(generation, wireKey);
      }
    }
  }

  private deleteBufferedInteraction(
    generation: EventGeneration,
    wireKey: string,
  ): void {
    const buffered = generation.bufferedInteractions.get(wireKey);
    if (!buffered) return;
    generation.bufferedInteractions.delete(wireKey);
    if (buffered.approvalKey) {
      generation.bufferedApprovalKeys.delete(buffered.approvalKey);
    }
  }

  private clearBufferedInteractions(generation: EventGeneration): void {
    generation.bufferedInteractions.clear();
    generation.bufferedApprovalKeys.clear();
    generation.bufferedStatuses.clear();
    generation.bufferedSessionTargets.clear();
    generation.interactionCutoffs.clear();
    generation.preLiveEvents.length = 0;
  }

  private acceptRuntimeError(
    event: Extract<HarnessUiEvent, { type: "agent-error" }>,
    generation: EventGeneration,
  ): void {
    const message = event.message.trim();
    if (!message || message.length > MAX_INTERACTION_TEXT_LENGTH) {
      this.failGenerationLocked(
        generation,
        new Error("Harness runtime error payload exceeded its safe bound."),
      );
      return;
    }
    const occurrence: RuntimeErrorOccurrence = {
      id: opaqueId(
        "runtime-error",
        `${++this.runtimeErrorOccurrence}:${event.sessionId}`,
      ),
      message,
      order: ++this.runtimeEventOrder,
    };
    const session = this.eligibleSession(event.sessionId);
    if (session) {
      this.applyRuntimeError(session, occurrence);
      return;
    }
    if (
      !this.runtimeErrorQuarantine.has(event.sessionId) &&
      this.runtimeErrorQuarantine.size >= MAX_PENDING_INTERACTIONS
    ) {
      this.failGenerationLocked(
        generation,
        new Error("Harness runtime error buffer exceeded its safe bound."),
      );
      return;
    }
    this.runtimeErrorQuarantine.delete(event.sessionId);
    this.runtimeErrorQuarantine.set(event.sessionId, occurrence);
    if (generation.phase === "live") this.startDirectoryRefreshLocked(generation);
  }

  private flushRuntimeErrorQuarantine(sessionId?: HarnessUiSessionId): void {
    for (const [bufferedSessionId, occurrence] of [
      ...this.runtimeErrorQuarantine,
    ]) {
      if (sessionId && bufferedSessionId !== sessionId) continue;
      const session = this.eligibleSession(bufferedSessionId);
      if (!session) continue;
      this.runtimeErrorQuarantine.delete(bufferedSessionId);
      this.applyRuntimeError(session, occurrence);
    }
  }

  private applyRuntimeError(
    session: MutableSession,
    occurrence: WorkspaceRuntimeError,
  ): void {
    const before = this.projectionFingerprint();
    session.runtimeError = Object.freeze({
      id: occurrence.id,
      message: occurrence.message,
    });
    session.stateVersion += 1;
    this.publishIfChanged(before, {
      type: "session-runtime-error",
      sessionId: session.id,
    });
  }

  private eligibleSession(
    sessionId: HarnessUiSessionId,
  ): MutableSession | undefined {
    if (
      this.directoryRemovals.has(sessionId) ||
      !this.directoryMembers.has(sessionId)
    ) {
      return undefined;
    }
    return this.sessions.get(sessionId);
  }

  private upsertRawInteraction(
    event: Extract<HarnessUiEvent, { type: "interaction-requested" }>,
    reservedInteractions = 0,
  ): void {
    const kind =
      event.request.type === "approval/requested" ? "approval" : "questions";
    const wireKey = wireInteractionKey(kind, event.rpcId);
    const existingId = this.interactionRegistry.byWireKey.get(wireKey);
    const fingerprint = requestFingerprint(event.request);
    if (existingId) {
      const existing = this.interactionRegistry.byUiId.get(existingId)!;
      if (
        existing.sessionId === event.sessionId &&
        existing.fingerprint === fingerprint
      ) {
        return;
      }
      throw new Error(
        "Harness replayed an interaction correlation with changed payload.",
      );
    }
    if (
      this.interactionRegistry.byUiId.size + reservedInteractions >=
      MAX_PENDING_INTERACTIONS
    ) {
      throw new Error("Harness interaction projection exceeded its safe bound.");
    }
    this.validateRawInteractionBounds(event);

    const uiId = opaqueId("interaction", wireKey);
    if (this.interactionRegistry.byUiId.has(uiId)) {
      throw new Error("Opaque interaction identity collision.");
    }
    const approvalKey =
      event.request.type === "approval/requested"
        ? wireApprovalKey(event.sessionId, event.request.approvalId)
        : undefined;
    if (
      approvalKey &&
      this.interactionRegistry.byApprovalKey.has(approvalKey)
    ) {
      throw new Error(
        "Harness reused an approval correlation for multiple requests.",
      );
    }
    const projection: PendingInteraction =
      event.request.type === "approval/requested"
        ? freezePendingInteraction({
            kind: "approval",
            id: uiId,
            sessionId: event.sessionId,
            actionLabel: event.request.toolName,
            ...(event.request.reason
              ? { explanation: event.request.reason }
              : {}),
          })
        : freezePendingInteraction({
            kind: "questions",
            id: uiId,
            sessionId: event.sessionId,
            questions: event.request.questions.map((question, questionIndex) => ({
              id: opaqueId("question", `${uiId}:${questionIndex}`),
              ...(question.header ? { heading: question.header } : {}),
              prompt: question.question,
              ...(question.detail ? { detail: question.detail } : {}),
              selection: question.multiSelect ? "multiple" : "single",
              options: (question.options ?? []).map((option, optionIndex) => ({
                id: opaqueId(
                  "option",
                  `${uiId}:${questionIndex}:${optionIndex}`,
                ),
                label: option.label,
                ...(option.description
                  ? { description: option.description }
                  : {}),
              })),
            })),
          });

    this.interactionRegistry.byUiId.set(uiId, {
      sessionId: event.sessionId,
      rpcId: event.rpcId,
      fingerprint,
      projection,
      request: event.request,
    });
    this.interactionRegistry.byWireKey.set(wireKey, uiId);
    if (approvalKey) {
      this.interactionRegistry.byApprovalKey.set(approvalKey, uiId);
    }
    this.publish({
      type: "interaction-upserted",
      sessionId: event.sessionId,
      interactionId: uiId,
    });
  }

  private validateRawInteractionBounds(
    event: Extract<HarnessUiEvent, { type: "interaction-requested" }>,
  ): void {
    const bounded = (value: unknown) =>
      typeof value !== "string" || value.length <= MAX_INTERACTION_TEXT_LENGTH;
    if (event.request.type === "approval/requested") {
      if (!bounded(event.request.toolName) || !bounded(event.request.reason)) {
        throw new Error("Harness approval payload exceeded its safe bound.");
      }
      return;
    }
    if (event.request.questions.length > MAX_INTERACTION_QUESTIONS) {
      throw new Error("Harness question batch exceeded its safe bound.");
    }
    for (const question of event.request.questions) {
      if (
        (question.options?.length ?? 0) >
          MAX_INTERACTION_OPTIONS_PER_QUESTION ||
        !bounded(question.header) ||
        !bounded(question.question) ||
        !bounded(question.detail) ||
        question.options?.some(
          (option) =>
            !bounded(option.label) || !bounded(option.description),
        )
      ) {
        throw new Error("Harness question payload exceeded its safe bound.");
      }
    }
  }

  private removeInteraction(uiId: string): void {
    const raw = this.interactionRegistry.byUiId.get(uiId);
    if (!raw) return;

    const kind =
      raw.request.type === "approval/requested" ? "approval" : "questions";
    this.interactionRegistry.byUiId.delete(uiId);
    this.interactionRegistry.byWireKey.delete(
      wireInteractionKey(kind, raw.rpcId),
    );
    if (raw.request.type === "approval/requested") {
      this.interactionRegistry.byApprovalKey.delete(
        wireApprovalKey(raw.sessionId, raw.request.approvalId),
      );
    }
    this.publish({
      type: "interaction-removed",
      sessionId: raw.sessionId,
      interactionId: uiId,
    });
  }

  private discardInteractionsForSession(sessionId: HarnessUiSessionId): void {
    for (const [uiId, raw] of this.interactionRegistry.byUiId) {
      if (raw.sessionId === sessionId) {
        this.interactionRegistry.byUiId.delete(uiId);
        this.interactionRegistry.byWireKey.delete(
          wireInteractionKey(
            raw.request.type === "approval/requested"
              ? "approval"
              : "questions",
            raw.rpcId,
          ),
        );
        if (raw.request.type === "approval/requested") {
          this.interactionRegistry.byApprovalKey.delete(
            wireApprovalKey(sessionId, raw.request.approvalId),
          );
        }
      }
    }
  }

  private setConnection(
    status: WorkspaceConnectionStatus,
    detail?: string,
  ): WorkspaceRevision {
    const normalizedDetail = detail?.trim() || undefined;
    if (
      this.connectionStatus === status &&
      this.connectionDetail === normalizedDetail
    ) {
      return this.revision;
    }
    this.connectionStatus = status;
    this.connectionDetail = normalizedDetail;
    return this.publish({ type: "connection-changed", status });
  }

  private publishIfChanged(
    previousFingerprint: string,
    cause: UiEventCause,
  ): WorkspaceRevision {
    if (previousFingerprint === this.projectionFingerprint()) {
      return this.revision;
    }
    return this.publish(cause);
  }

  private publish(cause: UiEventCause): WorkspaceRevision {
    this.revision += 1;
    const event = Object.freeze({
      type: "workspace-snapshot" as const,
      revision: this.revision,
      cause: freezeCause(cause),
      snapshot: this.buildSnapshot(),
    });
    this.eventHistory.push(event);
    while (this.eventHistory.length > MAX_EVENT_HISTORY) {
      const evicted = this.eventHistory.shift();
      if (evicted) {
        this.historyFloorRevision = evicted.revision;
      }
    }

    for (const subscriber of this.subscribers) {
      if (subscriber.closed || !subscriber.ready) continue;
      // Every event carries a complete immutable projection, so keeping only
      // the newest pending event is lossless for convergence and bounds slow
      // subscriber memory.
      subscriber.queue.length = 0;
      subscriber.queue.push(event);
      subscriber.wake?.();
      subscriber.wake = undefined;
    }
    return this.revision;
  }

  private projectionRebaseEvent(): UiEvent {
    return Object.freeze({
      type: "workspace-snapshot" as const,
      revision: this.revision,
      cause: Object.freeze({ type: "projection-rebased" as const }),
      snapshot: this.buildSnapshot(),
    });
  }

  private projectionFingerprint(): string {
    const snapshot = this.buildSnapshot();
    return JSON.stringify({
      connection: snapshot.connection,
      sessions: snapshot.sessions,
      activeSession: snapshot.activeSession,
    });
  }

  private buildSnapshot(): WorkspaceSnapshot {
    const sessions = [...this.sessions.values()]
      .filter((session) => this.directoryMembers.has(session.id))
      .sort(
        (left, right) =>
          right.updatedAt - left.updatedAt || left.id.localeCompare(right.id),
      )
      .map((session): WorkspaceSessionSummary =>
        Object.freeze({
          id: session.id,
          title: session.title,
          updatedAt: session.updatedAt,
          running: session.running,
          blank: session.blank,
          pendingInteractionCount: this.interactionsForSession(session.id).length,
        }),
      );
    const active = this.activeSessionId
      ? this.sessions.get(this.activeSessionId)
      : undefined;

    return Object.freeze({
      revision: this.revision,
      connection: freezeConnection(
        this.connectionStatus,
        this.connectionDetail,
      ),
      sessions: Object.freeze(sessions),
      activeSession: active ? this.freezeActiveSession(active) : null,
    });
  }

  private freezeActiveSession(
    session: MutableSession,
  ): WorkspaceSessionSnapshot {
    const orderedMessages = [
      ...session.durableMessages.map((message) => ({
        order: message.sequence,
        tieBreaker: 0,
        message: Object.freeze({
          id: message.id,
          role: message.role,
          text: message.text,
          delivery: "durable" as const,
          sequence: message.sequence,
          createdAt: message.createdAt,
        }) satisfies WorkspaceMessage,
      })),
      ...session.pendingPrompts
        .filter((pending) => pending.state === "visible")
        .map((pending) => ({
          order: pending.displayAfterSequence + 0.5,
          tieBreaker: pending.ordinal,
          message: Object.freeze({
            id: pending.clientMessageId,
            role: "user" as const,
            text: pending.text,
            delivery: "pending" as const,
            sequence: null,
            createdAt: pending.createdAt,
          }) satisfies WorkspaceMessage,
        })),
    ]
      .sort(
        (left, right) =>
          left.order - right.order || left.tieBreaker - right.tieBreaker,
      )
      .map((entry) => entry.message);

    return Object.freeze({
      id: session.id,
      title: session.title,
      running: session.running,
      ...(session.runtimeError ? { runtimeError: session.runtimeError } : {}),
      messages: Object.freeze(orderedMessages),
      scientificActivities: Object.freeze(
        session.scientificActivities.map(
          (activity): WorkspaceScientificActivity =>
            Object.freeze({
              ...activity,
              details: Object.freeze(
                activity.details.map((item) => Object.freeze({ ...item })),
              ),
            }),
        ),
      ),
      pendingInteractions: Object.freeze(
        this.interactionsForSession(session.id),
      ),
    });
  }

  private interactionsForSession(
    sessionId: HarnessUiSessionId,
  ): PendingInteraction[] {
    return [...this.interactionRegistry.byUiId.values()]
      .filter((interaction) => interaction.sessionId === sessionId)
      .map((interaction) => interaction.projection);
  }
}
