import fs from "node:fs/promises";
import path from "node:path";
import { Environments } from "../../src/settings/codex/environments.mjs";
import { runEnvironmentJob } from "../../src/settings/codex/environment-worker.mjs";
import { runSetupCommand } from "../../src/lib/setup-process.mjs";
import { digest } from "../../src/settings/codex/storage.mjs";
const [id, jobId, directory] = process.argv.slice(2);
const manager = new Environments({ root: process.cwd(), directory });
const control = JSON.parse(await fs.readFile(path.join(directory, "control.json"), "utf8"));
const environment = path.join(manager.environment.OPENQUANTUM_PYTHON_ENV_ROOT, id);
const executable = path.join(environment, process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
const marker = path.join(environment, "openquantum-lock.sha256");
await runEnvironmentJob({ manager, id, jobId,
  install: async signal => {
    await fs.appendFile(path.join(directory, "started"), `${jobId}\n`);
    await runSetupCommand(process.execPath, ["-e", control.slow
      ? `const fs=require('node:fs'); fs.writeFileSync(${JSON.stringify(path.join(directory, "child.pid"))},String(process.pid)); process.on('SIGTERM',()=>{});setInterval(()=>{},1000)`
      : "setTimeout(()=>{},200)"], { signal, capture: true });
    await fs.mkdir(path.dirname(executable), { recursive: true });
    await fs.writeFile(executable, "fixture, never executed", { mode: 0o755 });
    await fs.writeFile(marker, digest(await fs.readFile(path.join(manager.root, ".agents/skills", id, "uv.lock"))));
  },
  inspect: async (_manager, _id, record) => {
    if (control.fail) throw new Error("检查失败夹具");
    await fs.access(executable);
    return { ready: true, fingerprint: await manager.fingerprint(id, record.configuration), paths: [executable, marker], markers: [{ path: marker, sha256: digest(await fs.readFile(marker)) }], checkedAt: new Date().toISOString(), details: ["fixture"], optionalSimulation: false };
  },
});
