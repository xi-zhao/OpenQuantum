import { spawn } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { existsSync, createWriteStream } from "node:fs";
import { mkdir, readFile, appendFile, lstat, readlink, rename, symlink, chmod } from "node:fs/promises";
import path from "node:path";
import { OPENMAIC_REVISION, sourceDirectory } from "../../scripts/lib/openmaic-ui-source.mjs";
import { createLearningDatabase } from "./database-service.mjs";
import { createModelGateway } from "./model-gateway.mjs";

export function uiOrigins(parentOrigin, port) {
  const parent = new URL(parentOrigin);
  if (parent.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(parent.hostname) || parent.origin !== parentOrigin) {
    throw new TypeError("当前原版 UI 接入用于本机，请从 localhost 或 127.0.0.1 打开 OpenQuantum。");
  }
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || String(port) === parent.port) throw new TypeError("OpenMAIC UI 端口配置无效。");
  return { parent: parent.origin, origin: `http://${parent.hostname}:${port}` };
}

export async function verifyUiInstallation(root) {
  const directory = sourceDirectory(root);
  if (!existsSync(path.join(directory, "node_modules/next/dist/bin/next")) || !existsSync(path.join(directory, "packages/@openmaic/editor/dist/core/index.js"))) {
    throw new TypeError("OpenMAIC 原版界面尚未安装完整，请运行 npm run learning:ui:setup 后重新打开。");
  }
  const manifest = JSON.parse(await readFile(path.join(directory, ".openquantum-ui.json"), "utf8"));
  if (manifest.revision !== OPENMAIC_REVISION) throw new TypeError("OpenMAIC UI 版本不匹配，请重新准备界面。");
  for (const file of manifest.files) {
    const digest = createHash("sha256").update(await readFile(path.join(directory, file.name))).digest("hex");
    if (digest !== file.sha256) throw new TypeError(`OpenMAIC 界面适配文件已改变：${file.name}`);
  }
  return directory;
}

export async function prepareLearningData(root, directory) {
  const data = path.join(directory, "data");
  const persistent = path.join(root, ".openquantum/learning/openmaic-data");
  let entry;
  try { entry = await lstat(data); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (entry?.isSymbolicLink()) {
    if (path.resolve(directory, await readlink(data)) !== persistent) throw new TypeError("OpenMAIC data 已有自定义链接，请核对存储位置后再启动。");
    return;
  }
  if (entry) {
    if (!entry.isDirectory() || existsSync(persistent)) throw new TypeError("OpenMAIC 存在两份数据目录，请先核对内容，避免覆盖课程材料。");
    await rename(data, persistent);
  } else await mkdir(persistent, { recursive: true, mode: 0o700 });
  await chmod(persistent, 0o700);
  await symlink(persistent, data, "dir");
}

/** Owns the external application's process group, not its classroom workflows. */
export function createLearningUiService(root, { port = Number(process.env.OPENQUANTUM_OPENMAIC_PORT || 3037), llm, selection, attachments } = {}) {
  let child, starting, descriptor, services, stopped = false;
  const closeServices = (owned = services) => { owned?.gateway?.dispose(); owned?.database?.dispose(); if (services === owned) services = undefined; };
  const dispose = () => { stopped = true; child?.kill("SIGTERM"); closeServices(); };
  return {
    dispose,
    async open(parentOrigin) {
      const origins = uiOrigins(parentOrigin, port);
      if (stopped) throw new TypeError("课堂界面服务已经关闭，请重新打开 OpenQuantum。");
      if (descriptor && child?.exitCode === null) {
        if (descriptor.parent !== origins.parent) throw new TypeError(`课堂界面已绑定 ${descriptor.parent}，请使用同一地址打开。`);
        return descriptor;
      }
      if (starting) { const current = await starting; if (current.parent !== origins.parent) throw new TypeError("课堂界面正在由另一地址打开，请使用原地址。"); return current; }
      starting = (async () => {
        const directory = await verifyUiInstallation(root);
        const instance = randomUUID();
        await mkdir(path.join(root, ".openquantum/learning"), { recursive: true });
        await prepareLearningData(root, directory);
        if (!llm || !selection) throw new TypeError("课堂模型连接未装配，请重启 OpenQuantum。");
        const owned = { database: await createLearningDatabase(root) };
        services = owned;
        if (stopped) { closeServices(); throw new TypeError("课堂服务已停止。"); }
        owned.gateway = await createModelGateway({ llm, selection, attachments, record: (value) => appendFile(path.join(root, ".openquantum/learning/model-requests.jsonl"), `${JSON.stringify(value)}\n`, { mode: 0o600 }) });
        if (stopped) { closeServices(owned); throw new TypeError("课堂服务已停止。"); }
        const { database, gateway } = owned;
        const log = createWriteStream(path.join(root, ".openquantum/learning/openmaic-ui.log"), { flags: "a", mode: 0o600 });
        log.write(`\nOpenMAIC full application start ${new Date().toISOString()}\n`);
        // LLM keys stay in Harness. Explicitly configured upstream media/search
        // services remain usable server-side, as do upstream .env.local settings.
        const optionalServices = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(TTS_|ASR_|IMAGE_|VIDEO_|WEB_SEARCH_|PDF_|MINERU_|ALIDOCMIND_|TAVILY_|SEARXNG_|RENDER_SERVICE_)/.test(key)));
        const persistenceToken = randomUUID();
        const env = {
          ...optionalServices,
          PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH || ""}`,
          HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NODE_ENV: "development",
          NEXT_TELEMETRY_DISABLED: "1", OPENQUANTUM_UI_INSTANCE: instance,
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
        child = spawn(process.execPath, [path.join(directory, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: directory, env, stdio: ["ignore", "pipe", "pipe"] });
        const appProcess = child;
        let failure;
        child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
        child.once("error", () => { failure = "OpenMAIC 进程启动失败。"; closeServices(owned); log.end(); });
        child.once("exit", () => { failure = "OpenMAIC 未能启动，请检查端口占用和应用日志。"; if (child === appProcess) descriptor = undefined; closeServices(owned); log.end(); });
        const deadline = Date.now() + 50_000;
        while (Date.now() < deadline && !stopped) {
          if (failure) throw new TypeError(failure);
          try {
            const response = await fetch(`http://127.0.0.1:${port}/api/openquantum/status`, { signal: AbortSignal.timeout(2000) });
            const status = await response.json();
            if (status.instance === instance && status.revision === OPENMAIC_REVISION) {
              descriptor = { ...origins, url: `${origins.origin}/`, version: "1.0.1" };
              return descriptor;
            }
          } catch { /* Wait for this process, never adopt an unrelated listener. */ }
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
        child.kill("SIGTERM");
        throw new TypeError("OpenMAIC UI 启动超时，请查看 .openquantum/learning/openmaic-ui.log 后重试。");
      })();
      try { return await starting; } catch (error) { child?.kill("SIGTERM"); closeServices(); throw error; } finally { starting = undefined; }
    },
  };
}
