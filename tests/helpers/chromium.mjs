import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { access } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

export async function localChromium() {
  if (process.env.CHROME) { await access(process.env.CHROME); return process.env.CHROME; }
  const names = process.platform === "win32" ? ["chrome.exe", "msedge.exe"] : ["google-chrome", "chromium", "chromium-browser"];
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ...[process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA].filter(Boolean)
      .map(dir => path.join(dir, "Google/Chrome/Application/chrome.exe")),
    ...(process.env.PATH ?? "").split(path.delimiter).filter(Boolean).flatMap(dir => names.map(name => path.join(dir, name))),
  ];
  for (const file of candidates) { try { await access(file); return file; } catch { /* Try the next installed browser. */ } }
  const bundled = spawnSync(process.platform === "win32" ? "python" : "python3", ["-c",
    "from playwright.sync_api import sync_playwright\nwith sync_playwright() as p: print(p.chromium.executable_path)"], { encoding: "utf8" });
  if (bundled.status === 0) {
    const file = bundled.stdout.trim();
    try { await access(file); return file; } catch { /* Playwright can be installed without its browser. */ }
  }
  return null;
}

// Chromium's local DevTools pipe carries NUL-delimited JSON. No driver download or debug port.
export async function launchChromium(t, executable, profile) {
  const child = spawn(executable, ["--headless", "--remote-debugging-pipe", "--no-sandbox", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "--disable-component-update",
    "--disable-sync", "--allow-file-access-from-files", "--no-proxy-server", "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1",
    ...(process.platform === "linux" ? ["--disable-dev-shm-usage"] : []), "about:blank"],
  { stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"] });
  let diagnostics = "";
  child.stderr.setEncoding("utf8").on("data", chunk => { diagnostics = (diagnostics + chunk).slice(-1400); });
  const closed = once(child, "close");
  t.after(async () => { child.kill(); await closed; });
  let buffer = "", next = 0;
  const pending = new Map();
  child.stdio[4].setEncoding("utf8").on("data", chunk => {
    const messages = (buffer + chunk).split("\0");
    buffer = messages.pop();
    for (const message of messages) {
      const { id, result, error } = JSON.parse(message);
      const request = pending.get(id);
      if (!request) continue;
      pending.delete(id);
      clearTimeout(request.timer);
      if (error) request.reject(new Error(error.message)); else request.resolve(result);
    }
  });
  child.once("close", (code, signal) => {
    for (const { timer, reject } of pending.values()) { clearTimeout(timer); reject(new Error(`Chromium exited (${signal || code}): ${diagnostics}`)); }
    pending.clear();
  });
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      if (child.exitCode !== null || child.signalCode) { reject(new Error(`Chromium closed: ${diagnostics}`)); return; }
      const id = ++next;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Chromium timed out: ${method}`)); }, 15000);
      pending.set(id, { resolve, reject, timer });
      child.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + "\0");
    });
  }
  const { product } = await send("Browser.getVersion");
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const command = (method, params) => send(method, params, sessionId);
  async function evaluate(fn, arg) {
    const { result, exceptionDetails } = await command("Runtime.evaluate", { expression: `(${fn})(${JSON.stringify(arg) ?? ""})`,
      awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  }
  return {
    product, evaluate,
    async navigate(url, ready) {
      const nav = await command("Page.navigate", { url });
      if (nav.errorText) throw new Error(nav.errorText);
      for (let i = 0; i < 100; i++) { if (await evaluate(ready)) return; await delay(50); }
      throw new Error(`Page did not become ready: ${url}`);
    },
    viewport: width => command("Emulation.setDeviceMetricsOverride", { width, height: 850, deviceScaleFactor: 1, mobile: false }),
    async accessibleName(selector, { textNode = false } = {}) {
      const { root } = await command("DOM.getDocument");
      const { nodeId } = await command("DOM.querySelector", { nodeId: root.nodeId, selector });
      let target = { nodeId };
      if (textNode) {
        const { node } = await command("DOM.describeNode", { nodeId, depth: 1 });
        target = { backendNodeId: node.children.find(child => child.nodeType === 3).backendNodeId };
      }
      const { nodes } = await command("Accessibility.getPartialAXTree", { ...target, fetchRelatives: false });
      if (nodes[0]?.ignored) throw new Error(`Hidden from the accessibility tree: ${selector}`);
      return nodes[0]?.name?.value;
    },
  };
}
