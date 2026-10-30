import assert from "node:assert/strict";
import test from "node:test";
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, readlink, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { execFile, fork } from "node:child_process";
import { once } from "node:events";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { sha256 } from "../scripts/lib/desktop-distribution.mjs";
import { preflightDesktopHome, prepareOpenQuantumHarnessHome } from "../scripts/lib/prepare-harness-home.mjs";
import { parseDocument } from "yaml";
import { linkDesktopProfile } from "./fixtures/desktop-profile.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const execute = promisify(execFile);
const preset = ".agent-presets/openquantum/agent.cordis.yml";

async function snapshot(directory, relative = "", files = {}) {
  for (const entry of await readdir(path.join(directory, relative), { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const name = path.posix.join(relative, entry.name), file = path.join(directory, name);
    if (entry.isDirectory()) await snapshot(directory, name, files);
    else if (entry.isSymbolicLink()) files[name] = { link: await readlink(file) };
    else files[name] = { sha256: sha256(await readFile(file)), mode: (await lstat(file)).mode & 0o777 };
  }
  return files;
}

// Small source-only payloads use the already installed dependency tree. The
// Profile fixture supplies local links so this real CLI never invokes pnpm.
async function fixture(t) {
  const directory = await mkdtemp(path.join(await realpath(tmpdir()), "oq-install-home-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const projectRoot = path.join(directory, "user data/project");
  const home = path.join(projectRoot, ".openquantum/dsh");
  await linkDesktopProfile(home);
  async function release(version) {
    const payload = path.join(directory, version);
    await mkdir(payload, { recursive: true });
    for (const name of ["runtime", "src", "scripts", "packages"]) {
      await cp(path.join(root, name), path.join(payload, name), {
        recursive: true, filter: file => path.basename(file) !== "node_modules",
      });
    }
    await mkdir(path.join(payload, ".agents/skills"), { recursive: true });
    await cp(path.join(root, ".agents/capability-packages.yml"), path.join(payload, ".agents/capability-packages.yml"));
    const manifest = JSON.parse(await readFile(path.join(root, "package.json")));
    manifest.version = version;
    await writeFile(path.join(payload, "package.json"), JSON.stringify(manifest));
    const source = path.join(payload, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml");
    await writeFile(source, `${await readFile(source, "utf8")}\n# release ${version}\n`);
    const contents = await snapshot(payload);
    const files = Object.fromEntries(Object.entries(contents).map(([name, info]) => [name, { sha256: info.sha256, mode: info.mode & 0o111 ? 0o755 : 0o644 }]));
    await writeFile(path.join(payload, "distribution.json"), JSON.stringify({ schemaVersion: 1, version, files }));
    await symlink(path.join(root, "node_modules"), path.join(payload, "node_modules"), process.platform === "win32" ? "junction" : "dir");
    return payload;
  }
  const install = payload => execute(process.execPath, [path.join(payload, "scripts/prepare-installed-desktop.mjs"), payload, projectRoot], { maxBuffer: 4 * 1024 * 1024 });
  return { projectRoot, home, release, install };
}

test("installed CLI rolls back a late Home failure and can run the previous release again", { timeout: 90000 }, async t => {
  const f = await fixture(t);
  const old = await f.release("1.0.0"), next = await f.release("2.0.0");
  assert.equal(JSON.parse((await f.install(old)).stdout).version, "1.0.0");
  const marker = path.join(f.home, ".openquantum-credential-migration.json");
  await writeFile(marker, "invalid fixture document", { mode: 0o600 });
  // Exercise rollback after a real credential-layout migration, without any key
  // from the user's environment or an external account.
  await writeFile(path.join(f.home, ".credentials.yaml"), "version: 1\nrefs:\n  OQ_FIXTURE: fixture-value\nrecords: {}\n", { mode: 0o600 });
  await mkdir(path.join(f.home, "sessions"), { recursive: true });
  await writeFile(path.join(f.home, "sessions/user-note.txt"), "preserve unrelated user content");
  // An SDK may contain arbitrary workspace trees. Installation snapshots must
  // not traverse the environment root at all.
  const sdk = path.join(f.home, ".openquantum/capabilities/environments/python/fixture/workspace");
  await mkdir(sdk, { recursive: true });
  await writeFile(path.join(sdk, "preserve.txt"), "existing SDK environment");
  const before = await snapshot(f.projectRoot);
  const dependencies = await readlink(path.join(f.projectRoot, "node_modules"));
  const presetDependencies = await readlink(path.join(f.home, ".agent-presets/openquantum/node_modules"));
  await assert.rejects(f.install(next), /JSON|Unexpected token/);
  assert.deepEqual(await snapshot(f.projectRoot), before);
  assert.equal(await readlink(path.join(f.projectRoot, "node_modules")), dependencies);
  assert.equal(await readlink(path.join(f.home, ".agent-presets/openquantum/node_modules")), presetDependencies);
  assert.equal(JSON.parse(await readFile(path.join(f.projectRoot, ".openquantum/desktop-distribution.json"))).version, "1.0.0");
  await rm(marker);
  assert.equal(JSON.parse((await f.install(old)).stdout).version, "1.0.0");
  assert.equal(JSON.parse((await f.install(next)).stdout).version, "2.0.0");
  assert.match(await readFile(path.join(f.home, preset), "utf8"), /release 2\.0\.0/);
  await assert.rejects(f.install(old), /Refusing to downgrade/);
});

test("preflight validates the preserved source preset before replacing any programs", { timeout: 90000 }, async t => {
  const f = await fixture(t);
  const old = await f.release("1.0.0"), next = await f.release("2.0.0");
  await f.install(old);
  const relative = "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml";
  const filename = path.join(f.projectRoot, relative);
  const document = parseDocument(await readFile(filename, "utf8"), { customTags: [{ tag: "tag:yaml.org,2002:js", resolve: value => value }] });
  const config = document.contents.items.find(row => row.get("id") === "persona").get("config", true);
  config.set("prefix", "conflicting user text");
  await writeFile(filename, document.toString());
  const before = await snapshot(f.projectRoot);
  await assert.rejects(preflightDesktopHome({ harnessHome: f.home, projectRoot: f.projectRoot, sourceRoot: next, preservedFiles: [relative] }), /prefix\/text/);
  await assert.rejects(f.install(next), /prefix\/text/);
  assert.deepEqual(await snapshot(f.projectRoot), before);
  config.delete("prefix");
  config.set("text", "My preserved project instructions");
  const custom = document.toString();
  await writeFile(filename, custom);
  await prepareOpenQuantumHarnessHome({ harnessHome: f.home, projectRoot: f.projectRoot, profileName: "web" });
  const ledgerFile = path.join(f.home, ".openquantum-home.json");
  const ledger = JSON.parse(await readFile(ledgerFile, "utf8"));
  delete ledger.files["cordis.patch.yml"];
  await writeFile(ledgerFile, JSON.stringify(ledger));
  assert.equal(JSON.parse((await f.install(next)).stdout).version, "2.0.0");
  assert.equal(await readFile(filename, "utf8"), custom);
  assert.match(await readFile(path.join(f.home, preset), "utf8"), /My preserved project instructions/);
  assert.match(await readFile(path.join(f.home, preset), "utf8"), /openquantum-adaptive-capabilities/);
});

test("immutable launcher recovers a killed upgrade before importing a broken project entry", { skip: process.platform === "win32", timeout: 15000 }, async t => {
  const directory = await mkdtemp(path.join(await realpath(tmpdir()), "oq-bootstrap-recovery-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const projectRoot = path.join(directory, "project"), script = path.join(projectRoot, "scripts/run-desktop.mjs");
  await mkdir(path.dirname(script), { recursive: true });
  await writeFile(script, 'console.log("recovered installed entry");\n');
  const worker = path.join(directory, "interrupted.mjs");
  await writeFile(worker, `import { withDesktopInstall } from ${JSON.stringify(pathToFileURL(path.join(root, "scripts/lib/desktop-install-transaction.mjs")).href)};
import { writeFile } from "node:fs/promises";
await withDesktopInstall(${JSON.stringify(projectRoot)}, async ({ begin }) => {
  const tx = await begin();
  await tx.capture(${JSON.stringify(script)});
  await writeFile(${JSON.stringify(script)}, 'import "./missing-upgrade-module.mjs";');
  process.send("written");
  await new Promise(() => setInterval(() => {}, 1000));
});`);
  const child = fork(worker, [], { stdio: ["ignore", "pipe", "pipe", "ipc"] });
  t.after(() => { if (child.exitCode === null) child.kill("SIGKILL"); });
  await once(child, "message");
  const closed = once(child, "exit");
  child.kill("SIGKILL");
  await closed;
  const output = await execute(process.execPath, [path.join(root, "scripts/start-installed-desktop.mjs"), projectRoot]);
  assert.equal(output.stdout.trim(), "recovered installed entry");
  await assert.rejects(readFile(path.join(projectRoot, ".openquantum/desktop-install-journal.json")), { code: "ENOENT" });
});

test("installed CLI rejects an incompatible Home before replacing programs or receipts", { timeout: 90000 }, async t => {
  const f = await fixture(t);
  const old = await f.release("1.0.0"), next = await f.release("2.0.0");
  await f.install(old);
  await writeFile(path.join(f.home, preset), '- id: persona\n  name: "@deepseek-ai/dsh-persona"\n  config:\n    prefix: user instructions\n    text: different instructions\n');
  const before = await snapshot(f.projectRoot);
  const dependencies = await readlink(path.join(f.projectRoot, "node_modules"));
  await assert.rejects(f.install(next), /prefix\/text/);
  assert.deepEqual(await snapshot(f.projectRoot), before);
  assert.equal(await readlink(path.join(f.projectRoot, "node_modules")), dependencies);
});
