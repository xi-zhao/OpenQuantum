"use client";

import type { SettingsCommand, SkillSettings } from "@/settings/interface";

export interface SkillSettingsSectionProps {
  skills: readonly SkillSettings[];
  savingKey: string | null;
  onSave: (command: SettingsCommand, key: string) => void;
}

export function SkillSettingsSection({ skills, savingKey, onSave }: SkillSettingsSectionProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-[-0.025em] text-[#162936]">Skill 配置</h2>
      <p className="mt-2 text-sm leading-6 text-[#617682]">
        Skill 仍由 Harness 原生文件系统 Provider 发现。这里修改官方 invocation frontmatter，不复制一套 Skill 注册中心。
      </p>
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
            </article>
          );
        })}
      </div>
    </div>
  );
}
