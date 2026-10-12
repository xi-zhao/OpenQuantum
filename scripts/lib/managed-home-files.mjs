import { lstat, readFile, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { sha256 } from "./desktop-distribution.mjs";

// Only replace files that still match our previous output. A missing managed
// file is an intentional deletion; edited defaults are offered for review.
export async function writeManagedHomeFiles(home, files, legacyFiles = {}) {
  const stateFile = path.join(home, ".openquantum-home.json");
  const previous = await readFile(stateFile, "utf8").then(JSON.parse).catch(error => {
    if (error.code === "ENOENT") return { files: legacyFiles };
    throw error;
  });
  const next = { schemaVersion: 1, files: { ...previous.files } };
  async function noLinks(filename) {
    let current = path.resolve(filename);
    while (current !== path.dirname(current)) {
      const info = await lstat(current).catch(error => { if (error.code === "ENOENT") return null; throw error; });
      if (info?.isSymbolicLink()) throw new Error(`Refusing to write through a link: ${current}`);
      current = path.dirname(current);
    }
  }
  await noLinks(stateFile);
  const preserved = [];
  for (const [relative, content] of files) {
    if (path.isAbsolute(relative) || relative.split(/[\\/]/).some(part => part === "..")) throw new Error("Invalid managed Home path");
    const target = path.join(home, relative);
    await noLinks(target);
    const current = await readFile(target).catch(error => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    const hash = sha256(content);
    next.files[relative] = hash;
    if (current && sha256(current) === hash) continue;
    if ((current && sha256(current) !== previous.files[relative]) || (!current && previous.files[relative])) {
      preserved.push(relative);
      const review = path.join(home, ".openquantum-defaults", hash, relative);
      await noLinks(review);
      await mkdir(path.dirname(review), { recursive: true });
      await writeFile(review, content);
      continue;
    }
    await mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, content);
    await rename(temporary, target);
  }
  await mkdir(home, { recursive: true });
  const temporary = `${stateFile}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(next, null, 2));
  await rename(temporary, stateFile);
  return preserved;
}
