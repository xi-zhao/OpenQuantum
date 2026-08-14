"use client";

import {
  ArrowUpIcon,
  MicrophoneIcon,
} from "./icons";

interface PromptComposerProps {
  prompt: string;
  placeholder: string;
  disabled?: boolean;
  isSending?: boolean;
  onPromptChange: (value: string) => void;
  onSend: () => void;
}

export function PromptComposer({
  prompt,
  placeholder,
  disabled = false,
  isSending = false,
  onPromptChange,
  onSend,
}: PromptComposerProps) {
  const canSend = prompt.trim().length > 0 && !isSending && !disabled;

  return (
    <div
      aria-disabled={disabled || undefined}
      className="relative rounded-[20px] border border-[#d7e2e8] bg-white/95 shadow-[0_18px_50px_rgba(7,19,31,.08)] transition-all focus-within:border-[#62cfc2] focus-within:shadow-[0_20px_60px_rgba(15,159,145,.14)] aria-disabled:opacity-65"
    >
      <textarea
        autoFocus={!disabled}
        disabled={disabled}
        className="oq-composer-textarea block w-full resize-none bg-transparent px-5 pt-4 pb-12 text-[15px] leading-relaxed text-[#162936] placeholder:text-[#8b9aa4] focus:outline-none disabled:cursor-not-allowed"
        onChange={(event) => onPromptChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();

            if (canSend) {
              onSend();
            }
          }
        }}
        placeholder={placeholder}
        value={prompt}
      />

      <div className="absolute right-2 bottom-2 flex items-center gap-2">
        <button
          aria-label="语音输入"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef3f5] text-[#526673] transition-colors hover:bg-[#e1e9ed] hover:text-[#07131f] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={disabled}
          type="button"
        >
          <MicrophoneIcon size={16} />
        </button>
        <button
          aria-label="发送"
          className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
            canSend
              ? "bg-[#0f9f91] text-white shadow-[0_6px_18px_rgba(15,159,145,.26)] hover:bg-[#0b8379]"
              : "cursor-not-allowed bg-[#dfe8ec] text-[#90a0aa]"
          }`}
          disabled={!canSend}
          onClick={onSend}
          type="button"
        >
          <ArrowUpIcon size={16} />
        </button>
      </div>
    </div>
  );
}
