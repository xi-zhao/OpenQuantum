import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareOpenQuantumHarnessHome, preflightDesktopHome } from "../scripts/lib/prepare-harness-home.mjs";
import { sha256 } from "../scripts/lib/desktop-distribution.mjs";
import { linkDesktopProfile } from "./fixtures/desktop-profile.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
for (const order of [["web", "desktop", "web", "desktop"], ["desktop", "web", "desktop", "web"]]) {
  test(`shared Home retains ownership through ${order.join(" → ")}`, async t => {
    const home = await mkdtemp(path.join(await realpath(tmpdir()), "oq-home-roundtrip-"));
    t.after(() => rm(home, { recursive: true, force: true }));
    await linkDesktopProfile(home);
    for (const profileName of order) {
      const prepared = await prepareOpenQuantumHarnessHome({ harnessHome: home, projectRoot, profileName });
      const patch = await readFile(prepared.patchTarget, "utf8");
      assert.match(patch, /openquantum-web-capabilities/);
      const preset = await readFile(path.join(prepared.presetTarget, "agent.cordis.yml"), "utf8");
      assert.equal(preset.includes("id: openquantum-adaptive-capabilities"), profileName === "desktop");
      const state = JSON.parse(await readFile(path.join(home, ".openquantum-home.json")));
      assert.equal(state.files[".agent-presets/openquantum/agent.cordis.yml"], sha256(preset));
      const global = await readFile(path.join(home, "cordis.patch.yml")).catch(error => { if (error.code === "ENOENT") return null; throw error; });
      if (global) assert.equal(state.files["cordis.patch.yml"], sha256(global));
      else assert.equal(profileName, "desktop");
    }
    await prepareOpenQuantumHarnessHome({ harnessHome: home, projectRoot, profileName: "web" });
    const ledger = path.join(home, ".openquantum-home.json");
    const legacy = JSON.parse(await readFile(ledger, "utf8"));
    delete legacy.files["cordis.patch.yml"];
    await writeFile(ledger, JSON.stringify(legacy));
    // Older Web launches wrote the exact default patch without updating the ledger.
    await preflightDesktopHome({ harnessHome: home, projectRoot });
    const route = path.join(home, "profiles/model-routes.cordis.yml");
    const custom = '# user route\n- id: user-provider\n  config: {}\n';
    await writeFile(route, custom);
    for (const profileName of ["web", "desktop"]) {
      const result = await prepareOpenQuantumHarnessHome({ harnessHome: home, projectRoot, profileName });
      assert.ok(result.preservedFiles.includes("profiles/model-routes.cordis.yml"));
      assert.equal(await readFile(route, "utf8"), custom);
    }
    await prepareOpenQuantumHarnessHome({ harnessHome: home, projectRoot, profileName: "desktop" });
    const preset = path.join(home, ".agent-presets/openquantum/agent.cordis.yml");
    const edited = `${await readFile(preset, "utf8")}# user customization\n`;
    await writeFile(preset, edited);
    const state = await readFile(path.join(home, ".openquantum-home.json"), "utf8");
    await assert.rejects(prepareOpenQuantumHarnessHome({ harnessHome: home, projectRoot, profileName: "web" }), /user edits/);
    assert.equal(await readFile(preset, "utf8"), edited);
    assert.equal(await readFile(path.join(home, ".openquantum-home.json"), "utf8"), state);
  });
}
