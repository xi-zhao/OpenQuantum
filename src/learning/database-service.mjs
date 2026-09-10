import { fork } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function createLearningDatabase(root) {
  const directory = path.join(root, ".openquantum/learning");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const credentials = path.join(directory, "database.json");
  try { await writeFile(credentials, JSON.stringify({ password: randomBytes(32).toString("hex") }), { flag: "wx", mode: 0o600 }); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
  await chmod(credentials, 0o600);
  const { password } = JSON.parse(await readFile(credentials, "utf8"));
  if (!/^[a-f0-9]{64}$/.test(password)) throw new Error("课堂数据库凭据文件无效，请检查本机配置。");
  const reserve = createServer();
  await new Promise((resolve, reject) => { reserve.once("error", reject); reserve.listen(0, "127.0.0.1", resolve); });
  const port = reserve.address().port;
  await new Promise((resolve) => reserve.close(resolve));
  const worker = fork(fileURLToPath(new URL("database-worker.mjs", import.meta.url)), [], { execPath: process.env.OPENQUANTUM_NODE_EXECUTABLE || process.execPath, stdio: ["ignore", "ignore", "ignore", "ipc"], execArgv: [], env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR } });
  const dispose = () => { worker.kill("SIGTERM"); };
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("课堂数据库启动超时。")), 40_000);
      const fail = () => { clearTimeout(timer); reject(new Error("课堂数据库无法启动。请确认 learning:ui:setup 已完成，且数据库未被其他进程占用。")); };
      worker.once("error", fail); worker.once("exit", fail);
      worker.once("message", (message) => { clearTimeout(timer); if (message.ready) resolve(); else fail(); });
      worker.send({ databaseDir: path.join(directory, "postgres"), port, user: "openmaic", password });
    });
    return { url: `postgresql://openmaic:${password}@127.0.0.1:${port}/postgres`, dispose };
  } catch (error) { dispose(); throw error; }
}
