"use client";

import { useState } from "react";

import type { McpServerSettings, SettingsCommand } from "@/settings/interface";

const numberClass =
  "mt-1.5 h-10 w-full rounded-lg border border-[#ccd9df] bg-white px-3 text-sm text-[#162936] outline-none focus:border-[#20a999] focus:ring-2 focus:ring-[#20a999]/15";

interface McpEditorProps {
  server: McpServerSettings;
  revision: string;
  saving: boolean;
  onSave: (command: SettingsCommand) => void;
}

function McpEditor({ server, revision, saving, onSave }: McpEditorProps) {
  const [enabled, setEnabled] = useState(server.enabled);
  const [timeout, setTimeoutValue] = useState(server.toolCallTimeoutMs);
  const [reconnectEnabled, setReconnectEnabled] = useState(server.reconnect.enabled);
  const [initialDelay, setInitialDelay] = useState(server.reconnect.initialDelayMs);
  const [maxDelay, setMaxDelay] = useState(server.reconnect.maxDelayMs);
  const [maxAttempts, setMaxAttempts] = useState(server.reconnect.maxAttempts);

  return (
    <article className="rounded-2xl border border-[#dce5ea] bg-white p-5 shadow-[0_12px_36px_rgba(7,19,31,.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[#162936]">{server.serverName}</h3>
            <span className="rounded-full bg-[#edf4f6] px-2 py-0.5 font-mono text-[9px] font-semibold text-[#526673]">
              {server.transport.toUpperCase()}
            </span>
          </div>
          <p className="mt-1 break-all font-mono text-[10px] text-[#728793]">{server.target}</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-[#314653]">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="h-4 w-4 accent-[#0f9f91]" />
          启用服务
        </label>
      </div>

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
  revision: string;
  savingKey: string | null;
  onSave: (command: SettingsCommand, key: string) => void;
}

export function McpSettingsSection({ servers, revision, savingKey, onSave }: McpSettingsSectionProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-[-0.025em] text-[#162936]">MCP 服务</h2>
      <p className="mt-2 text-sm leading-6 text-[#617682]">
        这里管理 DeepSeek Harness 原生 MCP Client 的连接策略。OpenQuantum 不另建 MCP Runtime。
      </p>
      <div className="mt-6 space-y-4">
        {servers.map((server) => (
          <McpEditor
            key={`${server.serverName}:${revision}`}
            server={server}
            revision={revision}
            saving={savingKey === `mcp:${server.serverName}`}
            onSave={(command) => onSave(command, `mcp:${server.serverName}`)}
          />
        ))}
      </div>
    </div>
  );
}
