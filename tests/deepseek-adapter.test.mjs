import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import {
  DeepSeekHarnessAdapterCore,
  MAX_UNRESOLVED_PROMPT_RESERVATIONS,
} from "../src/harness/deepseek-adapter-core.ts";
import { HarnessTransportError } from "../src/harness/transport.ts";

class FakeHarnessTransport {
  constructor({ sessions = [], conversations = {} } = {}) {
    this.sessions = sessions.map((session) => ({ ...session }));
    this.conversations = new Map(
      Object.entries(conversations).map(([sessionId, snapshot]) => [
        sessionId,
        structuredClone(snapshot),
      ]),
    );
    this.calls = {
      listSessions: 0,
      createSession: 0,
      getSnapshot: [],
      prompt: [],
      cancel: [],
      respondToInteraction: [],
    };
    this.eventsQueue = [];
    this.eventWaiters = [];
    this.nextSession = 0;
    this.promptHook = undefined;
    this.failSnapshots = 0;
    this.eventSubscriptions = 0;
    this.respondError = undefined;
    this.respondHook = undefined;
    this.createHook = undefined;
    this.listHook = undefined;
    this.snapshotHook = undefined;
    this.eventSubscriptionHook = undefined;
    this.eventYieldHook = undefined;
    this.autoOpenEvents = true;
    this.nextPromptRpcId = 0;
  }

  async listSessions(signal) {
    signal?.throwIfAborted();
    this.calls.listSessions += 1;
    if (this.listHook) {
      return structuredClone(await this.listHook());
    }
    return structuredClone(this.sessions);
  }

  async createSession(requestedSessionId, signal) {
    signal?.throwIfAborted();
    this.calls.createSession += 1;
    if (this.createHook) {
      return this.createHook(requestedSessionId, signal);
    }
    this.nextSession += 1;
    const sessionId = requestedSessionId ?? `created-${this.nextSession}`;
    this.sessions.unshift({
      id: sessionId,
      title: "新对话",
      updatedAt: 100 + this.nextSession,
      running: false,
      blank: true,
    });
    this.conversations.set(sessionId, {
      sessionId,
      messages: [],
      lastSeq: -1,
      running: false,
    });
    return sessionId;
  }

  async getSnapshot(sessionId, signal) {
    signal?.throwIfAborted();
    this.calls.getSnapshot.push(sessionId);
    if (this.snapshotHook) {
      const hooked = await this.snapshotHook(sessionId);
      if (hooked !== undefined) return structuredClone(hooked);
    }
    if (this.failSnapshots > 0) {
      this.failSnapshots -= 1;
      throw new Error("temporary history failure");
    }
    const snapshot = this.conversations.get(sessionId);
    if (!snapshot) {
      throw new Error(`session not found: ${sessionId}`);
    }
    return structuredClone(snapshot);
  }

  startPrompt(sessionId, text, signal) {
    signal?.throwIfAborted();
    this.calls.prompt.push({ sessionId, text });
    const rpcId = `prompt-rpc-${++this.nextPromptRpcId}`;
    return {
      rpcId,
      completion: Promise.resolve(
        this.promptHook?.({ sessionId, text, rpcId }),
      ).then(() => undefined),
    };
  }

  async cancel(sessionId, signal) {
    signal?.throwIfAborted();
    this.calls.cancel.push(sessionId);
  }

  async respondToInteraction(response, signal) {
    signal?.throwIfAborted();
    this.calls.respondToInteraction.push(structuredClone(response));
    if (this.respondError) {
      throw this.respondError;
    }
    await this.respondHook?.(response, signal);
  }

  async *events(signal) {
    this.eventSubscriptions += 1;
    this.eventSubscriptionHook?.(this.eventSubscriptions);
    if (this.autoOpenEvents && !signal.aborted) {
      const opened = { type: "connection-state", status: "online" };
      this.eventYieldHook?.(opened);
      yield opened;
    }
    while (!signal.aborted) {
      const event = this.eventsQueue.shift();
      if (event) {
        this.eventYieldHook?.(event);
        yield event;
        continue;
      }

      const result = await new Promise((resolve) => {
        const waiter = { resolve };
        const handleAbort = () => {
          this.eventWaiters = this.eventWaiters.filter(
            (candidate) => candidate !== waiter,
          );
          resolve(undefined);
        };
        waiter.handleAbort = handleAbort;
        this.eventWaiters.push(waiter);
        signal.addEventListener("abort", handleAbort, { once: true });
      });
      if (result === undefined) {
        return;
      }
      this.eventYieldHook?.(result);
      yield result;
    }
  }

  emit(event) {
    const waiter = this.eventWaiters.shift();
    if (waiter) {
      waiter.resolve(event);
      return;
    }
    this.eventsQueue.push(event);
  }

  setConversation(sessionId, snapshot) {
    this.conversations.set(sessionId, structuredClone(snapshot));
  }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((settle, fail) => {
    resolve = settle;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function waitForTransportYield(transport, predicate) {
  const reached = deferred();
  const previous = transport.eventYieldHook;
  transport.eventYieldHook = (event) => {
    previous?.(event);
    if (predicate(event)) reached.resolve();
  };
  return reached.promise.finally(() => {
    if (transport.eventYieldHook !== previous) {
      transport.eventYieldHook = previous;
    }
  });
}

function existingSession(overrides = {}) {
  return {
    id: "session-1",
    title: "VQE 基线",
    updatedAt: 20,
    running: false,
    blank: false,
    ...overrides,
  };
}

function existingConversation(overrides = {}) {
  return {
    sessionId: "session-1",
    messages: [
      { id: "user-1", seq: 0, role: "user", text: "旧问题" },
      { id: "assistant-1", seq: 1, role: "assistant", text: "旧答案" },
    ],
    lastSeq: 1,
    running: false,
    ...overrides,
  };
}

const automaticRuntimeOwners = new Set();

afterEach(() => {
  for (const owner of automaticRuntimeOwners) owner.controller.abort();
  automaticRuntimeOwners.clear();
});

async function ownRuntime(adapter) {
  const controller = new AbortController();
  const iterator = adapter.events(null, controller.signal)[Symbol.asyncIterator]();
  const bootstrap = await nextEvent(iterator);
  const owner = { controller, iterator };
  automaticRuntimeOwners.add(owner);
  return { owner, bootstrap };
}

function configuredAdapter(overrides = {}, adapterOptions = {}) {
  let now = 1_000;
  const transport = new FakeHarnessTransport({
    sessions: [existingSession()],
    conversations: { "session-1": existingConversation() },
    ...overrides,
  });
  const adapter = new DeepSeekHarnessAdapterCore({
    transport,
    clock: () => ++now,
    ...adapterOptions,
  });
  // Most legacy command tests focus on command semantics, not runtime
  // ownership. Give them a realistic long-lived events owner lazily at the
  // first command; dedicated lifecycle tests instantiate the core directly.
  const command = adapter.command.bind(adapter);
  let runtimeOwner;
  adapter.command = async (...args) => {
    runtimeOwner ??= ownRuntime(adapter);
    await runtimeOwner;
    return command(...args);
  };
  return { adapter, transport };
}

async function nextEvent(iterator) {
  const result = await Promise.race([
    iterator.next(),
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("timed out waiting for adapter event")),
        1_000,
      );
    }),
  ]);
  assert.equal(result.done, false);
  return result.value;
}

async function subscribe(adapter) {
  const controller = new AbortController();
  const iterator = adapter
    .events(null, controller.signal)
    [Symbol.asyncIterator]();
  // Start with the stream-owned full bootstrap, then expose only subsequent
  // convergence events to legacy tests. This also deterministically waits for
  // the live generation; no timer guesses are involved.
  const bootstrap = await iterator.next();
  assert.equal(bootstrap.done, false);
  const pending = iterator.next();
  return { controller, iterator, pending };
}

test("baseline 读取 session 目录与当前 history，并返回深度不可变快照", async () => {
  const { adapter, transport } = configuredAdapter();

  const snapshot = await adapter.snapshot();

  assert.equal(transport.calls.listSessions, 1);
  assert.deepEqual(transport.calls.getSnapshot, ["session-1"]);
  assert.equal(
    snapshot.connection.status,
    "reconnecting",
    "point-in-time HTTP baseline cannot claim a live runtime",
  );
  assert.equal(snapshot.activeSession.id, "session-1");
  assert.deepEqual(
    snapshot.activeSession.messages.map(({ role, text, delivery, sequence }) => ({
      role,
      text,
      delivery,
      sequence,
    })),
    [
      { role: "user", text: "旧问题", delivery: "durable", sequence: 0 },
      {
        role: "assistant",
        text: "旧答案",
        delivery: "durable",
        sequence: 1,
      },
    ],
  );
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.sessions), true);
  assert.equal(Object.isFrozen(snapshot.activeSession), true);
  assert.equal(Object.isFrozen(snapshot.activeSession.messages), true);
  assert.equal(Object.isFrozen(snapshot.activeSession.messages[0]), true);
});

test("new/open/prompt/cancel 只经 Transport 执行，cancel 不抢先改 running", async () => {
  const { adapter, transport } = configuredAdapter();
  await adapter.snapshot();

  const created = await adapter.command({
    type: "new-session",
    commandId: "new-1",
    title: "量子新实验",
  });
  assert.equal(created.accepted, true);
  assert.equal(created.result.type, "session-created");
  assert.equal(transport.calls.createSession, 1);

  const opened = await adapter.command({
    type: "open-session",
    commandId: "open-1",
    sessionId: "session-1",
  });
  assert.equal(opened.accepted, true);
  assert.equal((await adapter.snapshot()).activeSession.id, "session-1");

  const queued = await adapter.command({
    type: "prompt",
    commandId: "prompt-1",
    sessionId: "session-1",
    clientMessageId: "client-1",
    text: "  继续计算  ",
  });
  assert.equal(queued.accepted, true);
  assert.deepEqual(transport.calls.prompt, [
    { sessionId: "session-1", text: "继续计算" },
  ]);
  assert.equal((await adapter.snapshot()).activeSession.running, true);

  const cancelled = await adapter.command({
    type: "cancel",
    commandId: "cancel-1",
    sessionId: "session-1",
  });
  assert.equal(cancelled.accepted, true);
  assert.deepEqual(transport.calls.cancel, ["session-1"]);
  assert.equal((await adapter.snapshot()).activeSession.running, true);
});

test("CommandId 重放不重复调用远端，同 ID 不同意图返回冲突", async () => {
  const { adapter, transport } = configuredAdapter();
  const command = {
    type: "prompt",
    commandId: "prompt-idempotent",
    sessionId: "session-1",
    clientMessageId: "client-idempotent",
    text: "计算能量",
  };

  const first = await adapter.command(command);
  const replay = await adapter.command(command);
  const conflict = await adapter.command({ ...command, text: "改变意图" });

  assert.deepEqual(replay, first);
  assert.equal(transport.calls.prompt.length, 1);
  assert.equal(conflict.accepted, false);
  assert.equal(conflict.error.code, "COMMAND_ID_CONFLICT");
  assert(
    (await adapter.snapshot()).revision >= first.revision,
    "the long-lived runtime may concurrently publish convergence events",
  );
});

