import { cp, lstat, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { writeFileAtomic } from "@deepseek-ai/dsh-atomic-write";
import { healProfilesModuleFallback, initProfile, PROFILE_TEMPLATES } from "@deepseek-ai/dsh-app-boot";
import { buildLearningClient } from "./build-learning-client.mjs";
import { buildLocaleClient } from "./build-locale-client.mjs";
import { buildCapabilityClient } from "./build-capability-client.mjs";
import { productUiOverlay } from "./product-ui-policy.mjs";
import { migrateDesktopCredentials } from "./desktop-credential-migration.mjs";
import { assertCompatibleHarnessHome } from "./harness-home-compatibility.mjs";
import { migrateDesktopPreparation, planDesktopPreparation } from "./desktop-preparation-migration.mjs";
import { desktopPreset, migrateDesktopPresetSchema } from "./desktop-profile-config.mjs";
import { writeManagedHomeFiles, readManagedHomeState } from "./managed-home-files.mjs";
import { desktopEnvironmentDefaults, persistDesktopCredentials } from "./desktop-environment.mjs";
import { assertNoLinks, sha256 } from "./desktop-distribution.mjs";
import { desktopModelRoutes, desktopModelDefault, clearRemovedDesktopModelSelection } from "./desktop-model-routes.mjs";
import { DESKTOP_PROFILE_BUNDLE, DESKTOP_PROFILE_DIRECTORY, DESKTOP_PROFILE_PATCH, desktopHomePatchMigration, desktopProfileManifest } from "./desktop-profile-bundle.mjs";

const extensions = {
  security: ["packages/openquantum-web-security", "harness-web-security"],
  capabilityHost: ["runtime/openquantum/capability-host", "harness-capability-host"],
  branding: ["packages/openquantum-web-branding", "harness-web-branding"],
  capabilities: ["runtime/openquantum/web-capabilities", "harness-web-capabilities"],
  learning: ["runtime/openquantum/web-learning", "harness-web-learning"],
  locales: ["runtime/openquantum/web-locales", "harness-web-locales"],
  updates: ["runtime/openquantum/web-updates", "harness-web-updates"],
};

export async function preflightDesktopHome({ harnessHome, projectRoot, sourceRoot = projectRoot, legacyHomeFiles = {}, preservedFiles = [] }) {
  await assertCompatibleHarnessHome(harnessHome);
  const activePatch = await readFile(path.join(harnessHome, "cordis.patch.yml")).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  const sourcePatch = activePatch && await readFile(path.join(projectRoot, "runtime/openquantum/cordis.patch.yml"), "utf8").catch(error => { if (error.code === "ENOENT") return null; throw error; });
  // Old Web launches did not keep an ownership ledger. Recognize their exact
  // output before migration preflight, while the old project still exists.
  if (sourcePatch !== null && activePatch) {
    const webHash = sha256(`${sourcePatch}\n${await productUiOverlay(projectRoot)}`);
    if (sha256(activePatch) === webHash) legacyHomeFiles = { ...legacyHomeFiles, "cordis.patch.yml": webHash };
  }
  const patchMigration = await desktopHomePatchMigration(harnessHome, legacyHomeFiles);
  const presetRelative = "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml";
  const presetRoot = preservedFiles.includes(presetRelative) ? projectRoot : sourceRoot;
  const migration = await planDesktopPreparation(projectRoot, harnessHome, { legacyHomeFiles, sourceRoot, presetRoot });
  const state = await readManagedHomeState(harnessHome, legacyHomeFiles);
  async function checkPreset(directory, relative) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const source = path.join(directory, entry.name), target = path.posix.join(relative, entry.name);
      await assertNoLinks(path.join(harnessHome, target));
      if (entry.isDirectory()) await checkPreset(source, target);
      else if (entry.isFile()) {
        const sourceRelative = target.replace(".agent-presets/", "runtime/openquantum/agent-presets/");
        const content = await readFile(preservedFiles.includes(sourceRelative) ? path.join(projectRoot, sourceRelative) : source);
        const current = await readFile(path.join(harnessHome, target)).catch(error => { if (error.code === "ENOENT") return null; throw error; });
        if (entry.name === "agent.cordis.yml") {
          desktopPreset(migrateDesktopPresetSchema(content.toString()), sourceRoot, process.execPath, { projectRoot, onDemand: relative.endsWith("/openquantum") });
          if (!current && state.files?.[target]) throw new Error(`Desktop preset was intentionally removed; restore it before launching: ${target}`);
        }
        if (entry.name.endsWith(".mjs") && current && sha256(current) !== sha256(content) && sha256(current) !== state.files?.[target] && sha256(current) !== legacyHomeFiles[target]) {
          throw new Error(`Desktop Home contains an edited preset module; reconcile it before upgrading: ${target}`);
        }
      }
    }
  }
  for (const name of ["openquantum", "quantum-learning"]) await checkPreset(path.join(sourceRoot, "runtime/openquantum/agent-presets", name), `.agent-presets/${name}`);
  return { ...migration, legacyHomeFiles, patchMigration };
}

