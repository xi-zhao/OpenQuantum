import {
  validateQuestionAnswers,
  COMMAND_REPLAY_WINDOW,
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

interface MutableMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  delivery: "pending" | "durable";
  sequence: number | null;
  createdAt: number;
}

interface MutableSession {
  id: HarnessUiSessionId;
  title: string;
  updatedAt: number;
  running: boolean;
  runtimeError?: WorkspaceRuntimeError;
  messages: MutableMessage[];
  scientificActivities: WorkspaceScientificActivity[];
  pendingInteractions: PendingInteraction[];
  nextSequence: number;
}

interface CommandLedgerEntry {
  readonly fingerprint: string;
  readonly receipt: CommandReceipt;
}

interface EventSubscriber {
  readonly queue: UiEvent[];
  closed: boolean;
  wake?: () => void;
}

export interface InMemoryMessageSeed {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly text: string;
  readonly delivery?: "pending" | "durable";
  readonly sequence?: number | null;
  readonly createdAt?: number;
}

export interface InMemorySessionSeed {
  readonly id: HarnessUiSessionId;
  readonly title?: string;
  readonly updatedAt?: number;
  readonly running?: boolean;
  readonly runtimeError?: string;
  readonly messages?: readonly InMemoryMessageSeed[];
  readonly scientificActivities?: readonly WorkspaceScientificActivity[];
  readonly pendingInteractions?: readonly PendingInteraction[];
}

export interface InMemoryHarnessUiAdapterOptions {
  readonly sessions?: readonly InMemorySessionSeed[];
  readonly activeSessionId?: HarnessUiSessionId | null;
  readonly connectionStatus?: WorkspaceConnectionStatus;
  readonly clock?: () => number;
  readonly idFactory?: (kind: "session" | "message") => string;
}

export interface AssistantFixtureOptions {
  readonly messageId?: string;
  readonly sequence?: number;
  readonly createdAt?: number;
}

export interface DurablePromptFixtureOptions {
  readonly sequence?: number;
}

/** 测试专用控制面，不属于生产 HarnessUiPort interface。 */
export interface InMemoryHarnessFixtureDriver {
  acknowledgePrompt(
    sessionId: HarnessUiSessionId,
    clientMessageId: string,
    options?: DurablePromptFixtureOptions,
  ): WorkspaceRevision;
  assistant(
    sessionId: HarnessUiSessionId,
    text: string,
    options?: AssistantFixtureOptions,
  ): WorkspaceRevision;
  running(
    sessionId: HarnessUiSessionId,
    running: boolean,
  ): WorkspaceRevision;
  runtimeError(
    sessionId: HarnessUiSessionId,
    message?: string,
  ): WorkspaceRevision;
  upsertInteraction(interaction: PendingInteraction): WorkspaceRevision;
  resolveInteraction(
    sessionId: HarnessUiSessionId,
    interactionId: string,
  ): WorkspaceRevision;
  rebaseInteractions(
    sessionId: HarnessUiSessionId,
    interactions: readonly PendingInteraction[],
  ): WorkspaceRevision;
  disconnect(detail?: string): WorkspaceRevision;
  reconnecting(detail?: string): WorkspaceRevision;
  reconnect(): WorkspaceRevision;
}

function abortError(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("The operation was aborted", "AbortError");
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw abortError(signal);
  }
}

function freezeConnection(
  status: WorkspaceConnectionStatus,
  detail?: string,
): WorkspaceConnection {
  return Object.freeze(detail ? { status, detail } : { status });
}

function freezeMessage(message: MutableMessage): WorkspaceMessage {
  return Object.freeze({
    id: message.id,
    role: message.role,
    text: message.text,
    delivery: message.delivery,
    sequence: message.sequence,
    createdAt: message.createdAt,
  });
}

