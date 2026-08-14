"use client";

import { useState } from "react";

import type { SettingsCommand, SkillSettings } from "@/settings/interface";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-[#ccd9df] bg-white px-3 py-2.5 text-sm text-[#162936] outline-none focus:border-[#20a999] focus:ring-2 focus:ring-[#20a999]/15";

export interface SkillSettingsSectionProps {
  skills: readonly SkillSettings[];
  savingKey: string | null;
  onSave: (command: SettingsCommand, key: string) => void;
}

function CreateSkillForm({ saving, onSave }: {
  saving: boolean;
  onSave: (command: SettingsCommand) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [modelInvocable, setModelInvocable] = useState(false);
  const [userInvocable, setUserInvocable] = useState(true);
  const valid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)
    && displayName.trim().length > 0
    && description.trim().length > 0
    && instructions.trim().length > 0;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 rounded-lg bg-[#0f9f91] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0b887d]"
      >
        添加自定义 Skill
      </button>
    );
  }

  return (
    <article className="mt-5 rounded-2xl border border-[#b8dcd7] bg-[#f1fbf9] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-[#162936]">新建 Harness 原生 Skill</h3>
          <p className="mt-1 text-xs leading-5 text-[#617682]">
            生成标准项目级 SKILL.md；不安装远程代码，也不创建新的 Skill Runtime。
          </p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-medium text-[#617682] hover:text-[#162936]">收起</button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-[#526673]">
          Skill 名称
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="quantum-workflow" />
          <span className="mt-1 block text-[10px] text-[#728793]">仅小写字母、数字和连字符；也是 /skill-name。</span>
        </label>
        <label className="text-xs font-medium text-[#526673]">
          显示名称
          <input className={inputClass} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Quantum Workflow" />
        </label>
      </div>
      <label className="mt-4 block text-xs font-medium text-[#526673]">
        能力描述
        <textarea className={`${inputClass} min-h-20 resize-y`} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="说明什么时候应该使用、什么时候不应该使用。" />
      </label>
      <label className="mt-4 block text-xs font-medium text-[#526673]">
        Skill 指令（Markdown）
        <textarea className={`${inputClass} min-h-40 resize-y font-mono text-xs`} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="# Workflow&#10;&#10;1. 验证输入……&#10;2. 调用已有 MCP……" />
      </label>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex items-start gap-3 rounded-xl bg-white/80 p-3 text-sm text-[#314653]">
          <input type="checkbox" checked={modelInvocable} onChange={(event) => setModelInvocable(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0f9f91]" />
          <span><strong className="block font-medium">模型可自动调用</strong><span className="mt-1 block text-xs text-[#728793]">新 Skill 默认关闭，审阅指令后再开启。</span></span>
        </label>
        <label className="flex items-start gap-3 rounded-xl bg-white/80 p-3 text-sm text-[#314653]">
          <input type="checkbox" checked={userInvocable} onChange={(event) => setUserInvocable(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0f9f91]" />
          <span><strong className="block font-medium">用户可显式调用</strong><span className="mt-1 block text-xs text-[#728793]">允许通过 /{name || "skill-name"} 调用。</span></span>
        </label>
      </div>
      <div className="mt-5 flex justify-end border-t border-[#cfe7e3] pt-4">
        <button
          type="button"
          disabled={saving || !valid}
          onClick={() => onSave({
            type: "skill.create",
            name,
            displayName,
            description,
            instructions,
            modelInvocable,
            userInvocable,
          })}
          className="rounded-lg bg-[#0f9f91] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b887d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "创建中…" : "创建 Skill"}
        </button>
      </div>
    </article>
  );
}

export function SkillSettingsSection({ skills, savingKey, onSave }: SkillSettingsSectionProps) {
  const [removeName, setRemoveName] = useState<string | null>(null);
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-[-0.025em] text-[#162936]">Skill 配置</h2>
      <p className="mt-2 text-sm leading-6 text-[#617682]">
        Skill 仍由 Harness 原生文件系统 Provider 发现。设置中心可以创建轻量项目 Skill；复杂 Skill 仍建议直接在 .agents/skills 中开发和版本管理。
      </p>
      <CreateSkillForm saving={savingKey === "skill:create"} onSave={(command) => onSave(command, "skill:create")} />
      <div className="mt-6 space-y-4">
        {skills.map((skill) => {
          const saving = savingKey === `skill:${skill.name}`;
          const update = (changes: Partial<Pick<SkillSettings, "modelInvocable" | "userInvocable">>) =>
            onSave(
              {
                type: "skill.update",
                name: skill.name,
                revision: skill.revision,
                modelInvocable: changes.modelInvocable ?? skill.modelInvocable,
                userInvocable: changes.userInvocable ?? skill.userInvocable,
              },
              `skill:${skill.name}`,
            );
          return (
            <article key={`${skill.name}:${skill.revision}`} className="rounded-2xl border border-[#dce5ea] bg-white p-5 shadow-[0_12px_36px_rgba(7,19,31,.05)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[#162936]">{skill.displayName}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10px] text-[#728793]">
                    <span>/{skill.name}</span>
                    {skill.version ? <span>v{skill.version}</span> : null}
                    {skill.maturity ? <span className="rounded-full bg-[#fff4dd] px-2 py-0.5 text-[#8b5b08]">{skill.maturity.toUpperCase()}</span> : null}
                    {skill.managed ? <span className="rounded-full bg-[#e7f7f4] px-2 py-0.5 text-[#0b776e]">PROJECT</span> : null}
                  </div>
                </div>
                {saving ? <span className="text-xs font-medium text-[#0b776e]">保存中…</span> : null}
              </div>
              <p className="mt-4 text-sm leading-6 text-[#617682]">{skill.description}</p>
              <div className="mt-5 grid gap-3 border-t border-[#e5ecef] pt-4 sm:grid-cols-2">
                <label className="flex items-start gap-3 rounded-xl bg-[#f5f8f9] p-3 text-sm text-[#314653]">
                  <input type="checkbox" checked={skill.modelInvocable} disabled={saving} onChange={(event) => update({ modelInvocable: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[#0f9f91]" />
                  <span><strong className="block font-medium">模型可自动调用</strong><span className="mt-1 block text-xs leading-5 text-[#728793]">出现在 Agent 的 Skill 目录中。</span></span>
                </label>
                <label className="flex items-start gap-3 rounded-xl bg-[#f5f8f9] p-3 text-sm text-[#314653]">
                  <input type="checkbox" checked={skill.userInvocable} disabled={saving} onChange={(event) => update({ userInvocable: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[#0f9f91]" />
                  <span><strong className="block font-medium">用户可显式调用</strong><span className="mt-1 block text-xs leading-5 text-[#728793]">允许通过 /{skill.name} 调用。</span></span>
                </label>
              </div>
              {skill.managed ? (
                <div className="mt-4 flex items-center justify-end gap-3">
                  {removeName === skill.name ? (
                    <>
                      <span className="text-xs text-[#8b5b08]">将移到本地回收区，可手动恢复。</span>
                      <button type="button" onClick={() => setRemoveName(null)} className="text-xs font-medium text-[#617682]">取消</button>
                      <button type="button" disabled={saving} onClick={() => onSave({ type: "skill.remove", name: skill.name, revision: skill.revision }, `skill:${skill.name}`)} className="rounded-lg border border-[#e2aeb3] px-3 py-1.5 text-xs font-semibold text-[#9f2633] hover:bg-[#fff5f5] disabled:opacity-50">确认移除</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setRemoveName(skill.name)} className="text-xs font-medium text-[#9f2633] hover:underline">移除自定义 Skill</button>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
