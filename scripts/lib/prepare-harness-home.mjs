import { cp, lstat, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { initProfile, PROFILE_TEMPLATES } from "@deepseek-ai/dsh-app-boot";
import { buildLearningClient } from "./build-learning-client.mjs";
import { buildLocaleClient } from "./build-locale-client.mjs";
import { buildCapabilityClient } from "./build-capability-client.mjs";
import { productUiOverlay } from "./product-ui-policy.mjs";
import { assertCompatibleHarnessHome } from "./harness-home-compatibility.mjs";
import { migrateDesktopPreparation } from "./desktop-preparation-migration.mjs";
import { desktopPreset } from "./desktop-profile-config.mjs";
import { writeManagedHomeFiles } from "./managed-home-files.mjs";
import { desktopEnvironmentDefaults, persistDesktopCredentials } from "./desktop-environment.mjs";
import { assertNoLinks } from "./desktop-distribution.mjs";
import { adoptLegacyDesktopRoutes, desktopModelRoutes, desktopModelDefault, clearRemovedDesktopModelSelection } from "./desktop-model-routes.mjs";
import { DESKTOP_BUNDLE_PATCHES, DESKTOP_MODEL_ROUTES, DESKTOP_PROFILE_BUNDLE, DESKTOP_PROFILE_DEFAULTS, DESKTOP_PROFILE_DIRECTORY, DESKTOP_PROFILE_PATCH, desktopHomePatchMigration, desktopProfileManifest } from "./desktop-profile-bundle.mjs";
import { MODEL_ROUTES_BUNDLE, bundleRows, migrateLegacyModelSettings, prepareModelProfiles, presetDeclarations } from "./prepare-model-profiles.mjs";

const extensions = {
  capabilityHost: ["runtime/openquantum/capability-host", "harness-capability-host"],
  branding: ["packages/openquantum-web-branding", "harness-web-branding"],
  capabilities: ["runtime/openquantum/web-capabilities", "harness-web-capabilities"],
  learning: ["runtime/openquantum/web-learning", "harness-web-learning"],
  locales: ["runtime/openquantum/web-locales", "harness-web-locales"],
  updates: ["runtime/openquantum/web-updates", "harness-web-updates"],
};

/** The upstream runtime owns its Profile; OpenQuantum contributes dependencies and patches. */
export async function prepareOpenQuantumHarnessHome({ harnessHome, projectRoot, profileName = "web", legacyHomeFiles = {} }) {
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
  const migration = desktop ? await desktopHomePatchMigration(harnessHome, legacyHomeFiles) : new Map();
  if (desktop) await migrateDesktopPreparation(projectRoot, harnessHome);
  const result = {};
  const marker = JSON.stringify({ projectRoot: path.resolve(projectRoot), nodeExecutable: process.execPath });
  await mkdir(path.join(projectRoot, ".openquantum"), { recursive: true });
  await writeFile(path.join(projectRoot, ".openquantum/runtime.json"), marker);
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
      name: DESKTOP_PROFILE_BUNDLE, version, private: true, type: "module", dsh: { bundle: { patch: DESKTOP_BUNDLE_PATCHES } },
    }, null, 2));
    initProfile(profile, PROFILE_TEMPLATES.web.bundles);
    const manifest = JSON.parse(await readFile(path.join(profile, "package.json"), "utf8"));
    const packages = Object.values(extensions).map(([, name]) => ({
      name: `@openquantum/${name}`, spec: `link:${path.join(extensionRoot, name).replaceAll("\\", "/")}`,
    }));
    packages.push({ name: DESKTOP_PROFILE_BUNDLE, spec: `link:${bundleDirectory.replaceAll("\\", "/")}` });
    let install = false;
    for (const pkg of packages) {
      if (manifest.dependencies?.[pkg.name] !== pkg.spec || !await lstat(path.join(profile, "node_modules", pkg.name)).catch(() => null)) install = true;
    }
    if (install) await promisify(execFile)(process.execPath, [path.join(projectRoot, "node_modules/pnpm/bin/pnpm.cjs"), "--dir", profile, "add", ...packages.map(pkg => `${pkg.name}@${pkg.spec}`)], {
      cwd: projectRoot, maxBuffer: 2 * 1024 * 1024, env: { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH}` },
    });
    const currentManifest = JSON.parse(await readFile(path.join(profile, "package.json"), "utf8"));
    await writeFile(path.join(profile, "package.json"), JSON.stringify(desktopProfileManifest(currentManifest), null, 2) + "\n");
  }

  const deploymentPatch = await readFile(path.join(projectRoot, "runtime/openquantum/cordis.patch.yml"), "utf8");
  const uiPatch = desktop
    ? await readFile(path.join(projectRoot, "runtime/openquantum/desktop.cordis.patch.yml"), "utf8")
    : await productUiOverlay(projectRoot);
  const modelRoutes = await readFile(path.join(projectRoot, "runtime/openquantum/model-routes.cordis.yml"), "utf8");
  const profileDefaults = await readFile(path.join(projectRoot, "runtime/openquantum/profile-defaults.cordis.yml"), "utf8");
  const desktopRoutes = desktop ? await desktopModelRoutes(modelRoutes, projectRoot, harnessHome) : null;
  const files = new Map(migration);
  if (desktop) {
    await adoptLegacyDesktopRoutes(harnessHome, legacyHomeFiles);
    result.preservedFiles = await writeManagedHomeFiles(harnessHome, new Map([[DESKTOP_MODEL_ROUTES, desktopEnvironmentDefaults(desktopRoutes.content, projectRoot)]]), legacyHomeFiles);
    const activeRoutes = await readFile(path.join(harnessHome, DESKTOP_MODEL_ROUTES), "utf8");
    files.set(DESKTOP_PROFILE_DEFAULTS, desktopModelDefault(profileDefaults, activeRoutes, desktopRoutes.removed));
  } else {
    await prepareModelProfiles({ projectRoot, harnessHome });
  }
  const patchRelative = desktop ? DESKTOP_PROFILE_PATCH : "cordis.patch.yml";
  files.set(patchRelative, `${deploymentPatch}\n${uiPatch}`);
  async function presetFiles(source, relative) {
    for (const entry of await readdir(source, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const filename = path.join(source, entry.name);
      const target = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) await presetFiles(filename, target);
      else if (entry.isFile()) {
        let content = await readFile(filename);
        if (desktop && entry.name === "agent.cordis.yml" && relative.endsWith("/openquantum")) {
          const active = await readFile(path.join(harnessHome, target), "utf8").catch(error => { if (error.code === "ENOENT") return null; throw error; });
          content = Buffer.from(desktopPreset(active ?? content.toString(), projectRoot, process.execPath, { onDemand: true }));
        } else if (desktop && entry.name === "agent.cordis.yml") content = Buffer.from(desktopPreset(content.toString(), projectRoot, process.execPath, { onDemand: false }));
        files.set(target, content);
      }
    }
  }
  const presetIds = ["openquantum", "quantum-learning"];
  for (const name of presetIds) await presetFiles(path.join(projectRoot, "runtime/openquantum/agent-presets", name), `.agent-presets/${name}`);
  files.set("profiles/.agent-presets/presets.cordis.yml", await presetDeclarations(path.join(projectRoot, "runtime/openquantum/agent-presets"), path.join(harnessHome, ".agent-presets"), presetIds));
  if (desktop) result.preservedFiles.push(...await writeManagedHomeFiles(harnessHome, files, legacyHomeFiles));
  else for (const [relative, content] of files) {
    await mkdir(path.dirname(path.join(harnessHome, relative)), { recursive: true });
    await writeFile(path.join(harnessHome, relative), content);
  }
  const routeDefaults = desktop
    ? bundleRows(path.join(harnessHome, DESKTOP_MODEL_ROUTES), path.join(harnessHome, DESKTOP_PROFILE_DEFAULTS))
    : bundleRows(...["model-routes.cordis.yml", "profile-defaults.cordis.yml"].map(name => path.join(harnessHome, "profiles/web/node_modules", MODEL_ROUTES_BUNDLE, name)));
  const acpDefaults = routeDefaults.filter(row => row.id === "llm-pi-ai");
  result.migratedSettings = await migrateLegacyModelSettings(harnessHome, desktop
    ? [["desktop", routeDefaults]]
    : [["web", routeDefaults], ["acp", acpDefaults]]);
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
      await readFile(path.join(harnessHome, DESKTOP_MODEL_ROUTES), "utf8"), active,
    ]);
  }
  const presetTarget = path.join(harnessHome, ".agent-presets/openquantum");
  const presetNodeModulesTarget = path.join(presetTarget, "node_modules");
  // Every declared preset composition resolves its plugins from the project dependencies.
  for (const id of presetIds) {
    const target = path.join(harnessHome, ".agent-presets", id, "node_modules");
    const existing = await lstat(target).catch(() => null);
    if (existing && !existing.isSymbolicLink()) throw new Error("Refusing to replace unmanaged preset node_modules");
    if (existing) await rm(target);
    await symlink(path.join(projectRoot, "node_modules"), target, process.platform === "win32" ? "junction" : "dir");
  }
  return { ...result, presetTarget, presetNodeModulesTarget,
    modelRoutesTarget: desktop ? path.join(harnessHome, DESKTOP_MODEL_ROUTES) : path.join(harnessHome, "profiles/web/node_modules", MODEL_ROUTES_BUNDLE, "model-routes.cordis.yml"),
    presetDeclarationsTarget: path.join(harnessHome, "profiles/.agent-presets/presets.cordis.yml"),
    patchTarget: path.join(harnessHome, patchRelative),
    learningPresetTarget: path.join(harnessHome, ".agent-presets/quantum-learning"),
  };
}
