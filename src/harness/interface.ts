/**
 * UI 与 Harness 之间的稳定 seam。
 *
 * UI 只需要学习三个操作：读取完整投影、提交用户命令、从某个 revision
 * 继续消费投影事件。Harness 的 RPC 名称、WebSocket frame 和内部事件均不属于
 * 这个 interface。
 */

export type WorkspaceRevision = number;
export type HarnessUiSessionId = string;
export type HarnessUiCommandId = string;

/** Exact command replay/conflict horizon within one Adapter instance. */
export const COMMAND_REPLAY_WINDOW = 256;

export type WorkspaceConnectionStatus =
  | "online"
  | "reconnecting"
  | "offline";

export interface WorkspaceConnection {
  readonly status: WorkspaceConnectionStatus;
  readonly detail?: string;
}

export interface WorkspaceSessionSummary {
  readonly id: HarnessUiSessionId;
  readonly title: string;
  readonly updatedAt: number;
  readonly running: boolean;
  readonly blank: boolean;
  readonly pendingInteractionCount: number;
}

export interface WorkspaceMessage {
  /** 本地 pending 和 Harness durable 投影之间保持不变的逻辑身份。 */
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly text: string;
  readonly delivery: "pending" | "durable";
  /** pending 消息还没有 Harness event sequence，因此为 null。 */
  readonly sequence: number | null;
  readonly createdAt: number;
}

/**
 * One concrete Harness runtime-error occurrence. The opaque id changes for
 * every Host frame, even when two consecutive errors have identical text, so
 * dismissing one occurrence never hides a later failure.
 */
export interface WorkspaceRuntimeError {
  readonly id: string;
  readonly message: string;
}

export type WorkspaceScientificRuntimeStatus =
  | "running"
  | "completed"
  | "failed";

export type WorkspaceScientificStatus =
  | "not_available"
  | "not_evaluated"
  | "observations_available"
  | "acceptance_available";

export type WorkspaceAcceptanceStatus = "passed" | "conditional" | "failed";

export interface WorkspaceScientificDetail {
  readonly label: string;
  readonly value: string;
}

/**
 * A bounded projection of one scientific MCP call already owned by the
 * Harness session log. Runtime completion and scientific review are separate
 * axes: a completed tool call must never imply scientific acceptance.
 */
export interface WorkspaceScientificActivity {
  readonly id: string;
  readonly toolName: string;
  readonly capabilityId: string;
  readonly operation: string;
  readonly title: string;
  readonly summary: string;
  readonly runtimeStatus: WorkspaceScientificRuntimeStatus;
  readonly scientificStatus: WorkspaceScientificStatus;
  readonly acceptanceStatus?: WorkspaceAcceptanceStatus;
  readonly details: readonly WorkspaceScientificDetail[];
  readonly sequence: number;
}

export interface UiQuestionOption {
  /** Adapter-local opaque identity. Harness option labels never act as IDs. */
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}

export interface UiQuestion {
  /** Adapter-local opaque identity. Harness caller question IDs stay private. */
  readonly id: string;
  readonly heading?: string;
  readonly prompt: string;
  readonly detail?: string;
  readonly selection: "single" | "multiple";
  readonly options: readonly UiQuestionOption[];
}

export type PendingInteraction =
  | {
      readonly kind: "approval";
      /** Stable, opaque UI identity; it is not a wire correlation ID. */
      readonly id: string;
      readonly sessionId: HarnessUiSessionId;
      readonly actionLabel: string;
      readonly explanation?: string;
    }
  | {
      readonly kind: "questions";
      /** Stable, opaque UI identity; it is not a wire correlation ID. */
      readonly id: string;
      readonly sessionId: HarnessUiSessionId;
      readonly questions: readonly UiQuestion[];
    };

export interface WorkspaceSessionSnapshot {
  readonly id: HarnessUiSessionId;
  readonly title: string;
  readonly running: boolean;
  /** Latest Harness runtime error occurrence scoped to this session, if any. */
  readonly runtimeError?: WorkspaceRuntimeError;
  /**
   * Harness tail history projected as a bounded recent-message window. This is
   * not a complete archival transcript; pagination/artifacts are a separate
   * product surface.
   */
  readonly messages: readonly WorkspaceMessage[];
  /** Bounded scientific MCP projections reconstructed from tool/call + tool/result. */
  readonly scientificActivities: readonly WorkspaceScientificActivity[];
  /** Transient Host-authoritative interactions, never reconstructed from history. */
  readonly pendingInteractions: readonly PendingInteraction[];
}

