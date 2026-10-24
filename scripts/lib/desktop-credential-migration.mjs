import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseDocument, stringify } from "yaml";
import { withFileLock, writeFileAtomic } from "@deepseek-ai/dsh-atomic-write";
import { assertNoLinks, sha256 } from "./desktop-distribution.mjs";

const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const validRefs = value => record(value) && Object.entries(value).every(([key, secret]) =>
  /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && typeof secret === "string" && secret.length > 0);

// The simple 2.0.0 desktop uses flat credential references and has no account
// login. Preserve the entire versioned document before projecting its refs;
// login grants remain recoverable in that private archive, never in logs.
export async function migrateDesktopCredentials(home) {
  const file = path.join(home, ".credentials.yaml");
  await assertNoLinks(file);
  const info = await lstat(file).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  if (!info) return { migrated: false };
  if (!info.isFile() || info.size > 2 * 1024 * 1024 || process.platform !== "win32" && (info.mode & 0o077)) {
    throw new Error("Credential migration requires an owner-only ordinary file");
  }
  await assertNoLinks(`${file}.lock`);
  return withFileLock(file, async () => {
    await assertNoLinks(file);
    const locked = await lstat(file);
    if (!locked.isFile() || process.platform !== "win32" && (locked.mode & 0o077)) throw new Error("Credential migration requires an owner-only ordinary file");
    const raw = await readFile(file, "utf8");
    const document = parseDocument(raw, { uniqueKeys: true, prettyErrors: false });
    if (document.errors.length) throw new Error("Invalid credential document; original kept unchanged");
    let data;
    try { data = document.toJS() ?? {}; } catch { throw new Error("Invalid credential document; original kept unchanged"); }
    if (validRefs(data)) return { migrated: false };
    if (!record(data) || data.version !== 1 || Object.keys(data).some(key => !["version", "refs", "records"].includes(key)) || !validRefs(data.refs ?? {})) {
      throw new Error("Unsupported credential layout; original kept unchanged");
    }
    const records = data.records ?? {};
    // Structured API keys cannot be mapped to flat refs without provider-specific
    // knowledge. Refuse them; only archive the login grants absent from this UI.
    if (!record(records) || Object.values(records).some(value => !record(value) || value.kind !== "grant"
      || !Object.hasOwn(value, "payload") || Object.keys(value).some(key => !["kind", "payload"].includes(key)))) {
      throw new Error("Unsupported credential records; original kept unchanged");
    }
    const backup = path.join(".openquantum-migrations", "credentials-v1", sha256(raw), ".credentials.yaml");
    const destination = path.join(home, backup);
    await assertNoLinks(destination);
    await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
    try { await writeFile(destination, raw, { mode: 0o600, flag: "wx", flush: true }); }
    catch (error) { if (error.code !== "EEXIST") throw error; }
    await assertNoLinks(destination);
    const archived = await lstat(destination);
    if (!archived.isFile() || process.platform !== "win32" && (archived.mode & 0o077)) throw new Error("Credential archive must be an owner-only ordinary file; original kept unchanged");
    if (await readFile(destination, "utf8") !== raw) throw new Error("Credential archive differs; original kept unchanged");
    if (await readFile(file, "utf8") !== raw) throw new Error("Credentials changed during migration; retry after closing the other host");
    await assertNoLinks(file);
    await writeFileAtomic(file, stringify(data.refs ?? {}), { mode: 0o600, dirMode: 0o700 });
    return { migrated: true, backup, archivedLoginGrants: Object.keys(records).length };
  });
}
