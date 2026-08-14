import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { OpenQuantumApp } from "../src/components/openquantum/OpenQuantumApp";
import { PromptComposer } from "../src/components/openquantum/PromptComposer";
import { Sidebar } from "../src/components/openquantum/Sidebar";

const noop = () => {};
const unusedSettingsPort = {
  snapshot: async () => {
    throw new Error("closed settings dialog must not read settings");
  },
  execute: async () => {
    throw new Error("closed settings dialog must not write settings");
  },
};

function disabledAttributeCount(markup) {
  return markup.match(/ disabled=""/g)?.length ?? 0;
}

test("bootstrap render keeps runtime actions disabled until a snapshot is ready", () => {
  const unusedPort = {
    snapshot: async () => {
      throw new Error("server render must not read the runtime");
    },
    command: async () => {
      throw new Error("server render must not submit commands");
    },
    async *events() {},
  };

  const markup = renderToStaticMarkup(
    createElement(OpenQuantumApp, {
      port: unusedPort,
      settingsPort: unusedSettingsPort,
    }),
  );

  assert.match(markup, />正在连接</);
  assert.match(markup, /<textarea[^>]* disabled=""/);
  assert.match(markup, /aria-label="语音输入"[^>]* disabled=""/);
  assert.match(markup, /aria-label="发送"[^>]* disabled=""/);
  assert.match(markup, /<button[^>]* disabled=""[^>]*>[\s\S]*?新建对话/);
});

test("sidebar disables creation and session selection only while runtime is unavailable", () => {
  const commonProps = {
    isOpen: true,
    sessions: [
      {
        id: "session-1",
        title: "量子测试会话",
        updatedAt: 0,
        running: false,
        blank: false,
        pendingInteractionCount: 0,
      },
    ],
    activeSessionId: null,
    isCreating: false,
    onClose: noop,
    onCreateConversation: noop,
    onSelectSession: noop,
    onOpenSettings: noop,
  };

  const unavailableMarkup = renderToStaticMarkup(
    createElement(Sidebar, { ...commonProps, isRuntimeReady: false }),
  );
  const onlineMarkup = renderToStaticMarkup(
    createElement(Sidebar, { ...commonProps, isRuntimeReady: true }),
  );

  assert.equal(disabledAttributeCount(unavailableMarkup), 2);
  assert.equal(disabledAttributeCount(onlineMarkup), 0);
});

test("prompt composer restores every input action when runtime becomes ready", () => {
  const commonProps = {
    prompt: "运行 VQE",
    placeholder: "描述任务",
    onPromptChange: noop,
    onSend: noop,
  };

  const unavailableMarkup = renderToStaticMarkup(
    createElement(PromptComposer, { ...commonProps, disabled: true }),
  );
  const onlineMarkup = renderToStaticMarkup(
    createElement(PromptComposer, { ...commonProps, disabled: false }),
  );

  assert.match(unavailableMarkup, /aria-disabled="true"/);
  assert.equal(disabledAttributeCount(unavailableMarkup), 3);
  assert.doesNotMatch(onlineMarkup, /aria-disabled="true"/);
  assert.equal(disabledAttributeCount(onlineMarkup), 0);
});
