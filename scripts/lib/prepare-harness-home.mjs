import { cp, mkdir, rm, symlink } from "node:fs/promises";
import path from "node:path";

/**
 * Materialize the OpenQuantum-owned parts of a Harness home.
 *
 * DeepSeek Harness owns the profile and runtime. OpenQuantum contributes one
 * Agent preset and two Host Web extensions. Keeping this setup in one place
 * makes the normal launcher, isolated tests and real-provider probes boot the
 * same composition even when each uses a different DSH_HOME.
 */
export async function prepareOpenQuantumHarnessHome({ harnessHome, projectRoot }) {
  const presetSource = path.join(
    projectRoot,
    "runtime",
    "openquantum",
    "agent-presets",
    "openquantum",
  );
  const presetTarget = path.join(
    harnessHome,
    ".agent-presets",
    "openquantum",
  );
  const brandingSource = path.join(
    projectRoot,
    "runtime",
    "openquantum",
    "web-branding",
  );
  const brandingTarget = path.join(
    harnessHome,
    "profiles",
    "node_modules",
    "@openquantum",
    "harness-web-branding",
  );
  const capabilitiesSource = path.join(
    projectRoot,
    "runtime",
    "openquantum",
    "web-capabilities",
  );
  const capabilitiesTarget = path.join(
    harnessHome,
    "profiles",
    "node_modules",
    "@openquantum",
    "harness-web-capabilities",
  );

  await Promise.all([
    mkdir(path.dirname(presetTarget), { recursive: true }),
    mkdir(path.dirname(brandingTarget), { recursive: true }),
    mkdir(path.dirname(capabilitiesTarget), { recursive: true }),
  ]);
  await Promise.all([
    cp(presetSource, presetTarget, { recursive: true, force: true }),
    cp(brandingSource, brandingTarget, { recursive: true, force: true }),
    cp(capabilitiesSource, capabilitiesTarget, {
      recursive: true,
      force: true,
    }),
  ]);

  // Agent preset entries are imported from the isolated DSH_HOME copy. Give
  // that generated copy one explicit dependency root instead of relying on
  // where DSH_HOME happens to live relative to the project.
  const presetNodeModulesTarget = path.join(presetTarget, "node_modules");
  await rm(presetNodeModulesTarget, { recursive: true, force: true });
  await symlink(
    path.join(projectRoot, "node_modules"),
    presetNodeModulesTarget,
    "dir",
  );

  return {
    brandingTarget,
    capabilitiesTarget,
    presetNodeModulesTarget,
    presetTarget,
  };
}
