"use client";

import { useState } from "react";

import type {
  McpCredentialSettings,
  McpServerSettings,
  SettingsCommand,
} from "@/settings/interface";

const numberClass =
  "mt-1.5 h-10 w-full rounded-lg border border-[#ccd9df] bg-white px-3 text-sm text-[#162936] outline-none focus:border-[#20a999] focus:ring-2 focus:ring-[#20a999]/15";

interface McpEditorProps {
  server: McpServerSettings;
  credential?: McpCredentialSettings;
  revision: string;
  saving: boolean;
  onSave: (command: SettingsCommand) => void;
}

function McpEditor({ server, credential, revision, saving, onSave }: McpEditorProps) {
  const [enabled, setEnabled] = useState(server.enabled);
  const [timeout, setTimeoutValue] = useState(server.toolCallTimeoutMs);
  const [reconnectEnabled, setReconnectEnabled] = useState(server.reconnect.enabled);
  const [initialDelay, setInitialDelay] = useState(server.reconnect.initialDelayMs);
  const [maxDelay, setMaxDelay] = useState(server.reconnect.maxDelayMs);
  const [maxAttempts, setMaxAttempts] = useState(server.reconnect.maxAttempts);
  const credentialMissing = credential !== undefined && !credential.configured;

  return (
    <article className="rounded-2xl border border-[#dce5ea] bg-white p-5 shadow-[0_12px_36px_rgba(7,19,31,.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[#162936]">{server.displayName}</h3>
            <span className="rounded-full bg-[#edf4f6] px-2 py-0.5 font-mono text-[9px] font-semibold text-[#526673]">
              {server.transport.toUpperCase()}
            </span>
            {server.packageVersion ? (
              <span className="rounded-full bg-[#edf4f6] px-2 py-0.5 font-mono text-[9px] font-semibold text-[#526673]">
                v{server.packageVersion}
              </span>
            ) : null}
          </div>
          <p className="mt-1 font-mono text-[10px] text-[#728793]">{server.serverName} · {server.provider}</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-[#314653]">
          <input
            type="checkbox"
            checked={enabled}
            disabled={!enabled && credentialMissing}
            onChange={(event) => setEnabled(event.target.checked)}
            className="h-4 w-4 accent-[#0f9f91] disabled:cursor-not-allowed"
          />
          启用服务
        </label>
      </div>

      <p className="mt-3 text-sm leading-6 text-[#526673]">{server.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        <code className="break-all rounded-md bg-[#f1f5f6] px-2 py-1 text-[#526673]">{server.target}</code>
        {server.sourceUrl ? (
          <a className="font-medium text-[#0b887d] underline-offset-2 hover:underline" href={server.sourceUrl} target="_blank" rel="noreferrer">
            官方源码
          </a>
        ) : null}
      </div>
      {credential ? (
        <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${credential.configured ? "border-[#afe1d9] bg-[#edfaf7] text-[#0b776e]" : "border-[#efd39c] bg-[#fff8e9] text-[#8b5b08]"}`}>
          {credential.configured
            ? `${credential.displayName} 已配置`
            : `启用前请先配置 ${credential.displayName}`}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-[#526673]">
          Tool 调用超时（ms）
          <input className={numberClass} type="number" min={1000} max={600000} value={timeout} onChange={(event) => setTimeoutValue(Number(event.target.value))} />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm text-[#526673]">
          <input type="checkbox" checked={reconnectEnabled} onChange={(event) => setReconnectEnabled(event.target.checked)} className="h-4 w-4 accent-[#0f9f91]" />
          连接断开后自动重连
        </label>
        <label className="text-xs font-medium text-[#526673]">
          初始延迟（ms）
          <input className={numberClass} type="number" min={1} max={60000} value={initialDelay} onChange={(event) => setInitialDelay(Number(event.target.value))} />
        </label>
        <label className="text-xs font-medium text-[#526673]">
          最大延迟（ms）
          <input className={numberClass} type="number" min={1} max={300000} value={maxDelay} onChange={(event) => setMaxDelay(Number(event.target.value))} />
        </label>
        <label className="text-xs font-medium text-[#526673]">
          最大重试次数
          <input className={numberClass} type="number" min={1} max={100} value={maxAttempts} onChange={(event) => setMaxAttempts(Number(event.target.value))} />
        </label>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-[#e5ecef] pt-4">
        <p className="text-xs leading-5 text-[#728793]">
          写入 Harness Agent preset；为保护正在运行的会话，重启 Harness 后生效。
        </p>
        <button
          type="button"
          disabled={saving || maxDelay < initialDelay}
          onClick={() => onSave({
            type: "mcp.update",
            serverName: server.serverName,
            revision,
            enabled,
            toolCallTimeoutMs: timeout,
            reconnect: { enabled: reconnectEnabled, initialDelayMs: initialDelay, maxDelayMs: maxDelay, maxAttempts },
          })}
          className="shrink-0 rounded-lg bg-[#0f9f91] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b887d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存 MCP"}
        </button>
      </div>
    </article>
  );
}

export interface McpSettingsSectionProps {
  servers: readonly McpServerSettings[];
  credentials: readonly McpCredentialSettings[];
  revision: string;
  savingKey: string | null;
  onSave: (command: SettingsCommand, key: string) => void;
}

interface McpCredentialEditorProps {
  credential: McpCredentialSettings;
  enabledConsumers: readonly string[];
  saving: boolean;
  onSave: (command: SettingsCommand) => void;
}

function McpCredentialEditor({ credential, enabledConsumers, saving, onSave }: McpCredentialEditorProps) {
  const [value, setValue] = useState("");
  const [remove, setRemove] = useState(false);

  return (
    <article className="rounded-2xl border border-[#b8dcd7] bg-[#f1fbf9] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#162936]">{credential.displayName}</h3>
          <p className="mt-1 font-mono text-[10px] text-[#728793]">{credential.ref}</p>
        </div>
        <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${credential.configured ? "bg-[#d9f5ef] text-[#0b776e]" : "bg-[#fff0cf] text-[#8b5b08]"}`}>
          {credential.configured ? "Token 已配置" : "Token 未配置"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#526673]">{credential.description}</p>
      <label className="mt-4 block text-xs font-medium text-[#526673]">
        API Token
        <input
          className={numberClass}
          type="password"
          autoComplete="new-password"
          disabled={!credential.writable || remove}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={credential.configured ? "已配置——输入新值可替换" : "输入 IBM Quantum API Token"}
        />
      </label>
      {credential.configured ? (
        <label className="mt-3 flex items-center gap-2 text-xs text-[#526673]">
          <input
            type="checkbox"
            checked={remove}
            disabled={!credential.writable || enabledConsumers.length > 0}
            onChange={(event) => {
              setRemove(event.target.checked);
              if (event.target.checked) setValue("");
            }}
            className="h-4 w-4 accent-[#0f9f91]"
          />
          移除已保存的 Token
        </label>
      ) : null}
      {credential.configured && enabledConsumers.length > 0 ? (
        <p className="mt-2 text-xs text-[#8b5b08]">
          请先停用 {enabledConsumers.join("、")}，再移除共享 Token。
        </p>
      ) : null}
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-[#cfe7e3] pt-4">
        <p className="text-xs leading-5 text-[#617682]">
          <a className="font-medium text-[#0b887d] underline-offset-2 hover:underline" href={credential.documentationUrl} target="_blank" rel="noreferrer">获取 IBM Quantum Token</a>
          <span> · 值不会返回浏览器或写入 Git。</span>
        </p>
        <button
          type="button"
          disabled={saving || !credential.writable || (!remove && !value.trim())}
          onClick={() => onSave({
            type: "mcp.credential.update",
            ref: credential.ref,
            ...(remove ? { remove: true } : { value }),
          })}
          className="shrink-0 rounded-lg bg-[#0f9f91] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b887d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "保存中…" : remove ? "移除 Token" : "保存 Token"}
        </button>
      </div>
    </article>
  );
}

export function McpSettingsSection({ servers, credentials, revision, savingKey, onSave }: McpSettingsSectionProps) {
  const credentialByRef = new Map(credentials.map((credential) => [credential.ref, credential]));
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-[-0.025em] text-[#162936]">MCP 服务</h2>
      <p className="mt-2 text-sm leading-6 text-[#617682]">
        这里管理 DeepSeek Harness 原生 MCP Client 的连接策略。OpenQuantum 不另建 MCP Runtime。
      </p>
      {credentials.length > 0 ? (
        <div className="mt-6 space-y-4">
          {credentials.map((credential) => (
            <McpCredentialEditor
              key={`${credential.ref}:${credential.configured}`}
              credential={credential}
              enabledConsumers={servers
                .filter((server) => server.enabled && server.credentialRef === credential.ref)
                .map((server) => server.displayName)}
              saving={savingKey === `mcp-credential:${credential.ref}`}
              onSave={(command) => onSave(command, `mcp-credential:${credential.ref}`)}
            />
          ))}
        </div>
      ) : null}
      <div className="mt-6 space-y-4">
        {servers.map((server) => (
          <McpEditor
            key={`${server.serverName}:${revision}`}
            server={server}
            credential={server.credentialRef ? credentialByRef.get(server.credentialRef) : undefined}
            revision={revision}
            saving={savingKey === `mcp:${server.serverName}`}
            onSave={(command) => onSave(command, `mcp:${server.serverName}`)}
          />
        ))}
      </div>
    </div>
  );
}
