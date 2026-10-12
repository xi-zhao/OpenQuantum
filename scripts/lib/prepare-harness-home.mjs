import { cp, lstat, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { initProfile, PROFILE_TEMPLATES } from "@deepseek-ai/dsh-app-boot";
import { buildLearningClient } from "./build-learning-client.mjs";
import { buildLocaleClient } from "./build-locale-client.mjs";
import { productUiOverlay } from "./product-ui-policy.mjs";
import { assertCompatibleHarnessHome } from "./harness-home-compatibility.mjs";
import { desktopPreset } from "./desktop-profile-config.mjs";
import { writeManagedHomeFiles } from "./managed-home-files.mjs";
import { desktopEnvironmentDefaults, persistDesktopCredentials } from "./desktop-environment.mjs";
import { assertNoLinks } from "./desktop-distribution.mjs";
import { desktopModelRoutes, desktopModelDefault, clearRemovedDesktopModelSelection } from "./desktop-model-routes.mjs";

const extensions = {
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

  if (desktop) {
    // Record ordinary local dependencies. Using `dsh plugin add` here would also
    // activate branding's bundle and duplicate the Home patch's plugin row.
    initProfile(profile, PROFILE_TEMPLATES.web.bundles, PROFILE_TEMPLATES.web.patchReload);
    const manifest = JSON.parse(await readFile(path.join(profile, "package.json"), "utf8"));
    const packages = Object.values(extensions).map(([, name]) => ({
      name: `@openquantum/${name}`, spec: `link:${path.join(extensionRoot, name).replaceAll("\\", "/")}`,
    }));
    let install = false;
    for (const pkg of packages) {
      if (manifest.dependencies?.[pkg.name] !== pkg.spec || !await lstat(path.join(profile, "node_modules", pkg.name)).catch(() => null)) install = true;
    }
    if (install) await promisify(execFile)(process.execPath, [path.join(projectRoot, "node_modules/pnpm/bin/pnpm.cjs"), "--dir", profile, "add", ...packages.map(pkg => `${pkg.name}@${pkg.spec}`)], {
      cwd: projectRoot, maxBuffer: 2 * 1024 * 1024, env: { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH}` },
    });
  }

  const deploymentPatch = await readFile(path.join(projectRoot, "runtime/openquantum/cordis.patch.yml"), "utf8");
  const uiPatch = desktop
    ? await readFile(path.join(projectRoot, "runtime/openquantum/desktop.cordis.patch.yml"), "utf8")
    : await productUiOverlay(projectRoot);
  const modelRoutes = await readFile(path.join(projectRoot, "runtime/openquantum/model-routes.cordis.yml"), "utf8");
  const desktopRoutes = desktop ? await desktopModelRoutes(modelRoutes, projectRoot, harnessHome) : null;
  const routeFile = "profiles/model-routes.cordis.yml";
  let effectivePatch = deploymentPatch;
  if (desktop) {
    result.preservedFiles = await writeManagedHomeFiles(harnessHome, new Map([[routeFile, desktopEnvironmentDefaults(desktopRoutes.content, projectRoot)]]), legacyHomeFiles);
    const activeRoutes = await readFile(path.join(harnessHome, routeFile), "utf8");
    effectivePatch = desktopModelDefault(deploymentPatch, activeRoutes, desktopRoutes.removed);
  }
  const files = new Map([["cordis.patch.yml", `${effectivePatch}\n${uiPatch}`]]);
  if (!desktop) files.set(routeFile, modelRoutes);
  async function presetFiles(source, relative) {
    for (const entry of await readdir(source, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const filename = path.join(source, entry.name);
      const target = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) await presetFiles(filename, target);
      else if (entry.isFile()) {
        let content = await readFile(filename);
        if (desktop && entry.name === "agent.cordis.yml") content = Buffer.from(desktopPreset(content.toString(), projectRoot));
        files.set(target, content);
      }
    }
  }
  for (const name of ["openquantum", "quantum-learning"]) await presetFiles(path.join(projectRoot, "runtime/openquantum/agent-presets", name), `.agent-presets/${name}`);
  if (desktop) result.preservedFiles.push(...await writeManagedHomeFiles(harnessHome, files, legacyHomeFiles));
  else for (const [relative, content] of files) {
    await mkdir(path.dirname(path.join(harnessHome, relative)), { recursive: true });
    await writeFile(path.join(harnessHome, relative), content);
  }
  if (desktop) {
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
  return { ...result, presetTarget, presetNodeModulesTarget,
    modelRoutesTarget: path.join(harnessHome, "profiles/model-routes.cordis.yml"),
    patchTarget: path.join(harnessHome, "cordis.patch.yml"),
    learningPresetTarget: path.join(harnessHome, ".agent-presets/quantum-learning"),
  };
}
