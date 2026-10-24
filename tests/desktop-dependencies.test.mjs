import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DESKTOP_SECURITY_VERSIONS, desktopSecurityResolutions, installDesktopDependencies, verifyDesktopDependencySecurity } from "../scripts/lib/desktop-dependencies.mjs";

const lock = '__metadata:\n  version: 8\n"undici@npm:^7.29.0":\n  version: 7.29.0\n"zod@npm:^4.4.3":\n  version: 4.4.3\n"zod@npm:^3.24.1":\n  version: 3.25.76\n';

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "oq-desktop-dependencies-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const manifest = '{"name":"upstream","resolutions":{"existing-vendor":"file:vendor.tgz"}}\n';
  await writeFile(path.join(directory, "package.json"), manifest);
  await writeFile(path.join(directory, "yarn.lock"), lock);
  return { directory, manifest };
}

test("Desktop security patches preserve HTTP-client majors and unrelated dev dependencies", () => {
  const resolutions = desktopSecurityResolutions(lock);
  assert.equal(resolutions["undici@npm:^7.29.0"], "7.30.1");
  assert.equal(resolutions["zod@npm:^4.4.3"], "4.6.6");
  assert.equal(resolutions["zod@npm:^3.24.1"], undefined);
});

for (const succeeds of [true, false]) {
  test(`Desktop dependency installation restores upstream files after ${succeeds ? "success" : "failure"}`, async t => {
    const { directory, manifest } = await fixture(t);
    const install = () => installDesktopDependencies(directory, async () => {
      const active = JSON.parse(await readFile(path.join(directory, "package.json"), "utf8"));
      assert.equal(active.resolutions["existing-vendor"], "file:vendor.tgz");
      assert.equal(active.resolutions["body-parser"], "2.4.0");
      await writeFile(path.join(directory, "yarn.lock"), "patched fixture\n");
      if (!succeeds) throw new Error("fixture install failure");
    });
    if (succeeds) {
      const marker = await install();
      assert.equal(marker.lockSha256, createHash("sha256").update("patched fixture\n").digest("hex"));
    } else await assert.rejects(install(), /fixture install failure/);
    assert.equal(await readFile(path.join(directory, "package.json"), "utf8"), manifest);
    assert.equal(await readFile(path.join(directory, "yarn.lock"), "utf8"), lock);
  });
}

test("Desktop cannot reuse a stale or unpatched dependency graph", async t => {
  const { directory } = await fixture(t);
  const marker = await installDesktopDependencies(directory, async () => {});
  for (const [name, version] of Object.entries({ ...DESKTOP_SECURITY_VERSIONS, undici: "7.30.1", zod: "4.6.6", "fast-uri": "3.1.9" })) {
    const target = path.join(directory, "node_modules", name);
    await mkdir(target, { recursive: true });
    await writeFile(path.join(target, "package.json"), JSON.stringify({ version }));
  }
  assert.equal((await verifyDesktopDependencySecurity(directory, marker)).undici, "7.30.1");
  await assert.rejects(verifyDesktopDependencySecurity(directory, {}), /security evidence/);
  await writeFile(path.join(directory, "node_modules/zod/package.json"), '{"version":"4.4.3"}');
  await assert.rejects(verifyDesktopDependencySecurity(directory, marker), /unpatched dependency: zod/);
});
