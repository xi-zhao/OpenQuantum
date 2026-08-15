"use client";

import { useState } from "react";

import type { SettingsCommand, SkillSettings } from "@/settings/interface";

export interface SkillSettingsSectionProps {
  skills: readonly SkillSettings[];
  savingKey: string | null;
  onSave: (command: SettingsCommand, key: string) => void;
}

export function SkillSettingsSection({ skills, savingKey, onSave }: SkillSettingsSectionProps) {
  const [removeName, setRemoveName] = useState<string | null>(null);
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-[-0.025em] text-[#162936]">Skill 配置</h2>
      <p className="mt-2 text-sm leading-6 text-[#617682]">
        Skill 由 Harness 原生文件系统 Provider 发现。设置中心只管理已发现 Skill 的调用策略，不在表单中创作或安装 Skill。
      </p>
      <article className="mt-5 rounded-2xl border border-[#b8dcd7] bg-[#f1fbf9] p-5">
        <h3 className="font-semibold text-[#162936]">添加现有 Skill</h3>
        <p className="mt-2 text-xs leading-5 text-[#617682]">
          简单 Skill 只需要一个带 frontmatter 的 SKILL.md；复杂 Skill 可以在同一目录附带 references、scripts 或其他资源。
        </p>
        <code className="mt-3 block rounded-lg border border-[#cfe7e3] bg-white px-3 py-2 font-mono text-xs text-[#314653]">
          .agents/skills/&lt;skill-name&gt;/SKILL.md
        </code>
        <p className="mt-3 text-xs leading-5 text-[#617682]">
          通过 Git、解压或手动复制加入完整目录，然后重新打开设置进行扫描和配置。
        </p>
      </article>
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