/** The upstream runtime owns its Profile; OpenQuantum contributes dependencies and patches. */
export async function prepareOpenQuantumHarnessHome({ harnessHome, projectRoot, profileName = "web", legacyHomeFiles = {}, transaction }) {
  if (!/^[A-Za-z0-9_-]+$/.test(profileName)) throw new Error("Invalid Harness profile name");
  const desktop = profileName === "desktop";
  const profile = path.join(harnessHome, "profiles", profileName);
  const extensionRoot = desktop ? path.join(harnessHome, ".openquantum-extensions") : path.join(profile, "node_modules/@openquantum");
  if (desktop) {
    // Preflight every owned destination before any locator, extension or pnpm
    // write. Profile dependency links themselves remain owned by upstream.
    for (const filename of [path.join(projectRoot, ".openquantum/runtime.json"),
      ...["settings.yaml", ".credentials.yaml"].map(name => path.join(harnessHome, name)),
      ...[harnessHome, extensionRoot].flatMap(directory => [path.join(directory, "project-root.mjs"), path.join(directory, "openquantum-project.json")]),
      ...["package.json", "cordis.yml", "cordis.patch.yml", "pnpm-workspace.yaml", "pnpm-lock.yaml", "node_modules"].map(name => path.join(profile, name)),
    ]) await assertNoLinks(filename);
    async function preflightTree(directory) {
      await assertNoLinks(directory);
      for (const entry of await readdir(directory, { withFileTypes: true }).catch(error => { if (error.code === "ENOENT") return []; throw error; })) {
        const filename = path.join(directory, entry.name);
        await assertNoLinks(filename);
        if (entry.isDirectory()) await preflightTree(filename);
      }
    }
    await preflightTree(extensionRoot);
  }
  await assertCompatibleHarnessHome(harnessHome);
  if (!desktop) {
    const relative = ".agent-presets/openquantum/agent.cordis.yml";
    const active = await readFile(path.join(harnessHome, relative), "utf8").catch(error => { if (error.code === "ENOENT") return null; throw error; });
    const state = await readManagedHomeState(harnessHome, legacyHomeFiles);
    if (active?.includes("id: openquantum-adaptive-capabilities") && sha256(active) !== state.files?.[relative]) {
      throw new Error("Desktop preset has user edits; preserve and reconcile them before switching this Home to Web");
    }
  }
  let credentialMigration;
  // 0.1.0 has no shipped ACP profile. Reuse its official base bundle and
  // apply the explicit transport overlay at launch; never replace user edits.
  if (!desktop) {
    initProfile(path.join(harnessHome, "profiles/acp"), ["@deepseek-ai/dsh-base"]);
    healProfilesModuleFallback(path.join(projectRoot, "package.json"), harnessHome);
  }
  let migration = new Map();
  if (desktop) {
    const planned = await preflightDesktopHome({ harnessHome, projectRoot, legacyHomeFiles });
    legacyHomeFiles = planned.legacyHomeFiles;
    migration = planned.patchMigration;
    if (transaction) {
      for (const relative of ["settings.yaml", ".credentials.yaml", ".openquantum-credential-migration.json", ".openquantum-home.json", "cordis.patch.yml", "project-root.mjs", "openquantum-project.json", "profiles/model-routes.cordis.yml",
        ...["package.json", "cordis.yml", "cordis.patch.yml", "pnpm-workspace.yaml", "pnpm-lock.yaml"].map(name => `profiles/desktop/${name}`)]) await transaction.capture(path.join(harnessHome, relative));
      for (const filename of ["project-root.mjs", "openquantum-project.json"]) await transaction.capture(path.join(extensionRoot, filename));
      for (const filename of ["settings.json", "skill-policy.json", "migration.json", "legacy-preset.yml"]) await transaction.capture(path.join(harnessHome, ".openquantum/capabilities", filename));
      for (const relative of [".agent-presets/openquantum", ".agent-presets/quantum-learning", DESKTOP_PROFILE_DIRECTORY,
        ...Object.values(extensions).map(([, name]) => `.openquantum-extensions/${name}`)]) {
        await transaction.captureTree(path.join(harnessHome, relative), { exclude: ["node_modules"] });
      }
      await transaction.capture(path.join(harnessHome, ".agent-presets/openquantum/node_modules"));
      await transaction.capture(path.join(projectRoot, ".openquantum/runtime.json"));
    }
    if (transaction) {
      await transaction.captureLock(path.join(harnessHome, ".credentials.yaml.lock"));
      for (const relative of [".openquantum-home.json", ...["migration.json", "settings.json", "skill-policy.json"].map(name => `.openquantum/capabilities/${name}`)]) {
        await transaction.captureLock(path.join(harnessHome, `${relative}.openquantum.lock`));
      }
      const credentialBytes = await readFile(path.join(harnessHome, ".credentials.yaml")).catch(error => { if (error.code === "ENOENT") return null; throw error; });
      if (credentialBytes) await transaction.capture(path.join(harnessHome, ".openquantum-migrations/credentials-v1", sha256(credentialBytes), ".credentials.yaml"));
      for (const relative of migration.keys()) await transaction.capture(path.join(harnessHome, relative));
    }
    credentialMigration = await migrateDesktopCredentials(harnessHome);
    await migrateDesktopPreparation(projectRoot, harnessHome, { legacyHomeFiles });
  }
  const result = { preservedFiles: [] };
  const marker = JSON.stringify({ projectRoot: path.resolve(projectRoot), nodeExecutable: process.execPath });
  await mkdir(path.join(projectRoot, ".openquantum"), { recursive: true });
  await writeFileAtomic(path.join(projectRoot, ".openquantum/runtime.json"), marker, { mode: 0o600, dirMode: 0o700 });
  // This module is a deployment locator, not a runtime or lifecycle hook.
  for (const directory of [harnessHome, extensionRoot]) {
    await mkdir(directory, { recursive: true });
    await cp(path.join(projectRoot, "runtime/openquantum/project-root.mjs"), path.join(directory, "project-root.mjs"));
    await writeFile(path.join(directory, "openquantum-project.json"), marker);
  }
  for (const [role, [source, name]] of Object.entries(extensions)) {
    const target = path.join(extensionRoot, name);
    await cp(path.join(projectRoot, source), target, { recursive: true, force: true });
    result[`${role}Target`] = target;
  }
  await buildLearningClient(projectRoot, path.join(result.learningTarget, "client.js"));
  await buildLocaleClient(projectRoot, path.join(result.localesTarget, "client.js"));
  await buildCapabilityClient(projectRoot, path.join(result.capabilitiesTarget, "client.js"));

  if (desktop) {
    // One declarative bundle owns activation in the same Profile as its dependencies.
    const bundleDirectory = path.join(harnessHome, DESKTOP_PROFILE_DIRECTORY);
    const { version } = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
    await mkdir(bundleDirectory, { recursive: true });
    await writeFile(path.join(bundleDirectory, "package.json"), JSON.stringify({
      name: DESKTOP_PROFILE_BUNDLE, version, private: true, type: "module", dsh: { bundle: { patch: "./cordis.patch.yml" } },
    }, null, 2));
    initProfile(profile, PROFILE_TEMPLATES.web);
    const manifest = JSON.parse(await readFile(path.join(profile, "package.json"), "utf8"));
    const packages = Object.values(extensions).map(([, name]) => ({
      name: `@openquantum/${name}`, spec: `link:${path.join(extensionRoot, name).replaceAll("\\", "/")}`,
    }));
    packages.push({ name: DESKTOP_PROFILE_BUNDLE, spec: `link:${bundleDirectory.replaceAll("\\", "/")}` });
    let install = false;
    for (const pkg of packages) {
      if (manifest.dependencies?.[pkg.name] !== pkg.spec || !await lstat(path.join(profile, "node_modules", pkg.name)).catch(() => null)) install = true;
    }
    if (install) {
      if (transaction) await transaction.detachDirectory(path.join(profile, "node_modules"));
      const execute = transaction ? transaction.runWriter : promisify(execFile);
      await execute(process.execPath, [path.join(projectRoot, "node_modules/pnpm/bin/pnpm.cjs"), "--dir", profile, "add", ...packages.map(pkg => `${pkg.name}@${pkg.spec}`)], {
        cwd: projectRoot, maxBuffer: 2 * 1024 * 1024, env: { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH}` },
      });
    }
    const currentManifest = JSON.parse(await readFile(path.join(profile, "package.json"), "utf8"));
    await writeFile(path.join(profile, "package.json"), JSON.stringify(desktopProfileManifest(currentManifest), null, 2) + "\n");
  }

  const deploymentPatch = await readFile(path.join(projectRoot, "runtime/openquantum/cordis.patch.yml"), "utf8");
  const uiPatch = desktop
    ? `${await readFile(path.join(projectRoot, "runtime/openquantum/desktop.cordis.patch.yml"), "utf8")}\n${await productUiOverlay(projectRoot, { desktop: true })}`
    : await productUiOverlay(projectRoot);
  const modelRoutes = await readFile(path.join(projectRoot, "runtime/openquantum/model-routes.cordis.yml"), "utf8");
  const desktopRoutes = desktop ? await desktopModelRoutes(modelRoutes, projectRoot, harnessHome) : null;
  const routeFile = "profiles/model-routes.cordis.yml";
  let effectivePatch = deploymentPatch;
  if (desktop) {
    const content = desktopEnvironmentDefaults(desktopRoutes.content, projectRoot);
    if (transaction) await transaction.capture(path.join(harnessHome, ".openquantum-defaults", sha256(content), routeFile));
    result.preservedFiles = await writeManagedHomeFiles(harnessHome, new Map([[routeFile, content]]), legacyHomeFiles);
    const activeRoutes = await readFile(path.join(harnessHome, routeFile), "utf8");
    effectivePatch = desktopModelDefault(deploymentPatch, activeRoutes, desktopRoutes.removed);
  }
  const patchRelative = desktop ? DESKTOP_PROFILE_PATCH : "cordis.patch.yml";
  const files = new Map([...migration, [patchRelative, `${effectivePatch}\n${uiPatch}`]]);
  if (!desktop) {
    files.set(routeFile, modelRoutes);
    files.set("profiles/acp/openquantum-ready.mjs", await readFile(path.join(projectRoot, "runtime/openquantum/cc-connect/ready.mjs")));
  }
  async function presetFiles(source, relative) {
    for (const entry of await readdir(source, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const filename = path.join(source, entry.name);
      const target = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) await presetFiles(filename, target);
      else if (entry.isFile()) {
        let content = await readFile(filename);
        if (desktop && entry.name === "agent.cordis.yml" && relative.endsWith("/openquantum")) {
          content = Buffer.from(desktopPreset(migrateDesktopPresetSchema(content.toString()), projectRoot, process.execPath, { onDemand: true }));
        } else if (desktop && entry.name === "agent.cordis.yml") content = Buffer.from(desktopPreset(migrateDesktopPresetSchema(content.toString()), projectRoot, process.execPath, { onDemand: false }));
        files.set(target, content);
      }
    }
  }
  for (const name of ["openquantum", "quantum-learning"]) await presetFiles(path.join(projectRoot, "runtime/openquantum/agent-presets", name), `.agent-presets/${name}`);
  if (transaction) for (const [relative, content] of files) await transaction.capture(path.join(harnessHome, ".openquantum-defaults", sha256(content), relative));
  result.preservedFiles.push(...await writeManagedHomeFiles(harnessHome, files, legacyHomeFiles));
  if (desktop) {
    if (migration.has("cordis.patch.yml") && result.preservedFiles.includes("cordis.patch.yml")) {
      throw new Error("Desktop Home patch changed during migration. It was preserved; reconcile cordis.patch.yml before launching.");
    }
    await clearRemovedDesktopModelSelection(harnessHome, desktopRoutes.removed);
    const unresolved = (result.preservedFiles || []).filter(name => name.startsWith(".agent-presets/") && name.endsWith(".mjs"));
    const active = await readFile(path.join(harnessHome, ".agent-presets/openquantum/agent.cordis.yml"), "utf8");
    if (unresolved.length || /!!js[^\n]*(?:process\.cwd\(\)|process\.execPath)/.test(active)) {
      throw new Error(`Desktop Home contains an older or edited preset that needs reconciliation; compare .openquantum-defaults before launching: ${harnessHome}`);
    }
    result.migratedCredentialRefs = await persistDesktopCredentials(projectRoot, harnessHome, [
      await readFile(path.join(harnessHome, "profiles/model-routes.cordis.yml"), "utf8"), active,
    ]);
  }
  const presetTarget = path.join(harnessHome, ".agent-presets/openquantum");
  const presetNodeModulesTarget = path.join(presetTarget, "node_modules");
  const existing = await lstat(presetNodeModulesTarget).catch(() => null);
  if (existing && !existing.isSymbolicLink()) throw new Error("Refusing to replace unmanaged preset node_modules");
  if (existing) await rm(presetNodeModulesTarget);
  await symlink(path.join(projectRoot, "node_modules"), presetNodeModulesTarget, process.platform === "win32" ? "junction" : "dir");
  return { ...result, credentialMigration, presetTarget, presetNodeModulesTarget,
    modelRoutesTarget: path.join(harnessHome, "profiles/model-routes.cordis.yml"),
    patchTarget: path.join(harnessHome, patchRelative),
    learningPresetTarget: path.join(harnessHome, ".agent-presets/quantum-learning"),
  };
}
