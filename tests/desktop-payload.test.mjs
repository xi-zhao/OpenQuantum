import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { stageDesktopPayload } from "../scripts/lib/desktop-payload.mjs";
import { sha256 } from "../scripts/lib/desktop-distribution.mjs";

test("standalone payload keeps previous dependencies after the app bundle is replaced", {
  skip: !["darwin-arm64", "darwin-x64", "win32-x64"].includes(`${process.platform}-${process.arch}`),
}, async t => {
  const root = await mkdtemp(path.join(await realpath(tmpdir()), "oq-immutable-payload-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const payload = path.join(root, "app/Resources/openquantum"), runtimes = path.join(root, "app/Resources/runtimes");
  await mkdir(path.join(payload, "node_modules"), { recursive: true });
  await mkdir(runtimes, { recursive: true });
  async function release(version) {
    await writeFile(path.join(payload, "program.mjs"), `program ${version}`);
    await writeFile(path.join(payload, "node_modules/dependency.mjs"), `dependency ${version}`);
    await writeFile(path.join(runtimes, "node-fixture"), `node ${version}`);
    await writeFile(path.join(payload, "distribution.json"), JSON.stringify({ schemaVersion: 1, kind: "dsh-capability-package", target: `${process.platform}-${process.arch}`,
      version, runtimeLockSha256: sha256(version), files: { "program.mjs": { sha256: sha256(`program ${version}`), mode: 0o644 } } }));
  }
  await release("1.0.0");
  const previous = await stageDesktopPayload(payload, path.join(root, "data"), runtimes);
  assert.equal(await stageDesktopPayload(payload, path.join(root, "data"), runtimes), previous);
  await writeFile(path.join(previous, "program.mjs"), "damaged staged program");
  await assert.rejects(stageDesktopPayload(payload, path.join(root, "data"), runtimes), /Damaged installation payload/);
  await writeFile(path.join(previous, "program.mjs"), "program 1.0.0");
  await release("2.0.0");
  const next = await stageDesktopPayload(payload, path.join(root, "data"), runtimes);
  assert.notEqual(next, previous);
  assert.equal(await readFile(path.join(previous, "node_modules/dependency.mjs"), "utf8"), "dependency 1.0.0");
  assert.equal(await readFile(path.join(previous, "../runtimes/node-fixture"), "utf8"), "node 1.0.0");
  assert.equal(await readFile(path.join(next, "node_modules/dependency.mjs"), "utf8"), "dependency 2.0.0");
  await release("3.0.0");
  await writeFile(path.join(payload, "program.mjs"), "corrupt");
  await assert.rejects(stageDesktopPayload(payload, path.join(root, "data"), runtimes), /Damaged installation payload/);
});
