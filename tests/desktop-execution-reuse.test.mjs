import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DESKTOP_EXTENSIONS, planDesktopExtensions } from "../scripts/lib/desktop-extension-preparation.mjs";

test("Desktop extension reuse verifies the merged execution guard, including missing and tampered copies", async t => {
  const directory = await mkdtemp(path.join(tmpdir(), "oq-guard-reuse-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const harnessHome = path.join(directory, "home"), projectRoot = path.join(directory, "project");
  await mkdir(path.join(projectRoot, "node_modules"), { recursive: true });
  for (const [, name] of Object.values(DESKTOP_EXTENSIONS)) {
    const target = path.join(harnessHome, ".openquantum-extensions", name);
    await mkdir(target, { recursive: true });
    await writeFile(path.join(target, "index.mjs"), "// verified extension\n");
  }
  const options = { harnessHome, projectRoot, sourceDigest: "a".repeat(64) };
  const initial = await planDesktopExtensions(options);
  assert.equal(initial.reused, false);
  await initial.complete();
  assert.equal((await planDesktopExtensions(options)).reused, true);
  assert.deepEqual(DESKTOP_EXTENSIONS.executionBoundary,
    ["runtime/openquantum/execution-boundary", "harness-execution-boundary"]);
  const guard = path.join(harnessHome, ".openquantum-extensions/harness-execution-boundary/index.mjs");
  await writeFile(guard, "// tampered guard\n");
  assert.equal((await planDesktopExtensions(options)).reused, false);
  await writeFile(guard, "// verified extension\n");
  assert.equal((await planDesktopExtensions(options)).reused, true);
  await rm(path.dirname(guard), { recursive: true });
  assert.equal((await planDesktopExtensions(options)).reused, false);
});
