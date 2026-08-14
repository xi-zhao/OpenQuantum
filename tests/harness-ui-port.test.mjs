import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryHarnessUiAdapter } from "../src/harness/in-memory-adapter.ts";

function deterministicAdapter(options = {}) {
  let now = 1_000;
  let id = 0;
  return new InMemoryHarnessUiAdapter({
    clock: () => ++now,
    idFactory: (kind) => `${kind}-${++id}`,
    ...options,
  });
}

async function nextEvent(iterator) {
  const result = await Promise.race([
    iterator.next(),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("timed out waiting for UI event")), 500);
    }),
  ]);
  assert.equal(result.done, false);
  return result.value;
}

test("CommandId 重放返回原 receipt，且不会重复改变状态", async () => {
  const adapter = deterministicAdapter();
  const command = {
    type: "new-session",
    commandId: "command-new-1",
    title: "量子工作区",
  };

  const first = await adapter.command(command);
  const replay = await adapter.command(command);
  const snapshot = await adapter.snapshot();

  assert.deepEqual(replay, first);
  assert.equal(first.accepted, true);
  assert.equal(first.revision, 1);
  assert.equal(snapshot.revision, 1);
  assert.equal(snapshot.sessions.length, 1);

  const conflict = await adapter.command({
    ...command,
    title: "另一个意图",
  });
  assert.equal(conflict.accepted, false);
  assert.equal(conflict.error.code, "COMMAND_ID_CONFLICT");
  assert.equal((await adapter.snapshot()).revision, 1);
});

test("prompt 从 pending 变为 durable 时保持一个逻辑消息", async () => {
  const adapter = deterministicAdapter();
  const created = await adapter.command({
    type: "new-session",
    commandId: "command-new-1",
  });
  assert.equal(created.accepted, true);
  const sessionId = created.result.sessionId;

  const prompt = {
    type: "prompt",
    commandId: "command-prompt-1",
    sessionId,
    clientMessageId: "client-message-1",
    text: "  解释一下 VQE  ",
  };
  const queued = await adapter.command(prompt);
  await adapter.command(prompt);
  const pendingSnapshot = await adapter.snapshot();

  assert.equal(queued.accepted, true);
  assert.equal(pendingSnapshot.activeSession.messages.length, 1);
  assert.deepEqual(pendingSnapshot.activeSession.messages[0], {
    id: "client-message-1",
    role: "user",
    text: "解释一下 VQE",
    delivery: "pending",
    sequence: null,
    createdAt: 1_002,
  });

  adapter.fixture.acknowledgePrompt(sessionId, "client-message-1", {
    sequence: 7,
  });
  const durableSnapshot = await adapter.snapshot();

  assert.equal(durableSnapshot.activeSession.messages.length, 1);
  assert.equal(durableSnapshot.activeSession.messages[0].id, "client-message-1");
  assert.equal(durableSnapshot.activeSession.messages[0].delivery, "durable");
  assert.equal(durableSnapshot.activeSession.messages[0].sequence, 7);

  // 较早快照不能被后续状态变化反向篡改。
  assert.equal(pendingSnapshot.activeSession.messages[0].delivery, "pending");
  assert.equal(pendingSnapshot.activeSession.messages[0].sequence, null);
  assert.equal(Object.isFrozen(pendingSnapshot.activeSession.messages), true);
});

test("snapshot revision 之后发生的更新可以完整 replay，revision 严格递增", async () => {
  const adapter = deterministicAdapter();
  const baseline = await adapter.snapshot();
  const controller = new AbortController();
  const iterator = adapter
    .events(baseline.revision, controller.signal)
    [Symbol.asyncIterator]();

  // 故意在第一次 iterator.next() 前更新，验证 snapshot -> subscribe 间没有丢失窗口。
  const created = await adapter.command({
    type: "new-session",
    commandId: "command-new-1",
  });
  assert.equal(created.accepted, true);
  const sessionId = created.result.sessionId;
  await adapter.command({
    type: "prompt",
    commandId: "command-prompt-1",
    sessionId,
    clientMessageId: "client-message-1",
    text: "hello",
  });
  adapter.fixture.running(sessionId, false);

  const events = [
    await nextEvent(iterator),
    await nextEvent(iterator),
    await nextEvent(iterator),
  ];
  controller.abort();
  await iterator.next();

  assert.deepEqual(
    events.map((event) => event.revision),
    [1, 2, 3],
  );
  assert.deepEqual(
    events.map((event) => event.cause.type),
    ["session-created", "prompt-pending", "running-changed"],
  );
  for (const event of events) {
    assert.equal(event.snapshot.revision, event.revision);
  }
});

test("业务失败只返回 rejection，不会把连接误标成离线", async () => {
  const adapter = deterministicAdapter();
  const before = await adapter.snapshot();
  const receipt = await adapter.command({
    type: "open-session",
    commandId: "command-open-missing",
    sessionId: "missing-session",
  });
  const after = await adapter.snapshot();

  assert.equal(receipt.accepted, false);
  assert.equal(receipt.error.code, "SESSION_NOT_FOUND");
  assert.equal(after.connection.status, "online");
  assert.equal(after.revision, before.revision);
});

