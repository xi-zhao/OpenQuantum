import { open, readFile, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { DESKTOP_SOURCE } from "./desktop-source.mjs";
import { assertCompatibleHarnessHome } from "./harness-home-compatibility.mjs";

export function desktopUserData() {
  return process.platform === "darwin" ? path.join(homedir(), "Library/Application Support/DSH Desktop") : path.join(process.env.APPDATA || homedir(), "DSH Desktop");
}

export async function assertSelectedDesktopHome(home, userData = desktopUserData()) {
  const state = await readFile(path.join(userData, "data-directory/state.json"), "utf8").then(JSON.parse).catch(error => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!state) return;
  if (state.version !== 1 || typeof state.activeHome !== "string" || !path.isAbsolute(state.activeHome)) throw new Error("Invalid DSH Desktop data-directory setting");
  await assertCompatibleHarnessHome(state.activeHome);
  const canonical = value => realpath(value).catch(error => { if (error.code === "ENOENT") return path.resolve(value); throw error; });
  if (await canonical(state.activeHome) !== await canonical(home)) throw new Error(`DSH Desktop has a different saved data directory. Select this Home in its native Data Directory settings before launching OpenQuantum: ${home}`);
}

// Read only package metadata from Electron's standard ASAR container. No app
// code executes and no signed application resource is rewritten.
export async function verifyNativeDesktop(executable) {
  const resources = process.platform === "darwin" ? path.resolve(executable, "../../Resources") : path.join(path.dirname(executable), "resources");
  const file = await open(path.join(resources, "app.asar"), "r");
  try {
    const prefix = Buffer.alloc(16);
    await file.read(prefix, 0, 16, 0);
    const headerBytes = prefix.readUInt32LE(12);
    if (headerBytes < 1 || headerBytes > 64 * 1024 * 1024) throw new Error("Invalid ASAR header");
    const header = Buffer.alloc(headerBytes);
    await file.read(header, 0, headerBytes, 16);
    const entry = JSON.parse(header.toString()).files["package.json"];
    if (!entry || entry.size > 1024 * 1024 || !/^\d+$/.test(entry.offset)) throw new Error("Missing DSH package metadata");
    const bytes = Buffer.alloc(entry.size);
    await file.read(bytes, 0, entry.size, 8 + prefix.readUInt32LE(4) + Number(entry.offset));
    const manifest = JSON.parse(bytes.toString());
    if (manifest.name !== "dsh-plugin-desktop" || manifest.version !== DESKTOP_SOURCE.version || manifest.dependencies?.["@deepseek-ai/dsh"] !== DESKTOP_SOURCE.harnessVersion) {
      throw new Error(`Use original DSH Desktop ${DESKTOP_SOURCE.version} with Harness ${DESKTOP_SOURCE.harnessVersion}; installed client is incompatible`);
    }
    return { version: manifest.version, harnessVersion: manifest.dependencies["@deepseek-ai/dsh"] };
  } finally { await file.close(); }
}
