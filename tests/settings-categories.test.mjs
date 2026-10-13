import assert from "node:assert/strict";
import test from "node:test";
import { readFile, mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { parse } from "yaml";
import { CAPABILITY_CATEGORIES, CAPABILITY_CATEGORY_IDS, capabilityCategory } from "../src/settings/capability-categories.mjs";
import { readCapabilityCatalog } from "../src/settings/server/capability-catalog.mjs";
import { createRuntimeReadinessReader } from "../src/readiness/server/runtime-readiness.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

test("every built-in capability has one display category; unknown entries remain discoverable", async () => {
  const policy = parse(await readFile(path.join(root, ".agents/capability-packages.yml"), "utf8"));
  assert.deepEqual(Object.keys(CAPABILITY_CATEGORY_IDS).sort(), policy.packages.map(item => item.id).sort());
  const allowed = new Set(CAPABILITY_CATEGORIES.map(item => item.id));
  const labels = JSON.parse(await readFile(path.join(root, "runtime/openquantum/web-locales/openquantum-source.json"), "utf8"))["settings.openquantumCapabilities"];
  for (const category of CAPABILITY_CATEGORIES) assert.ok(labels.en[category.title] && labels.zh[category.title]);
  for (const item of policy.packages) {
    assert.ok(allowed.has(capabilityCategory(item.id)), item.id);
    assert.notEqual(capabilityCategory(item.id), "other", item.id);
  }
  for (const unknown of ["my-custom-skill", "constructor", "__proto__", undefined]) assert.equal(capabilityCategory(unknown), "other");
  const catalog = await readCapabilityCatalog(root);
  assert.equal(capabilityCategory("flagquantum-workbench"), "circuits");
  assert.equal(catalog.servers.qiskit_docs, "reference");
  assert.equal(catalog.tools.quantum_practices, "reference");
  assert.equal(catalog.tools.bash, "reference");
  assert.equal(catalog.tools.mcp__hamiltonian_local__simulate_hamiltonian, "simulation");
  for (const category of Object.values(catalog.servers)) assert.ok(allowed.has(category));
});

test("runtime categories never add observations or change their states, and tolerate unavailable metadata", async t => {
  const observer = {
    listModelRoutes: () => [], listActivePresetScopes: () => ["test"],
    listSkills: () => ({ complete: true, skills: [{ name: "qec-memory-experiment" }, { name: "my-custom-skill" }] }),
    listTools: () => [{ name: "mcp__hamiltonian_local__simulate_hamiltonian" }, { name: "my_custom_tool" }],
  };
  const options = { observer, now: () => new Date("2026-10-13T00:00:00Z") };
  const baseline = await createRuntimeReadinessReader(options)();
  const categorized = await createRuntimeReadinessReader({ ...options, projectRoot: root })();
  assert.equal(categorized.checks[1].items.find(item => item.id === "qec-memory-experiment").category, "qec");
  assert.equal(categorized.checks[2].items.find(item => item.id === "my_custom_tool").category, "other");
  const { categories, ...observations } = categorized;
  assert.deepEqual(categories, CAPABILITY_CATEGORIES);
  observations.checks = observations.checks.map(check => ({ ...check, items: check.items.map(({ category: _category, ...item }) => item) }));
  assert.deepEqual(observations, baseline);
  const temporary = await mkdtemp(path.join(os.tmpdir(), "oq-category-metadata-"));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  await mkdir(path.join(temporary, ".agents"));
  await writeFile(path.join(temporary, ".agents/capability-packages.yml"), "packages: [invalid");
  assert.deepEqual(await createRuntimeReadinessReader({ ...options, projectRoot: temporary })(), baseline);
});

test("Desktop category search and status filters preserve all entries and never write settings", async () => {
  const servers = [
    { serverName: "circuit_local", displayName: "Circuit Service", category: "circuits", enabled: true },
    { serverName: "noise_local", displayName: "Noise Service", category: "qec", enabled: false },
    { serverName: "custom_local", displayName: "Custom Service", category: "future-category", enabled: true },
  ].map(item => ({ ...item, toolCallTimeoutMs: 180000, requiredCredentialRefs: [] }));
  const snapshot = { categories: CAPABILITY_CATEGORIES, mcpServers: servers, skills: [], mcpCredentials: [], mcpRevision: "original" };
  const state = [snapshot, null, {}, "mcp"];
  let slot = 0, plugin, render;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children: children.flat(Infinity) }),
    useState(initial) {
      const index = slot++;
      if (!Object.hasOwn(state, index)) state[index] = initial;
      return [state[index], next => { state[index] = typeof next === "function" ? next(state[index]) : next; }];
    },
    useCallback: callback => callback, useEffect() {},
  };
  runInNewContext(await readFile(path.join(root, "runtime/openquantum/web-capabilities/client.js"), "utf8"), {
    __ModuleLoader__: { load: ({ factory }) => { plugin = factory(() => react); } },
    fetch: () => { assert.fail("Filtering must not request or mutate settings"); },
  });
  plugin.apply({
    effect: register => register(), locale: { register: () => () => {}, bind: () => key => key },
    get: () => ({ isLoopback: true }), remote: { credentials: {} },
    slots: { inject: (_name, register) => register(), register: (entry, component) => { if (entry.id === "openquantum-capabilities") render = component; return () => {}; } },
  });
  const flatten = node => node && typeof node === "object" ? [node, ...node.children.flatMap(flatten)] : [];
  const tree = () => { slot = 0; return flatten(render({ loopback: true, credentialOperations: {} })); };
  const filter = (label, value) => tree().find(node => node.props["aria-label"] === label).props.onChange({ currentTarget: { value } });
  const titles = () => tree().filter(node => node.type === "h3").map(node => node.children[0]);
  assert.deepEqual(titles(), servers.map(item => item.displayName));
  assert.ok(tree().filter(node => node.props.className === "oq-cap-category").every(node => node.props.open === false));
  filter("搜索名称或用途", "ＮＯＩＳＥ");
  assert.deepEqual(titles(), ["Noise Service"]);
  assert.ok(tree().find(node => node.props.className === "oq-cap-category").props.open);
  filter("按启用状态筛选", "enabled");
  assert.deepEqual(titles(), []);
  const clear = tree().find(node => node.type === "button" && node.children.includes("清除筛选"));
  clear.props.onClick();
  assert.deepEqual(titles(), servers.map(item => item.displayName));
  filter("按用途筛选", "other");
  assert.deepEqual(titles(), ["Custom Service"]);
  assert.deepEqual(servers.map(item => item.enabled), [true, false, true]);
  assert.equal(snapshot.mcpRevision, "original");
});
