import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SkillSettingsSection } from "../src/components/openquantum/settings/SkillSettingsSection";

test("Skill settings discovers standard Skill directories instead of authoring instructions", () => {
  const markup = renderToStaticMarkup(
    createElement(SkillSettingsSection, {
      savingKey: null,
      onSave: () => {},
      skills: [
        {
          name: "quantum-ground-state",
          displayName: "Quantum Ground State",
          description: "Validated built-in",
          version: "0.2.0",
          maturity: "validated",
          modelInvocable: true,
          userInvocable: true,
          managed: false,
          revision: "a".repeat(64),
        },
        {
          name: "project-flow",
          displayName: "Project Flow",
          description: "Project-owned workflow",
          version: null,
          maturity: null,
          modelInvocable: false,
          userInvocable: true,
          managed: true,
          revision: "b".repeat(64),
        },
      ],
    }),
  );

  assert.match(markup, /添加现有 Skill/);
  assert.match(markup, /\.agents\/skills\/&lt;skill-name&gt;\/SKILL\.md/);
  assert.match(markup, /不在表单中创作或安装 Skill/);
  assert.doesNotMatch(markup, /Skill 指令（Markdown）|创建 Skill/);
  assert.match(markup, /Quantum Ground State/);
  assert.match(markup, /Project Flow/);
  assert.match(markup, /移除自定义 Skill/);
  assert.equal((markup.match(/移除自定义 Skill/g) ?? []).length, 1);
});
