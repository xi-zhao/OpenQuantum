import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SkillSettingsSection } from "../src/components/openquantum/settings/SkillSettingsSection";

test("Skill settings exposes scaffold creation and only removes managed project Skills", () => {
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

  assert.match(markup, /添加自定义 Skill/);
  assert.match(markup, /Quantum Ground State/);
  assert.match(markup, /Project Flow/);
  assert.match(markup, /移除自定义 Skill/);
  assert.equal((markup.match(/移除自定义 Skill/g) ?? []).length, 1);
});
