import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { constants } from "node:fs";
import { access, glob, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

async function executable(file) {
  try {
    await access(file, constants.X_OK);
    return (await stat(file)).isFile();
  } catch { return false; }
}

export async function localChromium() {
  const dirs = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  const override = process.env.OPENQUANTUM_CHROMIUM || process.env.CHROME;
  if (override) {
    const files = path.basename(override) === override ? dirs.map(dir => path.join(dir, override)) : [path.resolve(override)];
    for (const file of files) if (await executable(file)) return file;
    return null; // An explicit selection must never fall back to a different version.
  }
  const names = process.platform === "win32" ? ["chrome.exe", "msedge.exe"] : ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"];
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ...dirs.flatMap(dir => names.map(name => path.join(dir, name))),
    "/opt/google/chrome/chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/snap/bin/chromium",
    ...[process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA].filter(Boolean)
      .map(dir => path.join(dir, "Google/Chrome/Application/chrome.exe")),
  ];
  for (const file of candidates) if (await executable(file)) return file;
  const bundled = spawnSync(process.platform === "win32" ? "python" : "python3", ["-c",
    "from playwright.sync_api import sync_playwright\nwith sync_playwright() as p: print(p.chromium.executable_path)"], { encoding: "utf8" });
  if (bundled.status === 0 && await executable(bundled.stdout.trim())) return bundled.stdout.trim();

  // A runner can cache a different Playwright revision, or only its headless shell.
  const cacheRoot = process.platform === "darwin" ? path.join(homedir(), "Library", "Caches")
    : process.env.XDG_CACHE_HOME || path.join(homedir(), ".cache");
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(cacheRoot, "ms-playwright");
  const layouts = {
    linux: ["chromium-*/chrome-linux*/chrome", "chromium_headless_shell-*/chrome-linux/headless_shell",
      "chromium_headless_shell-*/chrome-headless-shell-linux*/chrome-headless-shell"],
    darwin: ["chromium-*/chrome-mac*/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
      "chromium-*/chrome-mac*/Chromium.app/Contents/MacOS/Chromium", "chromium_headless_shell-*/chrome-mac*/headless_shell",
      "chromium_headless_shell-*/chrome-headless-shell-mac*/chrome-headless-shell"],
  };
  if (cache !== "0") {
    for (const pattern of layouts[process.platform] ?? []) {
      for await (const match of glob(pattern, { cwd: cache })) {
        const file = path.resolve(cache, match);
        if (await executable(file)) return file;
      }
    }
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
