import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prepareOpenQuantumHarnessHome } from "./lib/prepare-harness-home.mjs";
import { DESKTOP_SOURCE, requireDesktopBuild } from "./lib/desktop-source.mjs";
import { assertSelectedDesktopHome, verifyNativeDesktop } from "./lib/native-desktop.mjs";
import { loadProjectEnv } from "./lib/load-project-env.mjs";
import { desktopLaunchEnvironment } from "./lib/desktop-environment.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
if (args.length && !["--version", "--help", "--source"].includes(args[0])) throw new Error("Usage: npm run desktop -- [--source|--version|--help]");
const native = process.env.DSH_DESKTOP_EXECUTABLE || (process.platform === "darwin" ? "/Applications/DSH Desktop.app/Contents/MacOS/DSH Desktop" : path.join(process.env.LOCALAPPDATA || "", "Programs/DSH Desktop/DSH Desktop.exe"));
if (args[0] === "--version") {
  console.log(`OpenQuantum capability package; compatible original DSH Desktop ${DESKTOP_SOURCE.version}, Harness ${DESKTOP_SOURCE.harnessVersion}`);
} else if (args[0] === "--help") {
  console.log("Install the original DSH Desktop 2.0.7, then run npm run desktop. Set DSH_DESKTOP_EXECUTABLE for a custom installation. --source uses the unmodified pinned source build.");
} else {
  const source = args[0] === "--source";
  if (!source && !existsSync(native)) throw new Error(`Install the original DSH Desktop ${DESKTOP_SOURCE.version}: https://github.com/anywhere-labs/dsh-desktop/releases/tag/v${DESKTOP_SOURCE.version}`);
  if (!source) await verifyNativeDesktop(native);
  if (!existsSync(path.join(projectRoot, "dist/chatgpt/app.html")) || !existsSync(path.join(projectRoot, "dist/chatgpt/capabilities.json"))) {
    const { buildChatgpt } = await import("./build-chatgpt.mjs");
    await buildChatgpt({ root: projectRoot });
  }
  const executable = source ? process.execPath : native;
  const argv = source ? [path.join(await requireDesktopBuild(projectRoot), "lib/bin.js")] : [];
  const inherited = { ...process.env };
  loadProjectEnv(projectRoot);
  const harnessHome = process.env.DSH_HOME ?? path.join(projectRoot, ".openquantum", "dsh");
  await assertSelectedDesktopHome(harnessHome);
  await prepareOpenQuantumHarnessHome({ harnessHome, projectRoot, profileName: "desktop" });
  const environment = desktopLaunchEnvironment(projectRoot, await Promise.all([
    readFile(path.join(harnessHome, "profiles/model-routes.cordis.yml"), "utf8"),
    readFile(path.join(harnessHome, ".agent-presets/openquantum/agent.cordis.yml"), "utf8"),
  ]), inherited);
  const child = spawn(executable, argv, { cwd: harnessHome, stdio: "inherit", env: {
    ...environment, DSH_HOME: harnessHome, OPENQUANTUM_NODE_EXECUTABLE: process.execPath,
    PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH}`, DSH_TELEMETRY_DISABLED: process.env.DSH_TELEMETRY_DISABLED ?? "1",
  } });
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => child.kill(signal));
  child.once("error", error => { console.error(`DSH Desktop launch failed: ${error.message}`); process.exitCode = 1; });
  child.once("exit", (code, signal) => { process.exitCode = signal ? 1 : code ?? 1; });
}
