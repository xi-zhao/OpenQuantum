import assert from "node:assert/strict";
import test from "node:test";

import {
  DeepSeekHarnessTransport,
  HarnessTransportError,
  HarnessTransportOutcomeUnknownError,
} from "../src/harness/transport.ts";

function waitForAbort(signal) {
  if (signal.aborted) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    signal.addEventListener("abort", resolve, { once: true });
  });
}

function success(value) {
  return { rpcId: "test-response", result: { ok: true, value } };
}

function eventFrame(sequence) {
  return {
    rpcId: `event-${sequence}`,
    payload: {
      type: "session/event",
      sessionId: "session-1",
      event: { type: "turn/start", seq: sequence, time: sequence, data: {} },
    },
  };
}

function fakeClient({ mux, host, history }) {
  return {
    sessions: {
      history,
    },
    events: { mux, host },
    respond() {
      return Promise.resolve({ accepted: true });
    },
  };
}

async function nextWithTimeout(iterator, timeoutMs = 1_000) {
  return Promise.race([
    iterator.next(),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("timed out waiting for event")), timeoutMs);
    }),
  ]);
}

test("event transport forwards every sequence fact and leaves convergence to Core", async () => {
  let historyCalls = 0;
  const client = fakeClient({
    async *mux(_payload, signal, onOpen) {
      onOpen?.();
      yield {
        rpcId: "subscribed-1",
        payload: {
          type: "session/subscribed",
          sessionId: "session-1",
          lastSeq: 1,
        },
      };
      yield eventFrame(2);
      yield eventFrame(2);
      yield eventFrame(1);
      yield eventFrame(4);
      await waitForAbort(signal);
    },
    async *host(_payload, signal, onOpen) {
      onOpen?.();
      await waitForAbort(signal);
    },
    async history() {
      historyCalls += 1;
      return success({
        events: [{ event: { type: "turn/end", seq: 4, time: 4, data: {} } }],
      });
    },
  });
  const transport = new DeepSeekHarnessTransport(client);
  const controller = new AbortController();
  const iterator = transport.events(controller.signal)[Symbol.asyncIterator]();
  const seen = [];

  while (seen.length < 6) {
    const result = await nextWithTimeout(iterator);
    assert.equal(result.done, false);
    if (
      result.value.type === "connection-state" ||
      result.value.type === "session-changed"
    ) {
      seen.push(result.value);
    }
  }

  controller.abort();
  await iterator.next();
  const sessionEvents = seen.filter((event) => event.type === "session-changed");
  assert.equal(historyCalls, 0);
  assert.deepEqual(
    sessionEvents.map((event) => ({ seq: event.seq, gap: event.gapDetected })),
    [
      { seq: 1, gap: true },
      { seq: 2, gap: undefined },
      { seq: 2, gap: undefined },
      { seq: 1, gap: undefined },
      { seq: 4, gap: undefined },
    ],
  );
});

test("first subscribed watermark always requests a fresh snapshot cut", async () => {
  const client = fakeClient({
    async *mux(_payload, signal, onOpen) {
      onOpen?.();
      yield {
        rpcId: "subscribed-first-cut",
        payload: {
          type: "session/subscribed",
          sessionId: "session-1",
          lastSeq: 8,
        },
      };
      await waitForAbort(signal);
    },
    async *host(_payload, signal, onOpen) {
      onOpen?.();
      await waitForAbort(signal);
    },
    async history() {
      throw new Error("transport must not fetch history");
    },
  });
  const transport = new DeepSeekHarnessTransport(client);
  const controller = new AbortController();
  const iterator = transport.events(controller.signal)[Symbol.asyncIterator]();
  let changed;
  while (!changed) {
    const result = await nextWithTimeout(iterator);
    if (result.value.type === "session-changed") changed = result.value;
  }
  assert.equal(changed.seq, 8);
  assert.equal(changed.eventType, "session/rebaseline");
  controller.abort();
  await iterator.next();
});

