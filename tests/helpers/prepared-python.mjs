import { createHash } from "node:crypto";
import { chmod, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Protocol fixture only: real dependency installation is covered separately.
export async function preparePythonFixture({ root, sandbox, id, executable }) {
  const environmentRoot = path.join(sandbox, "python-envs");
  const directory = path.join(environmentRoot, id);
  const python = path.join(directory, process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  await mkdir(path.dirname(python), { recursive: true });
  await copyFile(executable, python);
  await chmod(python, 0o755);
  // An accidental return to runtime installation must fail these protocol tests.
  await writeFile(executable, `#!${process.execPath}\nthrow new Error("Tool must not invoke uv; prepare dependencies explicitly");\n`);
  const digest = createHash("sha256").update(await readFile(path.join(root, ".agents/skills", id, "uv.lock"))).digest("hex");
  await writeFile(path.join(directory, "openquantum-lock.sha256"), digest + "\n");
  return { OPENQUANTUM_PYTHON_ENV_ROOT: environmentRoot };
}
