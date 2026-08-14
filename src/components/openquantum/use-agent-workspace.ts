"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  CommandReceipt,
  HarnessUiPort,
  HarnessUiSessionId,
  InteractionResponse,
  PendingInteraction,
  WorkspaceSnapshot,
} from "@/harness/interface";

function intentId(prefix: "command" | "message"): string {
  const suffix = globalThis.crypto?.randomUUID?.();

  if (suffix) {
    return `${prefix}:${suffix}`;
  }

  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function isAbortError(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === "AbortError";
}

function receiptError(receipt: CommandReceipt): string | null {
  return receipt.accepted ? null : receipt.error.message;
}

export function useAgentWorkspace(port: HarnessUiPort) {
  const committedRevisionRef = useRef(-1);
  const historyRequestRef = useRef(0);
  const submittingInteractionIdsRef = useRef(new Set<string>());
  const interactionSessionIdsRef = useRef(
    new Map<string, HarnessUiSessionId>(),
  );
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isPromptSubmitting, setIsPromptSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submittingInteractionIds, setSubmittingInteractionIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [interactionErrors, setInteractionErrors] = useState<
    ReadonlyMap<string, string>
  >(() => new Map());
  const [dismissedRuntimeDetail, setDismissedRuntimeDetail] = useState<
    string | null
  >(null);

  const acceptSnapshot = useCallback((next: WorkspaceSnapshot) => {
    if (next.revision <= committedRevisionRef.current) {
      return;
    }

    committedRevisionRef.current = next.revision;
    setSnapshot(next);
  }, []);

  const refreshSnapshot = useCallback(async () => {
    const next = await port.snapshot();
    acceptSnapshot(next);
    return next;
  }, [acceptSnapshot, port]);

  const applyReceipt = useCallback(
    async (receipt: CommandReceipt): Promise<boolean> => {
      const message = receiptError(receipt);
      if (message) {
        setActionError(message);
        return false;
      }

      setActionError(null);
      await refreshSnapshot();
      return true;
    },
    [refreshSnapshot],
  );

  const runtimeIsReady = snapshot?.connection.status === "online";
  const rejectWhileRuntimeUnavailable = useCallback(() => {
    setActionError("Harness 实时连接尚未就绪，请等待恢复后再操作。");
  }, []);

  const createConversation = useCallback(async () => {
    if (!runtimeIsReady) {
      rejectWhileRuntimeUnavailable();
      return undefined;
    }
    setIsCreating(true);
    setActionError(null);

    try {
      const receipt = await port.command({
        type: "new-session",
        commandId: intentId("command"),
      });

      if (!(await applyReceipt(receipt)) || !receipt.accepted) {
        return undefined;
      }

      return receipt.result.type === "session-created"
        ? receipt.result.sessionId
        : undefined;
    } catch (cause) {
      if (!isAbortError(cause)) {
        setActionError(errorMessage(cause));
      }
      return undefined;
    } finally {
      setIsCreating(false);
    }
  }, [applyReceipt, port, rejectWhileRuntimeUnavailable, runtimeIsReady]);

  const selectSession = useCallback(
    async (sessionId: HarnessUiSessionId) => {
      if (!runtimeIsReady) {
        rejectWhileRuntimeUnavailable();
        return;
      }
      const request = ++historyRequestRef.current;
      setIsLoadingHistory(true);
      setActionError(null);

      try {
        const receipt = await port.command({
          type: "open-session",
          commandId: intentId("command"),
          sessionId,
        });
        await applyReceipt(receipt);
      } catch (cause) {
        if (!isAbortError(cause)) {
          setActionError(errorMessage(cause));
        }
      } finally {
        if (request === historyRequestRef.current) {
          setIsLoadingHistory(false);
        }
      }
    },
    [applyReceipt, port, rejectWhileRuntimeUnavailable, runtimeIsReady],
  );

  const activeSessionId = snapshot?.activeSession?.id ?? null;
  const activeRunning = snapshot?.activeSession?.running ?? false;
  const pendingInteractions = useMemo(
    () => snapshot?.activeSession?.pendingInteractions ?? [],
    [snapshot?.activeSession?.pendingInteractions],
  );
  const isWaitingForInteraction = pendingInteractions.length > 0;
  const isSending =
    isPromptSubmitting || activeRunning || isWaitingForInteraction;

  const sendPrompt = useCallback(
    async (text: string) => {
      const prompt = text.trim();

      if (!prompt || isSending) {
        return false;
      }
      if (!runtimeIsReady) {
        rejectWhileRuntimeUnavailable();
        return false;
      }

      setIsPromptSubmitting(true);
      setActionError(null);

      try {
        let sessionId = activeSessionId;

        if (!sessionId) {
          sessionId = (await createConversation()) ?? null;
        }

        if (!sessionId) {
          return false;
        }

        const receipt = await port.command({
          type: "prompt",
          commandId: intentId("command"),
          sessionId,
          clientMessageId: intentId("message"),
          text: prompt,
        });

        return applyReceipt(receipt);
      } catch (cause) {
        if (!isAbortError(cause)) {
          setActionError(errorMessage(cause));
        }
        return false;
      } finally {
        setIsPromptSubmitting(false);
      }
    },
    [
      activeSessionId,
      applyReceipt,
      createConversation,
      isSending,
      port,
      rejectWhileRuntimeUnavailable,
      runtimeIsReady,
    ],
  );

  const cancelTurn = useCallback(async () => {
    if (!activeSessionId) {
      return;
    }
    if (!runtimeIsReady) {
      rejectWhileRuntimeUnavailable();
      return;
    }

    setActionError(null);

    try {
      const receipt = await port.command({
        type: "cancel",
        commandId: intentId("command"),
        sessionId: activeSessionId,
      });
      await applyReceipt(receipt);
    } catch (cause) {
      if (!isAbortError(cause)) {
        setActionError(errorMessage(cause));
      }
    }
  }, [
    activeSessionId,
    applyReceipt,
    port,
    rejectWhileRuntimeUnavailable,
    runtimeIsReady,
  ]);

  const answerInteraction = useCallback(
    async (
      interaction: PendingInteraction,
      response: InteractionResponse,
    ): Promise<boolean> => {
      if (!runtimeIsReady) {
        rejectWhileRuntimeUnavailable();
        return false;
      }
      if (submittingInteractionIdsRef.current.has(interaction.id)) {
        return false;
      }

      submittingInteractionIdsRef.current.add(interaction.id);
      interactionSessionIdsRef.current.set(
        interaction.id,
        interaction.sessionId,
      );
      setSubmittingInteractionIds(
        new Set(submittingInteractionIdsRef.current),
      );
      setInteractionErrors((current) => {
        if (!current.has(interaction.id)) {
          return current;
        }

        const next = new Map(current);
        next.delete(interaction.id);
        return next;
      });

      let keepLockedUntilAuthoritativeRemoval = false;

      try {
        const receipt = await port.command({
          type: "answer-interaction",
          commandId: intentId("command"),
          sessionId: interaction.sessionId,
          interactionId: interaction.id,
          response,
        });

        if (!receipt.accepted) {
          setInteractionErrors((current) => {
            const next = new Map(current);
            next.set(interaction.id, receipt.error.message);
            return next;
          });
          return false;
        }

        if (
          receipt.result.type !== "interaction-response-accepted" ||
          receipt.result.sessionId !== interaction.sessionId ||
          receipt.result.interactionId !== interaction.id
        ) {
          setInteractionErrors((current) => {
            const next = new Map(current);
            next.set(
              interaction.id,
              "Harness 返回了不匹配的交互回执，请重新提交。",
            );
            return next;
          });
          return false;
        }

        // accepted 只表示回应进入 Harness。保持提交锁和卡片，直到权威
        // snapshot 发出 interaction-removed，避免 UI 抢先宣称已解决或重复回应。
        keepLockedUntilAuthoritativeRemoval = true;
        return true;
      } catch (cause) {
        if (!isAbortError(cause)) {
          setInteractionErrors((current) => {
            const next = new Map(current);
            next.set(interaction.id, errorMessage(cause));
            return next;
          });
        }
        return false;
      } finally {
        if (!keepLockedUntilAuthoritativeRemoval) {
          submittingInteractionIdsRef.current.delete(interaction.id);
          setSubmittingInteractionIds(
            new Set(submittingInteractionIdsRef.current),
          );
        }
      }
    },
    [port, rejectWhileRuntimeUnavailable, runtimeIsReady],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function observeWorkspace() {
      try {
        // The long-lived stream owns the runtime generation. null asks the
        // Adapter to open the live cut before its baseline and then deliver one
        // complete bootstrap projection, eliminating snapshot -> events vacuum.
        for await (const event of port.events(
          null,
          controller.signal,
        )) {
          if (controller.signal.aborted) {
            return;
          }

          acceptSnapshot(event.snapshot);
        }
      } catch (cause) {
        if (!controller.signal.aborted && !isAbortError(cause)) {
          setActionError(errorMessage(cause));
        }
      }
    }

    void observeWorkspace();
    return () => controller.abort();
  }, [acceptSnapshot, port]);

  useEffect(() => {
    const activeSession = snapshot?.activeSession;
    if (!activeSession) {
      return;
    }

    const pendingIds = new Set(
      pendingInteractions.map((interaction) => interaction.id),
    );
    const resolvedIds = new Set<string>();
    let submittingChanged = false;

    for (const [interactionId, sessionId] of interactionSessionIdsRef.current) {
      if (
        sessionId === activeSession.id &&
        !pendingIds.has(interactionId)
      ) {
        resolvedIds.add(interactionId);
        interactionSessionIdsRef.current.delete(interactionId);
      }
    }

    for (const interactionId of resolvedIds) {
      if (submittingInteractionIdsRef.current.delete(interactionId)) {
        submittingChanged = true;
      }
    }

    if (submittingChanged) {
      setSubmittingInteractionIds(
        new Set(submittingInteractionIdsRef.current),
      );
    }

    setInteractionErrors((current) => {
      const next = new Map(
        [...current].filter(
          ([interactionId]) => !resolvedIds.has(interactionId),
        ),
      );
      return next.size === current.size ? current : next;
    });
  }, [pendingInteractions, snapshot?.activeSession]);

  const activeRuntimeError = snapshot?.activeSession?.runtimeError ?? null;
  const connectionDetail = snapshot?.connection.detail?.trim() || null;
  const runtimeDetail = activeRuntimeError?.message ?? connectionDetail;
  const runtimeDetailKey = activeRuntimeError
    ? `session:${activeSessionId}:${activeRuntimeError.id}`
    : connectionDetail
      ? `connection:${connectionDetail}`
      : null;

  useEffect(() => {
    if (!runtimeDetailKey) {
      setDismissedRuntimeDetail(null);
    }
  }, [runtimeDetailKey]);

  const error =
    actionError ??
    (runtimeDetail && runtimeDetailKey !== dismissedRuntimeDetail
      ? runtimeDetail
      : null);

  return useMemo(
    () => ({
      sessions: snapshot?.sessions ?? [],
      activeSessionId,
      messages: snapshot?.activeSession?.messages ?? [],
      scientificActivities:
        snapshot?.activeSession?.scientificActivities ?? [],
      pendingInteractions,
      isWaitingForInteraction,
      submittingInteractionIds,
      interactionErrors,
      runtimeStatus: snapshot?.connection.status ?? "reconnecting",
      runtimeIsReady,
      isCreating,
      isLoadingHistory,
      isSending,
      error,
      clearError: () => {
        if (actionError) {
          setActionError(null);
          return;
        }

        setDismissedRuntimeDetail(runtimeDetailKey);
      },
      createConversation,
      selectSession,
      sendPrompt,
      cancelTurn,
      answerInteraction,
    }),
    [
      actionError,
      activeSessionId,
      answerInteraction,
      cancelTurn,
      createConversation,
      error,
      isCreating,
      isLoadingHistory,
      isSending,
      isWaitingForInteraction,
      interactionErrors,
      pendingInteractions,
      runtimeDetailKey,
      runtimeIsReady,
      selectSession,
      sendPrompt,
      snapshot,
      submittingInteractionIds,
    ],
  );
}
