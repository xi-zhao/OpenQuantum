"use client";

import { useId, useState } from "react";

import {
  validateQuestionAnswers,
  type InteractionResponse,
  type PendingInteraction,
  type UiQuestion,
  type UiQuestionAnswer,
} from "@/harness/interface";

interface InteractionPanelProps {
  interactions: readonly PendingInteraction[];
  submittingInteractionIds: ReadonlySet<string>;
  interactionErrors: ReadonlyMap<string, string>;
  onAnswer: (
    interaction: PendingInteraction,
    response: InteractionResponse,
  ) => Promise<boolean>;
}

interface QuestionDraft {
  readonly optionIds: readonly string[];
  readonly custom: string;
  readonly useCustom: boolean;
}

function initialQuestionDraft(question: UiQuestion): QuestionDraft {
  return {
    optionIds: [],
    custom: "",
    useCustom: question.options.length === 0,
  };
}

function ApprovalCard({
  interaction,
  isSubmitting,
  error,
  onAnswer,
}: {
  interaction: Extract<PendingInteraction, { kind: "approval" }>;
  isSubmitting: boolean;
  error?: string;
  onAnswer: InteractionPanelProps["onAnswer"];
}) {
  const [accepted, setAccepted] = useState(false);
  const locked = isSubmitting || accepted;
  const allowOnceAvailable = false;

  async function submit(decision: "allow-once" | "deny") {
    if (locked) {
      return;
    }

    const wasAccepted = await onAnswer(interaction, {
      kind: "approval",
      decision,
    });
    setAccepted(wasAccepted);
  }

  return (
    <article className="rounded-2xl border border-[#f0cf88] bg-[#fffbef] p-5 shadow-[0_14px_38px_rgba(121,83,18,.08)]">
      <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#9a6311]">
        ACTION APPROVAL
      </div>
      <h2 className="mt-2 text-base font-semibold text-[#3d321e]">
        需要你批准一项操作
      </h2>
      <p className="mt-3 rounded-xl border border-[#f4dfae] bg-white/70 px-4 py-3 text-sm font-medium leading-6 text-[#4d4028]">
        {interaction.actionLabel}
      </p>
      {interaction.explanation ? (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#6f6044]">
          {interaction.explanation}
        </p>
      ) : null}
      <p className="mt-3 rounded-xl border border-[#f0cf88] bg-[#fff7df] px-4 py-3 text-xs leading-5 text-[#76551e]">
        当前 Harness 尚未提供可核验的完整操作参数，因此暂不开放批准；你仍可安全拒绝该操作。
      </p>

      {error ? (
        <p
          className="mt-3 text-sm leading-5 text-[#a23836]"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      ) : null}
      {accepted ? (
        <p className="mt-3 text-sm text-[#60736d]" aria-live="polite">
          回应已接收，正在等待 Harness 确认并继续执行…
        </p>
      ) : null}

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={locked}
          onClick={() => void submit("deny")}
          className="rounded-xl border border-[#d7c8a8] bg-white px-4 py-2.5 text-sm font-semibold text-[#72552b] transition-colors hover:border-[#bd9160] hover:text-[#9a4c25] disabled:cursor-wait disabled:opacity-55"
        >
          拒绝
        </button>
        <button
          type="button"
          disabled={locked || !allowOnceAvailable}
          aria-describedby={`${interaction.id}-allow-unavailable`}
          onClick={() => void submit("allow-once")}
          className="rounded-xl bg-[#0f9f91] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_7px_20px_rgba(15,159,145,.2)] transition-colors hover:bg-[#0b8379] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {locked ? "正在提交…" : "等待安全上下文"}
        </button>
        <span id={`${interaction.id}-allow-unavailable`} className="sr-only">
          缺少可核验的完整操作参数，暂时不能批准。
        </span>
      </div>
    </article>
  );
}

