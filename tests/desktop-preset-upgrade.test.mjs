import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";
import { Config as PersonaConfig } from "@deepseek-ai/dsh-persona";
import { desktopPreset, desktopYamlOptions, migrateDesktopPresetSchema } from "../scripts/lib/desktop-profile-config.mjs";
import { planDesktopPreparation, migrateDesktopPreparation } from "../scripts/lib/desktop-preparation-migration.mjs";
import { writeManagedHomeFiles } from "../scripts/lib/managed-home-files.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const relative = ".agent-presets/openquantum/agent.cordis.yml";
const source = await readFile(path.join(root, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml"), "utf8");
const persona = raw => parseDocument(raw, desktopYamlOptions).toJSON().find(row => row.name === "@deepseek-ai/dsh-persona").config;
async function homeFixture(t) {
  const home = await mkdtemp(path.join(await realpath(tmpdir()), "oq-preset-upgrade-"));
  t.after(() => rm(home, { recursive: true, force: true }));
  return home;
}

test("untouched legacy and adaptive defaults adopt the current release template", async t => {
  for (const onDemand of [false, true]) {
    const home = await homeFixture(t);
    const document = parseDocument(source, desktopYamlOptions);
    const config = document.contents.items.find(row => row.get("id") === "persona").get("config", true);
    config.set("prefix", "old shipped persona"); config.delete("text");
    const old = desktopPreset(document.toString(), root, process.execPath, { onDemand });
    await writeManagedHomeFiles(home, new Map([[relative, old]]));
    const before = await readFile(path.join(home, relative), "utf8");
    const plan = await planDesktopPreparation(root, home);
    assert.equal(await readFile(path.join(home, relative), "utf8"), before, "planning must not change the Home");
    assert.equal(persona(plan.preset).text, persona(source).text);
    assert.doesNotThrow(() => PersonaConfig(persona(plan.preset)));
    await migrateDesktopPreparation(root, home);
    const after = await readFile(path.join(home, relative), "utf8");
    assert.equal(persona(after).prefix, undefined);
    assert.equal(persona(after).text, persona(source).text);
    await migrateDesktopPreparation(root, home);
    assert.equal(await readFile(path.join(home, relative), "utf8"), after);
  }
});

test("the released v0.8.4 preset upgrades to the current Persona schema", async t => {
  const home = await homeFixture(t);
  // Exact v0.8.4 tag snapshot (SHA-256 d1c1253f210dcb63e4a3271f110680a1b0d4ee956a4a1e31c2541b04eee79b26).
  // Tests do not depend on local Git refs at runtime.
  const released = await readFile(new URL("./fixtures/desktop-v0.8.4-agent.cordis.yml", import.meta.url), "utf8");
  assert.equal(typeof persona(released).prefix, "string");
  await writeManagedHomeFiles(home, new Map([[relative, released]]));
  await migrateDesktopPreparation(root, home);
  const migrated = await readFile(path.join(home, relative), "utf8");
  assert.equal(persona(migrated).prefix, undefined);
  assert.equal(persona(migrated).text, persona(source).text);
  assert.doesNotThrow(() => PersonaConfig(persona(migrated)));
  assert.match(migrated, /openquantum-adaptive-capabilities/);
});

test("user persona and custom rows survive schema migration without becoming managed defaults", async t => {
  const home = await homeFixture(t);
  const defaults = desktopPreset(source, root, process.execPath, { onDemand: true });
  await writeManagedHomeFiles(home, new Map([[relative, defaults]]));
  const document = parseDocument(defaults, desktopYamlOptions);
  const config = document.contents.items.find(row => row.get("id") === "persona").get("config", true);
  config.set("prefix", "My research instructions"); config.delete("text");
  document.add({ id: "user-research", name: "./personal.mjs", disabled: true });
  const custom = document.toString();
  await writeFile(path.join(home, relative), custom);
  await migrateDesktopPreparation(root, home);
  const migrated = await readFile(path.join(home, relative), "utf8");
  assert.equal(persona(migrated).text, "My research instructions");
  assert.match(migrated, /user-research/);
  assert.deepEqual(await writeManagedHomeFiles(home, new Map([[relative, defaults]])), [relative]);
  assert.equal(await readFile(path.join(home, relative), "utf8"), migrated);
  assert.equal(await readFile(path.join(home, ".openquantum/capabilities/legacy-preset.yml"), "utf8"), custom);
  await migrateDesktopPreparation(root, home);
  assert.equal(await readFile(path.join(home, relative), "utf8"), migrated);
});

test("ambiguous persona migrations fail before settings or markers are written", async t => {
  const home = await homeFixture(t);
  const raw = '- id: persona\n  name: "@deepseek-ai/dsh-persona"\n  config:\n    prefix: older\n    text: independent\n';
  await mkdir(path.dirname(path.join(home, relative)), { recursive: true });
  await writeFile(path.join(home, relative), raw);
  await assert.rejects(planDesktopPreparation(root, home), /prefix\/text/);
  assert.equal(await readFile(path.join(home, relative), "utf8"), raw);
  await assert.rejects(readFile(path.join(home, ".openquantum/capabilities/settings.json")), { code: "ENOENT" });
  assert.equal(migrateDesktopPresetSchema(source), source);
});