test("cancel receipt 不会抢先覆盖 Host 的权威 running 状态", async () => {
  const adapter = deterministicAdapter();
  const created = await adapter.command({
    type: "new-session",
    commandId: "command-new-1",
  });
  assert.equal(created.accepted, true);
  const sessionId = created.result.sessionId;
  adapter.fixture.running(sessionId, true);

  const receipt = await adapter.command({
    type: "cancel",
    commandId: "command-cancel-1",
    sessionId,
  });
  const acceptedSnapshot = await adapter.snapshot();

  assert.equal(receipt.accepted, true);
  assert.equal(receipt.result.type, "cancel-requested");
  assert.equal(acceptedSnapshot.activeSession.running, true);

  adapter.fixture.running(sessionId, false);
  assert.equal((await adapter.snapshot()).activeSession.running, false);
});

test("AbortSignal 会关闭正在等待的事件流", async () => {
  const adapter = deterministicAdapter();
  const controller = new AbortController();
  const iterator = adapter.events(0, controller.signal)[Symbol.asyncIterator]();
  const pending = iterator.next();

  controller.abort();
  const result = await pending;
  assert.equal(result.done, true);

  // 关闭后的订阅者不会因后续 fixture 变化重新苏醒。
  adapter.fixture.disconnect("network down");
  assert.deepEqual(await iterator.next(), { done: true, value: undefined });
});

test("fixture driver 能投影 assistant、running 和连接恢复状态", async () => {
  const adapter = deterministicAdapter();
  const created = await adapter.command({
    type: "new-session",
    commandId: "command-new-1",
  });
  assert.equal(created.accepted, true);
  const sessionId = created.result.sessionId;

  const assistantRevision = adapter.fixture.assistant(
    sessionId,
    "计算已经完成",
    { messageId: "assistant-1", sequence: 2 },
  );
  const runningRevision = adapter.fixture.running(sessionId, true);
  const offlineRevision = adapter.fixture.disconnect("socket closed");
  const reconnectingRevision = adapter.fixture.reconnecting("retrying");
  const onlineRevision = adapter.fixture.reconnect();
  const snapshot = await adapter.snapshot();

  assert.deepEqual(
    [
      assistantRevision,
      runningRevision,
      offlineRevision,
      reconnectingRevision,
      onlineRevision,
    ],
    [2, 3, 4, 5, 6],
  );
  assert.equal(snapshot.connection.status, "online");
  assert.equal(snapshot.activeSession.running, true);
  assert.equal(snapshot.activeSession.messages[0].role, "assistant");
  assert.equal(snapshot.activeSession.messages[0].delivery, "durable");
});

function questionInteraction(sessionId) {
  return {
    kind: "questions",
    id: "interaction-local-1",
    sessionId,
    questions: [
      {
        id: "question-local-single",
        prompt: "选择一种方法",
        selection: "single",
        options: [
          { id: "option-local-a", label: "VQE" },
          { id: "option-local-b", label: "QAOA" },
        ],
      },
      {
        id: "question-local-multiple",
        prompt: "选择输出",
        selection: "multiple",
        options: [
          { id: "option-local-c", label: "能量" },
          { id: "option-local-d", label: "波函数" },
        ],
      },
    ],
  };
}

test("pending interaction 是 Host fixture 权威投影，回答 receipt 不抢先移除", async () => {
  const adapter = deterministicAdapter();
  const created = await adapter.command({
    type: "new-session",
    commandId: "new-interaction-session",
  });
  assert.equal(created.accepted, true);
  const sessionId = created.result.sessionId;
  const interaction = questionInteraction(sessionId);

  const upserted = adapter.fixture.upsertInteraction(interaction);
  assert.equal(upserted, 2);
  assert.equal(adapter.fixture.upsertInteraction(interaction), upserted);
  let snapshot = await adapter.snapshot();
  assert.equal(snapshot.sessions[0].pendingInteractionCount, 1);
  assert.deepEqual(snapshot.activeSession.pendingInteractions, [interaction]);

  const receipt = await adapter.command({
    type: "answer-interaction",
    commandId: "answer-valid-batch",
    sessionId,
    interactionId: interaction.id,
    response: {
      kind: "questions",
      action: "submit",
      // 输入顺序可以不同；合同按声明的问题顺序验证并重建。
      answers: [
        {
          questionId: "question-local-multiple",
          optionIds: ["option-local-c"],
          custom: "  密度矩阵  ",
        },
        {
          questionId: "question-local-single",
          optionIds: ["option-local-a"],
        },
      ],
    },
  });
  assert.equal(receipt.accepted, true);
  assert.equal(receipt.result.type, "interaction-response-accepted");
  snapshot = await adapter.snapshot();
  assert.equal(snapshot.activeSession.pendingInteractions.length, 1);

  const resolved = adapter.fixture.resolveInteraction(sessionId, interaction.id);
  assert.equal(resolved, 3);
  snapshot = await adapter.snapshot();
  assert.equal(snapshot.sessions[0].pendingInteractionCount, 0);
  assert.deepEqual(snapshot.activeSession.pendingInteractions, []);
});

