import assert from "node:assert/strict";
import { mkdtemp, realpath, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { findPackageJSON } from "node:module";

import {
  composeEntries,
  loadOverlayPatches,
} from "@deepseek-ai/dsh-app-boot";
import { DESKTOP_SOURCE, desktopPackageDirectory } from "../scripts/lib/desktop-source.mjs";

import { prepareOpenQuantumHarnessHome } from "../scripts/lib/prepare-harness-home.mjs";

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
  const desktopManifest = JSON.parse(await readFile(path.join(desktopRoot, "package.json"), "utf8"));
  assert.equal(desktopManifest.version, DESKTOP_SOURCE.version);
  assert.equal(desktopManifest.dependencies["@deepseek-ai/dsh"], DESKTOP_SOURCE.harnessVersion);
  const sandboxRoot = await mkdtemp(
    path.join(await realpath(tmpdir()), "openquantum-desktop-integration-"),
  );
  const harnessHome = path.join(sandboxRoot, "dsh");
  t.after(() => rm(sandboxRoot, { recursive: true, force: true }));

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
  for (const name of ["harness-web-branding", "harness-web-capabilities", "harness-web-learning", "harness-web-locales", "harness-web-updates"]) {
    const manifest = findPackageJSON(`@openquantum/${name}`, pathToFileURL(path.join(harnessHome, "profiles/desktop/package.json")));
    assert.ok(manifest.endsWith(path.join(name, "package.json")));
  }
  const rows = new Map();
  for (const row of composeEntries([prepared.patches])) {
    if (typeof row.id === "string") rows.set(row.id, row);
  }

  assert.equal(path.dirname(patchTarget), harnessHome);
  assert.equal(rows.get("desktop-shell")?.name, "dsh-plugin-desktop");
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
});

test("registers extensions without changing upstream Desktop files", { skip: !desktopBuilt }, async (t) => {
  const original = new Map();
  for (const file of await readdir(path.join(desktopRoot, "lib"))) {
    if (file.endsWith(".js")) original.set(file, await readFile(path.join(desktopRoot, "lib", file)));
  }
  const home = await mkdtemp(path.join(await realpath(tmpdir()), "oq-unmodified-desktop-"));
  t.after(() => rm(home, { recursive: true, force: true }));
  await prepareOpenQuantumHarnessHome({ harnessHome: home, projectRoot, profileName: "desktop" });
  await prepareOpenQuantumHarnessHome({ harnessHome: home, projectRoot, profileName: "desktop" });
  const manifest = JSON.parse(await readFile(path.join(home, "profiles/desktop/package.json")));
  assert.equal(Object.keys(manifest.dependencies).filter(name => name.startsWith("@openquantum/")).length, 5);
  assert.ok(!manifest.dsh.profile.bundles.includes("@openquantum/harness-web-branding"));
  for (const [file, content] of original) assert.deepEqual(await readFile(path.join(desktopRoot, "lib", file)), content);
});
