import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { DESKTOP_SOURCE, desktopSourceDirectory, desktopPackageDirectory } from "./lib/desktop-source.mjs";
import { installDesktopDependencies, verifyDesktopDependencySecurity } from "./lib/desktop-dependencies.mjs";
import { buildDesktopNativeMenu } from "./lib/desktop-native-menu.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const directory = desktopSourceDirectory(root);
const env = { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH}` };
// Node 24's fetch honors the user's HTTP(S) proxy when explicitly enabled.
// This is process-local and leaves the model route and global environment alone.
env.NODE_USE_ENV_PROXY ??= "1";
if (env.HTTP_PROXY || env.HTTPS_PROXY || env.http_proxy || env.https_proxy) env.ELECTRON_GET_USE_PROXY ??= "1";
const exec = promisify(execFile);
async function run(command, args, cwd = directory, extraEnv = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: { ...env, ...extraEnv }, stdio: "inherit", shell: process.platform === "win32" && command === "corepack" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}

await mkdir(path.dirname(directory), { recursive: true });
const fresh = !existsSync(directory);
if (fresh) await run("git", ["clone", "--filter=blob:none", "--no-checkout", DESKTOP_SOURCE.repository, directory], root);
const { stdout } = await exec("git", ["rev-parse", "HEAD"], { cwd: directory });
if (fresh || stdout.trim() !== DESKTOP_SOURCE.revision) {
  await run("git", ["fetch", "--depth", "1", "origin", DESKTOP_SOURCE.revision]);
  await run("git", ["checkout", "--detach", DESKTOP_SOURCE.revision]);
}
const { stdout: changes } = await exec("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: directory });
if (changes.trim()) throw new Error("Desktop 源码有本地修改；为避免覆盖，请先保留这些修改再构建固定版本。");
const dependencySecurity = await installDesktopDependencies(directory, () =>
  run("corepack", ["yarn", "install"], directory, { YARN_ENABLE_IMMUTABLE_INSTALLS: "false" }),
);
await verifyDesktopDependencySecurity(directory, dependencySecurity);
const nativeMenu = await buildDesktopNativeMenu(directory, async () => {
  await run("corepack", ["yarn", "workspace", "dsh-plugin-desktop", "build"]);
  await run("corepack", ["yarn", "workspace", "dsh-plugin-desktop", "exec", "vitest", "run", "tests/electron-runtime.spec.ts", "tests/tray-icons.spec.ts"]);
});
const packageRoot = desktopPackageDirectory(root);
// Upstream disables dependency hooks and exposes native setup explicitly.
await run(process.execPath, [path.join(packageRoot, "node_modules/electron/install.js")]);
await writeFile(path.join(directory, ".openquantum-build.json"), JSON.stringify({ ...DESKTOP_SOURCE, dependencySecurity, nativeMenu }, null, 2));
console.log(`DSH Desktop ready: ${DESKTOP_SOURCE.version} (${DESKTOP_SOURCE.revision.slice(0, 12)}); reviewed native menu extension and security-patched dependencies.`);
