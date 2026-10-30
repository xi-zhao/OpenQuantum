import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { writeManagedHomeFiles } from "../scripts/lib/managed-home-files.mjs";
import { sha256 } from "../scripts/lib/desktop-distribution.mjs";
import { desktopEnvironmentDefaults, desktopLaunchEnvironment, persistDesktopCredentials } from "../scripts/lib/desktop-environment.mjs";
import { desktopPreset } from "../scripts/lib/desktop-profile-config.mjs";
import { Context } from "@deepseek-ai/cordis";
import { LocalCredentialProvider } from "@deepseek-ai/dsh-credentials-local";
import { createLaunchEnvironmentSnapshot } from "@deepseek-ai/dsh-launch-environment";
import { loadOverlayPatches } from "@deepseek-ai/dsh-app-boot";
import { interpolate } from "@deepseek-ai/cordis-plugin-loader";
import { prepareOpenQuantumHarnessHome } from "../scripts/lib/prepare-harness-home.mjs";
import { desktopModelRoutes, desktopModelDefault, clearRemovedDesktopModelSelection } from "../scripts/lib/desktop-model-routes.mjs";
import { parseEnv } from "node:util";

test("Desktop drops unconfigured example models while preserving explicit routes and native settings", async t => {
  const root = await mkdtemp(path.join(await realpath(tmpdir()), "oq-desktop-models-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = path.join(root, "home");
  await mkdir(path.join(home, "profiles"), { recursive: true });
  const source = await readFile(new URL("../runtime/openquantum/model-routes.cordis.yml", import.meta.url), "utf8");
  const empty = await desktopModelRoutes(source, root, home, {});
  assert.deepEqual(empty.removed, ["openquantum-public", "openquantum-private"]);
  assert.doesNotMatch(empty.content, /Kimi|GLM|Gateway/);
  const exampleEnv = parseEnv(await readFile(new URL("../.env.example", import.meta.url), "utf8"));
  assert.deepEqual((await desktopModelRoutes(source, root, home, exampleEnv)).removed, empty.removed);
  for (const [before, after] of [["kimi-k2.7-code", "user-model"], ["OpenQuantum Public Gateway", "My provider"], ["OPENQUANTUM_PUBLIC_API_KEY", "USER_KEY"]]) {
    assert.deepEqual((await desktopModelRoutes(source.replace(before, after), root, home, {})).removed, ["openquantum-private"]);
  }
  await writeFile(path.join(home, ".env"), "OPENQUANTUM_PUBLIC_BASE_URL=https://home.example.test/v1\n");
  assert.deepEqual((await desktopModelRoutes(source, root, home, exampleEnv)).removed, ["openquantum-private"]);
  await writeFile(path.join(home, ".env"), "OPENQUANTUM_PUBLIC_API_KEY=fixture-home-credential\n");
  assert.deepEqual((await desktopModelRoutes(source, root, home, exampleEnv)).removed, ["openquantum-private"]);
  await rm(path.join(home, ".env"));
  const deployment = await readFile(new URL("../runtime/openquantum/cordis.patch.yml", import.meta.url), "utf8");
  assert.match(desktopModelDefault(deployment, empty.content, empty.removed), /provider: ""/);
  assert.match(desktopModelDefault(deployment, source, empty.removed), /provider: openquantum-public/);
  const customDefault = deployment.replace("provider: openquantum-public", "provider: user-local").replace("model: kimi-k2.7-code", "model: user-model");
  assert.match(desktopModelDefault(customDefault, empty.content, empty.removed), /provider: user-local\n\s+model: user-model/);
  await writeFile(path.join(home, "profiles/model-routes.cordis.yml"), empty.content);
  await mkdir(path.join(home, "profiles/desktop"));
  await writeFile(path.join(home, "profiles/desktop/cordis.patch.yml"), '- id: agent-default-model\n  config:\n    provider: openquantum-public\n    model: kimi-k2.7-code\n');
  await writeFile(path.join(home, "cordis.patch.yml"), '- id: agent-default-model\n  name: "@deepseek-ai/dsh-agent-default-model"\n  config:\n    provider: user-local\n    model: user-model\n');
  await clearRemovedDesktopModelSelection(home, empty.removed);
  await assert.rejects(readFile(path.join(home, "settings.yaml")), { code: "ENOENT" });
  await rm(path.join(home, "profiles/desktop/cordis.patch.yml"));
  for (const source of ["", "# custom empty Home patch\n", "null\n"]) {
    await writeFile(path.join(home, "cordis.patch.yml"), source);
    await clearRemovedDesktopModelSelection(home, empty.removed);
    await assert.rejects(readFile(path.join(home, "settings.yaml")), { code: "ENOENT" });
  }
  await rm(path.join(home, "cordis.patch.yml"));
  await writeFile(path.join(home, "settings.yaml"), 'agent-default-model:\n  provider: openquantum-public\n  model: glm5.2\nui-onboarding:\n  accepted: true\n');
  await clearRemovedDesktopModelSelection(home, empty.removed);
  const saved = await readFile(path.join(home, "settings.yaml"), "utf8");
  assert.match(saved, /provider: ""/);
  assert.match(saved, /accepted: true/);
  await writeFile(path.join(home, "settings.yaml"), 'agent-default-model:\n  provider: user-local\n  model: user-model\n');
  await clearRemovedDesktopModelSelection(home, empty.removed);
  assert.match(await readFile(path.join(home, "settings.yaml"), "utf8"), /provider: user-local/);
  await writeFile(path.join(root, ".env"), "OPENQUANTUM_PUBLIC_BASE_URL=https://configured.example.test/v1\n");
  assert.deepEqual((await desktopModelRoutes(source, root, home, {})).removed, ["openquantum-private"]);
  await writeFile(path.join(home, "settings.yaml"), 'llm-pi-ai:\n  providers:\n    openquantum-private:\n      baseURL: https://user.example.test/v1\n');
  assert.deepEqual((await desktopModelRoutes(source, root, home, {})).removed, []);
  const customized = source.replace("process.env.OPENQUANTUM_PRIVATE_BASE_URL || 'https://private-api.example.invalid/v1'", "'http://localhost:9099/v1'");
  await rm(path.join(home, "settings.yaml"));
  assert.deepEqual((await desktopModelRoutes(customized, root, home, {})).removed, []);
  const context = new Context();
  context.provide("launchEnvironment", createLaunchEnvironmentSnapshot([{ source: "process", values: {} }]));
  const provider = await context.plugin(LocalCredentialProvider, { dshHome: home, watch: false });
  await context.credentials.set("OPENQUANTUM_PRIVATE_API_KEY", "test-only-fixture");
  await provider.dispose();
  assert.deepEqual((await desktopModelRoutes(source, root, home, {})).removed, []);
});

test("preflights linked Home destinations before copying any extension or locator", async t => {
  const root = await mkdtemp(path.join(await realpath(tmpdir()), "oq-home-links-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = path.join(root, "home");
  const external = path.join(root, "external");
  const project = path.join(root, "project");
  await mkdir(home);
  await mkdir(external);
  await mkdir(project);
  await symlink(external, path.join(home, ".openquantum-extensions"), process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(prepareOpenQuantumHarnessHome({ harnessHome: home, projectRoot: project, profileName: "desktop" }), /write through a link/);
  for (const filename of [path.join(project, ".openquantum/runtime.json"), path.join(home, "project-root.mjs"), path.join(external, "project-root.mjs")]) {
    await assert.rejects(readFile(filename), { code: "ENOENT" });
  }
});

test("cold native configuration preserves endpoints and referenced credentials without a launcher", async t => {
  const root = await mkdtemp(path.join(await realpath(tmpdir()), "oq-native-env-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = path.join(root, "home");
  await mkdir(home);
  await writeFile(path.join(root, ".env"), "OPENQUANTUM_PUBLIC_BASE_URL=https://native.example.test/v1\nOPENQUANTUM_DISABLE_QISKIT_MCP=1\nOQ_TEST_API_KEY=fixture-value\nOQ_OPTIONAL_TOKEN=optional-fixture\nOQ_UNREFERENCED_SECRET=never-copy\n");
  const source = "- id: route\n  config:\n    baseURL: !!js process.env.OPENQUANTUM_PUBLIC_BASE_URL || 'https://api.example.invalid/v1'\n    apiKeyEnv: OQ_TEST_API_KEY\n    optionalCredentialEnv:\n      SERVICE_TOKEN: OQ_OPTIONAL_TOKEN\n";
  const rendered = desktopEnvironmentDefaults(source, root);
  assert.doesNotMatch(rendered, /fixture-value|optional-fixture|never-copy/);
  const filename = path.join(root, "routes.yml");
  await writeFile(filename, rendered);
  const rows = loadOverlayPatches("cold-desktop", filename);
  assert.equal(interpolate(new Context(), rows[0].config).baseURL, process.env.OPENQUANTUM_PUBLIC_BASE_URL || "https://native.example.test/v1");
  const preset = desktopPreset("- id: example\n  disabled: !!js process.env.OPENQUANTUM_DISABLE_QISKIT_MCP === '1'\n", root);
  await writeFile(filename, preset);
  assert.equal(interpolate(new Context(), loadOverlayPatches("cold-desktop", filename)[0]).disabled, (process.env.OPENQUANTUM_DISABLE_QISKIT_MCP ?? "1") === "1");
  assert.deepEqual(await persistDesktopCredentials(root, home, [source]), ["OQ_TEST_API_KEY", "OQ_OPTIONAL_TOKEN"]);
  if (process.platform !== "win32") assert.equal((await stat(path.join(home, ".credentials.yaml"))).mode & 0o777, 0o600);
  // A native launch has no wrapper/project environment. The upstream provider
  // still resolves the references through its own persistent storage.
  const context = new Context();
  const launch = desktopLaunchEnvironment(root, [source], {});
  assert.equal(launch.OQ_TEST_API_KEY, undefined);
  assert.equal(launch.OPENQUANTUM_DISABLE_QISKIT_MCP, "1");
  assert.equal(desktopLaunchEnvironment(root, [source], { OQ_TEST_API_KEY: "shell-override" }).OQ_TEST_API_KEY, "shell-override");
  context.provide("launchEnvironment", createLaunchEnvironmentSnapshot([{ source: "process", values: launch }]));
  const provider = await context.plugin(LocalCredentialProvider, { dshHome: home, watch: false });
  assert.equal((await context.credentials.describe("OQ_TEST_API_KEY")).configured, true);
  assert.equal((await context.credentials.describe("OQ_OPTIONAL_TOKEN")).configured, true);
  assert.equal((await context.credentials.describe("OQ_TEST_API_KEY")).writable, true);
  await writeFile(path.join(root, ".env"), "OQ_TEST_API_KEY=replacement\n");
  assert.deepEqual(await persistDesktopCredentials(root, home, [source]), []);
  await provider.dispose();
  const reloaded = await context.plugin(LocalCredentialProvider, { dshHome: home, watch: false });
  assert.equal((await context.credentials.resolve("OQ_TEST_API_KEY")).value, "fixture-value");
  await context.credentials.unset("OQ_TEST_API_KEY");
  await reloaded.dispose();
  assert.deepEqual(await persistDesktopCredentials(root, home, [source]), []);
  const afterDeletion = await context.plugin(LocalCredentialProvider, { dshHome: home, watch: false });
  t.after(() => afterDeletion.dispose());
  assert.equal((await context.credentials.describe("OQ_TEST_API_KEY")).configured, false);
  // The native adaptive provider references its shared service fields even
  // though the old per-server MCP rows no longer appear in the active preset.
  await writeFile(path.join(root, ".env"), "PASQAL_AUTH_TOKEN=pasqal-fixture\n");
  const adaptive = "- id: openquantum-adaptive-capabilities\n  name: ./adaptive-capabilities.mjs\n";
  assert.deepEqual(await persistDesktopCredentials(root, home, [adaptive]), ["PASQAL_AUTH_TOKEN"]);
  assert.equal(desktopLaunchEnvironment(root, [adaptive], {}).PASQAL_AUTH_TOKEN, undefined);
});

test("custom worker PATH and native Home selection remain authoritative", async t => {
  const root = await mkdtemp(path.join(await realpath(tmpdir()), "oq-native-selection-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const preset = desktopPreset('- id: example\n  config:\n    transport: stdio\n    command: custom\n    env:\n      PATH: custom-runtime\n      OPENQUANTUM_NODE_EXECUTABLE: custom-node\n', root, process.execPath);
  const filename = path.join(root, "agent.yml");
  await writeFile(filename, preset);
  const row = interpolate(new Context(), loadOverlayPatches("custom-path", filename)[0]);
  assert.equal(row.config.env.PATH, path.dirname(process.execPath) + path.delimiter + "custom-runtime");
  assert.equal(row.config.env.OPENQUANTUM_NODE_EXECUTABLE, "custom-node");
  const { assertSelectedDesktopHome } = await import("../scripts/lib/native-desktop.mjs");
  const home = path.join(root, "home");
  const userData = path.join(root, "native");
  await mkdir(home);
  await mkdir(path.join(userData, "data-directory"), { recursive: true });
  await writeFile(path.join(userData, "data-directory/state.json"), JSON.stringify({ version: 1, activeHome: home }));
  await assertSelectedDesktopHome(home, userData);
  await assert.rejects(assertSelectedDesktopHome(path.join(root, "other"), userData), /different saved data directory/);
  await writeFile(path.join(home, "log.v4.jsonl"), "");
  await assert.rejects(assertSelectedDesktopHome(home, userData), /V4|v4|newer|0\.2/);
});

test("legacy Home defaults migrate even after the old private application is removed", async t => {
  const root = await mkdtemp(path.join(await realpath(tmpdir()), "oq-old-app-migration-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = path.join(root, "project");
  const payload = path.join(root, "payload");
  const home = path.join(project, ".openquantum/dsh");
  await mkdir(path.join(project, "runtime/openquantum"), { recursive: true });
  await mkdir(home, { recursive: true });
  await mkdir(path.join(payload, "node_modules/@deepseek-ai/dsh-web-app"), { recursive: true });
  const patch = "- id: agent-presets\n  config: { default: openquantum }\n";
  const desktop = "- id: desktop-updates\n  disabled: true\n";
  const upstream = { harnessVersion: "0.1.5-rc.1" };
  await writeFile(path.join(payload, "distribution.json"), JSON.stringify({ upstream }));
  await writeFile(path.join(payload, "node_modules/@deepseek-ai/dsh-web-app/cordis.patch.yml"), "- insert:\n    - id: ui-settings-account\n");
  await symlink(path.join(root, "removed-private-app", "node_modules"), path.join(project, "node_modules"), process.platform === "win32" ? "junction" : "dir");
  const files = {};
  for (const [name, content] of [["cordis.patch.yml", patch], ["desktop.cordis.patch.yml", desktop]]) {
    const relative = `runtime/openquantum/${name}`;
    await writeFile(path.join(project, relative), content);
    files[relative] = { sha256: sha256(content) };
  }
  await writeFile(path.join(project, ".openquantum/desktop-distribution.json"), JSON.stringify({ files, upstream }));
  const { productUiOverlay } = await import("../scripts/lib/product-ui-policy.mjs");
  const oldHome = `${patch}\n${desktop}\n${await productUiOverlay(payload)}`;
  await writeFile(path.join(home, "cordis.patch.yml"), oldHome);
  const { legacyDesktopHomeFiles } = await import("../scripts/lib/legacy-desktop-home.mjs");
  const legacy = await legacyDesktopHomeFiles(project, payload);
  assert.equal(legacy["cordis.patch.yml"], sha256(oldHome));
  assert.deepEqual(await writeManagedHomeFiles(home, new Map([["cordis.patch.yml", patch]]), legacy), []);
  assert.equal(await readFile(path.join(home, "cordis.patch.yml"), "utf8"), patch);
});

test("adopts verified legacy defaults and retains user edits and deletions", async t => {
  const home = await mkdtemp(path.join(await realpath(tmpdir()), "oq-home-upgrade-"));
  t.after(() => rm(home, { recursive: true, force: true }));
  await writeFile(path.join(home, "patch.yml"), "legacy");
  await writeFile(path.join(home, "provider.yml"), "personal");
  const files = new Map([["patch.yml", "native updates"], ["provider.yml", "new default"], ["preset.yml", "new preset"]]);
  await writeManagedHomeFiles(home, files, { "patch.yml": sha256("legacy"), "provider.yml": sha256("legacy provider") });
  assert.equal(await readFile(path.join(home, "patch.yml"), "utf8"), "native updates");
  assert.equal(await readFile(path.join(home, "provider.yml"), "utf8"), "personal");
  await rm(path.join(home, "preset.yml"));
  await writeManagedHomeFiles(home, files);
  await assert.rejects(readFile(path.join(home, "preset.yml")), { code: "ENOENT" });
});

test("reviewed defaults do not become the applied ownership baseline", async t => {
  const home = await mkdtemp(path.join(await realpath(tmpdir()), "oq-home-ownership-"));
  t.after(() => rm(home, { recursive: true, force: true }));
  await writeManagedHomeFiles(home, new Map([["preset.yml", "old default"]]));
  await writeFile(path.join(home, "preset.yml"), "user edit");
  assert.deepEqual(await writeManagedHomeFiles(home, new Map([["preset.yml", "new default"]])), ["preset.yml"]);
  const state = JSON.parse(await readFile(path.join(home, ".openquantum-home.json")));
  assert.equal(state.files["preset.yml"], sha256("old default"));
  assert.equal(state.defaults["preset.yml"], sha256("new default"));
  await writeFile(path.join(home, "preset.yml"), "old default");
  assert.deepEqual(await writeManagedHomeFiles(home, new Map([["preset.yml", "new default"]])), []);
  assert.equal(await readFile(path.join(home, "preset.yml"), "utf8"), "new default");
});

test("generated presets resolve workers with an unrelated cwd and system-only PATH", async t => {
  const { desktopPreset } = await import("../scripts/lib/desktop-profile-config.mjs");
  const { loadOverlayPatches } = await import("@deepseek-ai/dsh-app-boot");
  const directory = await mkdtemp(path.join(await realpath(tmpdir()), "oq-rendered-preset-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const source = await readFile(new URL("../runtime/openquantum/agent-presets/openquantum/agent.cordis.yml", import.meta.url), "utf8");
  const project = path.join(directory, "project with spaces");
  const node = path.join(directory, "runtimes/bin", process.platform === "win32" ? "node.exe" : "node");
  const filename = path.join(directory, "agent.cordis.yml");
  await writeFile(filename, desktopPreset(source, project, node, { runtimeBin: path.dirname(node) }));
  const { interpolate } = await import("@deepseek-ai/cordis-plugin-loader");
  const { Context } = await import("@deepseek-ai/cordis");
  const rows = loadOverlayPatches("desktop-home-test", filename);
  const resolved = rows.map(row => ({ ...row, config: interpolate(new Context(), row.config) }));
  const mcp = resolved.find(row => row.id === "mcp-qiskit");
  assert.equal(mcp.config.cwd, project);
  assert.equal(mcp.config.command, path.join(path.dirname(node), process.platform === "win32" ? "uvx.exe" : "uvx"));
  assert.ok(mcp.config.env.PATH.startsWith(path.dirname(node) + path.delimiter));
  const nodeMcp = resolved.find(row => row.id === "mcp-hamiltonian-simulation");
  assert.equal(nodeMcp.config.command, node);
});

test("MCP settings update the active Desktop projection without relaunching a wrapper", async t => {
  const { mkdir } = await import("node:fs/promises");
  const { desktopPresetProjection } = await import("../src/settings/server/desktop-preset.mjs");
  const root = await mkdtemp(path.join(await realpath(tmpdir()), "oq-native-settings-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = path.join(root, "home");
  const source = path.join(root, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml");
  await mkdir(path.dirname(source), { recursive: true });
  await writeFile(source, "- id: example\n  disabled: true\n");
  await writeManagedHomeFiles(home, new Map([[".agent-presets/openquantum/agent.cordis.yml", "- id: example\n  disabled: false\n"], ["model.yml", "retained"]]));
  await writeFile(path.join(home, "openquantum-project.json"), JSON.stringify({ projectRoot: root, nodeExecutable: process.execPath }));
  const synchronize = await desktopPresetProjection(root, home);
  await synchronize();
  assert.match(await readFile(path.join(home, ".agent-presets/openquantum/agent.cordis.yml"), "utf8"), /disabled: true/);
  assert.equal(JSON.parse(await readFile(path.join(home, ".openquantum-home.json"))).files["model.yml"], sha256("retained"));
});

test("Desktop MCP projection reports concurrent Home edits and recovers after reconciliation", async t => {
  const { desktopPresetProjection } = await import("../src/settings/server/desktop-preset.mjs");
  const root = await mkdtemp(path.join(await realpath(tmpdir()), "oq-preset-conflict-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = path.join(root, "home");
  const relative = ".agent-presets/openquantum/agent.cordis.yml";
  const source = path.join(root, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml");
  const initial = "- id: example\n  disabled: false\n";
  const changed = "- id: example\n  disabled: true\n";
  await mkdir(path.dirname(source), { recursive: true });
  await writeFile(source, initial);
  await writeManagedHomeFiles(home, new Map([[relative, desktopPreset(initial, root)]]));
  await writeFile(path.join(home, "openquantum-project.json"), JSON.stringify({ projectRoot: root, nodeExecutable: process.execPath }));
  const synchronize = await desktopPresetProjection(root, home);
  const manual = `${initial}# concurrent user edit\n`;
  await writeFile(path.join(home, relative), manual);
  await writeFile(source, changed);
  await assert.rejects(synchronize(), /项目配置已保存.*本次设置未应用到 Desktop/);
  assert.equal(await readFile(source, "utf8"), changed);
  assert.equal(await readFile(path.join(home, relative), "utf8"), manual);
  const rendered = desktopPreset(changed, root);
  const review = path.join(home, ".openquantum-defaults", sha256(rendered), relative);
  assert.equal(await readFile(review, "utf8"), rendered);
  await writeFile(path.join(home, relative), await readFile(review));
  await (await desktopPresetProjection(root, home))();
  assert.equal(await readFile(path.join(home, relative), "utf8"), rendered);
});