export interface WorkspaceSnapshot {
  /**
   * 每次可观察状态变化严格递增。events 是完整投影的 convergence stream，
   * 不是审计日志：保留窗口内可逐条重放；cursor 早于窗口时先收到最新完整
   * snapshot。消费者必须用最新 snapshot 收敛，不能依赖看到每个中间 cause。
   */
  readonly revision: WorkspaceRevision;
  readonly connection: WorkspaceConnection;
  readonly sessions: readonly WorkspaceSessionSummary[];
  readonly activeSession: WorkspaceSessionSnapshot | null;
}

export interface NewSessionCommand {
  readonly type: "new-session";
  readonly commandId: HarnessUiCommandId;
  readonly title?: string;
}

export interface OpenSessionCommand {
  readonly type: "open-session";
  readonly commandId: HarnessUiCommandId;
  readonly sessionId: HarnessUiSessionId;
}

export interface PromptCommand {
  readonly type: "prompt";
  readonly commandId: HarnessUiCommandId;
  readonly sessionId: HarnessUiSessionId;
  /** 用来把 optimistic pending 消息与 Harness 的 durable echo 合并。 */
  readonly clientMessageId: string;
  readonly text: string;
}

export interface CancelCommand {
  readonly type: "cancel";
  readonly commandId: HarnessUiCommandId;
  readonly sessionId: HarnessUiSessionId;
}

export interface UiQuestionAnswer {
  readonly questionId: string;
  readonly optionIds: readonly string[];
  readonly custom?: string;
}

export type InteractionResponse =
  | {
      readonly kind: "approval";
      readonly decision: "allow-once" | "deny";
    }
  | {
      readonly kind: "questions";
      readonly action: "submit";
      readonly answers: readonly UiQuestionAnswer[];
    }
  | {
      readonly kind: "questions";
      readonly action: "cancel";
    };

export interface AnswerInteractionCommand {
  readonly type: "answer-interaction";
  readonly commandId: HarnessUiCommandId;
  readonly sessionId: HarnessUiSessionId;
  readonly interactionId: string;
  readonly response: InteractionResponse;
}

export type UiCommand =
  | NewSessionCommand
  | OpenSessionCommand
  | PromptCommand
  | CancelCommand
  | AnswerInteractionCommand;

export type CommandSuccessResult =
  | {
      readonly type: "session-created";
      readonly sessionId: HarnessUiSessionId;
    }
  | {
      readonly type: "session-opened";
      readonly sessionId: HarnessUiSessionId;
    }
  | {
      readonly type: "prompt-queued";
      readonly sessionId: HarnessUiSessionId;
      readonly messageId: string;
    }
  | {
      readonly type: "cancel-requested";
      readonly sessionId: HarnessUiSessionId;
    }
  | {
      readonly type: "interaction-response-accepted";
      readonly sessionId: HarnessUiSessionId;
      readonly interactionId: string;
    };

export type CommandFailureCode =
  | "COMMAND_ID_CONFLICT"
  | "CLIENT_MESSAGE_ID_CONFLICT"
  | "EMPTY_PROMPT"
  | "INTERACTION_NOT_PENDING"
  | "INVALID_INTERACTION_ANSWER"
  | "INTERACTION_TYPE_MISMATCH"
  | "APPROVAL_CONTEXT_UNAVAILABLE"
  | "COMMAND_OUTCOME_UNKNOWN"
  | "RUNTIME_UNAVAILABLE"
  | "SESSION_NOT_FOUND";

export type CommandReceipt =
  | {
      readonly accepted: true;
      readonly commandId: HarnessUiCommandId;
      readonly revision: WorkspaceRevision;
      readonly result: CommandSuccessResult;
    }
  | {
      readonly accepted: false;
      readonly commandId: HarnessUiCommandId;
      readonly revision: WorkspaceRevision;
      readonly error: {
        readonly code: CommandFailureCode;
        readonly message: string;
      };
    };

