#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const benchmarkRoot = fileURLToPath(new URL("..", import.meta.url));
const SHA256 = /^[a-f0-9]{64}$/;
const CASE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function validateCorpus(root = benchmarkRoot) {
  const manifest = readJson(path.join(root, "manifest.json"));
  invariant(manifest.schemaVersion === "1.0", "unsupported corpus schemaVersion");
  invariant(manifest.id === "openquantum-mqtbench-corpus", "unexpected corpus id");
  invariant(manifest.version === "1.0.0", "unexpected corpus version");
  invariant(manifest.generator?.package === "mqt.bench", "unexpected generator package");
  invariant(manifest.generator?.packageVersion === "2.2.3", "generator version must stay pinned");
  invariant(manifest.generator?.pythonVersion === "3.12", "Python version must stay pinned");
  invariant(manifest.generator?.level === "ALG", "benchmark level must stay ALG");
  invariant(manifest.generator?.randomParameters === false, "random parameters must stay disabled");
  invariant(manifest.generator?.serialization === "OpenQASM 2", "serialization must stay OpenQASM 2");

  const cases = manifest.cases;
  invariant(Array.isArray(cases) && cases.length > 0, "corpus cases are missing");
  const caseIds = cases.map((item) => item.id);
  invariant(caseIds.every((id) => CASE_ID.test(id)), "corpus contains an invalid case id");
  invariant(new Set(caseIds).size === caseIds.length, "corpus contains duplicate case ids");
  invariant(manifest.denominator?.caseCount === cases.length, "fixed denominator count does not match cases");
  invariant(
    JSON.stringify(manifest.denominator?.caseIds) === JSON.stringify(caseIds),
    "fixed denominator caseIds do not match ordered cases",
  );

  const expectedFixtures = cases.map((item) => item.fixture).sort();
  const actualFixtures = fs
    .readdirSync(path.join(root, "fixtures"), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".qasm"))
    .map((entry) => `fixtures/${entry.name}`)
    .sort();
  invariant(
    JSON.stringify(actualFixtures) === JSON.stringify(expectedFixtures),
    "fixture files and fixed denominator differ",
  );

  const observations = cases.map((definition) => {
    invariant(
      definition.fixture === `fixtures/${definition.id}.qasm`,
      `${definition.id}: fixture path is not canonical`,
    );
    invariant(SHA256.test(definition.sha256), `${definition.id}: invalid SHA-256`);
    invariant(
      Number.isInteger(definition.circuitSize) && definition.circuitSize > 0,
      `${definition.id}: invalid circuitSize`,
    );
    for (const metric of ["qubits", "depth", "gates"]) {
      invariant(
        Number.isInteger(definition.expected?.[metric]) && definition.expected[metric] > 0,
        `${definition.id}: invalid expected ${metric}`,
      );
    }
    const qasm = fs.readFileSync(path.join(root, definition.fixture), "utf8");
    invariant(qasm.endsWith("\n"), `${definition.id}: fixture must have one canonical trailing newline`);
    invariant(qasm.startsWith("OPENQASM 2.0;\n"), `${definition.id}: fixture is not OpenQASM 2`);
    const qreg = qasm.match(/^qreg\s+[A-Za-z_][A-Za-z0-9_]*\[(\d+)\];$/m);
    invariant(qreg, `${definition.id}: qreg declaration is missing`);
    invariant(Number(qreg[1]) === definition.expected.qubits, `${definition.id}: qubit count differs`);
    const sha256 = createHash("sha256").update(qasm).digest("hex");
    invariant(sha256 === definition.sha256, `${definition.id}: fixture digest differs`);
    return { id: definition.id, sha256, status: "pass" };
  });

  return {
    schemaVersion: "1.0",
    corpus: { id: manifest.id, version: manifest.version },
    denominator: { caseCount: cases.length, caseIds },
    observations,
  };
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  try {
    process.stdout.write(`${JSON.stringify(validateCorpus(), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