function freezeInteraction(interaction: PendingInteraction): PendingInteraction {
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

function freezeScientificActivity(
  activity: WorkspaceScientificActivity,
): WorkspaceScientificActivity {
  return Object.freeze({
    ...activity,
    details: Object.freeze(
      activity.details.map((item) => Object.freeze({ ...item })),
    ),
  });
}

function freezeSessionSummary(
  session: MutableSession,
): WorkspaceSessionSummary {
  return Object.freeze({
    id: session.id,
    title: session.title,
    updatedAt: session.updatedAt,
    running: session.running,
    blank: session.messages.length === 0,
    pendingInteractionCount: session.pendingInteractions.length,
  });
}

function freezeSessionSnapshot(
  session: MutableSession,
): WorkspaceSessionSnapshot {
  return Object.freeze({
    id: session.id,
    title: session.title,
    running: session.running,
    ...(session.runtimeError
      ? { runtimeError: Object.freeze({ ...session.runtimeError }) }
      : {}),
    messages: Object.freeze(session.messages.map(freezeMessage)),
    scientificActivities: Object.freeze(
      session.scientificActivities.map(freezeScientificActivity),
    ),
    pendingInteractions: Object.freeze(
      session.pendingInteractions.map(freezeInteraction),
    ),
  });
}

function freezeCause(cause: UiEventCause): UiEventCause {
  return Object.freeze({ ...cause });
}

function fingerprint(command: UiCommand): string {
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

export class InMemoryHarnessUiAdapter implements HarnessUiPort {
  readonly fixture: InMemoryHarnessFixtureDriver;

  private readonly sessions = new Map<HarnessUiSessionId, MutableSession>();
  private readonly commandLedger = new Map<string, CommandLedgerEntry>();
  private readonly eventHistory: UiEvent[] = [];
  private readonly subscribers = new Set<EventSubscriber>();
  private readonly clock: () => number;
  private readonly idFactory: (kind: "session" | "message") => string;

  private activeSessionId: HarnessUiSessionId | null;
  private connectionStatus: WorkspaceConnectionStatus;
  private connectionDetail: string | undefined;
  private revision = 0;
  private historyFloorRevision = 0;
  private runtimeErrorOccurrence = 0;

  constructor(options: InMemoryHarnessUiAdapterOptions = {}) {
    let generatedId = 0;
    this.clock = options.clock ?? (() => Date.now());
    this.idFactory =
      options.idFactory ?? ((kind) => `${kind}-${++generatedId}`);
    this.connectionStatus = options.connectionStatus ?? "online";

    for (const seed of options.sessions ?? []) {
      if (this.sessions.has(seed.id)) {
        throw new Error(`duplicate session seed: ${seed.id}`);
      }

      const messages = (seed.messages ?? []).map((message, index) => ({
        id: message.id,
        role: message.role,
        text: message.text,
        delivery: message.delivery ?? "durable",
        sequence:
          message.delivery === "pending"
            ? null
            : (message.sequence ?? index),
        createdAt: message.createdAt ?? seed.updatedAt ?? this.clock(),
      }));
      const durableSequences = messages
        .map((message) => message.sequence)
        .filter((sequence): sequence is number => sequence !== null);

      this.sessions.set(seed.id, {
        id: seed.id,
        title: seed.title?.trim() || "新对话",
        updatedAt: seed.updatedAt ?? this.clock(),
        running: seed.running ?? false,
        ...(seed.runtimeError?.trim()
          ? {
              runtimeError: {
                id: `fixture-runtime-error-${++this.runtimeErrorOccurrence}`,
                message: seed.runtimeError.trim(),
              },
            }
          : {}),
        messages,
        scientificActivities: (seed.scientificActivities ?? []).map(
          freezeScientificActivity,
        ),
        pendingInteractions: (seed.pendingInteractions ?? []).map(
          freezeInteraction,
        ),
        nextSequence:
          durableSequences.length === 0
            ? 0
            : Math.max(...durableSequences) + 1,
      });
    }

    const requestedActiveSession = options.activeSessionId;
    if (
      requestedActiveSession !== undefined &&
      requestedActiveSession !== null &&
      !this.sessions.has(requestedActiveSession)
    ) {
      throw new Error(`active session seed not found: ${requestedActiveSession}`);
    }
    this.activeSessionId =
      requestedActiveSession === undefined
        ? (this.sessions.keys().next().value ?? null)
        : requestedActiveSession;

    this.fixture = Object.freeze({
      acknowledgePrompt: (
        sessionId: HarnessUiSessionId,
        clientMessageId: string,
        fixtureOptions?: DurablePromptFixtureOptions,
      ) =>
        this.acknowledgePrompt(sessionId, clientMessageId, fixtureOptions),
      assistant: (
        sessionId: HarnessUiSessionId,
        text: string,
        fixtureOptions?: AssistantFixtureOptions,
      ) => this.addAssistant(sessionId, text, fixtureOptions),
      running: (sessionId: HarnessUiSessionId, running: boolean) =>
        this.setRunning(sessionId, running),
      runtimeError: (sessionId: HarnessUiSessionId, message?: string) =>
        this.setRuntimeError(sessionId, message),
      upsertInteraction: (interaction: PendingInteraction) =>
        this.upsertInteraction(interaction),
      resolveInteraction: (
        sessionId: HarnessUiSessionId,
        interactionId: string,
      ) => this.resolveInteraction(sessionId, interactionId),
      rebaseInteractions: (
        sessionId: HarnessUiSessionId,
        interactions: readonly PendingInteraction[],
      ) => this.rebaseInteractions(sessionId, interactions),
      disconnect: (detail?: string) =>
        this.setConnection("offline", detail),
      reconnecting: (detail?: string) =>
        this.setConnection("reconnecting", detail),
      reconnect: () => this.setConnection("online"),
    });
  }

  async snapshot(signal?: AbortSignal): Promise<WorkspaceSnapshot> {
    throwIfAborted(signal);
    return this.buildSnapshot();
  }

  async command(
    command: UiCommand,
    signal?: AbortSignal,
  ): Promise<CommandReceipt> {
    throwIfAborted(signal);

    const commandFingerprint = fingerprint(command);
    const prior = this.commandLedger.get(command.commandId);
    if (prior) {
      if (prior.fingerprint === commandFingerprint) {
        this.commandLedger.delete(command.commandId);
        this.commandLedger.set(command.commandId, prior);
        return prior.receipt;
      }

      return failureReceipt(
        command.commandId,
        this.revision,
        "COMMAND_ID_CONFLICT",
        "同一个 commandId 不能表示两个不同的用户意图。",
      );
    }

    const receipt =
      this.connectionStatus === "online"
        ? this.applyCommand(command)
        : failureReceipt(
            command.commandId,
            this.revision,
            "RUNTIME_UNAVAILABLE",
            "Harness 当前不可用，请在连接恢复后使用新的 commandId 重试。",
          );

    if (receipt.accepted || receipt.error.code !== "RUNTIME_UNAVAILABLE") {
      this.commandLedger.set(command.commandId, {
        fingerprint: commandFingerprint,
        receipt,
      });
      while (this.commandLedger.size > COMMAND_REPLAY_WINDOW) {
        const oldest = this.commandLedger.keys().next().value;
        if (oldest === undefined) break;
        this.commandLedger.delete(oldest);
      }
    }
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
    if (afterRevision !== null && afterRevision > this.revision) {
      throw new RangeError(
        `afterRevision ${afterRevision} is ahead of current revision ${this.revision}`,
      );
    }
    if (signal.aborted) {
      return;
    }

    const subscriber: EventSubscriber = {
      queue:
        afterRevision === null || afterRevision < this.historyFloorRevision
          ? [
              Object.freeze({
                type: "workspace-snapshot" as const,
                revision: this.revision,
                cause: freezeCause({ type: "projection-rebased" }),
                snapshot: this.buildSnapshot(),
              }),
            ]
          : this.eventHistory.filter(
              (event) => event.revision > afterRevision,
            ),
      closed: false,
    };
    const handleAbort = () => {
      subscriber.closed = true;
      subscriber.wake?.();
      subscriber.wake = undefined;
      // A consumer can stop while the generator is paused at `yield`, so
      // signal abort must release the subscriber without waiting for finally.
      this.subscribers.delete(subscriber);
    };

    this.subscribers.add(subscriber);
    signal.addEventListener("abort", handleAbort, { once: true });

    try {
      while (!subscriber.closed) {
        const event = subscriber.queue.shift();
        if (event) {
          yield event;
          continue;
        }

        await new Promise<void>((resolve) => {
          subscriber.wake = resolve;
        });
        subscriber.wake = undefined;
      }
    } finally {
      signal.removeEventListener("abort", handleAbort);
      this.subscribers.delete(subscriber);
    }
  }

  private applyCommand(command: UiCommand): CommandReceipt {
    switch (command.type) {
      case "new-session":
        return this.createSession(command);
      case "open-session":
        return this.openSession(command);
      case "prompt":
        return this.prompt(command);
      case "cancel":
        return this.cancel(command);
      case "answer-interaction":
        return this.answerInteraction(command);
    }
  }

  private createSession(
    command: Extract<UiCommand, { type: "new-session" }>,
  ): CommandReceipt {
    const sessionId = this.uniqueId("session", this.sessions);
    const now = this.clock();
    this.sessions.set(sessionId, {
      id: sessionId,
      title: command.title?.trim() || "新对话",
      updatedAt: now,
      running: false,
      messages: [],
      scientificActivities: [],
      pendingInteractions: [],
      nextSequence: 0,
    });
    this.activeSessionId = sessionId;
    const revision = this.publish({
      type: "session-created",
      sessionId,
      commandId: command.commandId,
    });

    return successReceipt(command.commandId, revision, {
      type: "session-created",
      sessionId,
    });
  }

  private openSession(
    command: Extract<UiCommand, { type: "open-session" }>,
  ): CommandReceipt {
    if (!this.sessions.has(command.sessionId)) {
      return failureReceipt(
        command.commandId,
        this.revision,
        "SESSION_NOT_FOUND",
        `找不到会话 ${command.sessionId}。`,
      );
    }

    if (this.activeSessionId !== command.sessionId) {
      this.activeSessionId = command.sessionId;
      this.publish({
        type: "session-opened",
        sessionId: command.sessionId,
        commandId: command.commandId,
      });
    }

    return successReceipt(command.commandId, this.revision, {
      type: "session-opened",
      sessionId: command.sessionId,
    });
  }

  private prompt(
    command: Extract<UiCommand, { type: "prompt" }>,
  ): CommandReceipt {
    const session = this.sessions.get(command.sessionId);
    if (!session) {
      return failureReceipt(
        command.commandId,
        this.revision,
        "SESSION_NOT_FOUND",
        `找不到会话 ${command.sessionId}。`,
      );
    }

    const text = command.text.trim();
    if (!text) {
      return failureReceipt(
        command.commandId,
        this.revision,
        "EMPTY_PROMPT",
        "消息内容不能为空。",
      );
    }

    const clientMessageId = command.clientMessageId.trim();
    const existing = session.messages.find(
      (message) => message.id === clientMessageId,
    );
    if (existing) {
      if (existing.role !== "user" || existing.text !== text) {
        return failureReceipt(
          command.commandId,
          this.revision,
          "CLIENT_MESSAGE_ID_CONFLICT",
          "同一个 clientMessageId 不能表示两条不同的消息。",
        );
      }

      return successReceipt(command.commandId, this.revision, {
        type: "prompt-queued",
        sessionId: command.sessionId,
        messageId: clientMessageId,
      });
    }

    if (!clientMessageId) {
      return failureReceipt(
        command.commandId,
        this.revision,
        "CLIENT_MESSAGE_ID_CONFLICT",
        "clientMessageId 不能为空。",
      );
    }

    const now = this.clock();
    session.messages.push({
      id: clientMessageId,
      role: "user",
      text,
      delivery: "pending",
      sequence: null,
      createdAt: now,
    });
    session.updatedAt = now;
    session.running = true;
    this.activeSessionId = command.sessionId;
    const revision = this.publish({
      type: "prompt-pending",
      sessionId: command.sessionId,
      commandId: command.commandId,
      messageId: clientMessageId,
    });

    return successReceipt(command.commandId, revision, {
      type: "prompt-queued",
      sessionId: command.sessionId,
      messageId: clientMessageId,
    });
  }

  private cancel(
    command: Extract<UiCommand, { type: "cancel" }>,
  ): CommandReceipt {
    const session = this.sessions.get(command.sessionId);
    if (!session) {
      return failureReceipt(
        command.commandId,
        this.revision,
        "SESSION_NOT_FOUND",
        `找不到会话 ${command.sessionId}。`,
      );
    }

    // 接收 cancel 只代表命令已送达。running 仍由 Host 状态决定，避免 UI
    // 在 Agent 尚未真正停止时制造一个虚假的 settled 状态。
    const revision = this.publish({
      type: "cancel-requested",
      sessionId: command.sessionId,
      commandId: command.commandId,
    });

    return successReceipt(command.commandId, revision, {
      type: "cancel-requested",
      sessionId: command.sessionId,
    });
  }

  private answerInteraction(
    command: Extract<UiCommand, { type: "answer-interaction" }>,
  ): CommandReceipt {
    const session = this.sessions.get(command.sessionId);
    if (!session) {
      return failureReceipt(
        command.commandId,
        this.revision,
        "SESSION_NOT_FOUND",
        `找不到会话 ${command.sessionId}。`,
      );
    }

    const interaction = session.pendingInteractions.find(
      (candidate) => candidate.id === command.interactionId,
    );
    if (!interaction) {
      return failureReceipt(
        command.commandId,
        this.revision,
        "INTERACTION_NOT_PENDING",
        "该交互已处理或不再等待回答。",
      );
    }
    if (interaction.kind !== command.response.kind) {
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

    if (
      interaction.kind === "questions" &&
      command.response.kind === "questions" &&
      command.response.action === "submit"
    ) {
      const validation = validateQuestionAnswers(
        interaction,
        command.response.answers,
      );
      if (!validation.valid) {
        return failureReceipt(
          command.commandId,
          this.revision,
          "INVALID_INTERACTION_ANSWER",
          validation.message,
        );
      }
    }

    // 接收回答不等于 Host 已完成交互。卡片由 resolved fixture/event 权威移除。
    return successReceipt(command.commandId, this.revision, {
      type: "interaction-response-accepted",
      sessionId: command.sessionId,
      interactionId: command.interactionId,
    });
  }

  private upsertInteraction(interaction: PendingInteraction): WorkspaceRevision {
    const session = this.requireSession(interaction.sessionId);
    const frozen = freezeInteraction(interaction);
    const index = session.pendingInteractions.findIndex(
      (candidate) => candidate.id === interaction.id,
    );
    if (index >= 0) {
      if (
        JSON.stringify(session.pendingInteractions[index]) ===
        JSON.stringify(frozen)
      ) {
        return this.revision;
      }
      throw new Error(`interaction fixture payload changed: ${interaction.id}`);
    }

    session.pendingInteractions.push(frozen);
    session.updatedAt = this.clock();
    return this.publish({
      type: "interaction-upserted",
      sessionId: interaction.sessionId,
      interactionId: interaction.id,
    });
  }

  private resolveInteraction(
    sessionId: HarnessUiSessionId,
    interactionId: string,
  ): WorkspaceRevision {
    const session = this.requireSession(sessionId);
    const remaining = session.pendingInteractions.filter(
      (interaction) => interaction.id !== interactionId,
    );
    if (remaining.length === session.pendingInteractions.length) {
      return this.revision;
    }

    session.pendingInteractions = remaining;
    session.updatedAt = this.clock();
    return this.publish({
      type: "interaction-removed",
      sessionId,
      interactionId,
    });
  }

  private rebaseInteractions(
    sessionId: HarnessUiSessionId,
    interactions: readonly PendingInteraction[],
  ): WorkspaceRevision {
    const session = this.requireSession(sessionId);
    if (interactions.some((interaction) => interaction.sessionId !== sessionId)) {
      throw new Error("interaction fixture session mismatch");
    }
    const ids = interactions.map((interaction) => interaction.id);
    if (new Set(ids).size !== ids.length) {
      throw new Error("interaction fixture ids must be unique");
    }

    const frozen = interactions.map(freezeInteraction);
    if (
      JSON.stringify(session.pendingInteractions) === JSON.stringify(frozen)
    ) {
      return this.revision;
    }
    session.pendingInteractions = frozen;
    session.updatedAt = this.clock();
    return this.publish({ type: "interactions-rebased", sessionId });
  }

  private acknowledgePrompt(
    sessionId: HarnessUiSessionId,
    clientMessageId: string,
    options: DurablePromptFixtureOptions = {},
  ): WorkspaceRevision {
    const session = this.requireSession(sessionId);
    const message = session.messages.find(
      (candidate) =>
        candidate.id === clientMessageId && candidate.role === "user",
    );
    if (!message) {
      throw new Error(
        `cannot acknowledge missing prompt ${clientMessageId} in ${sessionId}`,
      );
    }
    if (message.delivery === "durable") {
      return this.revision;
    }

    message.delivery = "durable";
    message.sequence = this.claimSequence(session, options.sequence);
    session.updatedAt = this.clock();
    return this.publish({
      type: "prompt-durable",
      sessionId,
      messageId: clientMessageId,
    });
  }

  private addAssistant(
    sessionId: HarnessUiSessionId,
    text: string,
    options: AssistantFixtureOptions = {},
  ): WorkspaceRevision {
    const session = this.requireSession(sessionId);
    const normalizedText = text.trim();
    if (!normalizedText) {
      throw new Error("assistant fixture text cannot be empty");
    }

    const messageId = options.messageId ?? this.uniqueMessageId();
    const existing = session.messages.find((message) => message.id === messageId);
    if (existing) {
      if (
        existing.role === "assistant" &&
        existing.text === normalizedText &&
        existing.delivery === "durable"
      ) {
        return this.revision;
      }
      throw new Error(`assistant fixture message id conflict: ${messageId}`);
    }

    const now = options.createdAt ?? this.clock();
    session.messages.push({
      id: messageId,
      role: "assistant",
      text: normalizedText,
      delivery: "durable",
      sequence: this.claimSequence(session, options.sequence),
      createdAt: now,
    });
    session.updatedAt = now;
    const revision = this.publish({
      type: "assistant-message",
      sessionId,
      messageId,
    });
    return revision;
  }

  private setRunning(
    sessionId: HarnessUiSessionId,
    running: boolean,
  ): WorkspaceRevision {
    const session = this.requireSession(sessionId);
    if (session.running === running && !(running && session.runtimeError)) {
      return this.revision;
    }

    session.running = running;
    if (running) session.runtimeError = undefined;
    session.updatedAt = this.clock();
    return this.publish({ type: "running-changed", sessionId, running });
  }

  private setRuntimeError(
    sessionId: HarnessUiSessionId,
    message?: string,
  ): WorkspaceRevision {
    const session = this.requireSession(sessionId);
    const normalized = message?.trim() || undefined;
    if (!normalized && !session.runtimeError) return this.revision;
    session.runtimeError = normalized
      ? {
          id: `fixture-runtime-error-${++this.runtimeErrorOccurrence}`,
          message: normalized,
        }
      : undefined;
    return this.publish({ type: "session-runtime-error", sessionId });
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

  private requireSession(sessionId: HarnessUiSessionId): MutableSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`fixture session not found: ${sessionId}`);
    }
    return session;
  }

  private claimSequence(
    session: MutableSession,
    requested?: number,
  ): number {
    if (requested === undefined) {
      return session.nextSequence++;
    }
    if (!Number.isSafeInteger(requested) || requested < session.nextSequence) {
      throw new Error(
        `sequence ${requested} must be a safe integer >= ${session.nextSequence}`,
      );
    }
    session.nextSequence = requested + 1;
    return requested;
  }

  private uniqueId(
    kind: "session",
    existing: ReadonlyMap<string, unknown>,
  ): string {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const candidate = this.idFactory(kind).trim();
      if (candidate && !existing.has(candidate)) {
        return candidate;
      }
    }
    throw new Error("idFactory could not produce a unique session id");
  }

  private uniqueMessageId(): string {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const candidate = this.idFactory("message").trim();
      const exists = [...this.sessions.values()].some((session) =>
        session.messages.some((message) => message.id === candidate),
      );
      if (candidate && !exists) {
        return candidate;
      }
    }
    throw new Error("idFactory could not produce a unique message id");
  }

  private publish(cause: UiEventCause): WorkspaceRevision {
    this.revision += 1;
    const snapshot = this.buildSnapshot();
    const event = Object.freeze({
      type: "workspace-snapshot" as const,
      revision: this.revision,
      cause: freezeCause(cause),
      snapshot,
    });

    this.eventHistory.push(event);
    while (this.eventHistory.length > COMMAND_REPLAY_WINDOW) {
      const removed = this.eventHistory.shift();
      if (removed) this.historyFloorRevision = removed.revision;
    }
    for (const subscriber of this.subscribers) {
      if (subscriber.closed) continue;
      // Full-snapshot convergence makes intermediate queued projections
      // redundant; one latest slot bounds every slow subscriber.
      subscriber.queue.splice(0, subscriber.queue.length, event);
      subscriber.wake?.();
      subscriber.wake = undefined;
    }
    return this.revision;
  }

  private buildSnapshot(): WorkspaceSnapshot {
    const sessions = [...this.sessions.values()]
      .sort(
        (left, right) =>
          right.updatedAt - left.updatedAt || left.id.localeCompare(right.id),
      )
      .map(freezeSessionSummary);
    const activeSession = this.activeSessionId
      ? this.sessions.get(this.activeSessionId)
      : undefined;

    return Object.freeze({
      revision: this.revision,
      connection: freezeConnection(
        this.connectionStatus,
        this.connectionDetail,
      ),
      sessions: Object.freeze(sessions),
      activeSession: activeSession
        ? freezeSessionSnapshot(activeSession)
        : null,
    });
  }
}
