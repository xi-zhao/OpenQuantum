import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  composeEntries,
  loadOverlayPatches,
} from "@deepseek-ai/dsh-app-boot";
import { prepareDesktopProfile } from "dsh-plugin-desktop/profile";

import { prepareOpenQuantumHarnessHome } from "../scripts/lib/prepare-harness-home.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

test("pins a Desktop release built for the same Harness family", async () => {
  const [openQuantumManifest, desktopManifest, pnpmManifest] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(
      new URL(
        "../node_modules/dsh-plugin-desktop/package.json",
        import.meta.url,
      ),
      "utf8",
    ).then(JSON.parse),
    readFile(new URL("../node_modules/pnpm/package.json", import.meta.url), "utf8")
      .then(JSON.parse),
  ]);

  assert.equal(openQuantumManifest.dependencies["@deepseek-ai/dsh"], "0.1.0-rc.6");
  assert.equal(openQuantumManifest.dependencies["dsh-plugin-desktop"], undefined);
  assert.equal(openQuantumManifest.devDependencies["dsh-plugin-desktop"], "2.0.0");
  assert.equal(openQuantumManifest.devDependencies.electron, "43.4.0");
  assert.equal(desktopManifest.version, "2.0.0");
  assert.equal(desktopManifest.dependencies["@deepseek-ai/dsh"], "0.1.0-rc.6");
  assert.equal(openQuantumManifest.overrides.pnpm, "11.8.0");
  assert.equal(pnpmManifest.version, "11.8.0");
});

test("composes the Desktop shell around the OpenQuantum Harness home", async (t) => {
  const sandboxRoot = await mkdtemp(
    path.join(tmpdir(), "openquantum-desktop-integration-"),
  );
  const harnessHome = path.join(sandboxRoot, "dsh");
  t.after(() => rm(sandboxRoot, { recursive: true, force: true }));

  const { modelRoutesTarget, patchTarget } = await prepareOpenQuantumHarnessHome({
    harnessHome,
    projectRoot,
  });
  const prepared = prepareDesktopProfile(
    "1",
    harnessHome,
    process.platform,
  );
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