export type UiEventCause =
  | {
      readonly type: "session-created";
      readonly sessionId: HarnessUiSessionId;
      readonly commandId: HarnessUiCommandId;
    }
  | {
      readonly type: "session-opened";
      readonly sessionId: HarnessUiSessionId;
      readonly commandId: HarnessUiCommandId;
    }
  | {
      readonly type: "prompt-pending";
      readonly sessionId: HarnessUiSessionId;
      readonly commandId: HarnessUiCommandId;
      readonly messageId: string;
    }
  | {
      readonly type: "prompt-durable";
      readonly sessionId: HarnessUiSessionId;
      readonly messageId: string;
    }
  | {
      readonly type: "cancel-requested";
      readonly sessionId: HarnessUiSessionId;
      readonly commandId: HarnessUiCommandId;
    }
  | {
      readonly type: "assistant-message";
      readonly sessionId: HarnessUiSessionId;
      readonly messageId: string;
    }
  | {
      readonly type: "session-refreshed";
      readonly sessionId: HarnessUiSessionId;
    }
  | {
      readonly type: "running-changed";
      readonly sessionId: HarnessUiSessionId;
      readonly running: boolean;
    }
  | {
      readonly type: "session-runtime-error";
      readonly sessionId: HarnessUiSessionId;
    }
  | {
      readonly type: "connection-changed";
      readonly status: WorkspaceConnectionStatus;
    }
  | {
      readonly type: "interaction-upserted";
      readonly sessionId: HarnessUiSessionId;
      readonly interactionId: string;
    }
  | {
      readonly type: "interaction-removed";
      readonly sessionId: HarnessUiSessionId;
      readonly interactionId: string;
    }
  | {
      readonly type: "interactions-rebased";
      readonly sessionId?: HarnessUiSessionId;
    }
  | {
      readonly type: "projection-rebased";
    };

export type QuestionAnswerValidation =
  | {
      readonly valid: true;
      /** Answers rebuilt in declared question order with normalized custom text. */
      readonly answers: readonly UiQuestionAnswer[];
    }
  | {
      readonly valid: false;
      readonly message: string;
    };

/**
 * The one canonical validator for question batches used by both production and
 * in-memory adapters. It validates only the stable UI contract; translating
 * opaque IDs back to Harness IDs remains private to the production Adapter.
 */
export function validateQuestionAnswers(
  interaction: Extract<PendingInteraction, { kind: "questions" }>,
  answers: readonly UiQuestionAnswer[],
): QuestionAnswerValidation {
  if (answers.length !== interaction.questions.length) {
    return {
      valid: false,
      message: "必须一次回答当前交互中的全部问题。",
    };
  }

  const byQuestionId = new Map<string, UiQuestionAnswer>();
  for (const answer of answers) {
    if (byQuestionId.has(answer.questionId)) {
      return { valid: false, message: "同一个问题不能重复回答。" };
    }
    byQuestionId.set(answer.questionId, answer);
  }

  const normalized: UiQuestionAnswer[] = [];
  for (const question of interaction.questions) {
    const answer = byQuestionId.get(question.id);
    if (!answer) {
      return { valid: false, message: "回答批次缺少问题。" };
    }

    const optionIds = [...answer.optionIds];
    if (new Set(optionIds).size !== optionIds.length) {
      return { valid: false, message: "同一选项不能重复选择。" };
    }

    const available = new Set(question.options.map((option) => option.id));
    if (optionIds.some((optionId) => !available.has(optionId))) {
      return { valid: false, message: "回答包含当前问题不存在的选项。" };
    }

    const hasCustom = answer.custom !== undefined;
    const custom = answer.custom?.trim();
    if (hasCustom && !custom) {
      return { valid: false, message: "自定义回答不能为空。" };
    }
    if (question.selection === "single" && optionIds.length > 1) {
      return { valid: false, message: "单选问题最多选择一个选项。" };
    }
    if (
      question.selection === "single" &&
      optionIds.length > 0 &&
      custom !== undefined
    ) {
      return {
        valid: false,
        message: "单选问题不能同时提交选项和自定义回答。",
      };
    }
    if (optionIds.length === 0 && custom === undefined) {
      return { valid: false, message: "每个问题都必须提供回答。" };
    }

    normalized.push(
      Object.freeze({
        questionId: question.id,
        optionIds: Object.freeze(optionIds),
        ...(custom === undefined ? {} : { custom }),
      }),
    );
  }

  return { valid: true, answers: Object.freeze(normalized) };
}

/**
 * 事件携带完整、不可变投影。每次可观察 mutation 都产生更高 revision，且
 * snapshot.revision 唯一标识该投影。events(after) 最终交付更新的完整投影，
 * 允许跳过被更高 revision 覆盖的中间态。cause 只用于诊断，不能驱动 UI 业务。
 */
export interface UiEvent {
  readonly type: "workspace-snapshot";
  readonly revision: WorkspaceRevision;
  readonly cause: UiEventCause;
  readonly snapshot: WorkspaceSnapshot;
}

export interface HarnessUiPort {
  snapshot(signal?: AbortSignal): Promise<WorkspaceSnapshot>;
  command(
    command: UiCommand,
    signal?: AbortSignal,
  ): Promise<CommandReceipt>;
  events(
    /** null starts a stream-owned bootstrap and yields a full initial projection. */
    afterRevision: WorkspaceRevision | null,
    signal: AbortSignal,
  ): AsyncIterable<UiEvent>;
}
