import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { assertCompatibleHarnessHome } from "../scripts/lib/harness-home-compatibility.mjs";
import { prepareOpenQuantumHarnessHome } from "../scripts/lib/prepare-harness-home.mjs";

async function fixture(t, files) {
  const root = await mkdtemp(path.join(tmpdir(), "oq-home-compatibility-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = path.join(root, "home");
  await mkdir(home);
  for (const [relative, contents] of Object.entries(files)) {
    const filename = path.join(home, relative);
    await mkdir(path.dirname(filename), { recursive: true });
    await writeFile(filename, contents);
  }
  return { root, home };
}

async function snapshot(directory) {
  const files = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    files[entry.name] = entry.isDirectory() ? await snapshot(filename) : (await readFile(filename)).toString("base64");
  }
  return files;
}

for (const log of ["log.v4.jsonl", "log.v4.jsonl.zstd", "log.v5.jsonl", "session.v4.jsonl", "session.v4.jsonl.zstd", "session.v5.jsonl.zstd"]) {
  test(`refuses ${log} before changing any Home or project file`, async t => {
    const { root, home } = await fixture(t, {
      [`sessions/research/${log}`]: "newer session evidence\n",
      "settings.yaml": "agent-default-model:\n  provider: fixture-provider\n  model: existing-model\n",
    });
    const before = await snapshot(root);
    await assert.rejects(prepareOpenQuantumHarnessHome({
      projectRoot: path.join(root, "absent-project"), harnessHome: home,
    }), /V[45] sessions.*2\.0\.0.*separate V3-compatible Home/);
    assert.deepEqual(await snapshot(root), before);
  });
}

for (const profile of ["web", "desktop", "acp"]) {
  test(`refuses a newer ${profile} profile even without a session log`, async t => {
    const { home } = await fixture(t, {
      [`profiles/${profile}/package.json`]: JSON.stringify({ dependencies: { "@deepseek-ai/dsh-web-app": "0.2.1-rc.2" } }),
    });
    const before = await snapshot(home);
    await assert.rejects(assertCompatibleHarnessHome(home), /Incompatible Harness dependency/);
    assert.deepEqual(await snapshot(home), before);
  });
}

for (const marker of [
  "profiles/.agent-presets/presets.cordis.yml",
  ".openquantum-extensions/harness-desktop-profile/profile-defaults.cordis.yml",
]) {
  test(`preserves newer profile settings at ${marker}`, async t => {
    const { home } = await fixture(t, { [marker]: "# retained newer settings\n" });
    const before = await snapshot(home);
    await assert.rejects(assertCompatibleHarnessHome(home), /newer Harness profile.*separate V3-compatible Home/);
    assert.deepEqual(await snapshot(home), before);
  });
}

test("accepts the matching 0.1.0-rc.6 Home without touching V3 history or settings", async t => {
  const { home } = await fixture(t, {
    "sessions/research/log.v3.jsonl": "retained V3 session evidence\n",
    "settings.yaml": "llm-pi-ai:\n  providers: {}\n",
    "profiles/desktop/package.json": JSON.stringify({ dependencies: { "@deepseek-ai/dsh": "0.1.0-rc.6" } }),
  });
  const before = await snapshot(home);
  await assertCompatibleHarnessHome(home);
  assert.deepEqual(await snapshot(home), before);
});