test("question batch 严格校验完整性、成员关系和 single/multiple/custom 规则", async () => {
  const adapter = deterministicAdapter();
  const created = await adapter.command({
    type: "new-session",
    commandId: "new-validation-session",
  });
  assert.equal(created.accepted, true);
  const sessionId = created.result.sessionId;
  const interaction = questionInteraction(sessionId);
  adapter.fixture.upsertInteraction(interaction);

  const invalidAnswers = [
    [],
    [
      {
        questionId: "question-local-single",
        optionIds: ["option-local-a", "option-local-b"],
      },
      { questionId: "question-local-multiple", optionIds: ["option-local-c"] },
    ],
    [
      {
        questionId: "question-local-single",
        optionIds: ["option-local-a"],
        custom: "同时自定义",
      },
      { questionId: "question-local-multiple", optionIds: ["option-local-c"] },
    ],
    [
      { questionId: "question-local-single", optionIds: ["unknown-option"] },
      { questionId: "question-local-multiple", optionIds: ["option-local-c"] },
    ],
    [
      { questionId: "question-local-single", optionIds: [], custom: "   " },
      {
        questionId: "question-local-multiple",
        optionIds: ["option-local-c", "option-local-c"],
      },
    ],
  ];

  for (const [index, answers] of invalidAnswers.entries()) {
    const receipt = await adapter.command({
      type: "answer-interaction",
      commandId: `invalid-answer-${index}`,
      sessionId,
      interactionId: interaction.id,
      response: { kind: "questions", action: "submit", answers },
    });
    assert.equal(receipt.accepted, false);
    assert.equal(receipt.error.code, "INVALID_INTERACTION_ANSWER");
  }

  const mismatch = await adapter.command({
    type: "answer-interaction",
    commandId: "mismatched-answer-kind",
    sessionId,
    interactionId: interaction.id,
    response: { kind: "approval", decision: "deny" },
  });
  assert.equal(mismatch.accepted, false);
  assert.equal(mismatch.error.code, "INTERACTION_TYPE_MISMATCH");
});

test("in-memory convergence history 与慢 subscriber 都保持有界", async () => {
  const adapter = deterministicAdapter();
  for (let index = 0; index < 300; index += 1) {
    if (index % 2 === 0) adapter.fixture.disconnect(`offline-${index}`);
    else adapter.fixture.reconnect();
  }
  const latest = await adapter.snapshot();
  const controller = new AbortController();
  const iterator = adapter.events(0, controller.signal)[Symbol.asyncIterator]();
  const rebased = await nextEvent(iterator);
  assert.equal(rebased.cause.type, "projection-rebased");
  assert.equal(rebased.revision, latest.revision);
  assert.deepEqual(rebased.snapshot, latest);

  // Leave one event yielded, then abort without another next/return. The
  // adapter must actively unregister this paused subscriber.
  controller.abort();
  await iterator.return();
});

test("in-memory approval 在缺少完整 disclosure 时 fail closed", async () => {
  const adapter = deterministicAdapter();
  const created = await adapter.command({
    type: "new-session",
    commandId: "approval-session",
  });
  const sessionId = created.result.sessionId;
  adapter.fixture.upsertInteraction({
    kind: "approval",
    id: "approval-local",
    sessionId,
    actionLabel: "bash",
    explanation: "缺少完整参数",
  });
  const allowed = await adapter.command({
    type: "answer-interaction",
    commandId: "unsafe-allow",
    sessionId,
    interactionId: "approval-local",
    response: { kind: "approval", decision: "allow-once" },
  });
  assert.equal(allowed.accepted, false);
  assert.equal(allowed.error.code, "APPROVAL_CONTEXT_UNAVAILABLE");
  assert.equal(
    (await adapter.snapshot()).activeSession.pendingInteractions.length,
    1,
  );
});

test("runtimeError 是 session occurrence，重复文案仍有新身份且 running 清旧错误", async () => {
  const adapter = deterministicAdapter();
  const created = await adapter.command({
    type: "new-session",
    commandId: "runtime-error-session",
  });
  const sessionId = created.result.sessionId;

  const firstRevision = adapter.fixture.runtimeError(sessionId, "执行失败");
  const first = await adapter.snapshot();
  assert.equal(first.activeSession.runtimeError.message, "执行失败");
  assert.equal(first.connection.detail, undefined);

  const secondRevision = adapter.fixture.runtimeError(sessionId, "执行失败");
  const second = await adapter.snapshot();
  assert(secondRevision > firstRevision);
  assert.notEqual(
    second.activeSession.runtimeError.id,
    first.activeSession.runtimeError.id,
  );

  adapter.fixture.running(sessionId, true);
  const running = await adapter.snapshot();
  assert.equal(running.activeSession.runtimeError, undefined);
});
