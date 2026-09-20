import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, realpath, rm } from "node:fs/promises";
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
import { brandDesktopJavaScript, prepareOpenQuantumDesktop } from "../scripts/lib/desktop-branding.mjs";

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
  const brandedRoot = await prepareOpenQuantumDesktop(projectRoot);
  const { prepareDesktopProfile } = await import(pathToFileURL(path.join(brandedRoot, "lib/profile.js")));
  const desktopManifest = JSON.parse(await readFile(path.join(desktopRoot, "package.json"), "utf8"));
  assert.equal(desktopManifest.version, DESKTOP_SOURCE.version);
  assert.equal(desktopManifest.dependencies["@deepseek-ai/dsh"], DESKTOP_SOURCE.harnessVersion);
  const sandboxRoot = await mkdtemp(
    path.join(tmpdir(), "openquantum-desktop-integration-"),
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
    assert.equal(manifest, path.join(harnessHome, "profiles/desktop/node_modules/@openquantum", name, "package.json"));
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
  assert.equal(rows.get("llm-deepseek")?.disabled, true);
  assert.equal(rows.get("llm-pi-ai")?.disabled, true);
  assert.equal(rows.get("desktop-updates")?.disabled, true, "the OpenQuantum deployment cannot offer upstream DSH installers");
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
  assert.equal(
    modelRouteRows[0]?.config?.providers?.["openquantum-public"]
      ?.displayName,
    "OpenQuantum Public Gateway",
  );
});

test("prepares native OQ assets while retaining the pinned upstream package and dependencies", { skip: !desktopBuilt }, async () => {
  const original = new Map();
  for (const file of await readdir(path.join(desktopRoot, "lib"))) {
    if (file.endsWith(".js")) original.set(path.join("lib", file), await readFile(path.join(desktopRoot, "lib", file), "utf8"));
  }
  const brandedRoot = await prepareOpenQuantumDesktop(projectRoot);
  assert.equal(await prepareOpenQuantumDesktop(projectRoot), brandedRoot);
  assert.notEqual(await realpath(brandedRoot), await realpath(desktopRoot));
  assert.deepEqual(await readFile(path.join(brandedRoot, "package.json")), await readFile(path.join(desktopRoot, "package.json")));
  assert.equal(await realpath(path.join(brandedRoot, "node_modules")), await realpath(path.join(desktopRoot, "node_modules")));
  const changes = brandDesktopJavaScript(original);
  assert.equal(changes.size, 4);
  assert.ok([...changes.values()].some((source) => source.includes('return preference === "zh" ? "zh" : preference ? "en" : void 0;')));
  for (const [file, source] of original) {
    assert.equal(await readFile(path.join(desktopRoot, file), "utf8"), source, "upstream must stay unchanged");
    assert.equal(await readFile(path.join(brandedRoot, file), "utf8"), changes.get(file) ?? source);
  }

  const sharp = createRequire(path.join(desktopRoot, "package.json"))("sharp");
  const appIcon = sharp(path.join(brandedRoot, "build/app-icon-mac.png"));
  const metadata = await appIcon.metadata();
  assert.equal(metadata.width, 1024);
  assert.equal(metadata.height, 1024);
  const { data: corner } = await appIcon.extract({ left: 0, top: 0, width: 100, height: 100 }).raw().toBuffer({ resolveWithObject: true });
  assert.ok(corner.every((value, index) => index % 4 !== 3 || value === 0), "macOS icon safe area stays transparent");
  for (const [filename, size] of [["tray-iconTemplate.png", 16], ["tray-iconTemplate@2x.png", 32]]) {
    const { data, info } = await sharp(path.join(brandedRoot, "build", filename)).raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, size);
    assert.equal(info.height, size);
    assert.equal(info.channels, 4);
    assert.ok(data.every((value, index) => index % 4 === 3 || value === 0), "template RGB must be black");
    const alpha = data.filter((value, index) => index % 4 === 3);
    assert.ok(alpha.some((value) => value > 0), "tray mark is visible");
    assert.ok(alpha.some((value) => value === 0), "tray background is transparent");
  }
  const changedUpstream = new Map(original);
  for (const [file, source] of changedUpstream) changedUpstream.set(file, source.replace('windowTitle: "DeepSeek Harness Desktop"', 'windowTitle: "New upstream title"'));
  assert.throws(() => brandDesktopJavaScript(changedUpstream), /window title matched 0 times/);
});
