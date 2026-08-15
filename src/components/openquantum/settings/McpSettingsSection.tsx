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
  credentials: readonly McpCredentialSettings[];
  revision: string;
  saving: boolean;
  removeArmed: boolean;
  onSave: (command: SettingsCommand) => void;
  onArmRemove: () => void;
  onCancelRemove: () => void;
  onRemove: () => void;
}

function McpEditor({ server, credentials, revision, saving, removeArmed, onSave, onArmRemove, onCancelRemove, onRemove }: McpEditorProps) {
  const [enabled, setEnabled] = useState(server.enabled);
  const [timeout, setTimeoutValue] = useState(server.toolCallTimeoutMs);
  const [reconnectEnabled, setReconnectEnabled] = useState(server.reconnect.enabled);
  const [initialDelay, setInitialDelay] = useState(server.reconnect.initialDelayMs);
  const [maxDelay, setMaxDelay] = useState(server.reconnect.maxDelayMs);
  const [maxAttempts, setMaxAttempts] = useState(server.reconnect.maxAttempts);
  const missingRequiredCredentials = credentials.filter(
    (credential) =>
      server.requiredCredentialRefs.includes(credential.ref) &&
      !credential.configured,
  );
  const enableBlocked =
    server.setup?.status === "required" || missingRequiredCredentials.length > 0;

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
            {server.managed ? (
              <span className="rounded-full bg-[#e7f7f4] px-2 py-0.5 font-mono text-[9px] font-semibold text-[#0b776e]">PROJECT</span>
            ) : null}
          </div>
          <p className="mt-1 font-mono text-[10px] text-[#728793]">{server.serverName} · {server.provider}</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-[#314653]">
          <input
            type="checkbox"
            checked={enabled}
            disabled={!enabled && enableBlocked}
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
      {server.setup ? (
        <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${server.setup.status === "ready" ? "border-[#afe1d9] bg-[#edfaf7] text-[#0b776e]" : "border-[#efd39c] bg-[#fff8e9] text-[#8b5b08]"}`}>
          <p>{server.setup.message}</p>
          {server.setup.command ? (
            <code className="mt-2 block select-all font-mono text-[11px]">{server.setup.command}</code>
          ) : null}
        </div>
      ) : null}
      {credentials.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {credentials.map((credential) => {
            const required = server.requiredCredentialRefs.includes(credential.ref);
            return (
              <div key={credential.ref} className={`rounded-lg border px-3 py-2 text-xs ${credential.configured ? "border-[#afe1d9] bg-[#edfaf7] text-[#0b776e]" : required ? "border-[#efd39c] bg-[#fff8e9] text-[#8b5b08]" : "border-[#dce5ea] bg-[#f7fafb] text-[#617682]"}`}>
                {credential.displayName} · {required ? "必需" : "可选"} · {credential.configured ? "已配置" : "未配置"}
              </div>
            );
          })}
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

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#e5ecef] pt-4">
        <p className="text-xs leading-5 text-[#728793]">
          写入 Harness Agent preset；为保护正在运行的会话，重启 Harness 后生效。
        </p>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {server.managed ? (
            removeArmed ? (
              <>
                <button type="button" onClick={onCancelRemove} className="text-xs font-medium text-[#617682]">取消</button>
                <button
                  type="button"
                  disabled={saving || server.enabled || credentials.some((credential) => credential.configured)}
                  onClick={onRemove}
                  className="rounded-lg border border-[#e2aeb3] px-3 py-2 text-xs font-semibold text-[#9f2633] hover:bg-[#fff5f5] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  确认移除
                </button>
              </>
            ) : (
              <button type="button" onClick={onArmRemove} className="text-xs font-medium text-[#9f2633] hover:underline">移除</button>
            )
          ) : null}
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
      </div>
      {server.managed && removeArmed && (server.enabled || credentials.some((credential) => credential.configured)) ? (
        <p className="mt-2 text-right text-xs text-[#8b5b08]">
          {server.enabled
            ? "请先停用服务。"
            : `请先移除 ${credentials.filter((credential) => credential.configured).map((credential) => credential.displayName).join("、")}。`}
        </p>
      ) : null}
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
          placeholder={credential.configured ? "已配置——输入新值可替换" : `输入 ${credential.displayName}`}
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
          {credential.documentationUrl ? (
            <><a className="font-medium text-[#0b887d] underline-offset-2 hover:underline" href={credential.documentationUrl} target="_blank" rel="noreferrer">查看凭据说明</a><span> · </span></>
          ) : null}
          <span>值不会返回浏览器或写入 Git。</span>
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

function RegisterMcpForm({ revision, saving, onSave }: {
  revision: string;
  saving: boolean;
  onSave: (command: SettingsCommand) => void;
}) {
  const [open, setOpen] = useState(false);
  const [serverName, setServerName] = useState("");
  const [transport, setTransport] = useState<"stdio" | "streamable-http">("stdio");
  const [command, setCommand] = useState("uvx");
  const [args, setArgs] = useState("");
  const [url, setUrl] = useState("");
  const [credentialRef, setCredentialRef] = useState("");
  const serverNameValid = /^[A-Za-z0-9_-]{1,32}$/.test(serverName);
  const valid = serverNameValid && (transport === "stdio" ? command.trim().length > 0 : /^https?:\/\//.test(url));

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-5 rounded-lg bg-[#0f9f91] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0b887d]">
        注册已有 MCP Server
      </button>
    );
  }

  return (
    <article className="mt-5 rounded-2xl border border-[#b8dcd7] bg-[#f1fbf9] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-[#162936]">注册 Harness 原生 MCP Server</h3>
          <p className="mt-1 text-xs leading-5 text-[#617682]">
            这里只写入 MCP 连接配置，不会下载、安装或创建 Server。stdio 程序必须已在本机可用，HTTP 端点必须已经部署并经过审查。
          </p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-medium text-[#617682] hover:text-[#162936]">收起</button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-[#526673]">
          Server ID
          <input className={numberClass} value={serverName} onChange={(event) => setServerName(event.target.value)} placeholder="my_quantum_tools" />
          <span className="mt-1 block text-[10px] text-[#728793]">用于 mcp__server__tool 命名，最多 32 个字符。</span>
        </label>
        <label className="text-xs font-medium text-[#526673]">
          Transport
          <select className={numberClass} value={transport} onChange={(event) => setTransport(event.target.value as "stdio" | "streamable-http")}>
            <option value="stdio">stdio（本地进程）</option>
            <option value="streamable-http">Streamable HTTP（公开端点）</option>
          </select>
        </label>
      </div>
      {transport === "stdio" ? (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium text-[#526673]">
              已有 MCP 程序命令
              <input className={numberClass} value={command} onChange={(event) => setCommand(event.target.value)} placeholder="uvx" />
            </label>
            <label className="text-xs font-medium text-[#526673]">
              可选凭据引用
              <input className={numberClass} value={credentialRef} onChange={(event) => setCredentialRef(event.target.value)} placeholder="例如 GITHUB_TOKEN" />
              <span className="mt-1 block text-[10px] text-[#728793]">同时作为传给子进程的环境变量名；留空表示无凭据。</span>
            </label>
          </div>
          <label className="mt-4 block text-xs font-medium text-[#526673]">
            参数（每行一项，不经过 Shell）
            <textarea className={`${numberClass} min-h-28 resize-y font-mono text-xs`} value={args} onChange={(event) => setArgs(event.target.value)} placeholder={"--from\nmy-mcp-server==1.0.0\nmy-mcp-server"} />
          </label>
        </>
      ) : (
        <label className="mt-4 block text-xs font-medium text-[#526673]">
          MCP URL
          <input className={numberClass} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/mcp" />
          <span className="mt-1 block text-[10px] text-[#728793]">当前只接受无内嵌凭据的 HTTP(S) 端点。</span>
        </label>
      )}
      <div className="mt-5 flex justify-end border-t border-[#cfe7e3] pt-4">
        <button
          type="button"
          disabled={saving || !valid}
          onClick={() => onSave({
            type: "mcp.register",
            revision,
            serverName,
            transport,
            ...(transport === "stdio"
              ? { command, args: args.split(/\r?\n/).filter((argument) => argument.length > 0), ...(credentialRef.trim() ? { credentialRef: credentialRef.trim() } : {}) }
              : { url }),
          })}
          className="rounded-lg bg-[#0f9f91] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b887d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "注册中…" : "注册为关闭状态"}
        </button>
      </div>
    </article>
  );
}

export function McpSettingsSection({ servers, credentials, revision, savingKey, onSave }: McpSettingsSectionProps) {
  const credentialByRef = new Map(credentials.map((credential) => [credential.ref, credential]));
  const [removeName, setRemoveName] = useState<string | null>(null);
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-[-0.025em] text-[#162936]">MCP 服务</h2>
      <p className="mt-2 text-sm leading-6 text-[#617682]">
        这里只注册和管理 DeepSeek Harness 原生 MCP Client 的连接配置；OpenQuantum 不下载、安装或创建 MCP Server，也不另建 MCP Runtime。
      </p>
      <RegisterMcpForm revision={revision} saving={savingKey === "mcp:register"} onSave={(command) => onSave(command, "mcp:register")} />
      {credentials.length > 0 ? (
        <div className="mt-6 space-y-4">
          {credentials.map((credential) => (
            <McpCredentialEditor
              key={`${credential.ref}:${credential.configured}`}
              credential={credential}
              enabledConsumers={servers
                .filter((server) => server.enabled && server.credentialRefs.includes(credential.ref))
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
            credentials={server.credentialRefs
              .map((ref) => credentialByRef.get(ref))
              .filter((credential): credential is McpCredentialSettings => credential !== undefined)}
            revision={revision}
            saving={savingKey === `mcp:${server.serverName}`}
            removeArmed={removeName === server.serverName}
            onSave={(command) => onSave(command, `mcp:${server.serverName}`)}
            onArmRemove={() => setRemoveName(server.serverName)}
            onCancelRemove={() => setRemoveName(null)}
            onRemove={() => onSave({ type: "mcp.remove", serverName: server.serverName, revision }, `mcp:${server.serverName}`)}
          />
        ))}
      </div>
    </div>
  );
}
