import { access, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

export const DESKTOP_SOURCE = Object.freeze({
  repository: "https://github.com/anywhere-labs/dsh-desktop.git",
  revision: "ee1235e1dd1675bbd6c52cfbe3f27b27bcfcfa81",
  version: "2.0.0",
  harnessVersion: "0.1.0-rc.6",
  sessionFormatVersion: 0,
});

export function desktopSourceDirectory(projectRoot) {
  return path.join(projectRoot, ".openquantum/external/dsh-desktop-2.0.0");
}

export function desktopPackageDirectory(projectRoot) {
  return path.join(desktopSourceDirectory(projectRoot), "dsh-plugin-desktop");
}

export async function requireDesktopBuild(projectRoot) {
  const directory = desktopPackageDirectory(projectRoot);
  try {
    const manifest = JSON.parse(await readFile(path.join(directory, "package.json"), "utf8"));
    if (manifest.version !== DESKTOP_SOURCE.version || manifest.dependencies["@deepseek-ai/dsh"] !== DESKTOP_SOURCE.harnessVersion) {
      throw new Error("Desktop and Harness versions differ from the pinned source.");
    }
    const marker = JSON.parse(await readFile(path.join(desktopSourceDirectory(projectRoot), ".openquantum-build.json"), "utf8"));
    if (marker.revision !== DESKTOP_SOURCE.revision) throw new Error("Desktop build revision differs from the pinned source.");
    const { verifyDesktopDependencySecurity } = await import("./desktop-dependencies.mjs");
    await verifyDesktopDependencySecurity(desktopSourceDirectory(projectRoot), marker.dependencySecurity);
    const { stdout } = await promisify(execFile)("git", ["rev-parse", "HEAD"], { cwd: desktopSourceDirectory(projectRoot) });
    if (stdout.trim() !== DESKTOP_SOURCE.revision) throw new Error("Desktop checkout differs from the pinned source.");
    await access(path.join(directory, "lib/bin.js"));
    return directory;
  } catch (error) {
    throw new Error("请先运行 npm run desktop:setup，构建与当前 Harness 匹配的桌面端。", { cause: error });
  }
}
