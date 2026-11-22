import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { prepareTropidistBuild, readTropidistBuild } from "../src/lib/tropidist-build.mjs";

test("explicit preparation attests each compiler input and output before use", { skip: process.platform === "win32" }, async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "oq cdist "));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const source = path.join(root, "source"), build = path.join(root, "build");
  await fs.mkdir(path.join(source, "cdist"), { recursive: true });
  const files = {};
  for (const name of ["viterbi", "gmitm", "sparse_dp", "tree_dp", "isd"]) {
    const file = "cdist/" + name + ".c";
    const program = "int present(void) { return 1; }\n";
    await fs.writeFile(path.join(source, file), program);
    files[file] = createHash("sha256").update(program).digest("hex");
  }
  const record = { repository: "fixture", revision: "abc", files, symlinks: {} };
  assert.equal(await readTropidistBuild(build, record), null);
  const setup = "import {prepareTropidistBuild} from " + JSON.stringify(new URL("../src/lib/tropidist-build.mjs", import.meta.url).href) +
    "; await prepareTropidistBuild(...JSON.parse(process.argv[1]))";
  const missing = spawnSync(process.execPath, ["--input-type=module", "-e", setup, JSON.stringify([source, record, build])], {
    env: { ...process.env, PATH: path.join(root, "no-compiler") }, encoding: "utf8",
  });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /cc.*ENOENT/);
  await assert.rejects(fs.access(build), { code: "ENOENT" });
  const ready = await prepareTropidistBuild(source, record, build);
  assert.equal(Object.keys(ready.outputs).length, 5);
  assert.deepEqual(await readTropidistBuild(build, record), ready);
  const binary = path.join(build, "payload/cdist/libgmitm.so");
  const bytes = await fs.readFile(binary);
  await fs.writeFile(binary, "modified");
  assert.equal(await readTropidistBuild(build, record), null);
  await assert.rejects(prepareTropidistBuild(source, record, build), /preserve/i);
  assert.equal(await fs.readFile(binary, "utf8"), "modified");
  await fs.writeFile(binary, bytes);
  const input = path.join(build, "payload/cdist/gmitm.c");
  await fs.utimes(input, Date.now()/1000 + 120, Date.now()/1000 + 120);
  assert.equal(await readTropidistBuild(build, record), null);
  await fs.appendFile(path.join(source, "cdist/gmitm.c"), "changed");
  await assert.rejects(prepareTropidistBuild(source, record, build + "-new"), /source/i);
  await assert.rejects(fs.access(build + "-new"), { code: "ENOENT" });
});
