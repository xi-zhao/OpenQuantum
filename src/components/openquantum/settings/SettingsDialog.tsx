"use client";

import { useEffect, useState } from "react";

import type {
  OpenQuantumSettingsPort,
  SettingsCommand,
  SettingsSnapshot,
} from "@/settings/interface";

import { AtomIcon, CloseIcon, CpuIcon, FlaskIcon, PlugIcon } from "../icons";
import { CapabilitySettingsSection } from "./CapabilitySettingsSection";
import { McpSettingsSection } from "./McpSettingsSection";
import { ModelSettingsSection } from "./ModelSettingsSection";
import { SkillSettingsSection } from "./SkillSettingsSection";

type Section = "capabilities" | "models" | "mcp" | "skills";

const sections = [
  { id: "capabilities" as const, label: "能力中心", description: "MCP 与 Skill 全景", icon: FlaskIcon },
  { id: "models" as const, label: "模型连接", description: "URL、协议与 API Key", icon: CpuIcon },
  { id: "mcp" as const, label: "MCP 服务", description: "Harness 原生工具连接", icon: PlugIcon },
  { id: "skills" as const, label: "Skill 配置", description: "发现与调用策略", icon: AtomIcon },
];

export interface SettingsDialogProps {
  open: boolean;
  port: OpenQuantumSettingsPort;
  onClose: () => void;
}

export function SettingsDialog({ open, port, onClose }: SettingsDialogProps) {
  const [section, setSection] = useState<Section>("capabilities");
  const [snapshot, setSnapshot] = useState<SettingsSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void port
      .snapshot(controller.signal)
      .then(setSnapshot)
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : "设置加载失败");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, port]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  async function execute(command: SettingsCommand, key: string) {
    setSavingKey(key);
    setError(null);
    setNotice(null);
    try {
      setSnapshot(await port.execute(command));
      setNotice(
        command.type.startsWith("mcp.")
          ? "MCP 配置已保存；重启 Harness 后生效。"
          : "设置已保存。",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "设置保存失败");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
      <button type="button" aria-label="关闭设置" className="absolute inset-0 bg-[#07131f]/55 backdrop-blur-[3px]" onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-labelledby="settings-title" className="relative flex h-[min(820px,calc(100dvh-24px))] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/30 bg-[#f7fafb] shadow-[0_32px_100px_rgba(7,19,31,.38)] md:flex-row">
        <aside className="shrink-0 border-b border-[#dce5ea] bg-[#0a1b27] p-3 text-white md:w-64 md:border-r md:border-b-0 md:p-5">
          <div className="flex items-center justify-between gap-3 px-2 py-1 md:block">
            <div>
              <p className="font-mono text-[9px] tracking-[0.18em] text-[#68d8ca]">OPENQUANTUM</p>
              <h1 id="settings-title" className="mt-1 text-lg font-semibold">设置中心</h1>
            </div>
            <button type="button" aria-label="关闭" onClick={onClose} className="rounded-lg p-2 text-[#9bb3bc] hover:bg-white/10 hover:text-white md:hidden"><CloseIcon /></button>
          </div>
          <nav aria-label="设置分类" className="mt-3 grid grid-cols-4 gap-1 md:mt-7 md:block md:space-y-2">
            {sections.map((item) => {
              const Icon = item.icon;
              const active = item.id === section;
              return (
                <button key={item.id} type="button" onClick={() => setSection(item.id)} className={`flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? "bg-[#163944] text-white shadow-[inset_3px_0_0_#2dd4bf]" : "text-[#9bb3bc] hover:bg-white/5 hover:text-white"}`}>
                  <Icon className={active ? "text-[#5ee4d2]" : "text-[#688995]"} />
                  <span className="min-w-0"><strong className="block truncate text-xs font-semibold sm:text-sm">{item.label}</strong><span className="mt-0.5 hidden truncate text-[10px] text-[#6f909b] md:block">{item.description}</span></span>
                </button>
              );
            })}
          </nav>
          <div className="mt-auto hidden border-t border-[#193747] pt-5 text-xs leading-5 text-[#6f909b] md:block">
            配置由 DeepSeek Harness 与项目 Agent preset 共同提供。
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="hidden h-16 shrink-0 items-center justify-between border-b border-[#dce5ea] bg-white/70 px-7 md:flex">
            <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#6a7f8c]">HARNESS CONFIGURATION</div>
            <button type="button" aria-label="关闭" onClick={onClose} className="rounded-lg p-2 text-[#617682] hover:bg-[#edf3f5] hover:text-[#162936]"><CloseIcon /></button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
            {error ? <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-[#efc2c6] bg-[#fff5f5] px-4 py-3 text-sm text-[#9f2633]"><span>{error}</span><button type="button" className="font-medium underline" onClick={() => setError(null)}>关闭</button></div> : null}
            {notice ? <div className="mb-5 rounded-xl border border-[#afe1d9] bg-[#edfaf7] px-4 py-3 text-sm text-[#0b776e]">{notice}</div> : null}
            {loading && !snapshot ? <div className="flex min-h-72 items-center justify-center text-sm text-[#728793]">正在读取 Harness 设置…</div> : null}
            {snapshot && section === "capabilities" ? (
              <CapabilitySettingsSection
                skills={snapshot.project.skills}
                servers={snapshot.project.mcpServers}
                credentials={snapshot.project.mcpCredentials}
                onOpenMcp={() => setSection("mcp")}
                onOpenSkills={() => setSection("skills")}
              />
            ) : null}
            {snapshot && section === "models" ? <ModelSettingsSection {...snapshot.models} savingKey={savingKey} onSave={(command, key) => void execute(command, key)} /> : null}
            {snapshot && section === "mcp" ? <McpSettingsSection servers={snapshot.project.mcpServers} credentials={snapshot.project.mcpCredentials} revision={snapshot.project.mcpRevision} savingKey={savingKey} onSave={(command, key) => void execute(command, key)} /> : null}
            {snapshot && section === "skills" ? <SkillSettingsSection skills={snapshot.project.skills} savingKey={savingKey} onSave={(command, key) => void execute(command, key)} /> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
