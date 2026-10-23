/**
 * Shared installer for pinned upstream MCP source trees.
 *
 * Some upstreams ship a GitHub repository rather than a reproducible PyPI
 * release. OpenQuantum never bundles their source. Instead a setup command
 * checks out exactly one reviewed commit into the Git-ignored `.openquantum`
 * tree and stamps a marker so Harness can refuse to run an unverified or
 * drifted checkout. Harness still owns MCP lifecycle and credential injection.
 *
 * An integration descriptor is a frozen object with:
 *   - sourceUrl     upstream Git remote
 *   - revision      full 40-hex commit SHA to pin
 *   - relativeRoot  install location under the project root
 *   - requiredFiles files that must exist for the checkout to be considered valid
 */

import { spawn } from "node:child_process";
import { lstat, mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  SOURCE_MARKER,
  assertRegularSourceFile,
  inspectPinnedSource,
  inspectPinnedSourceDirectory,
} from "../../src/settings/server/pinned-source.mjs";

export { SOURCE_MARKER, inspectPinnedSource };

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout = `${stdout}${chunk.toString("utf8")}`.slice(-16_384);
    });
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk.toString("utf8")}`.slice(-16_384);
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      reject(
        new Error(
          `${command} failed${signal ? ` with ${signal}` : ` with exit ${code ?? "unknown"}`}: ${stderr.trim() || stdout.trim()}`,
        ),
      );
    });
  });
}

export async function installPinnedSource(
  root,
  integration,
  { source = integration.sourceUrl, revision = integration.revision, runGit = run } = {},
) {
  const externalRoot = path.join(root, ".openquantum", "external");
  const target = path.join(root, integration.relativeRoot);
  await mkdir(externalRoot, { recursive: true, mode: 0o700 });

  try {
    return { ...(await inspectPinnedSource(root, integration, { source, revision })), status: "ready" };
  } catch (error) {
    let targetExists = true;
    try {
      await lstat(target);
    } catch (targetError) {
      if (targetError && typeof targetError === "object" && targetError.code === "ENOENT") {
        targetExists = false;
      } else {
        throw targetError;
      }
    }
    if (targetExists) {
      throw new Error(
        `Existing ${target} is not the pinned installation; move it aside before retrying`,
        { cause: error },
      );
    }
  }

  const temporary = await mkdtemp(path.join(externalRoot, ".pinned-source-"));
  try {
    await runGit("git", ["init", "--quiet"], temporary);
    await runGit("git", ["remote", "add", "origin", source], temporary);
    await runGit("git", ["fetch", "--quiet", "--depth", "1", "origin", revision], temporary);
    await runGit("git", ["checkout", "--quiet", "--detach", "FETCH_HEAD"], temporary);
    const actualRevision = await runGit("git", ["rev-parse", "HEAD"], temporary);
    if (actualRevision !== revision) {
      throw new Error(`Fetched ${actualRevision}; expected ${revision}`);
    }
    for (const relativeFile of integration.requiredFiles) {
      await assertRegularSourceFile(temporary, relativeFile);
    }
    await writeFile(
      path.join(temporary, SOURCE_MARKER),
      `${JSON.stringify({ schemaVersion: "1.0", source, revision }, null, 2)}\n`,
      { flag: "wx", mode: 0o600 },
    );
    await inspectPinnedSourceDirectory(temporary, integration, { source, revision });
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }

  return { ...(await inspectPinnedSource(root, integration, { source, revision })), status: "installed" };
}
