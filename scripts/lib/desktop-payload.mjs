import { cp, lstat, mkdir, readFile, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { assertNoLinks, desktopPayloadIdentity, sha256 } from "./desktop-distribution.mjs";

// An app bundle can be replaced in place. Keep the already verified payload in
// the same version store as capability packages so rollback has real old bytes.
export async function stageDesktopPayload(payload, dataRoot, runtimes) {
  const manifest = JSON.parse(await readFile(path.join(payload, "distribution.json"), "utf8"));
  const target = path.join(dataRoot, "versions", desktopPayloadIdentity(manifest));
  await assertNoLinks(target);
  async function verify(directory) {
    for (const [relative, entry] of Object.entries(manifest.files)) {
      if (path.isAbsolute(relative) || relative.includes("\\") || relative.includes(":") || relative.split("/").some(part => !part || part === ".." || part === ".")) throw new Error("Invalid Desktop payload path");
      await assertNoLinks(path.join(directory, relative));
      if (sha256(await readFile(path.join(directory, relative))) !== entry.sha256) throw new Error(`Damaged installation payload: ${relative}`);
    }
  }
  async function existingPayload() {
    const existing = await lstat(target).catch(error => { if (error.code === "ENOENT") return null; throw error; });
    if (!existing) return false;
    await assertNoLinks(path.join(target, "openquantum/distribution.json"));
    const staged = JSON.parse(await readFile(path.join(target, "openquantum/distribution.json"), "utf8"));
    if (!existing.isDirectory() || JSON.stringify(staged) !== JSON.stringify(manifest)) {
      throw new Error("Existing Desktop payload does not match its version identity");
    }
    await verify(path.join(target, "openquantum"));
    return true;
  }
  if (await existingPayload()) return path.join(target, "openquantum");
  await verify(payload);
  await mkdir(path.dirname(target), { recursive: true });
  const staging = `${target}.${randomUUID()}.tmp`;
  try {
    await cp(payload, path.join(staging, "openquantum"), { recursive: true, dereference: true });
    if (runtimes) await cp(runtimes, path.join(staging, "runtimes"), { recursive: true, dereference: true });
    await verify(path.join(staging, "openquantum"));
    try { await rename(staging, target); }
    catch (error) {
      if (!["EEXIST", "ENOTEMPTY"].includes(error.code) || !await existingPayload()) throw error;
    }
  } finally { await rm(staging, { recursive: true, force: true }); }
  return path.join(target, "openquantum");
}
