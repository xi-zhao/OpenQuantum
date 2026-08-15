import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

/**
 * Materialize the OpenQuantum-owned parts of a Harness home.
 *
 * DeepSeek Harness owns the profile and runtime. OpenQuantum contributes one
 * Agent preset and one Host branding plugin. Keeping this setup in one place
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

  await Promise.all([
    mkdir(path.dirname(presetTarget), { recursive: true }),
    mkdir(path.dirname(brandingTarget), { recursive: true }),
  ]);
  await Promise.all([
    cp(presetSource, presetTarget, { recursive: true, force: true }),
    cp(brandingSource, brandingTarget, { recursive: true, force: true }),
  ]);

  return { brandingTarget, presetTarget };
}