function QuestionFields({
  question,
  index,
  inputNamespace,
  draft,
  disabled,
  onChange,
}: {
  question: UiQuestion;
  index: number;
  inputNamespace: string;
  draft: QuestionDraft;
  disabled: boolean;
  onChange: (next: QuestionDraft) => void;
}) {
  const groupName = `${inputNamespace}-question-${index}`;

  return (
    <fieldset
      disabled={disabled}
      className="rounded-xl border border-[#dce5ea] bg-white/80 p-4 disabled:opacity-65"
    >
      <legend className="px-1 text-sm font-semibold text-[#203541]">
        {question.heading?.trim() || `问题 ${index + 1}`}
      </legend>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#354b57]">
        {question.prompt}
      </p>
      {question.detail ? (
        <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#72838c]">
          {question.detail}
        </p>
      ) : null}

      {question.options.length > 0 ? (
        <div className="mt-3 space-y-2">
          {question.options.map((option, optionIndex) => {
            const inputId = `${groupName}-option-${optionIndex}`;
            const selected = draft.optionIds.includes(option.id);

            return (
              <label
                key={option.id}
                htmlFor={inputId}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#e1e8ec] bg-[#f9fbfb] px-3 py-2.5 transition-colors hover:border-[#9bd9d1]"
              >
                <input
                  id={inputId}
                  type={question.selection === "single" ? "radio" : "checkbox"}
                  name={question.selection === "single" ? groupName : undefined}
                  checked={selected}
                  onChange={(event) => {
                    if (question.selection === "single") {
                      onChange({
                        ...draft,
                        optionIds: [option.id],
                        useCustom: false,
                      });
                      return;
                    }

                    const optionIds = event.target.checked
                      ? [...new Set([...draft.optionIds, option.id])]
                      : draft.optionIds.filter((id) => id !== option.id);
                    onChange({ ...draft, optionIds });
                  }}
                  className="mt-1 h-4 w-4 accent-[#0f9f91]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[#263d49]">
                    {option.label}
                  </span>
                  {option.description ? (
                    <span className="mt-0.5 block text-xs leading-5 text-[#71828c]">
                      {option.description}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      ) : null}

      <div className="mt-3">
        {question.selection === "single" && question.options.length > 0 ? (
          <>
            <label
              htmlFor={`${groupName}-custom-choice`}
              className="mb-2 flex cursor-pointer items-center gap-3 text-sm font-medium text-[#354b57]"
            >
              <input
                id={`${groupName}-custom-choice`}
                type="radio"
                name={groupName}
                checked={draft.useCustom}
                onChange={() =>
                  onChange({ ...draft, optionIds: [], useCustom: true })
                }
                className="h-4 w-4 accent-[#0f9f91]"
              />
              自定义回答
            </label>
            <label htmlFor={`${groupName}-custom`} className="sr-only">
              自定义回答内容
            </label>
          </>
        ) : (
          <label
            htmlFor={`${groupName}-custom`}
            className="mb-2 block text-xs font-semibold tracking-[0.04em] text-[#607580]"
          >
            {question.options.length === 0 ? "自定义回答" : "补充说明（可选）"}
          </label>
        )}
        <textarea
          id={`${groupName}-custom`}
          rows={2}
          value={draft.custom}
          onFocus={() => {
            if (question.selection === "single" && !draft.useCustom) {
              onChange({ ...draft, optionIds: [], useCustom: true });
            }
          }}
          onChange={(event) =>
            onChange({
              ...draft,
              custom: event.target.value,
              useCustom:
                question.selection === "single" ? true : draft.useCustom,
              ...(question.selection === "single" ? { optionIds: [] } : {}),
            })
          }
          placeholder={
            question.options.length === 0
              ? "请输入你的回答"
              : "也可以补充上下文"
          }
          className="block w-full resize-y rounded-lg border border-[#d5e0e5] bg-white px-3 py-2 text-sm leading-5 text-[#263d49] outline-none placeholder:text-[#9aa8af] focus:border-[#55c7ba] focus:ring-2 focus:ring-[#dff5f1]"
        />
      </div>
    </fieldset>
  );
}

function QuestionsCard({
  interaction,
  isSubmitting,
  error,
  onAnswer,
}: {
  interaction: Extract<PendingInteraction, { kind: "questions" }>;
  isSubmitting: boolean;
  error?: string;
  onAnswer: InteractionPanelProps["onAnswer"];
}) {
  const inputNamespace = useId();
  const [drafts, setDrafts] = useState<ReadonlyMap<string, QuestionDraft>>(
    () =>
      new Map(
        interaction.questions.map((question) => [
          question.id,
          initialQuestionDraft(question),
        ]),
      ),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const locked = isSubmitting || accepted;

  function updateDraft(questionId: string, next: QuestionDraft) {
    setValidationError(null);
    setDrafts((current) => {
      const updated = new Map(current);
      updated.set(questionId, next);
      return updated;
    });
  }

  function answersFromDrafts(): readonly UiQuestionAnswer[] {
    return interaction.questions.map((question) => {
      const draft = drafts.get(question.id) ?? initialQuestionDraft(question);
      const optionIds = [...new Set(draft.optionIds)];
      const custom = draft.custom.trim();

      if (question.selection === "single" && draft.useCustom) {
        return {
          questionId: question.id,
          optionIds: [],
          custom: draft.custom,
        };
      }

      if (question.selection === "single") {
        return {
          questionId: question.id,
          optionIds,
        };
      }

      return {
        questionId: question.id,
        optionIds,
        ...(custom ? { custom: draft.custom } : {}),
      };
    });
  }

  async function submitAnswers() {
    if (locked) {
      return;
    }

    const validation = validateQuestionAnswers(
      interaction,
      answersFromDrafts(),
    );
    if (!validation.valid) {
      setValidationError(validation.message);
      return;
    }

    setValidationError(null);
    const wasAccepted = await onAnswer(interaction, {
      kind: "questions",
      action: "submit",
      answers: validation.answers,
    });
    setAccepted(wasAccepted);
  }

  async function cancelQuestions() {
    if (locked) {
      return;
    }

    setValidationError(null);
    const wasAccepted = await onAnswer(interaction, {
      kind: "questions",
      action: "cancel",
    });
    setAccepted(wasAccepted);
  }

  const visibleError = validationError ?? error;

  return (
    <form
      className="rounded-2xl border border-[#afd9d3] bg-[#f5fcfa] p-5 shadow-[0_14px_38px_rgba(15,100,91,.08)]"
      onSubmit={(event) => {
        event.preventDefault();
        void submitAnswers();
      }}
    >
      <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#0b776e]">
        INPUT REQUIRED
      </div>
      <h2 className="mt-2 text-base font-semibold text-[#183c3a]">
        Harness 需要你补充信息
      </h2>
      <p className="mt-1 text-sm leading-6 text-[#55716e]">
        请完整回答下面的问题。所有回答会作为一个批次一次提交。
      </p>

      <div className="mt-4 space-y-4">
        {interaction.questions.map((question, index) => (
          <QuestionFields
            key={question.id}
            question={question}
            index={index}
            inputNamespace={inputNamespace}
            draft={
              drafts.get(question.id) ?? initialQuestionDraft(question)
            }
            disabled={locked}
            onChange={(next) => updateDraft(question.id, next)}
          />
        ))}
      </div>

      {visibleError ? (
        <p
          className="mt-3 text-sm leading-5 text-[#a23836]"
          role="alert"
          aria-live="assertive"
        >
          {visibleError}
        </p>
      ) : null}
      {accepted ? (
        <p className="mt-3 text-sm text-[#60736d]" aria-live="polite">
          回应已接收，正在等待 Harness 确认并继续执行…
        </p>
      ) : null}

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={locked}
          onClick={() => void cancelQuestions()}
          className="rounded-xl border border-[#cad8dc] bg-white px-4 py-2.5 text-sm font-semibold text-[#61747e] transition-colors hover:border-[#c78f8b] hover:text-[#9a3f3c] disabled:cursor-wait disabled:opacity-55"
        >
          取消本次提问
        </button>
        <button
          type="submit"
          disabled={locked}
          className="rounded-xl bg-[#0f9f91] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_7px_20px_rgba(15,159,145,.2)] transition-colors hover:bg-[#0b8379] disabled:cursor-wait disabled:opacity-55"
        >
          {locked ? "正在提交…" : "提交全部回答"}
        </button>
      </div>
    </form>
  );
}

export function InteractionPanel({
  interactions,
  submittingInteractionIds,
  interactionErrors,
  onAnswer,
}: InteractionPanelProps) {
  if (interactions.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 pb-6" aria-label="等待你的回应">
      <div className="flex items-start gap-3 rounded-xl border border-[#c8ddd9] bg-white/80 px-4 py-3">
        <span
          className="mt-1.5 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-[#e0a43a]"
          aria-hidden="true"
        />
        <div>
          <h2 className="text-sm font-semibold text-[#253d48]">
            Harness 已暂停，等待你的回应
          </h2>
          <p className="mt-0.5 text-xs leading-5 text-[#6a7d87]">
            回应后，当前 Agent 任务会从同一会话继续执行。
          </p>
        </div>
      </div>

      {interactions.map((interaction) => {
        const sharedProps = {
          isSubmitting: submittingInteractionIds.has(interaction.id),
          error: interactionErrors.get(interaction.id),
          onAnswer,
        };

        return interaction.kind === "approval" ? (
          <ApprovalCard
            key={interaction.id}
            interaction={interaction}
            {...sharedProps}
          />
        ) : (
          <QuestionsCard
            key={interaction.id}
            interaction={interaction}
            {...sharedProps}
          />
        );
      })}
    </section>
  );
}
