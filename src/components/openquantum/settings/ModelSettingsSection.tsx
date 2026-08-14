"use client";

import { useState } from "react";

import type {
  ModelProviderSettings,
  ModelProtocol,
  SettingsCommand,
} from "@/settings/interface";

const inputClass =
  "mt-1.5 h-10 w-full rounded-lg border border-[#ccd9df] bg-white px-3 text-sm text-[#162936] outline-none transition focus:border-[#20a999] focus:ring-2 focus:ring-[#20a999]/15 disabled:bg-[#eef3f5] disabled:text-[#6a7f8c]";

interface ModelProviderEditorProps {
  provider: ModelProviderSettings;
  saving: boolean;
  onSave: (command: SettingsCommand) => void;
}

function ModelProviderEditor({ provider, saving, onSave }: ModelProviderEditorProps) {
  const [displayName, setDisplayName] = useState(provider.displayName);
  const [baseUrl, setBaseUrl] = useState(provider.baseUrl);
  const [protocol, setProtocol] = useState<ModelProtocol>(provider.protocol);
  const [models, setModels] = useState(provider.modelIds.join(", "));
  const [apiKey, setApiKey] = useState("");
  const [removeApiKey, setRemoveApiKey] = useState(false);
  const modelIds = models
    .split(",")
    .map((value) => value.trim())
    .filter((value, index, values) => value && values.indexOf(value) === index);
  const canSave = displayName.trim() && baseUrl.trim() && modelIds.length > 0;

  return (
    <article className="rounded-2xl border border-[#dce5ea] bg-white p-5 shadow-[0_12px_36px_rgba(7,19,31,.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[#162936]">{provider.displayName}</h3>
            <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold ${provider.active ? "bg-[#dcf8f2] text-[#0b776e]" : "bg-[#edf2f4] text-[#6a7f8c]"}`}>
              {provider.active ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
          <p className="mt-1 font-mono text-[10px] text-[#728793]">{provider.id}</p>
        </div>
        <div className={`rounded-lg px-2.5 py-1 text-xs font-medium ${provider.apiKeyConfigured ? "bg-[#e5f7f3] text-[#0b776e]" : "bg-[#fff4dd] text-[#8b5b08]"}`}>
          {provider.apiKeyConfigured ? "Key 已配置" : "Key 未配置"}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-[#526673]">
          显示名称
          <input className={inputClass} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </label>
        <label className="text-xs font-medium text-[#526673]">
          API 协议
          <select className={inputClass} value={protocol} onChange={(event) => setProtocol(event.target.value as ModelProtocol)}>
            <option value="openai-completions">OpenAI Completions</option>
            <option value="openai-responses">OpenAI Responses</option>
            <option value="anthropic-messages">Anthropic Messages</option>
          </select>
        </label>
      </div>

      <label className="mt-4 block text-xs font-medium text-[#526673]">
        模型 URL
        <input className={inputClass} type="url" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://gateway.example/v1" />
      </label>

      <label className="mt-4 block text-xs font-medium text-[#526673]">
        模型 ID
        <input className={inputClass} value={models} onChange={(event) => setModels(event.target.value)} placeholder="model-a, model-b" />
        <span className="mt-1 block font-normal text-[#81939d]">多个模型使用英文逗号分隔。</span>
      </label>

      <label className="mt-4 block text-xs font-medium text-[#526673]">
        API Key
        <input
          className={inputClass}
          type="password"
          autoComplete="new-password"
          disabled={!provider.apiKeyWritable || removeApiKey}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder={provider.apiKeyConfigured ? "已配置——输入新值可替换" : "输入 API Key"}
        />
      </label>

      {provider.apiKeyConfigured ? (
        <label className="mt-3 flex items-center gap-2 text-xs text-[#526673]">
          <input
            type="checkbox"
            checked={removeApiKey}
            disabled={!provider.apiKeyWritable}
            onChange={(event) => {
              setRemoveApiKey(event.target.checked);
              if (event.target.checked) setApiKey("");
            }}
            className="h-4 w-4 accent-[#0f9f91]"
          />
          移除已保存的 Key
        </label>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-[#e5ecef] pt-4">
        <p className="text-xs leading-5 text-[#728793]">
          Key 由 Harness 凭据服务保存，读取时只返回是否已配置。
        </p>
        <button
          type="button"
          disabled={!canSave || saving}
          onClick={() =>
            onSave({
              type: "model.update",
              provider: provider.id,
              revision: provider.revision,
              displayName,
              baseUrl,
              protocol,
              modelIds,
              ...(apiKey.trim() ? { apiKey } : {}),
              ...(removeApiKey ? { removeApiKey: true } : {}),
            })
          }
          className="shrink-0 rounded-lg bg-[#0f9f91] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b887d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存连接"}
        </button>
      </div>
    </article>
  );
}

export interface ModelSettingsSectionProps {
  status: "ready" | "unavailable";
  message?: string;
  providers: readonly ModelProviderSettings[];
  savingKey: string | null;
  onSave: (command: SettingsCommand, key: string) => void;
}

export function ModelSettingsSection({ status, message, providers, savingKey, onSave }: ModelSettingsSectionProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-[-0.025em] text-[#162936]">模型连接</h2>
      <p className="mt-2 text-sm leading-6 text-[#617682]">
        URL、协议和模型目录写入 DeepSeek Harness 设置；API Key 进入 Harness 凭据服务，不写入项目文件。
      </p>
      {status === "unavailable" ? (
        <div className="mt-5 rounded-xl border border-[#efc2c6] bg-[#fff5f5] px-4 py-3 text-sm text-[#9f2633]">
          {message ?? "Harness 设置暂时不可用"}
        </div>
      ) : null}
      <div className="mt-6 space-y-4">
        {providers.map((provider) => (
          <ModelProviderEditor
            key={`${provider.id}:${provider.revision}:${provider.apiKeyConfigured}`}
            provider={provider}
            saving={savingKey === `model:${provider.id}`}
            onSave={(command) => onSave(command, `model:${provider.id}`)}
          />
        ))}
        {status === "ready" && providers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#ccd9df] px-5 py-10 text-center text-sm text-[#728793]">
            Harness 中还没有已声明的模型提供方。
          </div>
        ) : null}
      </div>
    </div>
  );
}
