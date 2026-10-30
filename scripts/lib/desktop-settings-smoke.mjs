import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

/** Exercise the shipped settings iframe with Chromium input, not synthetic DOM wheel events. */
export async function verifyDesktopSettingsScrolling(port) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(3_000) })).json();
  const target = targets.find(entry => entry.type === "page" && /^https?:/.test(entry.url));
  assert.ok(target, "Desktop renderer must be available");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  let nextId = 0;
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data), request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id); clearTimeout(request.timer);
    if (message.error || message.result?.exceptionDetails) request.reject(new Error(JSON.stringify(message.error || message.result.exceptionDetails)));
    else request.resolve(message.result);
  });
  const fail = () => {
    for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error("Desktop renderer disconnected")); }
    pending.clear();
  };
  socket.addEventListener("error", fail); socket.addEventListener("close", fail);
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Desktop settings probe timed out: ${method}`)); }, 15_000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => (await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.value;
  const inside = expression => evaluate(`(() => { const frame = document.querySelector("iframe.oq-plugin-settings"); const doc = frame.contentDocument; return (${expression}); })()`);
  async function waitFor(expression) {
    for (let attempt = 0; attempt < 80; attempt++) { if (await evaluate(expression)) return; await delay(100); }
    throw new Error("Desktop settings did not finish rendering");
  }
  async function wheel(selector, scrollSelector, deltaY = 420) {
    const point = await inside(`(() => { const area = doc.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); const host = frame.getBoundingClientRect(); return {x: host.x + area.x + 12, y: host.y + Math.max(0, area.y) + 12}; })()`);
    const scrolling = scrollSelector ? `doc.querySelector(${JSON.stringify(scrollSelector)})` : "doc.scrollingElement";
    const before = await inside(`${scrolling}.scrollTop`);
    await command("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
    await command("Input.dispatchMouseEvent", { type: "mouseWheel", ...point, deltaX: 0, deltaY });
    await waitFor(`document.querySelector("iframe.oq-plugin-settings") && (() => { const doc = document.querySelector("iframe.oq-plugin-settings").contentDocument; return ${scrolling}.scrollTop > ${before}; })()`);
    const after = await inside(`${scrolling}.scrollTop`);
    assert.ok(after > before, `Wheel over ${selector} must scroll ${scrollSelector} (${before} -> ${after})`);
    return { before, after };
  }
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Desktop renderer connection timed out")), 3_000);
      socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Desktop renderer connection failed")); }, { once: true });
    });
    await command("Page.bringToFront");
    await evaluate('document.querySelector(".oq-settings-trigger").click()');
    await waitFor('Boolean(document.querySelector(".oq-settings-nav"))');
    await evaluate('[...document.querySelectorAll(".oq-settings-nav button")].find(button => button.textContent === "OpenQuantum").click()');
    await waitFor('document.querySelector("iframe.oq-plugin-settings")?.contentDocument?.querySelector("#content")?.getAttribute("aria-busy") === "false"');
    const results = [];
    for (const size of [{ width: 1280, height: 808 }, { width: 1000, height: 540 }, { width: 600, height: 700 }]) {
      await command("Emulation.setDeviceMetricsOverride", { ...size, deviceScaleFactor: 1, mobile: false });
      await inside('(() => { doc.querySelector("[data-tab=runtime]").click(); doc.querySelector("[data-tab=skills]").click(); doc.scrollingElement.scrollTop = 0; return true; })()');
      const catalogWheel = await wheel("#toolbar", ".catalog-pane");
      await inside('(() => { const pane = doc.querySelector(".catalog-pane"); pane.scrollTop = 0; frame.focus(); pane.focus({ preventScroll: true }); return true; })()');
      await command("Input.dispatchKeyEvent", { type: "keyDown", key: "PageDown", code: "PageDown", windowsVirtualKeyCode: 34 });
      await command("Input.dispatchKeyEvent", { type: "keyUp", key: "PageDown", code: "PageDown", windowsVirtualKeyCode: 34 });
      await delay(180);
      const keyboard = await inside('({top: doc.querySelector(".catalog-pane").scrollTop, active: doc.activeElement.className, focused: doc.hasFocus(), hostActive: document.activeElement.className})');
      assert.ok(keyboard.top > 0, `Keyboard PageDown must scroll the focused catalog: ${JSON.stringify(keyboard)}`);
      const remembered = await inside('(() => { const pane = doc.querySelector(".catalog-pane"); const before = pane.scrollTop; doc.querySelector(".catalog-item").click(); return before; })()');
      if (size.width <= 720) await inside('doc.querySelector(".back-to-list").click()');
      assert.equal(await inside('doc.querySelector(".catalog-pane").scrollTop'), remembered, "Selecting a row and returning retains catalog position");
      await inside('(() => { const input = doc.querySelector("#search"); input.value = "quantum-sdk-workbench"; input.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true })); doc.querySelector(".catalog-item").click(); for (const detail of doc.querySelectorAll(".detail-pane details")) detail.open = true; doc.querySelector(".detail-pane").scrollTop = 0; doc.scrollingElement.scrollTop = 0; return true; })()');
      const detailWheel = await wheel(".detail-pane", ".detail-pane");
      await wheel(".detail-pane", ".detail-pane", 100_000);
      const bottom = await inside('(() => { const pane = doc.querySelector(".detail-pane"); return pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 1; })()');
      assert.ok(bottom, "Wheel input must reach the last detail controls");
      const geometry = await inside('({viewport: frame.clientHeight, pane: doc.querySelector(".detail-pane").clientHeight, document: doc.scrollingElement.scrollHeight, app: doc.querySelector("#app").offsetHeight})');
      assert.ok(geometry.pane >= geometry.viewport * .6, "Catalog and detail must occupy most of the settings workspace");
      assert.ok(geometry.document <= geometry.app + 1, "Hidden form labels must not create blank document overflow");
      const documentWheel = geometry.document > geometry.viewport + 1 ? await wheel(".detail-pane", null, 100_000) : null;
      assert.ok(await inside('(() => { const rect = doc.querySelector("footer").getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= frame.clientHeight + 1; })()'), "The complete footer must be visible at the document bottom");
      results.push({ ...size, geometry, catalogWheel, keyboardPageDown: true, catalogPositionRetained: true, detailWheel, detailBottomReachable: bottom, documentWheel, footerVisible: true });
      await inside('(() => { const input = doc.querySelector("#search"); input.value = ""; input.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true })); return true; })()');
    }
    return results;
  } finally {
    if (socket.readyState === WebSocket.OPEN) await command("Emulation.clearDeviceMetricsOverride").catch(() => {});
    socket.close(); fail();
  }
}
