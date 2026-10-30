import { lstat, readFile, mkdir, rename, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { sha256, assertNoLinks } from "./desktop-distribution.mjs";

export async function readManagedHomeState(home, legacyFiles = {}) {
  const stateFile = path.join(home, ".openquantum-home.json");
  await assertNoLinks(stateFile);
  return readFile(stateFile, "utf8").then(JSON.parse).catch(error => {
    if (error.code === "ENOENT") return { schemaVersion: 1, files: legacyFiles };
    throw error;
  });
}

// Only replace files that still match our previous output. A missing managed
// file is an intentional deletion; edited defaults are offered for review.
export async function writeManagedHomeFiles(home, files, legacyFiles = {}) {
  const stateFile = path.join(home, ".openquantum-home.json");
  const previous = await readManagedHomeState(home, legacyFiles);
  const next = { schemaVersion: 1, files: { ...previous.files }, defaults: { ...previous.defaults } };
  const preserved = [], changes = [];
  for (const [relative, content] of files) {
    if (path.isAbsolute(relative) || relative.split(/[\\/]/).some(part => part === "..")) throw new Error("Invalid managed Home path");
    const target = path.join(home, relative);
    await assertNoLinks(target);
    const current = await readFile(target).catch(error => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    const hash = sha256(content);
    next.defaults[relative] = hash;
    if (current && sha256(current) === hash) {
      next.files[relative] = hash;
      continue;
    }
    if ((current && ![previous.files[relative], legacyFiles[relative]].includes(sha256(current))) || (!current && previous.files[relative])) {
      preserved.push(relative);
      const review = path.join(home, ".openquantum-defaults", hash, relative);
      await assertNoLinks(review);
      changes.push({ target: review, content });
      continue;
    }
    next.files[relative] = hash;
    changes.push({ target, content });
  }
  // Finish validation before changing any managed target or its ownership record.
  for (const { target, content } of changes) {
    await mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.${randomUUID()}.tmp`;
    const mode = (await lstat(target).catch(error => { if (error.code === "ENOENT") return null; throw error; }))?.mode & 0o777;
    try {
      await writeFile(temporary, content, { mode: mode || 0o600, flag: "wx" });
      await rename(temporary, target);
    } finally { await rm(temporary, { force: true }); }
  }
  await mkdir(home, { recursive: true });
  const temporary = `${stateFile}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(next, null, 2), { mode: 0o600, flag: "wx" });
    await rename(temporary, stateFile);
  } finally { await rm(temporary, { force: true }); }
  return preserved;
}
