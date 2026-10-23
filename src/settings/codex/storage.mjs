import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

export const digest = value => createHash("sha256").update(value).digest("hex");
export async function readOptional(file) {
  try {
    const stat = await fs.lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("配置必须是普通文件");
    if (stat.size > 2 * 1024 * 1024) throw new Error("配置文件过大");
    return await fs.readFile(file, "utf8");
  } catch (error) { if (error.code === "ENOENT") return ""; throw error; }
}
export async function atomicWrite(file, text, { expected } = {}) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, text, { mode: 0o600, flag: "wx" });
    if (expected !== undefined && await readOptional(file) !== expected) throw new Error("配置正在变化，请刷新后重试");
    await fs.rename(temporary, file);
  } finally { await fs.rm(temporary, { force: true }); }
}
export async function withLock(file, action) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const lock = `${file}.openquantum.lock`;
  const deadline = Date.now() + 5000;
  let handle;
  const owner = JSON.stringify({ pid: process.pid, nonce: randomUUID() });
  while (!handle) {
    try {
      handle = await fs.open(lock, "wx", 0o600);
      await handle.writeFile(owner);
    }
    catch (error) {
      if (error.code !== "EEXIST") throw error;
      // Recover only a proven dead process, or an old incomplete creation.
      // A live operation is never evicted on elapsed time alone.
      try {
        const stat = await fs.lstat(lock);
        const raw = await readOptional(lock);
        let pid;
        try { pid = JSON.parse(raw).pid; } catch { /* incomplete creation */ }
        let stale = !Number.isSafeInteger(pid) && Date.now() - stat.mtimeMs > 30000;
        if (Number.isSafeInteger(pid) && pid > 0) {
          try { process.kill(pid, 0); } catch (failure) { stale = failure.code === "ESRCH"; }
        }
        if (stale && await readOptional(lock) === raw && (await fs.lstat(lock)).ino === stat.ino) await fs.unlink(lock);
      } catch (failure) { if (failure.code !== "ENOENT") throw failure; }
      if (Date.now() >= deadline) throw new Error("另一个设置操作尚未完成，请稍后重试");
      await delay(30);
    }
  }
  try { return await action(); }
  finally {
    await handle.close();
    if (await readOptional(lock) === owner) await fs.unlink(lock);
  }
}