test("打开当前会话时若 history 已变化，也会发布新 revision", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  transport.setConversation(
    "session-1",
    existingConversation({
      messages: [
        ...existingConversation().messages,
        { id: "assistant-late", seq: 2, role: "assistant", text: "稍后到达" },
      ],
      lastSeq: 2,
    }),
  );

  const receipt = await adapter.command({
    type: "open-session",
    commandId: "open-refresh",
    sessionId: "session-1",
  });
  const snapshot = await adapter.snapshot();

  assert.equal(receipt.accepted, true);
  assert(receipt.revision > baseline.revision);
  assert(snapshot.revision >= receipt.revision);
  assert.equal(snapshot.activeSession.messages.at(-1).id, "assistant-late");
});

test("snapshot 之后、events 开始前的变化最终收敛到最新完整投影", async () => {
  const { adapter } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const created = await adapter.command({
    type: "new-session",
    commandId: "new-replay",
  });
  assert.equal(created.accepted, true);
  await adapter.command({
    type: "open-session",
    commandId: "open-replay",
    sessionId: "session-1",
  });

  const controller = new AbortController();
  const iterator = adapter
    .events(baseline.revision, controller.signal)
    [Symbol.asyncIterator]();
  const targetRevision = (await adapter.snapshot()).revision;
  let latest;
  while (!latest || latest.revision < targetRevision) {
    latest = await nextEvent(iterator);
  }
  controller.abort();
  await iterator.next();

  assert.equal(latest.revision, targetRevision);
  assert.equal(latest.snapshot.revision, targetRevision);
  assert.equal(latest.snapshot.activeSession.id, "session-1");
});

test("durable sourceRpcId 精确匹配会将 pending 与 echo 合并为同一逻辑消息", async () => {
  const { adapter, transport } = configuredAdapter();
  const queued = await adapter.command({
    type: "prompt",
    commandId: "prompt-reconcile",
    sessionId: "session-1",
    clientMessageId: "client-reconcile",
    text: "计算基态能量",
  });
  assert.equal(queued.accepted, true);

  const subscription = await subscribe(adapter, queued.revision);
  transport.setConversation(
    "session-1",
    existingConversation({
      messages: [
        ...existingConversation().messages,
        {
          id: "harness-generated-id",
          seq: 2,
          role: "user",
          text: "计算基态能量",
          sourceRpcId: "prompt-rpc-1",
        },
      ],
      lastSeq: 2,
      running: true,
    }),
  );
  transport.emit({
    type: "session-changed",
    sessionId: "session-1",
    eventType: "user/message",
    seq: 2,
  });

  const event = await subscription.pending;
  subscription.controller.abort();
  await subscription.iterator.next();

  assert.equal(event.done, false);
  assert.equal(event.value.cause.type, "prompt-durable");
  const messages = event.value.snapshot.activeSession.messages;
  const reconciled = messages.filter(
    (message) => message.id === "client-reconcile",
  );
  assert.equal(reconciled.length, 1);
  assert.equal(reconciled[0].delivery, "durable");
  assert.equal(reconciled[0].sequence, 2);
  assert.equal(
    messages.some((message) => message.id === "harness-generated-id"),
    false,
  );
});

test("单个 pending 不会吞并另一 tab 的同文本不同 rpc 消息", async () => {
  const { adapter, transport } = configuredAdapter();
  const gate = deferred();
  transport.promptHook = () => gate.promise;
  const command = adapter.command({
    type: "prompt",
    commandId: "prompt-external-same-text",
    sessionId: "session-1",
    clientMessageId: "client-external-same-text",
    text: "相同文本",
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  transport.setConversation("session-1", existingConversation({
    messages: [
      ...existingConversation().messages,
      {
        id: "external-message",
        seq: 2,
        role: "user",
        text: "相同文本",
        sourceRpcId: "other-tab-rpc",
      },
    ],
    lastSeq: 2,
  }));
  transport.emit({
    type: "session-changed",
    sessionId: "session-1",
    eventType: "user/message",
    seq: 2,
  });
  const external = await subscription.pending;
  assert.equal(external.done, false);
  assert.equal(
    external.value.snapshot.activeSession.messages.at(-1).id,
    "external-message",
  );
  gate.resolve();
  await command;
  const finalMessages = (await adapter.snapshot()).activeSession.messages;
  assert(finalMessages.some((message) => message.id === "external-message"));
  assert(finalMessages.some((message) => message.id === "client-external-same-text"));

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("两个相同文本 pending 时不猜测 durable 身份，避免错误吞并", async () => {
  const { adapter, transport } = configuredAdapter();
  await adapter.command({
    type: "prompt",
    commandId: "prompt-ambiguous-1",
    sessionId: "session-1",
    clientMessageId: "client-ambiguous-1",
    text: "再算一次",
  });
  const second = await adapter.command({
    type: "prompt",
    commandId: "prompt-ambiguous-2",
    sessionId: "session-1",
    clientMessageId: "client-ambiguous-2",
    text: "再算一次",
  });
  assert.equal(second.accepted, true);

  const subscription = await subscribe(adapter, second.revision);
  transport.setConversation(
    "session-1",
    existingConversation({
      messages: [
        ...existingConversation().messages,
        { id: "server-ambiguous", seq: 2, role: "user", text: "再算一次" },
      ],
      lastSeq: 2,
      running: true,
    }),
  );
  transport.emit({
    type: "session-changed",
    sessionId: "session-1",
    eventType: "user/message",
    seq: 2,
  });

  // 没有安全的 prompt-durable cause，但快照在后续 Host 状态事件中仍保留三者。
  transport.emit({
    type: "session-status",
    sessionId: "session-1",
    running: false,
  });
  const event = await subscription.pending;
  subscription.controller.abort();
  await subscription.iterator.next();

  assert.equal(event.done, false);
  const messages = event.value.snapshot.activeSession.messages;
  assert.equal(
    messages.filter((message) => message.text === "再算一次").length,
    3,
  );
  assert.deepEqual(
    messages
      .filter((message) => message.text === "再算一次")
      .map((message) => message.delivery)
      .sort(),
    ["durable", "pending", "pending"],
  );
});

test("连接、Host running 与 assistant session event 折叠为稳定 UI events", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);

  transport.emit({ type: "connection-state", status: "reconnecting" });
  const reconnecting = await subscription.pending;
  assert.equal(reconnecting.done, false);
  assert.equal(reconnecting.value.cause.type, "connection-changed");
  assert.equal(reconnecting.value.snapshot.connection.status, "reconnecting");

  const waitingRunning = subscription.iterator.next();
  transport.emit({
    type: "session-status",
    sessionId: "session-1",
    running: true,
  });
  const running = await nextEvent({ next: () => waitingRunning });
  assert.equal(running.cause.type, "running-changed");
  assert.equal(running.snapshot.activeSession.running, true);

  transport.setConversation(
    "session-1",
    existingConversation({
      messages: [
        ...existingConversation().messages,
        { id: "assistant-2", seq: 2, role: "assistant", text: "新答案" },
      ],
      lastSeq: 2,
      running: true,
    }),
  );
  const waitingAssistant = subscription.iterator.next();
  transport.emit({
    type: "session-changed",
    sessionId: "session-1",
    eventType: "assistant/message",
    seq: 2,
  });
  const assistant = await nextEvent({ next: () => waitingAssistant });
  assert.equal(assistant.cause.type, "assistant-message");
  assert.equal(assistant.snapshot.activeSession.messages.at(-1).text, "新答案");

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("online 重基线失败后受控退避并自动恢复，不让现有订阅永久卡住", async () => {
  const { adapter, transport } = configuredAdapter({}, { retryDelay: () => 0 });
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  transport.failSnapshots = 1;

  transport.emit({ type: "connection-state", status: "online" });
  const offlineResult = await subscription.pending;
  const reconnecting = await nextEvent(subscription.iterator);
  const online = await nextEvent(subscription.iterator);

  assert.equal(offlineResult.done, false);
  assert.equal(offlineResult.value.snapshot.connection.status, "offline");
  assert.equal(reconnecting.snapshot.connection.status, "reconnecting");
  assert.equal(online.snapshot.connection.status, "online");
  assert.equal(transport.eventSubscriptions, 2);

  const listCallsAfterRecovery = transport.calls.listSessions;
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(
    transport.calls.listSessions,
    listCallsAfterRecovery,
    "恢复后不能无事件 busy-loop",
  );

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("初始目录失败时首代先恢复 baseline，再保留早到的 interaction", async () => {
  const { adapter, transport } = configuredAdapter(
    {},
    { retryDelay: () => 0 },
  );
  const recoveryListStarted = deferred();
  const recoveryList = deferred();
  let listAttempt = 0;
  transport.listHook = () => {
    listAttempt += 1;
    if (listAttempt === 1) {
      throw new Error("initial directory unavailable");
    }
    if (listAttempt === 2) {
      recoveryListStarted.resolve();
      return recoveryList.promise;
    }
    return [existingSession()];
  };

  const offline = await adapter.snapshot();
  assert.equal(offline.connection.status, "offline");
  assert.deepEqual(offline.sessions, []);

  const controller = new AbortController();
  const iterator = adapter
    .events(offline.revision, controller.signal)
    [Symbol.asyncIterator]();
  let next = iterator.next();
  await recoveryListStarted.promise;
  assert.equal(
    transport.eventSubscriptions,
    1,
    "stream-owned bootstrap must establish the live cut before directory I/O",
  );

  transport.emit(approvalRequest());
  transport.emit({ type: "connection-state", status: "online" });
  recoveryList.resolve([existingSession()]);

  let interactionEvent;
  while (!interactionEvent) {
    const result = await next;
    assert.equal(result.done, false);
    if (
      result.value.snapshot.activeSession?.pendingInteractions.length === 1
    ) {
      interactionEvent = result.value;
      break;
    }
    next = iterator.next();
  }
  assert.equal(transport.eventSubscriptions, 1);
  assert.equal(
    interactionEvent.snapshot.activeSession.pendingInteractions[0].kind,
    "approval",
  );
  assert.equal(
    (await adapter.snapshot()).activeSession.pendingInteractions.length,
    1,
  );

  controller.abort();
  await iterator.next();
});

test("空目录中 interaction 早于 host added 时按原序缓冲并在确认后投影", async () => {
  const { adapter, transport } = configuredAdapter({ sessions: [] });
  const unknownRefreshStarted = deferred();
  const unknownRefresh = deferred();
  const confirmingRefreshStarted = deferred();
  let listAttempt = 0;
  transport.listHook = () => {
    listAttempt += 1;
    if (listAttempt === 1) return [];
    if (listAttempt === 2) {
      unknownRefreshStarted.resolve();
      return unknownRefresh.promise;
    }
    confirmingRefreshStarted.resolve();
    return [existingSession()];
  };

  const baseline = await adapter.snapshot();
  assert.deepEqual(baseline.sessions, []);
  const controller = new AbortController();
  const iterator = adapter
    .events(baseline.revision, controller.signal)
    [Symbol.asyncIterator]();
  let next = iterator.next();
  transport.emit(approvalRequest());
  await unknownRefreshStarted.promise;
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "added",
  });
  unknownRefresh.resolve([]);
  await confirmingRefreshStarted.promise;

  let interactionEvent;
  while (!interactionEvent) {
    const result = await next;
    assert.equal(result.done, false);
    if (
      result.value.snapshot.activeSession?.pendingInteractions.length === 1
    ) {
      interactionEvent = result.value;
      break;
    }
    next = iterator.next();
  }
  assert.equal(
    interactionEvent.snapshot.activeSession.pendingInteractions[0].kind,
    "approval",
  );

  controller.abort();
  await iterator.next();
});

test("buffered interaction 在 session 确认前 resolved 后不得复活", async () => {
  const { adapter, transport } = configuredAdapter({ sessions: [] });
  const unknownRefreshStarted = deferred();
  const unknownRefresh = deferred();
  const confirmingRefreshStarted = deferred();
  let listAttempt = 0;
  transport.listHook = () => {
    listAttempt += 1;
    if (listAttempt === 1) return [];
    if (listAttempt === 2) {
      unknownRefreshStarted.resolve();
      return unknownRefresh.promise;
    }
    confirmingRefreshStarted.resolve();
    return [existingSession()];
  };

  const baseline = await adapter.snapshot();
  const controller = new AbortController();
  const iterator = adapter
    .events(baseline.revision, controller.signal)
    [Symbol.asyncIterator]();
  let next = iterator.next();
  transport.emit(approvalRequest());
  await unknownRefreshStarted.promise;
  transport.emit({
    type: "interaction-resolved",
    sessionId: "session-1",
    resolution: { kind: "approval", approvalId: "approval-private-id" },
  });
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "added",
  });
  unknownRefresh.resolve([]);
  await confirmingRefreshStarted.promise;

  let confirmed;
  while (!confirmed) {
    const result = await next;
    assert.equal(result.done, false);
    if (result.value.snapshot.sessions.length === 1) {
      confirmed = result.value.snapshot;
      break;
    }
    next = iterator.next();
  }
  assert.deepEqual(confirmed.activeSession.pendingInteractions, []);
  assert.deepEqual(
    (await adapter.snapshot()).activeSession.pendingInteractions,
    [],
  );

  controller.abort();
  await iterator.next();
});

test("unknown session-status 使在途旧目录失效，并以 status 后的新 cut 恢复 running", async () => {
  const { adapter, transport } = configuredAdapter({
    sessions: [],
    conversations: {
      "session-1": existingConversation({ running: true }),
    },
  });
  const staleListStarted = deferred();
  const staleList = deferred();
  const freshListStarted = deferred();
  let listAttempt = 0;
  transport.listHook = () => {
    listAttempt += 1;
    if (listAttempt === 1) return [];
    if (listAttempt === 2) {
      staleListStarted.resolve();
      return staleList.promise;
    }
    freshListStarted.resolve();
    return [existingSession({ running: true })];
  };

  const baseline = await adapter.snapshot();
  const controller = new AbortController();
  const iterator = adapter
    .events(baseline.revision, controller.signal)
    [Symbol.asyncIterator]();
  let next = iterator.next();
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "added",
  });
  await staleListStarted.promise;
  const statusQueued = waitForTransportYield(
    transport,
    (event) => event.eventType === "status-fold-barrier",
  );
  transport.emit({
    type: "session-status",
    sessionId: "session-1",
    running: true,
  });
  transport.emit({
    type: "session-changed",
    sessionId: "barrier-session",
    eventType: "status-fold-barrier",
  });
  await statusQueued;
  staleList.resolve([existingSession({ running: false })]);
  await freshListStarted.promise;

  let recovered;
  while (!recovered) {
    const result = await next;
    assert.equal(result.done, false);
    if (result.value.snapshot.activeSession?.running === true) {
      recovered = result.value.snapshot;
      break;
    }
    next = iterator.next();
  }
  assert.equal(recovered.activeSession.id, "session-1");
  assert.equal((await adapter.snapshot()).activeSession.running, true);

  controller.abort();
  await iterator.next();
});

