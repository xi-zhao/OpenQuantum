import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CapabilitySettingsSection } from "../src/components/openquantum/settings/CapabilitySettingsSection";

test("capability center presents MCP, Skills and credential readiness together", () => {
  const markup = renderToStaticMarkup(
    createElement(CapabilitySettingsSection, {
      onOpenMcp: () => {},
      onOpenSkills: () => {},
      credentials: [
        {
          ref: "QUAFU_API_TOKEN",
          displayName: "夸父量子云 Token",
          description: "FieldQKit",
          documentationUrl: "https://quafu-sqc.baqis.ac.cn/",
          serverNames: ["fieldqkit"],
          configured: false,
          writable: true,
        },
      ],
      servers: [
        {
          serverName: "fieldqkit",
          displayName: "FieldQKit 量子硬件",
          description: "统一发现国内量子云后端。",
          provider: "FieldQuantum / OpenQuantum",
          sourceUrl: "https://github.com/FieldQuantum/fieldqkit",
          packageName: "fieldqkit",
          packageVersion: "0.1.1",
          credentialRefs: ["QUAFU_API_TOKEN"],
          requiredCredentialRefs: [],
          setup: null,
          managed: false,
          transport: "stdio",
          target: "./.agents/skills/fieldqkit-hardware/mcp/server.mjs",
          enabled: true,
          toolCallTimeoutMs: 180000,
          failOnStartupError: true,
          reconnect: {
            enabled: true,
            initialDelayMs: 1000,
            maxDelayMs: 30000,
            maxAttempts: 10,
          },
        },
      ],
      skills: [
        {
          name: "fieldqkit-hardware",
          displayName: "FieldQKit 量子硬件",
          description: "发现国内量子云后端。",
          version: null,
          maturity: null,
          modelInvocable: true,
          userInvocable: true,
          managed: false,
          revision: "a".repeat(64),
        },
      ],
    }),
  );

  assert.match(markup, /扩展组件/);
  assert.match(markup, /MCP 组件/);
  assert.match(markup, /Skill 组件/);
  assert.match(markup, /互不包含/);
  assert.match(markup, /一个 Skill 可以使用多个 MCP/);
  assert.match(markup, /不会启动 MCP/);
  assert.match(markup, /FieldQKit 量子硬件/);
  assert.match(markup, /管理 MCP 与凭据/);
  assert.match(markup, /安全凭据 0\/1/);
  assert.match(markup, /Agent 可用/);
});