test("one generation keeps no growing session state across removed then late subscribed frames", async () => {
  const sessionCount = 200;
  let releaseMux;
  const hostRemovedAllSessions = new Promise((resolve) => {
    releaseMux = resolve;
  });
  const client = fakeClient({
    async *mux(_payload, signal, onOpen) {
      onOpen?.();
      await hostRemovedAllSessions;
      for (let index = 0; index < sessionCount; index += 1) {
        const sessionId = `session-late-${index}`;
        yield {
          rpcId: `subscribed-${sessionId}`,
          payload: {
            type: "session/subscribed",
            sessionId,
            lastSeq: index,
          },
        };
      }
      await waitForAbort(signal);
    },
    async *host(_payload, signal, onOpen) {
      onOpen?.();
      for (let index = 0; index < sessionCount; index += 1) {
        const sessionId = `session-late-${index}`;
        yield {
          rpcId: `removed-${sessionId}`,
          payload: {
            type: "host/session-removed",
            sessionId,
          },
        };
      }
      releaseMux();
      await waitForAbort(signal);
    },
    async history() {
      throw new Error("transport must not fetch history");
    },
  });
  const transport = new DeepSeekHarnessTransport(client);
  const transportOwnProperties = Object.getOwnPropertyNames(transport);
  const controller = new AbortController();
  const iterator = transport.events(controller.signal)[Symbol.asyncIterator]();
  const iteratorOwnProperties = Object.getOwnPropertyNames(iterator);
  const removals = [];
  const subscriptions = [];

  while (
    removals.length < sessionCount ||
    subscriptions.length < sessionCount
  ) {
    const result = await nextWithTimeout(iterator);
    assert.equal(result.done, false);
    if (
      result.value.type === "session-directory-changed" &&
      result.value.change === "removed"
    ) {
      removals.push(result.value);
    }
    if (result.value.type === "session-changed") {
      subscriptions.push(result.value);
    }
  }

  controller.abort();
  await iterator.next();
  assert.deepEqual(
    removals.map((event) => event.sessionId),
    Array.from({ length: sessionCount }, (_, index) => `session-late-${index}`),
  );
  assert.deepEqual(
    subscriptions.map((event) => ({
      sessionId: event.sessionId,
      seq: event.seq,
      gapDetected: event.gapDetected,
    })),
    Array.from({ length: sessionCount }, (_, index) => ({
      sessionId: `session-late-${index}`,
      seq: index,
      gapDetected: true,
    })),
  );
  assert.deepEqual(Object.getOwnPropertyNames(transport), transportOwnProperties);
  assert.deepEqual(Object.getOwnPropertyNames(iterator), iteratorOwnProperties);
  assert.equal(
    transportOwnProperties.some((name) => /session|watermark/i.test(name)),
    false,
  );
  assert.equal(
    iteratorOwnProperties.some((name) => /session|watermark/i.test(name)),
    false,
  );
});

test("one transport iterable owns one stream generation and lets Adapter recover", async () => {
  let muxGeneration = 0;
  let hostGeneration = 0;
  const client = fakeClient({
    async *mux(_payload, signal, onOpen) {
      muxGeneration += 1;
      onOpen?.();
      return;
    },
    async *host(_payload, signal, onOpen) {
      hostGeneration += 1;
      onOpen?.();
      await waitForAbort(signal);
    },
    async history() {
      return success({ events: [] });
    },
  });
  const transport = new DeepSeekHarnessTransport(client);
  const controller = new AbortController();
  const iterator = transport.events(controller.signal)[Symbol.asyncIterator]();
  const states = [];

  const online = await nextWithTimeout(iterator);
  assert.equal(online.value.type, "connection-state");
  states.push(online.value.status);
  const ended = await nextWithTimeout(iterator);
  assert.equal(ended.done, true);
  assert.deepEqual(states, ["online"]);
  assert.equal(muxGeneration, 1);
  assert.equal(hostGeneration, 1);
});

test("a stalled consumer fails closed instead of leaking an unhandled rejection", async () => {
  let muxGeneration = 0;
  let hostGeneration = 0;
  const unhandled = [];
  const onUnhandled = (error) => unhandled.push(error);
  process.on("unhandledRejection", onUnhandled);

  const client = fakeClient({
    async *mux(_payload, signal, onOpen) {
      muxGeneration += 1;
      onOpen?.();
      if (muxGeneration === 1) {
        for (let sequence = 0; sequence < 600; sequence += 1) {
          yield eventFrame(sequence);
        }
      }
      await waitForAbort(signal);
    },
    async *host(_payload, signal, onOpen) {
      hostGeneration += 1;
      onOpen?.();
      await waitForAbort(signal);
    },
    async history() {
      return success({ events: [] });
    },
  });
  const transport = new DeepSeekHarnessTransport(client);
  const controller = new AbortController();
  const iterator = transport.events(controller.signal)[Symbol.asyncIterator]();

  const first = await nextWithTimeout(iterator);
  assert.equal(first.done, false);
  await new Promise((resolve) => setTimeout(resolve, 20));

  let sawOverflow = false;
  let ended = false;
  for (let index = 0; index < 20 && !ended; index += 1) {
    const result = await nextWithTimeout(iterator);
    if (result.done) {
      ended = true;
      break;
    }
    sawOverflow ||=
      result.value.type === "transport-error" &&
      result.value.message.includes("fell behind");
  }

  controller.abort();
  await iterator.next();
  await new Promise((resolve) => setTimeout(resolve, 0));
  process.removeListener("unhandledRejection", onUnhandled);

  assert.equal(sawOverflow, true);
  assert.equal(ended, true);
  assert.equal(unhandled.length, 0);
  assert.equal(muxGeneration, 1);
  assert.equal(hostGeneration, 1);
});

