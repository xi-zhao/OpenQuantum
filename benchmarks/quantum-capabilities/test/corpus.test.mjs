import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { validateCorpus } from "../scripts/validate-corpus.mjs";

const benchmarkRoot = fileURLToPath(new URL("..", import.meta.url));

async function copiedCorpus(t) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "openquantum-mqtbench-test-"));
  const root = path.join(temporary, "corpus");
  await cp(benchmarkRoot, root, { recursive: true });
  t.after(() => rm(temporary, { recursive: true, force: true }));
  return root;
}

test("fixed MQT Bench corpus validates with a denominator of three", () => {
  const report = validateCorpus();
  assert.equal(report.denominator.caseCount, 3);
  assert.deepEqual(report.denominator.caseIds, ["ghz-3", "qft-3", "bv-4"]);
  assert.ok(report.observations.every((item) => item.status === "pass"));
});

test("fixture tampering fails closed", async (t) => {
  const root = await copiedCorpus(t);
  const fixture = path.join(root, "fixtures", "ghz-3.qasm");
  await writeFile(fixture, `${await readFile(fixture, "utf8")}x q[0];\n`);
  assert.throws(() => validateCorpus(root), /fixture digest differs/);
});

test("denominator drift fails closed", async (t) => {
  const root = await copiedCorpus(t);
  const manifestPath = path.join(root, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.denominator.caseCount = 4;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  assert.throws(() => validateCorpus(root), /fixed denominator count/);
});
