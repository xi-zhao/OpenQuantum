import { execFile } from "node:child_process";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { requireDesktopBuild } from "./lib/desktop-source.mjs";
import { writeDesktopBuilderPreload } from "./lib/desktop-package-dependencies.mjs";

if (process.platform !== "darwin") throw new Error("The Desktop signing check requires macOS");
const root = fileURLToPath(new URL("..", import.meta.url));
const upstream = await requireDesktopBuild(root);
const require = createRequire(path.join(upstream, "package.json"));
const temporary = await mkdtemp(path.join(await realpath(tmpdir()), "oq-signing-check-"));
try {
  const fixture = path.join(temporary, "files");
  await mkdir(fixture);
  for (let index = 0; index < 512; index++) {
    await writeFile(path.join(fixture, `${index}.bin`), Buffer.from([0, 1, 2, 3]));
  }
  await writeFile(path.join(fixture, "text.txt"), "This file must not be signed.\n");
  const scanner = path.join(temporary, "scan.cjs");
  await writeFile(scanner, `const assert = require("node:assert/strict");
const path = require("node:path");
const { walkAsync } = require(${JSON.stringify(require.resolve("@electron/osx-sign"))});
(async () => {
  const expected = Array.from({ length: 512 }, (_, index) => path.join(process.argv[2], index + ".bin")).sort();
  for (let attempt = 0; attempt < 3; attempt++) {
    assert.deepEqual((await walkAsync(process.argv[2])).sort(), expected);
  }
  console.log("Official signing traversal: all 512 binaries retained across three scans at a 128-file limit.");
})().catch(error => { console.error(error); process.exitCode = 1; });
`);
  const preload = await writeDesktopBuilderPreload(upstream, temporary);
  const result = await promisify(execFile)("/bin/sh", ["-c", 'ulimit -n 128\nexec "$@"', "openquantum-signing-check",
    process.execPath, "--require", preload, scanner, fixture], { timeout: 30_000 });
  console.log(result.stdout.trim());
} finally {
  await rm(temporary, { recursive: true, force: true });
}
