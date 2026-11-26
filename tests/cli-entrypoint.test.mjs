import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { isMainModule } from "../src/lib/cli-entrypoint.mjs";

const run = promisify(execFile), root = fileURLToPath(new URL("../", import.meta.url));

test("CLI entry detection resolves both URL and argv through parent case and symlinks", async t => {
  const directory = await mkdtemp(path.join(tmpdir(), "oq-entry-case-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const physical = path.join(directory, "OpenQuantum"), differentlyCased = path.join(directory, "openQuantum");
  await mkdir(physical);
  let caseInsensitive = true;
  try { await realpath(differentlyCased); }
  catch (error) {
    assert.equal(error.code, "ENOENT"); caseInsensitive = false;
    await symlink(physical, differentlyCased, process.platform === "win32" ? "junction" : "dir");
  }
  const entry = path.join(physical, "cli.mjs"), alias = path.join(directory, "linked parent");
  await symlink(physical, alias, process.platform === "win32" ? "junction" : "dir");
  await writeFile(entry, `import { isMainModule } from ${JSON.stringify(new URL("../src/lib/cli-entrypoint.mjs", import.meta.url).href)};\nif (isMainModule(import.meta.url)) console.log(JSON.stringify({ran: true}));\n`);
  const calls = [entry, path.join(differentlyCased, "cli.mjs"), path.join(alias, "cli.mjs")];
  if (process.platform !== "win32") {
    const fileAlias = path.join(directory, "linked-file.mjs");
    await symlink(entry, fileAlias); calls.push(fileAlias);
  }
  for (const invoked of calls) {
    assert.equal(isMainModule(pathToFileURL(entry), invoked), true);
    assert.equal(isMainModule(pathToFileURL(invoked), entry), true);
    for (const flags of [[], ["--preserve-symlinks-main"]]) {
      assert.deepEqual(JSON.parse((await run(process.execPath, [...flags, invoked])).stdout), { ran: true });
    }
  }
  const imported = await run(process.execPath, ["--input-type=module", "-e", `await import(${JSON.stringify(pathToFileURL(entry).href)})`]);
  assert.equal(imported.stdout, "", "Importing a CLI must never run its main body");
  if (!caseInsensitive) {
    const other = path.join(physical, "CLI.mjs"); await writeFile(other, "");
    assert.equal(isMainModule(pathToFileURL(entry), other), false, "Distinct files must not be lowercased into equivalence");
  }
});

test("entry detection handles absent argv and resolves nonexistent paths lexically", () => {
  assert.equal(isMainModule(import.meta.url, null), false);
  assert.equal(isMainModule(import.meta.url, ""), false);
  const missing = path.join(root, "nonexistent-cli-directory", "main.mjs");
  assert.equal(isMainModule(pathToFileURL(missing), path.join(path.dirname(missing), ".", "main.mjs")), true);
  assert.equal(isMainModule(pathToFileURL(missing), `${missing}.other`), false);
  // ENOTDIR is another nonexistent-file case, not an access denial.
  const notDirectory = path.join(fileURLToPath(import.meta.url), "main.mjs");
  assert.equal(isMainModule(pathToFileURL(notDirectory), notDirectory), true);
});

test("the actual SDK CLI emits its contract when invoked through a linked repository", async t => {
  const directory = await mkdtemp(path.join(tmpdir(), "oq-sdk-entry-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const alias = path.join(directory, "OpenQuantum");
  await symlink(root, alias, process.platform === "win32" ? "junction" : "dir");
  const command = path.join(alias, "scripts/sdk-access.mjs");
  const output = JSON.parse((await run(process.execPath, ["--preserve-symlinks-main", command, "inspect", "tenpy-ground-state"], {
    cwd: directory, env: { ...process.env, OPENQUANTUM_PLUGIN_SETTINGS_HOME: path.join(directory, "settings") },
  })).stdout);
  assert.equal(output.id, "tenpy-ground-state");
  assert.equal(await realpath(output.project), await realpath(path.join(root, ".agents/skills/tenpy-ground-state")));
  assert.ok(output.run.command);
  // The cached Skill adapter is intentionally copied beside a self-contained
  // helper; the source runtime re-export and generated copy share one source.
  assert.match(await readFile(path.join(root, "runtime/chatgpt/sdk-access.mjs"), "utf8"), /isMainModule\(import.meta.url\)/);
});