test("question cancel uses the cancelled client-response error envelope", async () => {
  let received;
  const client = fakeClient({
    async *mux(_payload, signal, onOpen) {
      onOpen?.();
      await waitForAbort(signal);
    },
    async *host(_payload, signal, onOpen) {
      onOpen?.();
      await waitForAbort(signal);
    },
    async history() {
      return success({ events: [] });
    },
  });
  client.respond = async (message) => {
    received = message;
    return { accepted: true };
  };
  const transport = new DeepSeekHarnessTransport(client);

  await transport.respondToInteraction({
    type: "question-cancel",
    rpcId: "question-rpc",
  });

  assert.deepEqual(received, {
    type: "client-response",
    rpcId: "question-rpc",
    result: {
      ok: false,
      error: {
        code: "cancelled",
        message: "用户取消了问题批次。",
        details: {},
      },
    },
  });
});

test("resolved interaction is preserved as a dedicated transport event", async () => {
  const client = fakeClient({
    async *mux(_payload, signal, onOpen) {
      onOpen?.();
      yield {
        rpcId: "resolved-push",
        payload: {
          type: "question/resolved",
          sessionId: "session-1",
          questionRpcId: "question-rpc",
          outcome: "answered",
        },
      };
      await waitForAbort(signal);
    },
    async *host(_payload, signal, onOpen) {
      onOpen?.();
      await waitForAbort(signal);
    },
    async history() {
      return success({ events: [] });
    },
  });
  const transport = new DeepSeekHarnessTransport(client);
  const controller = new AbortController();
  const iterator = transport.events(controller.signal)[Symbol.asyncIterator]();
  let resolved;
  while (!resolved) {
    const next = await nextWithTimeout(iterator);
    if (next.value.type === "interaction-resolved") resolved = next.value;
  }
  controller.abort();
  await iterator.next();
  assert.deepEqual(resolved, {
    type: "interaction-resolved",
    sessionId: "session-1",
    resolution: { kind: "questions", rpcId: "question-rpc" },
  });
});

test("a sequence gap never blocks a following approval frame on history I/O", async () => {
  let historyCalls = 0;
  const client = fakeClient({
    async *mux(_payload, signal, onOpen) {
      onOpen?.();
      yield {
        rpcId: "subscribed",
        payload: { type: "session/subscribed", sessionId: "session-1", lastSeq: 1 },
      };
      yield eventFrame(4);
      yield {
        rpcId: "approval-rpc",
        payload: {
          type: "approval/requested",
          sessionId: "session-1",
          approvalId: "approval-id",
          toolName: "quantum-tool",
        },
      };
      await waitForAbort(signal);
    },
    async *host(_payload, signal, onOpen) {
      onOpen?.();
      await waitForAbort(signal);
    },
    async history() {
      historyCalls += 1;
      return new Promise(() => {});
    },
  });
  const transport = new DeepSeekHarnessTransport(client);
  const controller = new AbortController();
  const iterator = transport.events(controller.signal)[Symbol.asyncIterator]();
  let approval;
  while (!approval) {
    const next = await nextWithTimeout(iterator);
    if (next.value.type === "interaction-requested") approval = next.value;
  }
  controller.abort();
  await iterator.next();
  assert.equal(approval.rpcId, "approval-rpc");
  assert.equal(historyCalls, 0);
});

test("mutation transport classifies non-envelope failures as unknown, valid business errors as definite", async () => {
  const client = fakeClient({
    async *mux() {},
    async *host() {},
    async history() {
      return success({ events: [] });
    },
  });
  client.sessions.create = async () => {
    throw new TypeError("response body lost");
  };
  const transport = new DeepSeekHarnessTransport(client);
  await assert.rejects(
    transport.createSession("session-safe-retry"),
    HarnessTransportOutcomeUnknownError,
  );

  client.sessions.create = async () => ({
    rpcId: "create-response",
    result: {
      ok: false,
      error: {
        code: "session-conflict",
        message: "session exists with another cwd",
        details: {},
      },
    },
  });
  await assert.rejects(
    transport.createSession("session-conflict"),
    (error) =>
      error instanceof HarnessTransportError &&
      error.code === "session-conflict",
  );
});
