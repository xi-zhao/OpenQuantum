import { nodeExecutable as deployedNodeExecutable } from "../../runtime/openquantum/project-root.mjs";
import { execFile, fork } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { existsSync, createWriteStream } from "node:fs";
import { mkdir, readFile, appendFile, lstat, readlink, realpath, rename, symlink, chmod } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OPENMAIC_REVISION, sourceDirectory } from "../../scripts/lib/openmaic-ui-source.mjs";
import { createLearningDatabase } from "./database-service.mjs";
import { createModelGateway } from "./model-gateway.mjs";
import { waitForLearningUi } from "./ui-readiness.mjs";
import { createLearningUiDiagnosticObserver } from "./ui-route-diagnostics.mjs";

export function uiOrigins(parentOrigin, port) {
  const parent = new URL(parentOrigin);
  if (parent.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(parent.hostname) || parent.origin !== parentOrigin) {
    throw new TypeError("当前原版 UI 接入用于本机，请从 localhost 或 127.0.0.1 打开 OpenQuantum。");
  }
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || String(port) === parent.port) throw new TypeError("量子学习通 UI 端口配置无效。");
  return { parent: parent.origin, origin: `http://${parent.hostname}:${port}` };
}

export async function verifyUiInstallation(root) {
  const directory = sourceDirectory(root);
  if (!existsSync(path.join(directory, "node_modules/next/dist/bin/next")) || !existsSync(path.join(directory, "packages/@openmaic/editor/dist/core/index.js"))) {
    throw new TypeError("量子学习通原版界面尚未安装完整，请运行 npm run learning:ui:setup 后重新打开。");
  }
  const manifest = JSON.parse(await readFile(path.join(directory, ".openquantum-ui.json"), "utf8"));
  if (manifest.revision !== OPENMAIC_REVISION) throw new TypeError("量子学习通 UI 版本不匹配，请重新准备界面。");
  for (const file of manifest.files) {
    const digest = createHash("sha256").update(await readFile(path.join(directory, file.name))).digest("hex");
    if (digest !== file.sha256) throw new TypeError(`量子学习通界面适配文件已改变：${file.name}`);
  }
  for (const file of ["dist/prompts/loader.js", "dist/pbl/prompts/loader.js"]) {
    const loader = await readFile(path.join(directory, "packages/@openmaic/generation", file), "utf8");
    if (!loader.includes("OPENQUANTUM_GENERATION_RESOURCE_DIR")) {
      throw new TypeError("量子学习通模板适配尚未编译，请运行 npm run learning:ui:setup 后重新打开。");
    }
  }
  const renderer = path.join(directory, "packages/@openmaic/renderer/dist/elements/latex/BaseLatexElement.js");
  const quizGenerator = path.join(directory, "packages/@openmaic/generation/dist/scene-generator.js");
  if (!existsSync(quizGenerator) || !(await readFile(quizGenerator, "utf8")).includes("Generated quiz does not match the declared count or question types.")) {
    throw new TypeError("量子学习通测验适配尚未编译，请运行 npm run learning:ui:setup 后重新打开。");
  }
  if (!existsSync(renderer) || !(await readFile(renderer, "utf8")).includes("formulaHtml")) {
    throw new TypeError("量子学习通公式适配尚未编译，请运行 npm run learning:ui:setup 后重新打开。");
  }
  const converter = path.join(directory, "packages/mathml2omml/dist/index.js");
  if (!existsSync(converter) || !/normal:\s*['"]p['"]/.test(await readFile(converter, "utf8"))) {
    throw new TypeError("量子学习通数学导出适配尚未编译，请运行 npm run learning:ui:setup 后重新打开。");
  }
  if (!(await readFile(converter, "utf8")).includes("children.length > 2")) {
    throw new TypeError("量子学习通公式括号适配尚未编译，请运行 npm run learning:ui:setup 后重新打开。");
  }
  const pptx = path.join(directory, "packages/pptxgenjs/dist/pptxgen.es.js");
  if (!existsSync(pptx) || !(await readFile(pptx, "utf8")).includes('wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr"')) {
    throw new TypeError("量子学习通公式排版适配尚未编译，请运行 npm run learning:ui:setup 后重新打开。");
  }
  if (!(await readFile(pptx, "utf8")).includes('typeface="${encodeXmlEntities(opts.fontFace)}"')) {
    throw new TypeError("量子学习通字体导出适配尚未编译，请运行 npm run learning:ui:setup 后重新打开。");
  }
  return directory;
}

export async function prepareLearningData(root, directory) {
  const data = path.join(directory, "data");
  const persistent = path.join(root, ".openquantum/learning/openmaic-data");
  let entry;
  try { entry = await lstat(data); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (entry?.isSymbolicLink()) {
    const linked = path.resolve(directory, await readlink(data));
    const sameDirectory = linked === persistent || await Promise.all([realpath(linked), realpath(persistent)])
      .then(([actual, expected]) => actual === expected, () => false);
    if (!sameDirectory) throw new TypeError("量子学习通 data 已有自定义链接，请核对存储位置后再启动。");
    return;
  }
  if (entry) {
    if (!entry.isDirectory() || existsSync(persistent)) throw new TypeError("量子学习通存在两份数据目录，请先核对内容，避免覆盖课程材料。");
    await rename(data, persistent);
  } else await mkdir(persistent, { recursive: true, mode: 0o700 });
  await chmod(persistent, 0o700);
  await symlink(persistent, data, "dir");
}

/** Owns the external application's process group, not its classroom workflows. */
export function createLearningUiService(root, { port = Number(process.env.OPENQUANTUM_OPENMAIC_PORT || 3037), llm, selection, attachments } = {}) {
  const nodeExecutable = process.env.OPENQUANTUM_NODE_EXECUTABLE || deployedNodeExecutable;
  let child, starting, descriptor, services, startup, instance, stopped = false;
  let closing = Promise.resolve();
  const terminating = new WeakSet();
  const appGroups = new WeakMap();
  const reapAppGroup = (owned) => {
    const pid = appGroups.get(owned);
    appGroups.delete(owned);
    if (!pid) return;
    // Only the private supervisor IPC may identify this instance's Next group.
    if (process.platform !== "win32") {
      try { process.kill(-pid, "SIGKILL"); } catch { /* The owned group may already be gone. */ }
    } else {
      execFile("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, timeout: 5000 }, () => {});
    }
  };
  const stopApp = (owned = child) => {
    if (!owned?.pid || terminating.has(owned) || owned.exitCode !== null || owned.signalCode != null) return;
    terminating.add(owned);
    // The supervisor normally reaps Next; Host also owns its reported group.
    if (process.platform !== "win32") {
      try { process.kill(-owned.pid, "SIGTERM"); } catch (error) { if (error.code !== "ESRCH") owned.kill("SIGTERM"); }
    } else {
      execFile("taskkill", ["/PID", String(owned.pid), "/T", "/F"], { windowsHide: true, timeout: 5000 }, () => {});
    }
  };
  const closeServices = (owned = services) => {
    if (!owned || owned.closing) return closing;
    owned.closing = true;
    owned.gateway?.dispose();
    const done = owned.database?.dispose();
    closing = Promise.all([closing, done, owned.appClosed]).then(() => {});
    if (services === owned) services = undefined;
    return closing;
  };
  const status = async (parentOrigin) => {
    const origins = uiOrigins(parentOrigin, port);
    if (descriptor && descriptor.parent !== origins.parent) throw new TypeError("课堂界面已绑定其他地址，请使用原地址。");
    const owned = child, current = descriptor, expectedInstance = instance;
    if (stopped || !current || owned?.exitCode !== null || owned.killed) return { state: "unavailable" };
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/openquantum/status`, { signal: AbortSignal.timeout(3000) });
      if (!response.ok) { await response.body?.cancel(); return { state: "unavailable" }; }
      const value = await response.json();
      if (stopped || child !== owned || descriptor !== current || owned.exitCode !== null || owned.killed) return { state: "unavailable" };
      return { state: value.instance === expectedInstance && value.revision === OPENMAIC_REVISION ? "ready" : "unavailable" };
    } catch { return { state: "unavailable" }; }
  };
  const dispose = async () => {
    stopped = true;
    startup?.abort(new TypeError("课堂服务已停止。"));
    stopApp();
    await closeServices();
    // An in-flight database/gateway preparation must also reach its cleanup.
    await starting?.catch(() => {});
    await closing;
  };
  return {
    dispose,
    status,
    async open(parentOrigin) {
      const origins = uiOrigins(parentOrigin, port);
      if (stopped) throw new TypeError("课堂界面服务已经关闭，请重新打开 OpenQuantum。");
      if (descriptor && descriptor.parent !== origins.parent) throw new TypeError(`课堂界面已绑定 ${descriptor.parent}，请使用同一地址打开。`);
      if (starting) { const current = await starting; if (current.parent !== origins.parent) throw new TypeError("课堂界面正在由另一地址打开，请使用原地址。"); return current; }
      starting = (async () => {
        if (descriptor && child?.exitCode === null) {
          const current = descriptor;
          if ((await status(parentOrigin)).state === "ready" && descriptor === current) return current;
          // Only this explicit open action replaces an unresponsive instance.
          descriptor = undefined;
          stopApp();
          await closeServices();
        }
        await closing;
        if (stopped) throw new TypeError("课堂服务已停止。");
        const directory = await verifyUiInstallation(root);
        instance = randomUUID();
        await mkdir(path.join(root, ".openquantum/learning"), { recursive: true });
        await prepareLearningData(root, directory);
        if (!llm || !selection) throw new TypeError("课堂模型连接未装配，请重启 OpenQuantum。");
        const owned = { database: await createLearningDatabase(root) };
        services = owned;
        if (stopped) { await closeServices(owned); throw new TypeError("课堂服务已停止。"); }
        owned.gateway = await createModelGateway({ llm, selection, attachments, record: (value) => appendFile(path.join(root, ".openquantum/learning/model-requests.jsonl"), `${JSON.stringify(value)}\n`, { mode: 0o600 }) });
        if (stopped) {
          owned.gateway.dispose();
          await closeServices(owned);
          throw new TypeError("课堂服务已停止。");
        }
        const { database, gateway } = owned;
        const log = createWriteStream(path.join(root, ".openquantum/learning/openmaic-ui.log"), { flags: "a", mode: 0o600 });
        log.write(`\nOpenMAIC full application start ${new Date().toISOString()}\n`);
        const observe = createLearningUiDiagnosticObserver(directory, {
          report: (value) => log.write(`${JSON.stringify({ at: new Date().toISOString(), ...value })}\n`),
          isActive: () => !owned.closing && !log.writableEnded && !log.destroyed,
        });
        // LLM keys stay in Harness. Explicitly configured upstream media/search
        // services remain usable server-side, as do upstream .env.local settings.
        const optionalServices = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(TTS_|ASR_|IMAGE_|VIDEO_|WEB_SEARCH_|PDF_|MINERU_|ALIDOCMIND_|TAVILY_|SEARXNG_|RENDER_SERVICE_)/.test(key)));
        const persistenceToken = randomUUID();
        const env = {
          ...optionalServices,
          PATH: `${path.dirname(nodeExecutable)}${path.delimiter}${process.env.PATH || ""}`,
          HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NODE_ENV: "development",
          NEXT_TELEMETRY_DISABLED: "1", OPENQUANTUM_UI_INSTANCE: instance,
          OPENQUANTUM_GENERATION_RESOURCE_DIR: path.resolve(directory, "packages/@openmaic/generation"),
          NEXT_PUBLIC_OPENQUANTUM_EMBED: "1", NEXT_PUBLIC_OPENQUANTUM_PARENT_ORIGIN: origins.parent,
          ALLOWED_FRAME_ANCESTORS: origins.parent, NEXT_PUBLIC_MAIC_EDITOR_ENABLED: "1",
          OPENMAIC_AGENT_RUNTIME_ENABLED: "1", NEXT_PUBLIC_PRO_WORKBENCH_ENABLED: "1",
          NEXT_PUBLIC_PERSISTENCE: "1", DATABASE_URL: database.url,
          PERSISTENCE_DEV_TOKEN: persistenceToken, NEXT_PUBLIC_PERSISTENCE_TOKEN: persistenceToken,
          OPENQUANTUM_MODEL_GATEWAY_URL: gateway.url, OPENQUANTUM_MODEL_GATEWAY_TOKEN: gateway.token,
          DEFAULT_MODEL: "custom-openquantum:harness-default",
          MODEL_ROUTES: JSON.stringify({ "maic-agent-driver": { model: "custom-openquantum:harness-default", api: "openai-completions" } }),
          NEXT_PUBLIC_ENABLE_PPTX_IMPORT: "1", NEXT_PUBLIC_ENABLE_VIDEO_EXPORT: "1",
        };
        child = fork(fileURLToPath(new URL("./ui-worker.mjs", import.meta.url)), [], { execPath: nodeExecutable, execArgv: [], cwd: directory, env, detached: true, windowsHide: true, stdio: ["ignore", "pipe", "pipe", "ipc"] });
        const appProcess = child;
        owned.appClosed = new Promise(resolve => appProcess.once("close", resolve));
        const readiness = new AbortController();
        startup = readiness;
        child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
        const failed = () => {
          readiness.abort(new TypeError("量子学习通进程启动失败。"));
          stopApp(appProcess);
          void closeServices(owned);
        };
        child.on("error", failed);
        child.on("message", (message) => {
          if (message?.type === "app-started" && Number.isInteger(message.pid) && message.pid > 1 && message.pid !== process.pid && message.pid !== appProcess.pid && !appGroups.has(appProcess)) {
            appGroups.set(appProcess, message.pid);
          } else if (message?.type === "app-stopped" && message.pid === appGroups.get(appProcess)) {
            appGroups.delete(appProcess);
          }
        });
        child.once("exit", () => { reapAppGroup(appProcess); readiness.abort(new TypeError("量子学习通未能启动，请检查端口占用和课堂启动日志。")); if (child === appProcess) descriptor = undefined; void closeServices(owned); });
        child.once("close", () => log.end());
        child.once("spawn", () => {
          try { appProcess.send({ directory, port }, (error) => { if (error) failed(); }); }
          catch { failed(); }
        });
        try {
          await waitForLearningUi({ url: `http://127.0.0.1:${port}/api/openquantum/status`, instance, revision: OPENMAIC_REVISION, signal: readiness.signal, observe });
          descriptor = { ...origins, url: `${origins.origin}/`, version: "1.0.1" };
          return descriptor;
        } finally { if (startup === readiness) startup = undefined; }
      })();
      try { return await starting; } catch (error) { stopApp(); await closeServices(); throw error; } finally { starting = undefined; }
    },
  };
}
