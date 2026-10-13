import assert from "node:assert/strict";
import { mkdtemp, realpath, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { createRequire, findPackageJSON } from "node:module";

import {
  composeEntries,
  loadOverlayPatches,
} from "@deepseek-ai/dsh-app-boot";
import { DESKTOP_SOURCE, desktopPackageDirectory } from "../scripts/lib/desktop-source.mjs";

import { prepareOpenQuantumHarnessHome } from "../scripts/lib/prepare-harness-home.mjs";
import { DESKTOP_PROFILE_BUNDLE, DESKTOP_PROFILE_PATCH } from "../scripts/lib/desktop-profile-bundle.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

const desktopRoot = desktopPackageDirectory(projectRoot);
const desktopBuilt = existsSync(path.join(desktopRoot, "lib/profile.js"));

test("pins a Desktop source build for the same Harness family", async () => {
  const [openQuantumManifest, pnpmManifest] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../node_modules/pnpm/package.json", import.meta.url), "utf8")
      .then(JSON.parse),
  ]);

  assert.equal(openQuantumManifest.dependencies["@deepseek-ai/dsh"], DESKTOP_SOURCE.harnessVersion);
  assert.equal(openQuantumManifest.dependencies["dsh-plugin-desktop"], undefined);
  assert.equal(openQuantumManifest.devDependencies["dsh-plugin-desktop"], undefined);
  assert.equal(openQuantumManifest.devDependencies.electron, undefined);
  assert.equal(openQuantumManifest.overrides.pnpm, "11.26.0");
  assert.equal(pnpmManifest.version, "11.26.0");
});

test("composes the Desktop shell around the OpenQuantum Harness home", { skip: !desktopBuilt }, async (t) => {
  const { prepareDesktopProfile } = await import(pathToFileURL(path.join(desktopRoot, "lib/profile.js")));
  const { createDesktopWebProfile } = await import(pathToFileURL(path.join(desktopRoot, "lib/profile-manager.js")));
  const { installProfilePackageResolver } = await import(pathToFileURL(path.join(desktopRoot, "lib/module-resolution.js")));
  const desktopManifest = JSON.parse(await readFile(path.join(desktopRoot, "package.json"), "utf8"));
  assert.equal(desktopManifest.version, DESKTOP_SOURCE.version);
  assert.equal(desktopManifest.dependencies["@deepseek-ai/dsh"], DESKTOP_SOURCE.harnessVersion);
  const sandboxRoot = await mkdtemp(
    path.join(await realpath(tmpdir()), "openquantum-desktop-integration-"),
  );
  const harnessHome = path.join(sandboxRoot, "dsh");
  t.after(() => rm(sandboxRoot, { recursive: true, force: true }));
  createDesktopWebProfile(harnessHome, "existing");
  const nativePatchFile = path.join(harnessHome, "profiles/existing/cordis.patch.yml");
  const nativePatch = '# native user preference\n- id: agent-default-model\n  config:\n    provider: user-local\n    model: user-model\n';
  await writeFile(nativePatchFile, nativePatch);

  const { modelRoutesTarget, patchTarget } = await prepareOpenQuantumHarnessHome({
    harnessHome,
    projectRoot,
    profileName: "desktop",
  });
  const prepared = prepareDesktopProfile(
    "1",
    harnessHome,
    process.platform,
  );
  for (const name of ["harness-web-branding", "harness-web-capabilities", "harness-web-learning", "harness-web-locales", "harness-web-updates", "harness-desktop-profile"]) {
    const manifest = findPackageJSON(`@openquantum/${name}`, pathToFileURL(path.join(harnessHome, "profiles/desktop/package.json")));
    assert.ok(manifest.endsWith(path.join(name, "package.json")));
  }
  const desktopPackageUrl = pathToFileURL(path.join(harnessHome, "profiles/desktop/package.json"));
  const disposeResolver = installProfilePackageResolver(desktopPackageUrl.href);
  try {
    for (const name of ["branding", "capabilities", "learning", "locales", "updates"]) {
      assert.ok(createRequire(desktopPackageUrl).resolve(`@openquantum/harness-web-${name}/package.json`).endsWith("package.json"));
    }
  } finally { disposeResolver(); }
  const rows = new Map();
  for (const row of composeEntries([prepared.patches])) {
    if (typeof row.id === "string") rows.set(row.id, row);
  }

  assert.equal(patchTarget, path.join(harnessHome, DESKTOP_PROFILE_PATCH));
  assert.equal(rows.get("desktop-shell")?.name, "dsh-plugin-desktop");
  assert.equal(rows.get("openquantum-desktop-branding")?.name, "@openquantum/harness-web-branding/desktop");
  assert.deepEqual(rows.get("openquantum-desktop-branding")?.inject, ["desktopRuntime"]);
  assert.deepEqual(rows.get("desktop-shell")?.inject, ["openquantumDesktopIcon"]);
  assert.equal(
    rows.get("openquantum-web-branding")?.name,
    "@openquantum/harness-web-branding",
  );
  assert.equal(
    rows.get("openquantum-web-capabilities")?.name,
    "@openquantum/harness-web-capabilities",
  );
  assert.equal(rows.get("agent-presets")?.config?.default, "openquantum");
  assert.equal(rows.get("openquantum-web-branding")?.config?.minimalUi, true);
  assert.equal(rows.get("openquantum-web-capabilities")?.config?.channels, false);
  assert.equal(rows.get("llm-deepseek")?.disabled, true);
  assert.equal(rows.get("llm-pi-ai")?.disabled, true);
  assert.notEqual(rows.get("desktop-updates")?.disabled, true, "upstream owns native updates");
  assert.equal(rows.get("openquantum-web-updates")?.name, "@openquantum/harness-web-updates");
  assert.equal(
    rows.get("openquantum-model-routes")?.name,
    "@deepseek-ai/cordis-plugin-include",
  );
  assert.equal(
    path.resolve(
      path.dirname(prepared.rootConfig),
      rows.get("openquantum-model-routes")?.config?.path,
    ),
    modelRoutesTarget,
  );

  const modelRouteRows = loadOverlayPatches(
    "openquantum-desktop-integration",
    modelRoutesTarget,
  );
  assert.equal(modelRouteRows.length, 1);
  assert.equal(modelRouteRows[0]?.id, "openquantum-llm-pi-ai");
  assert.equal(
    modelRouteRows[0]?.name,
    "@deepseek-ai/dsh-llm-pi-ai",
  );
  assert.deepEqual(modelRouteRows[0]?.config?.providers, {});
  assert.equal(rows.get("agent-default-model")?.config?.provider, "");
  assert.equal(rows.get("agent-default-model")?.config?.model, "");

  createDesktopWebProfile(harnessHome, "fresh");
  for (const name of ["existing", "fresh"]) {
    const native = prepareDesktopProfile("1", harnessHome, process.platform, name);
    const entries = composeEntries([native.patches]);
    assert.ok(entries.some(row => row.id === "desktop-shell"));
    assert.ok(!entries.some(row => row.name?.startsWith("@openquantum/")), "native Profiles do not load unavailable OpenQuantum packages");
    assert.ok(!entries.some(row => row.id?.startsWith("openquantum-")), "native Profiles do not inherit OpenQuantum routes or settings");
    const manifest = JSON.parse(await readFile(path.join(harnessHome, "profiles", name, "package.json")));
    assert.ok(!manifest.dsh.profile.bundles.includes(DESKTOP_PROFILE_BUNDLE));
    if (name === "existing") {
      assert.equal(await readFile(nativePatchFile, "utf8"), nativePatch);
      assert.equal(entries.find(row => row.id === "agent-default-model")?.config?.provider, "user-local");
    }
  }
});