test("unknown status 后收到 removed 时，post-event 目录 absence 保持移除", async () => {
  const survivor = existingSession({
    id: "session-survivor",
    title: "存活会话",
  });
  const { adapter, transport } = configuredAdapter({
    sessions: [],
    conversations: {
      "session-1": existingConversation({ running: true }),
      "session-survivor": {
        sessionId: "session-survivor",
        messages: [],
        lastSeq: -1,
        running: false,
      },
    },
  });
  const staleListStarted = deferred();
  const staleList = deferred();
  const retryListStarted = deferred();
  const retryList = deferred();
  let listAttempt = 0;
  transport.listHook = () => {
    listAttempt += 1;
    if (listAttempt === 1) return [];
    if (listAttempt === 2) {
      staleListStarted.resolve();
      return staleList.promise;
    }
    retryListStarted.resolve();
    return retryList.promise;
  };

  const baseline = await adapter.snapshot();
  const controller = new AbortController();
  const iterator = adapter
    .events(baseline.revision, controller.signal)
    [Symbol.asyncIterator]();
  let next = iterator.next();
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "added",
  });
  await staleListStarted.promise;
  const removalQueued = waitForTransportYield(
    transport,
    (event) => event.eventType === "removal-fold-barrier",
  );
  transport.emit({
    type: "session-status",
    sessionId: "session-1",
    running: true,
  });
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "removed",
  });
  transport.emit({
    type: "session-changed",
    sessionId: "barrier-session",
    eventType: "removal-fold-barrier",
  });
  await removalQueued;

  staleList.resolve([existingSession({ running: false })]);
  await retryListStarted.promise;
  retryList.resolve([survivor]);

  let committed;
  while (!committed) {
    const result = await next;
    assert.equal(result.done, false);
    if (
      result.value.snapshot.sessions.some(
        (session) => session.id === "session-survivor",
      )
    ) {
      committed = result.value.snapshot;
      break;
    }
    next = iterator.next();
  }
  assert.equal(
    committed.sessions.some((session) => session.id === "session-1"),
    false,
  );
  assert.equal(
    (await adapter.snapshot()).sessions.some(
      (session) => session.id === "session-1",
    ),
    false,
  );

  controller.abort();
  await iterator.next();
});

test("live removed 后 post-event 目录仍含 durable session 时恢复为 cold", async () => {
  const { adapter, transport } = configuredAdapter({
    sessions: [existingSession({ running: true })],
    conversations: {
      "session-1": existingConversation({ running: true }),
    },
  });
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  const postRemovalListStarted = deferred();
  const postRemovalList = deferred();
  transport.listHook = () => {
    postRemovalListStarted.resolve();
    return postRemovalList.promise;
  };

  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "removed",
  });
  const detached = await subscription.pending;
  assert.equal(detached.value.snapshot.sessions.length, 0);
  await postRemovalListStarted.promise;
  postRemovalList.resolve([existingSession({ running: true })]);

  let restored;
  while (!restored) {
    const result = await subscription.iterator.next();
    assert.equal(result.done, false);
    if (result.value.snapshot.sessions.length === 1) {
      restored = result.value.snapshot;
    }
  }
  assert.equal(restored.activeSession.id, "session-1");
  assert.equal(restored.activeSession.running, true);
  assert.equal((await adapter.snapshot()).activeSession.running, true);

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("removed 发生于旧 list 在途时，旧 cut 不复活且 post-event list 裁决", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  const staleListStarted = deferred();
  const staleList = deferred();
  const postRemovalListStarted = deferred();
  const postRemovalList = deferred();
  let listAttempt = 0;
  transport.listHook = () => {
    listAttempt += 1;
    if (listAttempt === 1) {
      staleListStarted.resolve();
      return staleList.promise;
    }
    postRemovalListStarted.resolve();
    return postRemovalList.promise;
  };

  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "updated",
  });
  await staleListStarted.promise;
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "removed",
  });
  const detached = await subscription.pending;
  assert.equal(detached.value.snapshot.sessions.length, 0);

  staleList.resolve([existingSession({ title: "stale pre-removal cut" })]);
  await postRemovalListStarted.promise;
  assert.equal((await adapter.snapshot()).sessions.length, 0);
  postRemovalList.resolve([
    existingSession({ title: "durable post-removal cut", running: true }),
  ]);

  let restored;
  while (!restored) {
    const result = await subscription.iterator.next();
    assert.equal(result.done, false);
    const session = result.value.snapshot.sessions[0];
    if (session?.title === "durable post-removal cut") restored = session;
  }
  assert.equal(restored.running, true);

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("removed 后同 ID 新 interaction 会缓冲到 added/list 确认后恢复", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  const removalListStarted = deferred();
  const removalList = deferred();
  const confirmingListStarted = deferred();
  let listAttempt = 0;
  transport.listHook = () => {
    listAttempt += 1;
    if (listAttempt === 1) {
      removalListStarted.resolve();
      return removalList.promise;
    }
    confirmingListStarted.resolve();
    return [existingSession()];
  };

  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "removed",
  });
  const detached = await subscription.pending;
  assert.equal(detached.value.snapshot.sessions.length, 0);
  await removalListStarted.promise;
  transport.emit(
    approvalRequest({
      rpcId: "rpc-resumed-session",
      request: {
        ...approvalRequest().request,
        approvalId: "approval-resumed-session",
        toolName: "恢复后的新审批",
      },
    }),
  );
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "added",
  });
  removalList.resolve([]);
  await confirmingListStarted.promise;

  let resumed;
  while (!resumed) {
    const result = await subscription.iterator.next();
    assert.equal(result.done, false);
    const interaction =
      result.value.snapshot.activeSession?.pendingInteractions[0];
    if (interaction?.actionLabel === "恢复后的新审批") resumed = interaction;
  }
  assert.equal(resumed.kind, "approval");

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("removed 清除事件前已缓冲的 interaction，post-event list 不得复活旧卡", async () => {
  const { adapter, transport } = configuredAdapter({ sessions: [] });
  const baseline = await adapter.snapshot();
  const controller = new AbortController();
  const iterator = adapter
    .events(baseline.revision, controller.signal)
    [Symbol.asyncIterator]();
  let next = iterator.next();
  const staleListStarted = deferred();
  const staleList = deferred();
  const postRemovalListStarted = deferred();
  let listAttempt = 0;
  transport.listHook = () => {
    listAttempt += 1;
    if (listAttempt === 1) {
      staleListStarted.resolve();
      return staleList.promise;
    }
    postRemovalListStarted.resolve();
    return [existingSession()];
  };

  transport.emit(approvalRequest({ rpcId: "rpc-buffered-before-remove" }));
  await staleListStarted.promise;
  const removalQueued = waitForTransportYield(
    transport,
    (event) => event.eventType === "buffer-removal-barrier",
  );
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "removed",
  });
  transport.emit({
    type: "session-changed",
    sessionId: "barrier-session",
    eventType: "buffer-removal-barrier",
  });
  await removalQueued;

  staleList.resolve([existingSession()]);
  await postRemovalListStarted.promise;
  let restored;
  while (!restored) {
    const result = await next;
    assert.equal(result.done, false);
    if (
      result.value.snapshot.sessions.length === 1 &&
      result.value.snapshot.activeSession.pendingInteractions.length === 0
    ) {
      restored = result.value.snapshot;
      break;
    }
    next = iterator.next();
  }
  assert.deepEqual(restored.activeSession.pendingInteractions, []);

  controller.abort();
  await iterator.next();
});

test("unknown-session interaction buffer 超界时 fail closed 并重建 generation", async () => {
  const { adapter, transport } = configuredAdapter(
    { sessions: [] },
    { retryDelay: () => 60_000 },
  );
  const baseline = await adapter.snapshot();
  const controller = new AbortController();
  const iterator = adapter
    .events(baseline.revision, controller.signal)
    [Symbol.asyncIterator]();
  const bootstrap = await iterator.next();
  assert.equal(bootstrap.done, false);
  assert.equal(bootstrap.value.snapshot.connection.status, "online");
  const pending = iterator.next();

  for (let index = 0; index <= 128; index += 1) {
    const event = approvalRequest({
      sessionId: "session-missing",
      rpcId: `rpc-buffer-${index}`,
    });
    transport.emit({
      ...event,
      request: {
        ...event.request,
        sessionId: "session-missing",
        approvalId: `approval-buffer-${index}`,
      },
    });
  }

  const failed = await pending;
  assert.equal(failed.done, false);
  assert.equal(failed.value.snapshot.connection.status, "offline");
  assert.deepEqual(failed.value.snapshot.sessions, []);
  assert.equal(transport.eventSubscriptions, 1);

  controller.abort();
  await iterator.next();
});

