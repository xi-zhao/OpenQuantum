import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, stat, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { parse } from "yaml";
import { migrateDesktopCredentials } from "../scripts/lib/desktop-credential-migration.mjs";

async function fixture(t, raw) {
  const home = await mkdtemp(path.join(await realpath(tmpdir()), "oq-credentials-"));
  t.after(() => rm(home, { recursive: true, force: true }));
  const file = path.join(home, ".credentials.yaml");
  if (raw !== undefined) await writeFile(file, raw, { mode: 0o600 });
  return { home, file };
}

test("versioned refs retain exact values, login grants are archived, and a second launch is unchanged", async t => {
  const raw = '# original document\nversion: 1\nrefs:\n  API_KEY: "  fixture-secret  "\nrecords:\n  account/session:\n    kind: grant\n    payload: { token: fixture-grant }\n';
  const { home, file } = await fixture(t, raw);
  const result = await migrateDesktopCredentials(home);
  assert.equal(result.migrated, true);
  assert.equal(result.archivedLoginGrants, 1);
  assert.deepEqual(parse(await readFile(file, "utf8")), { API_KEY: "  fixture-secret  " });
  assert.equal(await readFile(path.join(home, result.backup), "utf8"), raw);
  if (process.platform !== "win32") {
    assert.equal((await stat(file)).mode & 0o777, 0o600);
    assert.equal((await stat(path.join(home, result.backup))).mode & 0o777, 0o600);
  }
  const before = await readFile(file, "utf8");
  assert.deepEqual(await migrateDesktopCredentials(home), { migrated: false });
  assert.equal(await readFile(file, "utf8"), before);
});

for (const raw of [
  "version: 2\nrefs: {KEY: secret-sentinel}\n",
  "version: 1\nrefs: {KEY: 123}\n",
  "version: 1\nrefs: {KEY: secret-sentinel}\nrecords: {provider/key: {kind: api-key, key: secret-sentinel}}\n",
  "version: 1\nrefs: {KEY: secret-sentinel}\nextra: true\n",
  "version: 1\nrefs: {KEY: secret-sentinel, KEY: another-secret}\n",
]) test("unknown or ambiguous credential layouts fail without changing or exposing values", async t => {
  const { home, file } = await fixture(t, raw);
  await assert.rejects(migrateDesktopCredentials(home), error => /Unsupported credential|Invalid credential/.test(error.message) && !error.message.includes("secret-sentinel"));
  assert.equal(await readFile(file, "utf8"), raw);
});

test("legacy credentials and an absent store remain unchanged", async t => {
  const { home, file } = await fixture(t);
  assert.deepEqual(await migrateDesktopCredentials(home), { migrated: false });
  const raw = '# retained comment\nAPI_KEY: fixture-secret\n';
  await writeFile(file, raw, { mode: 0o600 });
  assert.deepEqual(await migrateDesktopCredentials(home), { migrated: false });
  assert.equal(await readFile(file, "utf8"), raw);
});

test("unsafe permissions and linked credential destinations are rejected before writes", { skip: process.platform === "win32" }, async t => {
  const { home, file } = await fixture(t, "API_KEY: fixture-secret\n");
  await chmod(file, 0o644);
  await assert.rejects(migrateDesktopCredentials(home), /owner-only/);
  await rm(file);
  await mkdir(path.join(home, "private"));
  await writeFile(path.join(home, "private/key"), "API_KEY: fixture-secret\n", { mode: 0o600 });
  await symlink(path.join(home, "private/key"), file);
  await assert.rejects(migrateDesktopCredentials(home), /link/);
  assert.equal(await readFile(file, "utf8"), "API_KEY: fixture-secret\n");
});

for (const conflict of ["different-bytes", "unsafe-mode"]) test(`existing credential archive rejects ${conflict}`, { skip: process.platform === "win32" }, async t => {
  const raw = "version: 1\nrefs: {KEY: fixture-secret}\n";
  const { home, file } = await fixture(t, raw);
  const digest = createHash("sha256").update(raw).digest("hex");
  const archive = path.join(home, ".openquantum-migrations/credentials-v1", digest, ".credentials.yaml");
  await mkdir(path.dirname(archive), { recursive: true });
  await writeFile(archive, conflict === "different-bytes" ? "other original\n" : raw, { mode: 0o600 });
  if (conflict === "unsafe-mode") await chmod(archive, 0o644);
  await assert.rejects(migrateDesktopCredentials(home), /archive/);
  assert.equal(await readFile(file, "utf8"), raw);
});
