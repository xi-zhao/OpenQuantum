import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { validateCorpus } from "../scripts/validate-corpus.mjs";

const root = fileURLToPath(new URL("../corpora/v2/", import.meta.url));
const versions = { version: "2.0.0", packageVersion: "2.3.0" };
test("v2 corpus covers seven families at three sizes without changing v1", () => {
  const report = validateCorpus(root, versions);
  assert.equal(report.denominator.caseCount, 21);
  assert.deepEqual(report.denominator.caseIds, ["ghz", "qft", "bv", "wstate", "dj", "grover", "qaoa"].flatMap(name => [3, 5, 7].map(size => `${name}-${size}`)));
  assert.equal(validateCorpus().denominator.caseCount, 3);
});

test("expanded corpus rejects altered fixture hashes and a stale generator version", async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "oq corpus v2 "));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.cp(root, directory, { recursive: true });
  const manifestFile = path.join(directory, "manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestFile, "utf8"));
  manifest.generator.packageVersion = "2.2.3";
  await fs.writeFile(manifestFile, JSON.stringify(manifest));
  assert.throws(() => validateCorpus(directory, versions), /generator version must stay pinned/);
  manifest.generator.packageVersion = "2.3.0";
  await fs.writeFile(manifestFile, JSON.stringify(manifest));
  await fs.appendFile(path.join(directory, "fixtures/ghz-3.qasm"), "x q[0];\n");
  assert.throws(() => validateCorpus(directory, versions), /fixture digest differs/);
});