test("recovery baseline 被并发目录提交标脏时先重试，不提前打开 stream", async () => {
  const { adapter, transport } = configuredAdapter(
    {},
    { retryDelay: () => 0 },
  );
  const baseline = await adapter.snapshot();
  const recoveredStreamStarted = deferred();
  transport.eventSubscriptionHook = (count) => {
    if (count === 2) recoveredStreamStarted.resolve();
  };
  const subscription = await subscribe(adapter, baseline.revision);

  const createStarted = deferred();
  const createReceipt = deferred();
  let createdId;
  transport.createHook = (sessionId) => {
    createdId = sessionId;
    createStarted.resolve();
    return createReceipt.promise;
  };
  const creating = adapter.command({
    type: "new-session",
    commandId: "create-during-recovery-baseline",
  });
  await createStarted.promise;

  const firstRecoveryStarted = deferred();
  const firstRecovery = deferred();
  const retryRecoveryStarted = deferred();
  const retryRecovery = deferred();
  let recoveryAttempt = 0;
  transport.listHook = () => {
    recoveryAttempt += 1;
    if (recoveryAttempt === 1) {
      firstRecoveryStarted.resolve();
      return firstRecovery.promise;
    }
    retryRecoveryStarted.resolve();
    return retryRecovery.promise;
  };

  transport.emit({ type: "transport-error", message: "force recovery" });
  const offline = await subscription.pending;
  assert.equal(offline.value.snapshot.connection.status, "offline");
  await firstRecoveryStarted.promise;

  createReceipt.resolve(createdId);
  const created = await creating;
  assert.equal(created.accepted, true);
  firstRecovery.resolve([existingSession()]);
  await retryRecoveryStarted.promise;
  assert.equal(
    transport.eventSubscriptions,
    2,
    "recovery opens its fresh transport cut before reading the new baseline",
  );

  retryRecovery.resolve([
    existingSession(),
    existingSession({ id: createdId, title: "并发创建会话" }),
  ]);
  await recoveredStreamStarted.promise;
  assert.equal(transport.eventSubscriptions, 2);
  assert.equal(
    (await adapter.snapshot()).sessions.some((session) => session.id === createdId),
    true,
  );

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("session 目录重基线失败同样交给统一 recovery loop", async () => {
  const { adapter, transport } = configuredAdapter({}, { retryDelay: () => 0 });
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  transport.failSnapshots = 1;

  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-2",
    change: "added",
  });
  const offlineResult = await subscription.pending;
  const reconnecting = await nextEvent(subscription.iterator);
  const online = await nextEvent(subscription.iterator);

  assert.equal(offlineResult.done, false);
  assert.equal(offlineResult.value.snapshot.connection.status, "offline");
  assert.equal(reconnecting.snapshot.connection.status, "reconnecting");
  assert.equal(online.snapshot.connection.status, "online");
  assert.equal(transport.eventSubscriptions, 2);

  subscription.controller.abort();
  await subscription.iterator.next();
});

function approvalRequest(overrides = {}) {
  return {
    type: "interaction-requested",
    sessionId: "session-1",
    rpcId: "rpc-private-approval",
    request: {
      type: "approval/requested",
      sessionId: "session-1",
      approvalId: "approval-private-id",
      toolName: "运行受控量子工具",
      reason: "该操作需要访问计算资源",
    },
    ...overrides,
  };
}

function questionsRequest(overrides = {}) {
  return {
    type: "interaction-requested",
    sessionId: "session-1",
    rpcId: "rpc-private-questions",
    request: {
      type: "question/requested",
      sessionId: "session-1",
      questions: [
        {
          id: "wire-question-method",
          header: "算法",
          question: "选择算法",
          options: [
            { label: "VQE", description: "变分方法" },
            { label: "QAOA" },
          ],
        },
        {
          id: "wire-question-output",
          question: "选择输出",
          multiSelect: true,
          options: [{ label: "能量" }, { label: "波函数" }],
        },
      ],
    },
    ...overrides,
  };
}

test("approval 投影使用不可逆本地 ID，重放幂等且 resolved 权威移除", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  const raw = approvalRequest();

  transport.emit(raw);
  const upserted = await subscription.pending;
  assert.equal(upserted.done, false);
  assert.equal(upserted.value.cause.type, "interaction-upserted");
  const interaction = upserted.value.snapshot.activeSession.pendingInteractions[0];
  assert.equal(interaction.kind, "approval");
  assert.equal(interaction.actionLabel, "运行受控量子工具");
  assert.equal(
    upserted.value.snapshot.sessions[0].pendingInteractionCount,
    1,
  );
  const serialized = JSON.stringify(upserted.value.snapshot);
  assert.equal(serialized.includes("rpc-private-approval"), false);
  assert.equal(serialized.includes("approval-private-id"), false);
  assert.equal(interaction.id.includes("rpc-private-approval"), false);

  transport.emit(raw);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal((await adapter.snapshot()).revision, upserted.value.revision);

  const waitingResolved = subscription.iterator.next();
  transport.emit({
    type: "interaction-resolved",
    sessionId: "session-1",
    resolution: { kind: "approval", approvalId: "approval-private-id" },
  });
  const resolved = await nextEvent({ next: () => waitingResolved });
  assert.equal(resolved.cause.type, "interaction-removed");
  assert.deepEqual(resolved.snapshot.activeSession.pendingInteractions, []);

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("question 回答按声明顺序映射回 wire IDs/labels，且 accepted 不抢先移除", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  transport.emit(questionsRequest());
  const upserted = await subscription.pending;
  assert.equal(upserted.done, false);
  const interaction = upserted.value.snapshot.activeSession.pendingInteractions[0];
  assert.equal(interaction.kind, "questions");
  const [method, output] = interaction.questions;
  const serialized = JSON.stringify(upserted.value.snapshot);
  for (const wireSecret of [
    "rpc-private-questions",
    "wire-question-method",
    "wire-question-output",
  ]) {
    assert.equal(serialized.includes(wireSecret), false);
  }

  const receipt = await adapter.command({
    type: "answer-interaction",
    commandId: "answer-question-batch",
    sessionId: "session-1",
    interactionId: interaction.id,
    response: {
      kind: "questions",
      action: "submit",
      answers: [
        {
          questionId: output.id,
          optionIds: [output.options[1].id],
          custom: "  密度矩阵  ",
        },
        {
          questionId: method.id,
          optionIds: [method.options[0].id],
        },
      ],
    },
  });
  assert.equal(receipt.accepted, true);
  assert.equal(receipt.result.type, "interaction-response-accepted");
  assert.deepEqual(transport.calls.respondToInteraction, [
    {
      type: "question",
      rpcId: "rpc-private-questions",
      value: {
        sessionId: "session-1",
        answer: {
          answers: [
            {
              id: "wire-question-method",
              selected: ["VQE"],
            },
            {
              id: "wire-question-output",
              selected: ["波函数"],
              custom: "密度矩阵",
            },
          ],
        },
      },
    },
  ]);
  assert.equal(
    (await adapter.snapshot()).activeSession.pendingInteractions.length,
    1,
  );

  const waitingResolved = subscription.iterator.next();
  transport.emit({
    type: "interaction-resolved",
    sessionId: "session-1",
    resolution: { kind: "questions", rpcId: "rpc-private-questions" },
  });
  const resolved = await nextEvent({ next: () => waitingResolved });
  assert.equal(resolved.cause.type, "interaction-removed");
  subscription.controller.abort();
  await subscription.iterator.next();
});