test("registers extensions without changing upstream Desktop files", { skip: !desktopBuilt }, async (t) => {
  const original = new Map();
  for (const file of await readdir(path.join(desktopRoot, "lib"))) {
    if (file.endsWith(".js")) original.set(file, await readFile(path.join(desktopRoot, "lib", file)));
  }
  const home = await mkdtemp(path.join(await realpath(tmpdir()), "oq-unmodified-desktop-"));
  t.after(() => rm(home, { recursive: true, force: true }));
  await prepareOpenQuantumHarnessHome({ harnessHome: home, projectRoot, profileName: "desktop" });
  const userPatch = '# User overrides stay after the OpenQuantum bundle.\n- id: openquantum-web-branding\n  config:\n    minimalUi: false\n';
  const userPatchFile = path.join(home, "profiles/desktop/cordis.patch.yml");
  await writeFile(userPatchFile, userPatch);
  await prepareOpenQuantumHarnessHome({ harnessHome: home, projectRoot, profileName: "desktop" });
  const manifest = JSON.parse(await readFile(path.join(home, "profiles/desktop/package.json")));
  assert.equal(Object.keys(manifest.dependencies).filter(name => name.startsWith("@openquantum/")).length, 6);
  assert.equal(manifest.dsh.profile.bundles.filter(name => name === DESKTOP_PROFILE_BUNDLE).length, 1);
  assert.ok(!manifest.dsh.profile.bundles.includes("@openquantum/harness-web-branding"));
  assert.equal(await readFile(userPatchFile, "utf8"), userPatch);
  const { prepareDesktopProfile } = await import(pathToFileURL(path.join(desktopRoot, "lib/profile.js")));
  const entries = composeEntries([prepareDesktopProfile("1", home, process.platform).patches]);
  assert.equal(entries.find(row => row.id === "openquantum-web-branding")?.config?.minimalUi, false);
  for (const [file, content] of original) assert.deepEqual(await readFile(path.join(desktopRoot, "lib", file)), content);
});
