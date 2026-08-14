"use client";

import type { WorkspaceMessage } from "@/harness/interface";

interface ConversationPanelProps {
  messages: readonly WorkspaceMessage[];
  isLoading: boolean;
  isSending: boolean;
}

export function ConversationPanel({
  messages,
  isLoading,
  isSending,
}: ConversationPanelProps) {
  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-[#6a7f8c]">
        正在读取 Harness 会话记录…
      </div>
    );
  }

  return (
    <div className="space-y-6 py-8" aria-live="polite">
      {messages.map((message) => (
        <article
          key={message.id}
          className={
            message.role === "user"
              ? "ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-[#0f9f91] px-4 py-3 text-white shadow-[0_8px_24px_rgba(15,159,145,.16)]"
              : "max-w-[94%] rounded-2xl rounded-bl-md border border-[#dce5ea] bg-white/90 px-5 py-4 text-[#243845] shadow-[0_8px_28px_rgba(7,19,31,.04)]"
          }
        >
          <div className="mb-1.5 font-mono text-[9px] font-semibold tracking-[0.16em] opacity-65">
            {message.role === "user" ? "YOU" : "OPENQUANTUM"}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p>
        </article>
      ))}

      {isSending ? (
        <div className="flex items-center gap-2 text-sm text-[#5c6f7c]">
          <span className="flex gap-1" aria-hidden="true">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0f9f91]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0f9f91] [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0f9f91] [animation-delay:240ms]" />
          </span>
          Harness 正在执行
        </div>
      ) : null}
    </div>
  );
}
