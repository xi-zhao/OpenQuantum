import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DESKTOP_PROFILE_BUNDLE, DESKTOP_PROFILE_PATCH, desktopHomePatchMigration, desktopProfileManifest } from "../scripts/lib/desktop-profile-bundle.mjs";
import { sha256 } from "../scripts/lib/desktop-distribution.mjs";
import { writeManagedHomeFiles } from "../scripts/lib/managed-home-files.mjs";
import { prepareOpenQuantumHarnessHome } from "../scripts/lib/prepare-harness-home.mjs";
import { clearRemovedDesktopModelSelection } from "../scripts/lib/desktop-model-routes.mjs";

async function isolatedHome(t) {
  const home = await mkdtemp(path.join(await realpath(tmpdir()), "oq-profile-bundle-"));
  t.after(() => rm(home, { recursive: true, force: true }));
  return home;
}

test("keeps native and third-party bundle order while enabling OpenQuantum once", () => {
  const bundles = ["@deepseek-ai/dsh-base-profile", "@deepseek-ai/dsh-web-app", "user-bundle-a", DESKTOP_PROFILE_BUNDLE, "user-bundle-b"];
  const manifest = { name: "user-profile", dependencies: { "user-bundle-a": "1.0.0" }, dsh: { profile: { bundles, patchReload: "startup" } } };
  const next = desktopProfileManifest(manifest);
  assert.deepEqual(next.dsh.profile.bundles, [bundles[0], bundles[1], DESKTOP_PROFILE_BUNDLE, "user-bundle-a", "user-bundle-b"]);
  assert.deepEqual(desktopProfileManifest(next), next);
  assert.equal(next.dsh.profile.patchReload, "startup");
  assert.deepEqual(next.dependencies, manifest.dependencies);
  assert.deepEqual(manifest.dsh.profile.bundles, bundles);
  assert.throws(() => desktopProfileManifest({}), /missing @deepseek-ai\/dsh-web-app/);
});

for (const ownership of ["managed", "legacy"]) {
  test(`moves the ${ownership} global patch with a byte-identical backup`, async t => {
    const home = await isolatedHome(t);
    const original = Buffer.from('# original OpenQuantum settings\n- insert:\n    - id: oq\n      name: "@openquantum/harness-web-branding"\n');
    const legacy = { "cordis.patch.yml": sha256(original) };
    await writeFile(path.join(home, "cordis.patch.yml"), original);
    if (ownership === "managed") await writeFile(path.join(home, ".openquantum-home.json"), JSON.stringify({ schemaVersion: 1, files: legacy }));
    const files = await desktopHomePatchMigration(home, ownership === "legacy" ? legacy : {});
    assert.deepEqual(await readFile(path.join(home, "cordis.patch.yml")), original, "planning does not change the Home");
    assert.deepEqual(await writeManagedHomeFiles(home, files, legacy), []);
    assert.equal(await readFile(path.join(home, "cordis.patch.yml"), "utf8"), "[]\n");
    assert.deepEqual(await readFile(path.join(home, ".openquantum-migrations", sha256(original), "cordis.patch.yml")), original);
    assert.deepEqual([...await desktopHomePatchMigration(home)], [["cordis.patch.yml", "[]\n"]]);
  });
}

test("preserves custom Home overrides and rejects edited OpenQuantum activation before any write", async t => {
  const home = await isolatedHome(t);
  const filename = path.join(home, "cordis.patch.yml");
  const custom = '- id: agent-default-model\n  config:\n    provider: user-local\n    model: user-model\n';
  await writeFile(filename, custom);
  assert.equal((await desktopHomePatchMigration(home)).size, 0);
  assert.equal(await readFile(filename, "utf8"), custom);
  const edited = '# independently maintained\n- insert:\n    - id: oq\n      name: "@openquantum/harness-web-branding"\n';
  await writeFile(filename, edited);
  await writeFile(path.join(home, ".openquantum-home.json"), JSON.stringify({ files: { "cordis.patch.yml": sha256("older contents") } }));
  const project = path.join(home, "project");
  await mkdir(project);
  await assert.rejects(prepareOpenQuantumHarnessHome({ harnessHome: home, projectRoot: project, profileName: "desktop" }), /independently edited OpenQuantum patch/);
  assert.equal(await readFile(filename, "utf8"), edited);
  for (const target of [path.join(project, ".openquantum/runtime.json"), path.join(home, "project-root.mjs"), path.join(home, DESKTOP_PROFILE_PATCH)]) {
    await assert.rejects(readFile(target), { code: "ENOENT" });
  }
});

test("respects user Profile defaults after the bundle when clearing removed model selections", async t => {
  const home = await isolatedHome(t);
  const profile = path.join(home, "profiles/desktop/cordis.patch.yml");
  const bundle = path.join(home, DESKTOP_PROFILE_PATCH);
  await mkdir(path.dirname(profile), { recursive: true });
  await mkdir(path.dirname(bundle), { recursive: true });
  await writeFile(path.join(home, "profiles/model-routes.cordis.yml"), '- id: openquantum-llm-pi-ai\n  config:\n    providers: {}\n');
  await writeFile(bundle, '- id: agent-default-model\n  config:\n    provider: openquantum-public\n    model: old-example\n');
  await writeFile(profile, '- id: agent-default-model\n  config:\n    provider: user-local\n    model: user-model\n');
  await clearRemovedDesktopModelSelection(home, ["openquantum-public"]);
  await assert.rejects(readFile(path.join(home, "settings.yaml")), { code: "ENOENT" });
  await rm(profile);
  await clearRemovedDesktopModelSelection(home, ["openquantum-public"]);
  const settings = await readFile(path.join(home, "settings.yaml"), "utf8");
  assert.match(settings, /provider: ""/);
  assert.match(settings, /model: ""/);
});
