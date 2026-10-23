import path from "node:path";
import { fileURLToPath } from "node:url";
import { Environments } from "./environments.mjs";
import { inspectEnvironment } from "./environment-check.mjs";
import { withLock } from "./storage.mjs";
import { runSetupCommand } from "../../lib/setup-process.mjs";
import { externalMcp } from "../../../runtime/chatgpt/external/catalog.mjs";
import { setupExternal } from "../../../runtime/chatgpt/external/setup.mjs";

export async function runEnvironmentJob({ manager, id, jobId, inspect = inspectEnvironment, install = async (signal, onOutput) => externalMcp(id)
  ? setupExternal(manager.root, id, { environment: manager.environment, signal, onOutput })
  : runSetupCommand(process.execPath, [path.join(manager.root, "scripts/setup-sdk.mjs"), id], {
  cwd: manager.root, env: manager.environment, capture: true, signal, onOutput,
}) }) {
  await manager.entry(id);
  const controller = new AbortController();
  let successful = false, pendingPoll, category = "依赖安装或模块检查失败", phase = "准备操作";
  const update = async action => withLock(manager.file(id), async () => {
    const record = await manager.read(id);
    if (record.job?.id !== jobId) throw new Error("Environment operation was superseded");
    action(record); await manager.write(id, record);
  });
  const stop = () => controller.abort();
  process.once("SIGTERM", stop); process.once("SIGINT", stop);
  const timer = setInterval(() => {
    if (pendingPoll) return;
    pendingPoll = (async () => { try {
      await update(record => {
        if (record.job.status === "cancelling") controller.abort();
        else if (record.job.status === "running" && record.job.phase !== phase) record.job.phase = phase;
      });
    } catch { controller.abort(); }
    finally { pendingPoll = null; } })();
  }, 500);
  const timeout = setTimeout(stop, 1_800_000);
  const output = text => {
    // Installer output can include proxy addresses or package-index credentials.
    // Keep only fixed user-facing categories, never raw stdout/stderr or secrets.
    if (/download|fetch|resolv/i.test(text)) phase = "下载固定版本依赖";
    if (/building|installing|prepared|installed/i.test(text)) phase = "安装运行环境";
    if (phase !== "检查依赖与配置" && /connection|timed? ?out|network|ssl|certificate/i.test(text)) category = "下载连接失败，请检查网络或代理后重试";
    else if (/not found|enoent|no such file/i.test(text)) category = "缺少依赖或本机工具，请查看安装条件";
    else if (/unsupported|no matching|not available|incompatible/i.test(text)) category = "固定依赖与当前平台不兼容，请查看安装条件";
  };
  try {
    let record = await manager.read(id);
    await update(current => {
      if (current.job.status === "cancelling") controller.abort();
      else Object.assign(current.job, { status: "running", pid: process.pid });
    });
    controller.signal.throwIfAborted();
    if (record.job.operation === "install") {
      phase = "安装运行环境";
      await install(controller.signal, output);
      await update(current => { current.job.synced = true; });
    }
    phase = "检查依赖与配置";
    category = "环境检查未通过，请查看环境详情与安装条件。";
    record = await manager.read(id);
    const check = await inspect(manager, id, record, controller.signal, output);
    await update(current => {
      if (current.job.status === "cancelling") controller.abort();
      controller.signal.throwIfAborted();
      current.check = check;
      Object.assign(current.job, { status: "completed", phase: "环境检查完成", finishedAt: new Date().toISOString(), message: "运行环境已准备；使用限制保持不变。" });
    });
    successful = true;
  } catch (error) {
    const cancelled = controller.signal.aborted;
    await update(current => {
      delete current.check;
      Object.assign(current.job, { status: cancelled ? "cancelled" : "failed", phase: cancelled ? "已取消" : "未完成", finishedAt: new Date().toISOString(),
        message: cancelled ? "操作已取消，安装进程已退出。可以重新检查或重试安装。" : /^[\u4e00-\u9fff]/.test(error.message) ? error.message : category });
    }).catch(() => {});
  } finally {
    clearInterval(timer); clearTimeout(timeout);
    await pendingPoll;
    process.removeListener("SIGTERM", stop); process.removeListener("SIGINT", stop);
  }
  return successful;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [id, jobId, directory] = process.argv.slice(2);
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  if (!id || !/^[a-f0-9-]{36}$/.test(jobId ?? "") || !path.isAbsolute(directory ?? "")) throw new Error("Invalid environment worker request");
  const manager = new Environments({ root, directory });
  process.exitCode = await runEnvironmentJob({ manager, id, jobId }) ? 0 : 1;
}