test("question cancel 可发送；缺少 disclosure 的 approval 只允许拒绝", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);

  transport.emit(questionsRequest());
  const questionEvent = await subscription.pending;
  const question = questionEvent.value.snapshot.activeSession.pendingInteractions[0];
  const cancelled = await adapter.command({
    type: "answer-interaction",
    commandId: "cancel-questions",
    sessionId: "session-1",
    interactionId: question.id,
    response: { kind: "questions", action: "cancel" },
  });
  assert.equal(cancelled.accepted, true);
  assert.deepEqual(transport.calls.respondToInteraction.at(-1), {
    type: "question-cancel",
    rpcId: "rpc-private-questions",
  });

  transport.emit({
    type: "interaction-resolved",
    sessionId: "session-1",
    resolution: { kind: "questions", rpcId: "rpc-private-questions" },
  });
  await nextEvent(subscription.iterator);
  const waitingApproval = subscription.iterator.next();
  transport.emit(approvalRequest());
  const approvalEvent = await nextEvent({ next: () => waitingApproval });
  const approval = approvalEvent.snapshot.activeSession.pendingInteractions[0];
  const approved = await adapter.command({
    type: "answer-interaction",
    commandId: "allow-approval",
    sessionId: "session-1",
    interactionId: approval.id,
    response: { kind: "approval", decision: "allow-once" },
  });
  assert.equal(approved.accepted, false);
  assert.equal(approved.error.code, "APPROVAL_CONTEXT_UNAVAILABLE");
  assert.equal(transport.calls.respondToInteraction.length, 1);
  const denied = await adapter.command({
    type: "answer-interaction",
    commandId: "deny-approval",
    sessionId: "session-1",
    interactionId: approval.id,
    response: { kind: "approval", decision: "deny" },
  });
  assert.equal(denied.accepted, true);
  assert.deepEqual(transport.calls.respondToInteraction.at(-1), {
    type: "approval",
    rpcId: "rpc-private-approval",
    value: {
      sessionId: "session-1",
      approvalId: "approval-private-id",
      outcome: "rejected",
    },
  });

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("not-pending 移除 stale 卡片，bad-response 保留卡片供修正", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  transport.emit(approvalRequest());
  const first = await subscription.pending;
  const interaction = first.value.snapshot.activeSession.pendingInteractions[0];

  transport.respondError = new HarnessTransportError(
    "bad-response",
    "invalid response",
  );
  const bad = await adapter.command({
    type: "answer-interaction",
    commandId: "bad-response",
    sessionId: "session-1",
    interactionId: interaction.id,
    response: { kind: "approval", decision: "deny" },
  });
  assert.equal(bad.accepted, false);
  assert.equal(bad.error.code, "INVALID_INTERACTION_ANSWER");
  assert.equal(
    (await adapter.snapshot()).activeSession.pendingInteractions.length,
    1,
  );

  transport.respondError = new HarnessTransportError(
    "not-pending",
    "already settled",
  );
  const stale = await adapter.command({
    type: "answer-interaction",
    commandId: "stale-response",
    sessionId: "session-1",
    interactionId: interaction.id,
    response: { kind: "approval", decision: "deny" },
  });
  assert.equal(stale.accepted, false);
  assert.equal(stale.error.code, "INTERACTION_NOT_PENDING");
  assert.deepEqual(
    (await adapter.snapshot()).activeSession.pendingInteractions,
    [],
  );

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("prompt RPC 挂起时 event durable 先到，命令完成后仍发布 active/revision", async () => {
  const { adapter, transport } = configuredAdapter({
    sessions: [
      existingSession(),
      existingSession({ id: "session-2", title: "另一个会话", updatedAt: 10 }),
    ],
    conversations: {
      "session-1": existingConversation(),
      "session-2": {
        sessionId: "session-2",
        messages: [],
        lastSeq: -1,
        running: false,
      },
    },
  });
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  const gate = deferred();
  transport.promptHook = () => gate.promise;

  const commandPromise = adapter.command({
    type: "prompt",
    commandId: "prompt-race",
    sessionId: "session-2",
    clientMessageId: "client-race",
    text: "竞态问题",
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  transport.setConversation("session-2", {
    sessionId: "session-2",
    messages: [
      {
        id: "wire-race",
        seq: 0,
        role: "user",
        text: "竞态问题",
        sourceRpcId: "prompt-rpc-1",
      },
    ],
    lastSeq: 0,
    running: true,
  });
  const waiting = subscription.pending;
  transport.emit({
    type: "session-changed",
    sessionId: "session-2",
    eventType: "user/message",
    seq: 0,
  });
  gate.resolve();
  const receipt = await commandPromise;
  assert.equal(receipt.accepted, true);
  const event = await waiting;
  assert.equal(event.done, false);
  const snapshot = await adapter.snapshot();
  assert.equal(snapshot.activeSession.id, "session-2");
  assert(snapshot.revision > baseline.revision);
  assert.equal(snapshot.activeSession.messages[0].id, "client-race");

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("旧 history 晚于更新事件返回时不得把 session sequence 回退", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  const gate = deferred();
  let gated = true;
  transport.snapshotHook = async () => {
    if (!gated) return undefined;
    gated = false;
    return gate.promise;
  };

  const openPromise = adapter.command({
    type: "open-session",
    commandId: "open-stale-history",
    sessionId: "session-1",
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  transport.setConversation("session-1", existingConversation({
    messages: [
      ...existingConversation().messages,
      { id: "assistant-new", seq: 2, role: "assistant", text: "新事件" },
    ],
    lastSeq: 2,
  }));
  transport.emit({
    type: "session-changed",
    sessionId: "session-1",
    eventType: "assistant/message",
    seq: 2,
  });
  gate.resolve(existingConversation());
  await openPromise;
  const converged = await subscription.pending;
  assert.equal(converged.done, false);
  const snapshot = await adapter.snapshot();
  assert.equal(snapshot.activeSession.messages.at(-1).id, "assistant-new");
  assert.equal(snapshot.activeSession.messages.at(-1).sequence, 2);

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("history 暂时落后 target sequence 时会重取直到追平", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  let calls = 0;
  transport.snapshotHook = () => {
    calls += 1;
    return calls === 1
      ? existingConversation()
      : existingConversation({
          messages: [
            ...existingConversation().messages,
            { id: "assistant-five", seq: 5, role: "assistant", text: "追平" },
          ],
          lastSeq: 5,
        });
  };
  transport.emit({
    type: "session-changed",
    sessionId: "session-1",
    eventType: "assistant/message",
    seq: 5,
  });
  const event = await subscription.pending;
  assert.equal(event.done, false);
  assert(calls >= 2);
  assert.equal(event.value.snapshot.activeSession.messages.at(-1).text, "追平");

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("history 无法追平 target sequence 时进入统一 offline recovery", async () => {
  const { adapter, transport } = configuredAdapter(
    {},
    { retryDelay: () => 1_000 },
  );
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  transport.snapshotHook = () => existingConversation();
  transport.emit({
    type: "session-changed",
    sessionId: "session-1",
    eventType: "assistant/message",
    seq: 9,
  });
  const event = await subscription.pending;
  assert.equal(event.done, false);
  assert.equal(event.value.snapshot.connection.status, "offline");
  assert.match(event.value.snapshot.connection.detail, /sequence 9/);

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("旧目录 baseline 晚到不得删除并发 create 的新 session", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  const gate = deferred();
  const listStarted = deferred();
  let listAttempt = 0;
  transport.listHook = () => {
    listAttempt += 1;
    if (listAttempt === 1) {
      listStarted.resolve();
      return gate.promise;
    }
    return transport.sessions;
  };
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "updated",
  });
  await listStarted.promise;
  const createPromise = adapter.command({
    type: "new-session",
    commandId: "create-during-list",
  });
  const created = await createPromise;
  assert.equal(created.accepted, true);
  gate.resolve([existingSession()]);
  let snapshot = await adapter.snapshot();
  assert(snapshot.sessions.some((session) => session.id === created.result.sessionId));

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("挂起 prompt 不阻塞 approval 请求投影与回答命令", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  const promptGate = deferred();
  transport.promptHook = () => promptGate.promise;
  const prompt = adapter.command({
    type: "prompt",
    commandId: "hanging-prompt",
    sessionId: "session-1",
    clientMessageId: "hanging-message",
    text: "等待响应",
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  transport.emit(approvalRequest());
  const interactionEvent = await subscription.pending;
  assert.equal(interactionEvent.done, false);
  const approval = interactionEvent.value.snapshot.activeSession.pendingInteractions[0];
  const answered = await adapter.command({
    type: "answer-interaction",
    commandId: "answer-during-prompt",
    sessionId: "session-1",
    interactionId: approval.id,
    response: { kind: "approval", decision: "deny" },
  });
  assert.equal(answered.accepted, true);
  assert.equal(transport.calls.respondToInteraction.length, 1);

  promptGate.resolve();
  await prompt;
  subscription.controller.abort();
  await subscription.iterator.next();
});

test("deferred history 不阻塞 interaction frame 与回答", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  const historyGate = deferred();
  transport.snapshotHook = () => historyGate.promise;
  transport.emit({
    type: "session-changed",
    sessionId: "session-1",
    eventType: "assistant/message",
    seq: 2,
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  transport.emit(approvalRequest());
  const interactionEvent = await subscription.pending;
  assert.equal(interactionEvent.done, false);
  const approval = interactionEvent.value.snapshot.activeSession.pendingInteractions[0];
  assert.equal(approval.kind, "approval");
  const answered = await adapter.command({
    type: "answer-interaction",
    commandId: "answer-during-history",
    sessionId: "session-1",
    interactionId: approval.id,
    response: { kind: "approval", decision: "deny" },
  });
  assert.equal(answered.accepted, true);

  historyGate.resolve(existingConversation({
    messages: [
      ...existingConversation().messages,
      { id: "assistant-2", seq: 2, role: "assistant", text: "done" },
    ],
    lastSeq: 2,
  }));
  subscription.controller.abort();
  await subscription.iterator.next();
});

test("较早 active intent 的 I/O 晚到不会抢回较新的会话选择", async () => {
  const { adapter, transport } = configuredAdapter({
    sessions: [
      existingSession(),
      existingSession({ id: "session-2", title: "B", updatedAt: 10 }),
    ],
    conversations: {
      "session-1": existingConversation(),
      "session-2": {
        sessionId: "session-2",
        messages: [],
        lastSeq: -1,
        running: false,
      },
    },
  });
  await adapter.command({
    type: "open-session",
    commandId: "warm-active-intent-runtime",
    sessionId: "session-1",
  });
  const gate = deferred();
  const slowOpenStarted = deferred();
  let first = true;
  transport.snapshotHook = (sessionId) => {
    if (sessionId === "session-1" && first) {
      first = false;
      slowOpenStarted.resolve();
      return gate.promise;
    }
    return undefined;
  };
  const openA = adapter.command({
    type: "open-session",
    commandId: "open-a-slow",
    sessionId: "session-1",
  });
  await slowOpenStarted.promise;
  const openB = await adapter.command({
    type: "open-session",
    commandId: "open-b-fast",
    sessionId: "session-2",
  });
  assert.equal(openB.accepted, true);
  gate.resolve(existingConversation());
  await openA;
  assert.equal((await adapter.snapshot()).activeSession.id, "session-2");
});

test("changed-payload replay fail closed；新 generation 清空并以相同 opaque ID 重建", async () => {
  const { adapter, transport } = configuredAdapter(
    {},
    { retryDelay: () => 1_000 },
  );
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  const raw = approvalRequest();
  transport.emit(raw);
  const first = await subscription.pending;
  const firstId =
    first.value.snapshot.activeSession.pendingInteractions[0].id;

  const waitingFailure = subscription.iterator.next();
  transport.emit(
    approvalRequest({
      request: { ...raw.request, reason: "payload changed" },
    }),
  );
  const failed = await nextEvent({ next: () => waitingFailure });
  assert.equal(failed.snapshot.connection.status, "offline");

  // Use a fresh adapter to exercise the ordinary transport reconnect signal
  // without waiting for the fail-closed recovery timer above.
  subscription.controller.abort();
  await subscription.iterator.next();
  const secondSetup = configuredAdapter();
  const secondBaseline = await secondSetup.adapter.snapshot();
  const secondSubscription = await subscribe(
    secondSetup.adapter,
    secondBaseline.revision,
  );
  secondSetup.transport.emit(raw);
  const beforeReconnect = await secondSubscription.pending;
  const deterministicId =
    beforeReconnect.value.snapshot.activeSession.pendingInteractions[0].id;
  assert.equal(deterministicId, firstId);

  assert.equal(deterministicId, firstId);

  secondSubscription.controller.abort();
  await secondSubscription.iterator.next();
});

test("abort 即使发生在 yield 暂停点也会主动释放 subscriber 与 event pump", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const first = await subscribe(adapter, baseline.revision);
  transport.emit(approvalRequest());
  await first.pending;

  // Do not call next/return: this reproduces a consumer paused at `yield`.
  first.controller.abort();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const current = await adapter.snapshot();
  const second = await subscribe(adapter, current.revision);
  transport.emit(
    approvalRequest({
      rpcId: "rpc-second-generation",
      request: {
        ...approvalRequest().request,
        approvalId: "approval-second-generation",
      },
    }),
  );
  const event = await second.pending;
  assert.equal(event.done, false);
  assert.equal(transport.eventSubscriptions, 2);

  second.controller.abort();
  await second.iterator.next();
  await first.iterator.return();
});

test("projection updated 标脏重取，但不会越过 removed 后的目录裁决", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  const firstList = deferred();
  let refreshCalls = 0;
  transport.listHook = () => {
    refreshCalls += 1;
    return refreshCalls === 1 ? firstList.promise : transport.sessions;
  };

  transport.sessions[0].title = "标题 B";
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "updated",
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  transport.sessions[0].title = "标题 C";
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "updated",
  });
  firstList.resolve([{ ...existingSession(), title: "标题 B" }]);

  let projected = await subscription.pending;
  while (
    projected.value.snapshot.sessions.find((session) => session.id === "session-1")
      ?.title !== "标题 C"
  ) {
    projected = await subscription.iterator.next();
  }
  assert.equal(refreshCalls, 2);

  transport.sessions = [];
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "removed",
  });
  const removed = await nextEvent(subscription.iterator);
  assert.equal(
    removed.snapshot.sessions.some((session) => session.id === "session-1"),
    false,
  );
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "updated",
  });
  transport.emit(approvalRequest());
  await new Promise((resolve) => setTimeout(resolve, 10));
  const afterLateFrames = await adapter.snapshot();
  assert.equal(afterLateFrames.sessions.length, 0);
  assert.equal(afterLateFrames.activeSession.id, "session-1");
  assert.equal(afterLateFrames.activeSession.running, false);
  assert.deepEqual(afterLateFrames.activeSession.pendingInteractions, []);

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("create 使用确定性 SHA-256 sessionId，并合并先到的 Host 投影", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  const gate = deferred();
  const createStarted = deferred();
  let requestedId;
  transport.createHook = (sessionId) => {
    requestedId = sessionId;
    createStarted.resolve();
    return gate.promise;
  };
  const command = {
    type: "new-session",
    commandId: "create-correlated-session",
    title: "本地临时标题",
  };
  const creating = adapter.command(command);
  await createStarted.promise;
  assert.match(requestedId, /^session-[a-f0-9]{64}$/);

  transport.sessions.unshift({
    id: requestedId,
    title: "Host 权威标题",
    updatedAt: 500,
    running: true,
    blank: false,
  });
  transport.conversations.set(requestedId, {
    sessionId: requestedId,
    messages: [],
    lastSeq: -1,
    running: true,
  });
  transport.emit({
    type: "session-directory-changed",
    sessionId: requestedId,
    change: "added",
  });
  await subscription.pending;
  gate.resolve(requestedId);
  const receipt = await creating;
  assert.equal(receipt.accepted, true);
  assert.equal(receipt.result.sessionId, requestedId);
  const summary = (await adapter.snapshot()).sessions.find(
    (session) => session.id === requestedId,
  );
  assert.equal(summary.title, "Host 权威标题");
  assert.equal(summary.running, true);

  const replay = await adapter.command(command);
  assert.deepEqual(replay, receipt);
  assert.equal(transport.calls.createSession, 1);

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("resolved 可先于 interaction HTTP receipt，carrier success 仍返回 accepted", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  transport.emit(approvalRequest());
  const requested = await subscription.pending;
  const interaction =
    requested.value.snapshot.activeSession.pendingInteractions[0];
  const responseGate = deferred();
  transport.respondHook = () => responseGate.promise;
  const answering = adapter.command({
    type: "answer-interaction",
    commandId: "resolved-before-http",
    sessionId: "session-1",
    interactionId: interaction.id,
    response: { kind: "approval", decision: "deny" },
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  transport.emit({
    type: "interaction-resolved",
    sessionId: "session-1",
    resolution: { kind: "approval", approvalId: "approval-private-id" },
  });
  const resolved = await nextEvent(subscription.iterator);
  assert.deepEqual(resolved.snapshot.activeSession.pendingInteractions, []);
  responseGate.resolve();
  assert.equal((await answering).accepted, true);

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("Host running 在 open history 在途时变化，旧 history 不得回退状态", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  const historyGate = deferred();
  let gated = true;
  transport.snapshotHook = () => {
    if (!gated) return undefined;
    gated = false;
    return historyGate.promise;
  };
  const opening = adapter.command({
    type: "open-session",
    commandId: "open-running-cas",
    sessionId: "session-1",
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  transport.emit({
    type: "session-status",
    sessionId: "session-1",
    running: true,
  });
  await subscription.pending;
  historyGate.resolve(existingConversation({ running: false }));
  await opening;
  assert.equal((await adapter.snapshot()).activeSession.running, true);

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("UNKNOWN correlation 与 command LRU 共用同一 horizon，exact durable 可升级 replay", async () => {
  const { adapter, transport } = configuredAdapter();
  await adapter.snapshot();
  transport.promptHook = () => Promise.reject(new Error("response lost"));
  const command = (index) => ({
    type: "prompt",
    commandId: `unknown-${index}`,
    sessionId: "session-1",
    clientMessageId: `unknown-message-${index}`,
    text: `问题 ${index}`,
  });
  const first = await adapter.command(command(1));
  assert.equal(first.error.code, "COMMAND_OUTCOME_UNKNOWN");
  for (let index = 2; index <= 256; index += 1) {
    await adapter.command(command(index));
  }
  // LRU-touch c1, then force a 257th record. Its hidden pending alias may be
  // pruned, but the unified command record must retain exact rpc correlation.
  await adapter.command(command(1));
  await adapter.command(command(257));

  const beforeDurable = await adapter.snapshot();
  const subscription = await subscribe(adapter, beforeDurable.revision);
  transport.setConversation(
    "session-1",
    existingConversation({
      messages: [
        ...existingConversation().messages,
        {
          id: "raw-unknown-1",
          seq: 2,
          role: "user",
          text: "问题 1",
          sourceRpcId: "prompt-rpc-1",
        },
      ],
      lastSeq: 2,
    }),
  );
  transport.emit({
    type: "session-changed",
    sessionId: "session-1",
    eventType: "user/message",
    seq: 2,
  });
  const durable = await subscription.pending;
  assert.equal(
    durable.value.snapshot.activeSession.messages.at(-1).id,
    "unknown-message-1",
  );
  const replay = await adapter.command(command(1));
  assert.equal(replay.accepted, true);
  assert.equal(replay.revision, durable.value.revision);

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("bootstrap 等 active history 追平 cut，同时保留期间到达的 interaction", async () => {
  const transport = new FakeHarnessTransport({
    sessions: [existingSession()],
    conversations: { "session-1": existingConversation() },
  });
  const adapter = new DeepSeekHarnessAdapterCore({ transport });
  const historyGate = deferred();
  const historyStarted = deferred();
  transport.snapshotHook = () => {
    historyStarted.resolve();
    return historyGate.promise;
  };
  const controller = new AbortController();
  const iterator = adapter.events(null, controller.signal)[Symbol.asyncIterator]();
  let bootstrapSettled = false;
  const bootstrap = iterator.next().then((result) => {
    bootstrapSettled = true;
    return result;
  });
  await historyStarted.promise;
  const requestYielded = waitForTransportYield(
    transport,
    (event) => event.type === "interaction-requested",
  );
  transport.emit(approvalRequest());
  await requestYielded;
  await Promise.resolve();
  assert.equal(bootstrapSettled, false);

  historyGate.resolve(existingConversation());
  let event = await bootstrap;
  assert.equal(event.done, false);
  if (
    event.value.snapshot.activeSession.pendingInteractions.length === 0
  ) {
    event = await iterator.next();
    assert.equal(event.done, false);
  }
  assert.equal(
    event.value.snapshot.activeSession.pendingInteractions[0].kind,
    "approval",
  );

  controller.abort();
  await iterator.next();
});

test("create receipt 晚于 authoritative removed 时不得复活 phantom session", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  const createGate = deferred();
  const createStarted = deferred();
  const removalBaselineStarted = deferred();
  let createdId;
  transport.createHook = (sessionId) => {
    createdId = sessionId;
    createStarted.resolve();
    return createGate.promise;
  };
  transport.listHook = () => {
    removalBaselineStarted.resolve();
    return [existingSession({ title: "removed baseline committed" })];
  };
  const creating = adapter.command({
    type: "new-session",
    commandId: "create-removed-before-receipt",
  });
  await createStarted.promise;
  transport.emit({
    type: "session-directory-changed",
    sessionId: createdId,
    change: "removed",
  });
  await removalBaselineStarted.promise;
  const baselineCommitted = await subscription.pending;
  assert.equal(
    baselineCommitted.value.snapshot.sessions[0].title,
    "removed baseline committed",
  );
  createGate.resolve(createdId);
  const receipt = await creating;
  assert.equal(receipt.accepted, false);
  assert.equal(receipt.error.code, "SESSION_NOT_FOUND");
  const final = await adapter.snapshot();
  assert.equal(final.sessions.some((session) => session.id === createdId), false);
  assert.notEqual(final.activeSession?.id, createdId);

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("一个 create 失败只清理自己的 lifecycle token，不影响并发 create", async () => {
  const { adapter, transport } = configuredAdapter();
  await adapter.snapshot();
  const gateA = deferred();
  const gateB = deferred();
  const startedA = deferred();
  const startedB = deferred();
  let call = 0;
  transport.createHook = () => {
    call += 1;
    if (call === 1) {
      startedA.resolve();
      return gateA.promise;
    }
    startedB.resolve();
    return gateB.promise;
  };
  const createA = adapter.command({ type: "new-session", commandId: "create-a" });
  await startedA.promise;
  const createB = adapter.command({ type: "new-session", commandId: "create-b" });
  await startedB.promise;
  gateA.reject(new HarnessTransportError("invalid-request", "rejected"));
  const failed = await createA;
  assert.equal(failed.accepted, false);
  gateB.resolve("session-concurrent-b");
  const succeeded = await createB;
  assert.equal(succeeded.accepted, true);
  assert.equal(succeeded.result.sessionId, "session-concurrent-b");
});

test("definite session-not-found 触发目录裁决，presence 会恢复 cold session", async () => {
  const { adapter, transport } = configuredAdapter();
  await adapter.command({
    type: "open-session",
    commandId: "warm-not-found-runtime",
    sessionId: "session-1",
  });
  transport.snapshotHook = () => {
    throw new HarnessTransportError("session-not-found", "missing");
  };
  const receipt = await adapter.command({
    type: "open-session",
    commandId: "open-ghost",
    sessionId: "session-1",
  });
  assert.equal(receipt.accepted, false);
  assert.equal(receipt.error.code, "SESSION_NOT_FOUND");
  const final = await adapter.snapshot();
  assert.equal(final.sessions.length, 1);
  assert.equal(final.activeSession.id, "session-1");
  assert.equal(final.activeSession.running, false);
});

test("remote mutation 发出后 caller abort 会缓存 UNKNOWN 并阻止同 ID 重放", async () => {
  const { adapter, transport } = configuredAdapter();
  await adapter.snapshot();
  const started = deferred();
  transport.createHook = (_sessionId, signal) =>
    new Promise((_, reject) => {
      started.resolve();
      signal.addEventListener(
        "abort",
        () => reject(signal.reason ?? new DOMException("aborted", "AbortError")),
        { once: true },
      );
    });
  const controller = new AbortController();
  const command = { type: "new-session", commandId: "create-aborted-after-send" };
  const firstPromise = adapter.command(command, controller.signal);
  await started.promise;
  controller.abort();
  const first = await firstPromise;
  assert.equal(first.accepted, false);
  assert.equal(first.error.code, "COMMAND_OUTCOME_UNKNOWN");

  const replay = await adapter.command(command);
  assert.deepEqual(replay, first);
  assert.equal(transport.calls.createSession, 1);
});

test("没有 events runtime owner 时命令 fail fast 且不会触发远端副作用", async () => {
  const transport = new FakeHarnessTransport({
    sessions: [existingSession()],
    conversations: { "session-1": existingConversation() },
  });
  const adapter = new DeepSeekHarnessAdapterCore({ transport });
  const pointInTime = await adapter.snapshot();
  assert.equal(pointInTime.connection.status, "reconnecting");

  const receipt = await adapter.command({
    type: "new-session",
    commandId: "no-runtime-owner",
  });

  assert.equal(receipt.accepted, false);
  assert.equal(receipt.error.code, "RUNTIME_UNAVAILABLE");
  assert.equal(transport.calls.createSession, 0);
});

test("opening 超时会交付完整 offline bootstrap，而不是让首订阅永久等待", async () => {
  const transport = new FakeHarnessTransport({
    sessions: [existingSession()],
    conversations: { "session-1": existingConversation() },
  });
  transport.autoOpenEvents = false;
  const adapter = new DeepSeekHarnessAdapterCore({
    transport,
    openingTimeoutMs: 5,
    retryDelay: () => 1_000,
  });
  const controller = new AbortController();
  const iterator = adapter.events(null, controller.signal)[Symbol.asyncIterator]();

  const bootstrap = await nextEvent(iterator);
  assert.equal(bootstrap.snapshot.connection.status, "offline");
  assert.equal(bootstrap.snapshot.revision, bootstrap.revision);
  assert.equal(transport.eventSubscriptions, 1);

  controller.abort();
  await iterator.next();
});

test("opening 中 unknown subscribed target 必须追平后才交付 online bootstrap", async () => {
  const transport = new FakeHarnessTransport({
    sessions: [existingSession()],
    conversations: { "session-1": existingConversation() },
  });
  transport.autoOpenEvents = false;
  const subscribed = deferred();
  transport.eventSubscriptionHook = () => subscribed.resolve();
  const secondHistoryStarted = deferred();
  const secondHistory = deferred();
  let historyAttempt = 0;
  transport.snapshotHook = () => {
    historyAttempt += 1;
    if (historyAttempt === 1) {
      return existingConversation({ lastSeq: 9 });
    }
    secondHistoryStarted.resolve();
    return secondHistory.promise;
  };
  const adapter = new DeepSeekHarnessAdapterCore({ transport });
  const controller = new AbortController();
  const iterator = adapter.events(null, controller.signal)[Symbol.asyncIterator]();
  let settled = false;
  const bootstrap = iterator.next().then((result) => {
    settled = true;
    return result;
  });
  await subscribed.promise;
  transport.emit({
    type: "session-changed",
    sessionId: "session-1",
    eventType: "session/rebaseline",
    seq: 10,
    gapDetected: true,
  });
  transport.emit({ type: "connection-state", status: "online" });
  await secondHistoryStarted.promise;
  assert.equal(settled, false);

  secondHistory.resolve(existingConversation({ lastSeq: 10 }));
  const ready = await bootstrap;
  assert.equal(ready.done, false);
  assert.equal(ready.value.snapshot.connection.status, "online");
  assert.equal(ready.value.snapshot.activeSession.messages.at(-1).sequence, 1);
  assert.equal(historyAttempt, 2);

  controller.abort();
  await iterator.next();
});

test("agent-error 归属会话 occurrence，不污染 connection.detail，running true 清旧错误", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);

  transport.emit({
    type: "agent-error",
    sessionId: "session-1",
    message: "模型执行失败",
  });
  const first = await subscription.pending;
  const firstError = first.value.snapshot.activeSession.runtimeError;
  assert.equal(firstError.message, "模型执行失败");
  assert.equal(first.value.snapshot.connection.detail, undefined);

  const waitingSecond = subscription.iterator.next();
  transport.emit({
    type: "agent-error",
    sessionId: "session-1",
    message: "模型执行失败",
  });
  const second = await waitingSecond;
  assert.equal(second.done, false);
  assert.notEqual(second.value.snapshot.activeSession.runtimeError.id, firstError.id);
  assert(second.value.revision > first.value.revision);

  const waitingRunning = subscription.iterator.next();
  transport.emit({
    type: "session-status",
    sessionId: "session-1",
    running: true,
  });
  const running = await waitingRunning;
  assert.equal(running.done, false);
  assert.equal(running.value.snapshot.activeSession.runtimeError, undefined);

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("unknown agent-error 跨失败 generation 保留，并在下一目录 cut 归属会话", async () => {
  const { adapter, transport } = configuredAdapter(
    {
      sessions: [],
      conversations: { "session-1": existingConversation() },
    },
    { retryDelay: () => 0 },
  );
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);

  transport.emit({
    type: "agent-error",
    sessionId: "session-1",
    message: "跨代错误",
  });
  transport.sessions = [existingSession()];
  transport.emit({ type: "transport-error", message: "generation failed" });

  let assigned;
  for (let attempt = 0; attempt < 6 && !assigned; attempt += 1) {
    const event =
      attempt === 0
        ? await subscription.pending
        : await subscription.iterator.next();
    assert.equal(event.done, false);
    if (event.value.snapshot.activeSession?.runtimeError) {
      assigned = event.value.snapshot;
    }
  }
  assert.equal(assigned.activeSession.runtimeError.message, "跨代错误");
  assert.equal(assigned.connection.detail, undefined);

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("旧 point-in-time snapshot 晚到不得覆盖 stream-owned live authority", async () => {
  const transport = new FakeHarnessTransport({
    sessions: [existingSession()],
    conversations: { "session-1": existingConversation() },
  });
  const staleListStarted = deferred();
  const staleList = deferred();
  let listAttempt = 0;
  transport.listHook = () => {
    listAttempt += 1;
    if (listAttempt === 1) {
      staleListStarted.resolve();
      return staleList.promise;
    }
    return [existingSession({ title: "stream authority" })];
  };
  const adapter = new DeepSeekHarnessAdapterCore({ transport });
  const staleSnapshot = adapter.snapshot();
  await staleListStarted.promise;

  const controller = new AbortController();
  const iterator = adapter.events(null, controller.signal)[Symbol.asyncIterator]();
  const live = await nextEvent(iterator);
  assert.equal(live.snapshot.connection.status, "online");
  assert.equal(live.snapshot.sessions[0].title, "stream authority");

  staleList.resolve([existingSession({ title: "stale point read" })]);
  const staleResult = await staleSnapshot;
  assert.equal(staleResult.connection.status, "online");
  assert.equal(staleResult.sessions[0].title, "stream authority");
  const final = await adapter.snapshot();
  assert.equal(final.connection.status, "online");
  assert.equal(final.sessions[0].title, "stream authority");

  controller.abort();
  await iterator.next();
});

test("point-in-time baseline 失败不会永久缓存，下一次 snapshot 可重新恢复", async () => {
  const transport = new FakeHarnessTransport({
    sessions: [existingSession()],
    conversations: { "session-1": existingConversation() },
  });
  let first = true;
  transport.listHook = () => {
    if (first) {
      first = false;
      throw new Error("temporary list failure");
    }
    return [existingSession()];
  };
  const adapter = new DeepSeekHarnessAdapterCore({ transport });

  const failed = await adapter.snapshot();
  assert.equal(failed.connection.status, "offline");
  const recovered = await adapter.snapshot();
  assert.equal(transport.calls.listSessions, 2);
  assert.equal(recovered.sessions.length, 1);
  assert.equal(recovered.activeSession.id, "session-1");
});

test("active session removed 后保留 frozen resident，用户切换后才释放", async () => {
  const second = existingSession({
    id: "session-2",
    title: "另一个会话",
    updatedAt: 10,
  });
  const { adapter, transport } = configuredAdapter({
    sessions: [existingSession(), second],
    conversations: {
      "session-1": existingConversation(),
      "session-2": {
        sessionId: "session-2",
        messages: [],
        lastSeq: -1,
        running: false,
      },
    },
  });
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  transport.emit({
    type: "agent-error",
    sessionId: "session-1",
    message: "保留的会话错误",
  });
  await subscription.pending;

  transport.sessions = [second];
  const waitingRemoved = subscription.iterator.next();
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "removed",
  });
  const removed = await waitingRemoved;
  assert.equal(removed.done, false);
  assert.equal(
    removed.value.snapshot.sessions.some(
      (session) => session.id === "session-1",
    ),
    false,
  );
  assert.equal(removed.value.snapshot.activeSession.id, "session-1");
  assert.equal(removed.value.snapshot.activeSession.running, false);
  assert.equal(
    removed.value.snapshot.activeSession.runtimeError.message,
    "保留的会话错误",
  );

  const opened = await adapter.command({
    type: "open-session",
    commandId: "leave-detached-resident",
    sessionId: "session-2",
  });
  assert.equal(opened.accepted, true);
  const switched = await adapter.snapshot();
  assert.equal(switched.activeSession.id, "session-2");
  assert.equal(
    switched.sessions.some((session) => session.id === "session-1"),
    false,
  );

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("same-ID detach 后 reattach 建立 fresh lifecycle，低 sequence 新历史可替换旧历史", async () => {
  const oldConversation = existingConversation({
    messages: [
      { id: "old-100", seq: 100, role: "assistant", text: "旧 lifecycle" },
    ],
    lastSeq: 100,
  });
  const { adapter, transport } = configuredAdapter({
    sessions: [existingSession()],
    conversations: { "session-1": oldConversation },
  });
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  const staleHistoryStarted = deferred();
  const staleHistory = deferred();
  let gateOld = true;
  transport.snapshotHook = () => {
    if (gateOld) {
      gateOld = false;
      staleHistoryStarted.resolve();
      return staleHistory.promise;
    }
    return undefined;
  };
  transport.emit({
    type: "session-changed",
    sessionId: "session-1",
    eventType: "assistant/message",
    seq: 101,
  });
  await staleHistoryStarted.promise;

  transport.setConversation("session-1", {
    sessionId: "session-1",
    messages: [
      { id: "fresh-0", seq: 0, role: "assistant", text: "新 lifecycle" },
    ],
    lastSeq: 0,
    running: false,
  });
  transport.sessions = [existingSession({ running: false })];
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "removed",
  });
  await subscription.pending;
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "added",
  });

  let fresh;
  for (let attempt = 0; attempt < 6 && !fresh; attempt += 1) {
    const event = await subscription.iterator.next();
    assert.equal(event.done, false);
    if (event.value.snapshot.activeSession?.messages[0]?.id === "fresh-0") {
      fresh = event.value.snapshot;
    }
  }
  assert.equal(fresh.activeSession.messages[0].text, "新 lifecycle");

  staleHistory.resolve({
    ...oldConversation,
    messages: [
      ...oldConversation.messages,
      { id: "old-101", seq: 101, role: "assistant", text: "迟到旧历史" },
    ],
    lastSeq: 101,
  });
  await Promise.resolve();
  const final = await adapter.snapshot();
  assert.deepEqual(
    final.activeSession.messages.map((message) => message.id),
    ["fresh-0"],
  );

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("success prompt 的 exact pending correlation 不依赖 command ledger 窗口", async () => {
  const { adapter, transport } = configuredAdapter();
  const queued = await adapter.command({
    type: "prompt",
    commandId: "delayed-echo-prompt",
    sessionId: "session-1",
    clientMessageId: "delayed-client-id",
    text: "延迟持久化",
  });
  assert.equal(queued.accepted, true);
  for (let index = 0; index < 256; index += 1) {
    const cancelled = await adapter.command({
      type: "cancel",
      commandId: `ledger-evict-${index}`,
      sessionId: "session-1",
    });
    assert.equal(cancelled.accepted, true);
  }

  const beforeEcho = await adapter.snapshot();
  const subscription = await subscribe(adapter, beforeEcho.revision);
  transport.setConversation(
    "session-1",
    existingConversation({
      messages: [
        ...existingConversation().messages,
        {
          id: "raw-delayed-echo",
          seq: 2,
          role: "user",
          text: "延迟持久化",
          sourceRpcId: "prompt-rpc-1",
        },
      ],
      lastSeq: 2,
      running: true,
    }),
  );
  transport.emit({
    type: "session-changed",
    sessionId: "session-1",
    eventType: "user/message",
    seq: 2,
  });
  const durable = await subscription.pending;
  const matching = durable.value.snapshot.activeSession.messages.filter(
    (message) =>
      message.id === "delayed-client-id" || message.id === "raw-delayed-echo",
  );
  assert.deepEqual(
    matching.map(({ id, delivery }) => ({ id, delivery })),
    [{ id: "delayed-client-id", delivery: "durable" }],
  );

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("UNKNOWN prompt 不随普通 command LRU 淘汰，late exact echo 后 replay 不重发", async () => {
  const { adapter, transport } = configuredAdapter();
  transport.promptHook = () => Promise.reject(new Error("response lost"));
  const command = {
    type: "prompt",
    commandId: "unknown-beyond-ledger",
    sessionId: "session-1",
    clientMessageId: "unknown-beyond-ledger-client",
    text: "等待跨窗口回显",
  };
  const first = await adapter.command(command);
  assert.equal(first.accepted, false);
  assert.equal(first.error.code, "COMMAND_OUTCOME_UNKNOWN");

  for (
    let index = 0;
    index < MAX_UNRESOLVED_PROMPT_RESERVATIONS;
    index += 1
  ) {
    const receipt = await adapter.command({
      type: "cancel",
      commandId: `unrelated-ledger-${index}`,
      sessionId: "session-1",
    });
    assert.equal(receipt.accepted, true);
  }
  const stillUnknown = await adapter.command(command);
  assert.equal(stillUnknown.error.code, "COMMAND_OUTCOME_UNKNOWN");
  assert.equal(transport.calls.prompt.length, 1);

  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  transport.setConversation(
    "session-1",
    existingConversation({
      messages: [
        ...existingConversation().messages,
        {
          id: "raw-beyond-ledger",
          seq: 2,
          role: "user",
          text: command.text,
          sourceRpcId: "prompt-rpc-1",
        },
      ],
      lastSeq: 2,
    }),
  );
  transport.emit({
    type: "session-changed",
    sessionId: "session-1",
    eventType: "user/message",
    seq: 2,
  });
  const durable = await subscription.pending;
  const logical = durable.value.snapshot.activeSession.messages.filter(
    (message) =>
      message.id === command.clientMessageId ||
      message.id === "raw-beyond-ledger",
  );
  assert.deepEqual(
    logical.map(({ id, delivery }) => ({ id, delivery })),
    [{ id: command.clientMessageId, delivery: "durable" }],
  );

  const replay = await adapter.command(command);
  assert.equal(replay.accepted, true);
  assert.equal(transport.calls.prompt.length, 1);

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("unresolved prompt reservation 满载时发送前 fail closed，exact echo 释放容量", async () => {
  const { adapter, transport } = configuredAdapter();
  transport.promptHook = () => Promise.reject(new Error("response lost"));
  const command = (index) => ({
    type: "prompt",
    commandId: `reservation-${index}`,
    sessionId: "session-1",
    clientMessageId: `reservation-client-${index}`,
    text: `预留 ${index}`,
  });
  for (
    let index = 0;
    index < MAX_UNRESOLVED_PROMPT_RESERVATIONS;
    index += 1
  ) {
    const receipt = await adapter.command(command(index));
    assert.equal(receipt.error.code, "COMMAND_OUTCOME_UNKNOWN");
  }
  assert.equal(
    transport.calls.prompt.length,
    MAX_UNRESOLVED_PROMPT_RESERVATIONS,
  );

  const blocked = await adapter.command(
    command(MAX_UNRESOLVED_PROMPT_RESERVATIONS),
  );
  assert.equal(blocked.accepted, false);
  assert.equal(blocked.error.code, "RUNTIME_UNAVAILABLE");
  assert.equal(
    transport.calls.prompt.length,
    MAX_UNRESOLVED_PROMPT_RESERVATIONS,
    "capacity rejection must happen before startPrompt",
  );

  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  transport.setConversation(
    "session-1",
    existingConversation({
      messages: [
        ...existingConversation().messages,
        {
          id: "raw-reservation-zero",
          seq: 2,
          role: "user",
          text: "预留 0",
          sourceRpcId: "prompt-rpc-1",
        },
      ],
      lastSeq: 2,
    }),
  );
  transport.emit({
    type: "session-changed",
    sessionId: "session-1",
    eventType: "user/message",
    seq: 2,
  });
  await subscription.pending;

  const admitted = await adapter.command(
    command(MAX_UNRESOLVED_PROMPT_RESERVATIONS),
  );
  assert.equal(admitted.error.code, "COMMAND_OUTCOME_UNKNOWN");
  assert.equal(
    transport.calls.prompt.length,
    MAX_UNRESOLVED_PROMPT_RESERVATIONS + 1,
  );

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("host added reattach 与 sidebar membership 必须发布新 revision", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  const removalListStarted = deferred();
  transport.listHook = () => {
    removalListStarted.resolve();
    return [];
  };
  transport.sessions = [];
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "removed",
  });
  const detached = await subscription.pending;
  assert.equal(detached.value.snapshot.sessions.length, 0);
  assert.equal(detached.value.snapshot.activeSession.id, "session-1");
  await removalListStarted.promise;
  while (adapter.directoryRefreshTask !== undefined) {
    await Promise.resolve();
  }
  const beforeAdded = await adapter.snapshot();

  transport.sessions = [existingSession({ running: false })];
  transport.listHook = () => transport.sessions;
  const waitingAdded = subscription.iterator.next();
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "added",
  });
  const added = await waitingAdded;
  assert.equal(added.done, false);
  assert(added.value.revision > beforeAdded.revision);
  assert.equal(
    added.value.snapshot.sessions.some(
      (session) => session.id === "session-1",
    ),
    true,
  );
  assert.equal(added.value.snapshot.activeSession.id, "session-1");

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("新 transport generation 的低 subscribed cut 会建立 fresh lifecycle", async () => {
  const oldConversation = {
    sessionId: "session-1",
    messages: [
      { id: "old-100", seq: 100, role: "assistant", text: "旧代消息" },
    ],
    lastSeq: 100,
    running: false,
  };
  const { adapter, transport } = configuredAdapter(
    {
      sessions: [existingSession()],
      conversations: { "session-1": oldConversation },
    },
    { retryDelay: () => 0 },
  );
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  transport.emit({
    type: "agent-error",
    sessionId: "session-1",
    message: "OLD lifecycle error",
  });
  const oldError = await subscription.pending;
  assert.equal(
    oldError.value.snapshot.activeSession.runtimeError.message,
    "OLD lifecycle error",
  );
  transport.setConversation("session-1", {
    sessionId: "session-1",
    messages: [
      { id: "new-0", seq: 0, role: "assistant", text: "新代消息" },
    ],
    lastSeq: 0,
    running: true,
  });
  transport.emit({ type: "transport-error", message: "disconnect" });
  transport.emit({
    type: "session-changed",
    sessionId: "session-1",
    eventType: "session/rebaseline",
    seq: 0,
    gapDetected: true,
  });

  let fresh;
  for (let attempt = 0; attempt < 8 && !fresh; attempt += 1) {
    const event =
      attempt === 0
        ? await subscription.pending
        : await subscription.iterator.next();
    assert.equal(event.done, false);
    const messages = event.value.snapshot.activeSession?.messages;
    if (
      event.value.snapshot.connection.status === "online" &&
      messages?.length === 1 &&
      messages[0].id === "new-0"
    ) {
      fresh = event.value.snapshot;
    }
  }
  assert.equal(fresh.connection.status, "online");
  assert.deepEqual(
    fresh.activeSession.messages.map((message) => message.id),
    ["new-0"],
  );
  assert.equal(fresh.activeSession.running, true);
  assert.equal(fresh.activeSession.runtimeError, undefined);

  const waitingNewError = subscription.iterator.next();
  transport.emit({
    type: "agent-error",
    sessionId: "session-1",
    message: "NEW lifecycle error",
  });
  const newError = await waitingNewError;
  assert.equal(newError.done, false);
  assert.equal(
    newError.value.snapshot.activeSession.runtimeError.message,
    "NEW lifecycle error",
  );

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("unknown inactive target 绑定目录后立即追平，open 必须等待有限 target cut", async () => {
  const sessionB = existingSession({
    id: "session-b",
    title: "B",
    updatedAt: 10,
  });
  const { adapter, transport } = configuredAdapter({
    sessions: [existingSession()],
    conversations: {
      "session-1": existingConversation(),
      "session-b": {
        sessionId: "session-b",
        messages: [],
        lastSeq: 9,
        running: false,
      },
    },
  });
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  const directoryConfirmed = deferred();
  transport.sessions = [existingSession(), sessionB];
  transport.listHook = () => {
    directoryConfirmed.resolve();
    return transport.sessions;
  };
  const openHistoryStarted = deferred();
  const openHistory = deferred();
  let firstBHistory = true;
  transport.snapshotHook = (sessionId) => {
    if (sessionId !== "session-b") return undefined;
    if (firstBHistory) {
      firstBHistory = false;
      openHistoryStarted.resolve();
      return openHistory.promise;
    }
    return {
      sessionId: "session-b",
      messages: [
        { id: "b-10", seq: 10, role: "assistant", text: "已经追平" },
      ],
      lastSeq: 10,
      running: false,
    };
  };

  transport.emit({
    type: "session-changed",
    sessionId: "session-b",
    eventType: "session/rebaseline",
    seq: 10,
    gapDetected: true,
  });
  await directoryConfirmed.promise;
  const opening = adapter.command({
    type: "open-session",
    commandId: "open-b-at-target-10",
    sessionId: "session-b",
  });
  await openHistoryStarted.promise;
  let settled = false;
  opening.then(() => {
    settled = true;
  });
  await Promise.resolve();
  assert.equal(settled, false);

  openHistory.resolve({
    sessionId: "session-b",
    messages: [
      { id: "b-9", seq: 9, role: "assistant", text: "尚未追平" },
    ],
    lastSeq: 9,
    running: false,
  });
  const opened = await opening;
  assert.equal(opened.accepted, true);
  const final = await adapter.snapshot();
  assert.equal(final.activeSession.id, "session-b");
  assert.equal(final.activeSession.messages.at(-1).id, "b-10");

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("旧 lifecycle prompt success 不得把同 ID 新 session 改成 pending/running", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  const completion = deferred();
  const started = deferred();
  transport.promptHook = () => {
    started.resolve();
    return completion.promise;
  };
  const prompting = adapter.command({
    type: "prompt",
    commandId: "old-lifecycle-prompt-success",
    sessionId: "session-1",
    clientMessageId: "old-lifecycle-client",
    text: "旧代请求",
  });
  await started.promise;

  transport.setConversation("session-1", {
    sessionId: "session-1",
    messages: [],
    lastSeq: -1,
    running: false,
  });
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "removed",
  });
  await subscription.pending;
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "added",
  });
  completion.resolve();
  const receipt = await prompting;
  assert.equal(receipt.accepted, true);
  const final = await adapter.snapshot();
  assert.equal(final.activeSession.running, false);
  assert.equal(
    final.activeSession.messages.some(
      (message) => message.id === "old-lifecycle-client",
    ),
    false,
  );

  subscription.controller.abort();
  await subscription.iterator.next();
});

test("旧 lifecycle prompt definite error 不得 detach 同 ID 新 session", async () => {
  const { adapter, transport } = configuredAdapter();
  const baseline = await adapter.snapshot();
  const subscription = await subscribe(adapter, baseline.revision);
  const completion = deferred();
  const started = deferred();
  transport.promptHook = () => {
    started.resolve();
    return completion.promise;
  };
  const prompting = adapter.command({
    type: "prompt",
    commandId: "old-lifecycle-prompt-error",
    sessionId: "session-1",
    clientMessageId: "old-error-client",
    text: "旧代失败请求",
  });
  await started.promise;

  transport.setConversation("session-1", {
    sessionId: "session-1",
    messages: [],
    lastSeq: -1,
    running: false,
  });
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "removed",
  });
  await subscription.pending;
  transport.emit({
    type: "session-directory-changed",
    sessionId: "session-1",
    change: "added",
  });
  completion.reject(
    new HarnessTransportError("session-not-found", "old lifecycle missing"),
  );
  const receipt = await prompting;
  assert.equal(receipt.accepted, false);
  assert.equal(receipt.error.code, "SESSION_NOT_FOUND");
  const final = await adapter.snapshot();
  assert.equal(
    final.sessions.some((session) => session.id === "session-1"),
    true,
  );
  assert.equal(final.activeSession.id, "session-1");

  subscription.controller.abort();
  await subscription.iterator.next();
});
