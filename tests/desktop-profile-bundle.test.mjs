import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DESKTOP_MODEL_ROUTES, LEGACY_DESKTOP_MODEL_ROUTES, DESKTOP_PROFILE_BUNDLE, DESKTOP_PROFILE_DEFAULTS, DESKTOP_PROFILE_PATCH, desktopHomePatchMigration, desktopProfileManifest } from "../scripts/lib/desktop-profile-bundle.mjs";
import { sha256 } from "../scripts/lib/desktop-distribution.mjs";
import { writeManagedHomeFiles } from "../scripts/lib/managed-home-files.mjs";
import { prepareOpenQuantumHarnessHome } from "../scripts/lib/prepare-harness-home.mjs";
import { adoptLegacyDesktopRoutes, desktopModelDefault, clearRemovedDesktopModelSelection } from "../scripts/lib/desktop-model-routes.mjs";

import { bundleRows, migrateLegacyModelSettings } from "../scripts/lib/prepare-model-profiles.mjs";
import { parseDocument } from "yaml";

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
  const defaults = path.join(home, DESKTOP_PROFILE_DEFAULTS);
  await mkdir(path.dirname(profile), { recursive: true });
  await mkdir(path.dirname(defaults), { recursive: true });
  await writeFile(path.join(home, DESKTOP_MODEL_ROUTES), '- id: llm-pi-ai\n  config:\n    providers: {}\n');
  await writeFile(defaults, '- id: agent-default-model\n  config:\n    provider: openquantum-public\n    model: old-example\n');
  const user = '- id: agent-default-model\n  config:\n    provider: user-local\n    model: user-model\n';
  await writeFile(profile, user);
  await clearRemovedDesktopModelSelection(home, ["openquantum-public"]);
  assert.equal(await readFile(profile, "utf8"), user);
  await rm(profile);
  await clearRemovedDesktopModelSelection(home, ["openquantum-public"]);
  const saved = await readFile(profile, "utf8");
  assert.match(saved, /provider: ""/);
  assert.match(saved, /model: ""/);
  await assert.rejects(readFile(path.join(home, "settings.yaml")), { code: "ENOENT" });
});


test("adopts edited legacy routes under the native row ID without losing the selected model", async t => {
  const home = await isolatedHome(t);
  const legacyPath = path.join(home, LEGACY_DESKTOP_MODEL_ROUTES);
  const target = path.join(home, DESKTOP_MODEL_ROUTES);
  const legacy = `# user provider note
- id: openquantum-llm-pi-ai
  name: '@deepseek-ai/dsh-llm-pi-ai'
  config:
    providers:
      openquantum-public:
        displayName: My openquantum-llm-pi-ai gateway
        apiKeyEnv: MY_PROVIDER_KEY
        baseURL: !!js process.env.MY_PROVIDER_URL || 'https://user.example.test/v1'
        models:
          - id: user-model
- id: unrelated-plugin
  config:
    value: openquantum-llm-pi-ai
`;
  await mkdir(path.dirname(legacyPath), { recursive: true });
  await writeFile(legacyPath, legacy);
  await writeFile(path.join(home, ".openquantum-home.json"), JSON.stringify({ files: { [LEGACY_DESKTOP_MODEL_ROUTES]: sha256("previous shipped defaults") } }));
  await adoptLegacyDesktopRoutes(home, {});
  const migrated = await readFile(target, "utf8");
  const parse = text => parseDocument(text, { customTags: [{ tag: "tag:yaml.org,2002:js", resolve: value => value }] }).toJS();
  const expected = parse(legacy);
  expected[0].id = "llm-pi-ai";
  assert.deepEqual(parse(migrated), expected);
  assert.match(migrated, /# user provider note/);
  assert.match(migrated, /!!js/);
  assert.equal(await readFile(legacyPath, "utf8"), legacy, "keep the source as recovery evidence");

  const shipped = '- id: llm-pi-ai\n  config: { providers: {} }\n';
  assert.deepEqual(await writeManagedHomeFiles(home, new Map([[DESKTOP_MODEL_ROUTES, shipped]])), [DESKTOP_MODEL_ROUTES]);
  const defaults = '- id: agent-default-model\n  config: { provider: openquantum-public, model: user-model }\n';
  await writeFile(path.join(home, DESKTOP_PROFILE_DEFAULTS), desktopModelDefault(defaults, migrated, ["openquantum-public"]));
  await writeFile(path.join(home, "settings.yaml"), 'agent-default-model:\n  provider: openquantum-public\n  model: user-model\n');
  await migrateLegacyModelSettings(home, [["desktop", bundleRows(target, path.join(home, DESKTOP_PROFILE_DEFAULTS))]]);
  await clearRemovedDesktopModelSelection(home, ["openquantum-public"]);
  const profile = bundleRows(path.join(home, "profiles/desktop/cordis.patch.yml"));
  assert.deepEqual(profile.find(row => row.id === "agent-default-model").config, { provider: "openquantum-public", model: "user-model" });
  await adoptLegacyDesktopRoutes(home, {});
  assert.equal(await readFile(target, "utf8"), migrated, "repeat preparation preserves the migrated route");
});

test("legacy route adoption leaves shipped defaults and an existing target alone", async t => {
  const home = await isolatedHome(t);
  const legacyPath = path.join(home, LEGACY_DESKTOP_MODEL_ROUTES);
  const target = path.join(home, DESKTOP_MODEL_ROUTES);
  const legacy = '- id: openquantum-llm-pi-ai\n  config: { providers: {} }\n';
  await mkdir(path.dirname(legacyPath), { recursive: true });
  await writeFile(legacyPath, legacy);
  await adoptLegacyDesktopRoutes(home, { [LEGACY_DESKTOP_MODEL_ROUTES]: sha256(legacy) });
  await assert.rejects(readFile(target), { code: "ENOENT" });
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, "# user owns the current target\n[]\n");
  await adoptLegacyDesktopRoutes(home, {});
  assert.equal(await readFile(target, "utf8"), "# user owns the current target\n[]\n");
});

for (const invalid of ["- [broken", "config: {}\n", "- id: openquantum-llm-pi-ai\n- id: llm-pi-ai\n", "- id: openquantum-llm-pi-ai\n- id: openquantum-llm-pi-ai\n"]) {
  test(`legacy route adoption refuses ambiguous or invalid YAML: ${JSON.stringify(invalid)}`, async t => {
    const home = await isolatedHome(t);
    const legacyPath = path.join(home, LEGACY_DESKTOP_MODEL_ROUTES);
    await mkdir(path.dirname(legacyPath), { recursive: true });
    await writeFile(legacyPath, invalid);
    await assert.rejects(adoptLegacyDesktopRoutes(home, {}), /Invalid|ambiguous|sequence/);
    await assert.rejects(readFile(path.join(home, DESKTOP_MODEL_ROUTES)), { code: "ENOENT" });
    assert.equal(await readFile(legacyPath, "utf8"), invalid);
  });
}
