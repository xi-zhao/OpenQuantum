import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parse, stringify } from "yaml";

import {
  buildAcceptanceReport,
  ContractValidationError,
  deriveAcceptanceStatus,
  digestFile,
  loadAcceptanceReport,
  loadCapability,
  loadResultPackage,
  validateAcceptanceReportValue,
} from "../index.mjs";

const testRoot = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(testRoot, "fixtures");
const capabilityFixture = path.join(
  fixtureRoot,
  "capabilities",
  "fixture-capability",
);
const resultFixture = path.join(fixtureRoot, "results", "valid");
const resultPackageFixture = path.join(resultFixture, "result-package.json");
const acceptanceReportFixture = path.join(resultFixture, "acceptance-report.json");
const observationsFixture = path.join(resultFixture, "observations-passed.json");
const cliPath = path.resolve(testRoot, "..", "cli.mjs");

function clone(value) {
  return structuredClone(value);
}

function createTemporaryDirectory(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `openquantum-${prefix}-`));
}

function removeTemporaryDirectory(directory) {
  fs.rmSync(directory, { recursive: true, force: true });
}

async function expectContractFailure(action, fragment) {
  try {
    await action();
    assert.fail("Expected ContractValidationError");
  } catch (error) {
    assert.ok(error instanceof ContractValidationError, String(error));
    if (fragment) {
      assert.ok(
        error.issues.some((issue) => issue.includes(fragment)),
        `Expected an issue containing ${JSON.stringify(fragment)}; received:\n${error.issues.join("\n")}`,
      );
    }
  }
}

async function withCapabilityTree(mutator, assertion) {
  const temporaryRoot = createTemporaryDirectory("capability");
  const skillRoot = path.join(temporaryRoot, "fixture-capability");
  fs.cpSync(capabilityFixture, skillRoot, { recursive: true });
  const manifestPath = path.join(skillRoot, "capability.yaml");
  let manifest = parse(fs.readFileSync(manifestPath, "utf8"));
  const context = {
    manifest,
    manifestPath,
    skillRoot,
    temporaryRoot,
    saveManifest() {
      fs.writeFileSync(manifestPath, stringify(manifest));
    },
    replaceManifest(nextManifest) {
      manifest = nextManifest;
      context.manifest = nextManifest;
    },
  };

  try {
    await mutator(context);
    await assertion(context);
  } finally {
    removeTemporaryDirectory(temporaryRoot);
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function refreshFileReference(packageRoot, reference) {
  const filePath = path.join(packageRoot, reference.path);
  reference.bytes = fs.statSync(filePath).size;
  reference.sha256 = digestFile(filePath);
}

async function withResultTree(capability, mutator, assertion) {
  const temporaryRoot = createTemporaryDirectory("result");
  const packageRoot = path.join(temporaryRoot, "result");
  fs.cpSync(resultFixture, packageRoot, { recursive: true });
  const packagePath = path.join(packageRoot, "result-package.json");
  const resultPackage = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const context = {
    packageRoot,
    packagePath,
    resultPackage,
    temporaryRoot,
    savePackage() {
      writeJson(packagePath, resultPackage);
    },
    writePayload(reference, value) {
      writeJson(path.join(packageRoot, reference.path), value);
      refreshFileReference(packageRoot, reference);
    },
  };

  try {
    await mutator(context);
    await assertion(context, capability);
  } finally {
    removeTemporaryDirectory(temporaryRoot);
  }
}

test("Capability manifest v1 accepts a complete Skill tree", async () => {
  const capability = await loadCapability(capabilityFixture);
  assert.equal(capability.manifest.id, "fixture-capability");
  assert.equal(capability.manifest.version, "1.2.3");
  assert.equal(capability.artifactSchemas.size, 2);
});

test("Capability manifest v1 accepts a validated maturity with digest-backed evidence", async () => {
  await withCapabilityTree(
    ({ manifest, skillRoot, saveManifest }) => {
      const evidenceDirectory = path.join(skillRoot, "evidence");
      fs.mkdirSync(evidenceDirectory);
      const evidencePath = path.join(evidenceDirectory, "validation.json");
      writeJson(evidencePath, { accepted: true });
      manifest.maturity = {
        status: "validated",
        evidence: [
          {
            id: "validation-001",
            kind: "validator-report",
            path: "evidence/validation.json",
            sha256: digestFile(evidencePath),
          },
        ],
      };
      saveManifest();
    },
    async ({ skillRoot }) => {
      const capability = await loadCapability(skillRoot);
      assert.equal(capability.manifest.maturity.status, "validated");
    },
  );
});

const capabilityMutationCases = [
  {
    name: "directory id mismatch",
    fragment: "directory name",
    mutate({ manifest, saveManifest }) {
      manifest.id = "another-capability";
      saveManifest();
    },
  },
  {
    name: "SKILL frontmatter mismatch",
    fragment: "SKILL frontmatter name",
    mutate({ manifest, saveManifest }) {
      manifest.skill.name = "another-capability";
      saveManifest();
    },
  },
  {
    name: "duplicate artifact id",
    fragment: "duplicate artifact id",
    mutate({ manifest, saveManifest }) {
      manifest.artifacts.push(clone(manifest.artifacts[0]));
      saveManifest();
    },
  },
  {
    name: "duplicate profile check id",
    fragment: "duplicate check id",
    mutate({ manifest, saveManifest }) {
      manifest.acceptanceProfiles[0].checks.push(
        clone(manifest.acceptanceProfiles[0].checks[0]),
      );
      saveManifest();
    },
  },
  {
    name: "unknown profile validator",
    fragment: "unknown validator",
    mutate({ manifest, saveManifest }) {
      manifest.acceptanceProfiles[0].validator = "missing-validator";
      saveManifest();
    },
  },
  {
    name: "missing referenced file",
    fragment: "does not resolve to an existing file",
    mutate({ manifest, saveManifest }) {
      manifest.input.schema = "inputs/missing.schema.json";
      saveManifest();
    },
  },
  {
    name: "parent path traversal",
    fragment: "without '.' or '..'",
    mutate({ manifest, saveManifest }) {
      manifest.input.schema = "../outside.schema.json";
      saveManifest();
    },
  },
  {
    name: "absolute path",
    fragment: "must not be absolute",
    mutate({ manifest, saveManifest }) {
      manifest.input.schema = "/tmp/request.schema.json";
      saveManifest();
    },
  },
  {
    name: "strict JSON Schema compile failure",
    fragment: "strict mode",
    mutate({ skillRoot }) {
      writeJson(path.join(skillRoot, "inputs/request.schema.json"), {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        unknownKeyword: true,
      });
    },
  },
  {
    name: "validated maturity without validation evidence",
    fragment: "requires validator-report or scientific-review",
    mutate({ manifest, saveManifest }) {
      manifest.maturity.status = "validated";
      saveManifest();
    },
  },
  {
    name: "released maturity without release record",
    fragment: "requires release-record",
    mutate({ manifest, skillRoot, saveManifest }) {
      const evidenceDirectory = path.join(skillRoot, "evidence");
      fs.mkdirSync(evidenceDirectory);
      const evidencePath = path.join(evidenceDirectory, "validation.json");
      writeJson(evidencePath, { accepted: true });
      manifest.maturity = {
        status: "released",
        evidence: [
          {
            id: "validation-001",
            kind: "validator-report",
            path: "evidence/validation.json",
            sha256: digestFile(evidencePath),
          },
        ],
      };
      saveManifest();
    },
  },
  {
    name: "maturity evidence digest mismatch",
    fragment: "sha256 does not match",
    mutate({ manifest, skillRoot, saveManifest }) {
      const evidenceDirectory = path.join(skillRoot, "evidence");
      fs.mkdirSync(evidenceDirectory);
      writeJson(path.join(evidenceDirectory, "validation.json"), { accepted: true });
      manifest.maturity = {
        status: "validated",
        evidence: [
          {
            id: "validation-001",
            kind: "validator-report",
            path: "evidence/validation.json",
            sha256: "c".repeat(64),
          },
        ],
      };
      saveManifest();
    },
  },
  {
    name: "credential in manifest",
    fragment: "probable OpenAI-style key",
    mutate({ manifest, saveManifest }) {
      manifest.description = `Never embed ${"sk"}-${"abcdefghijklmnopqrstuv"} in a manifest.`;
      saveManifest();
    },
  },
  {
    name: "validator script is not mjs",
    fragment: "package-local .mjs",
    mutate({ manifest, saveManifest }) {
      manifest.validators[0].command.script = "validators/validate.js";
      saveManifest();
    },
  },
  {
    name: "validator enables a shell",
    fragment: "must be equal to constant",
    mutate({ manifest, saveManifest }) {
      manifest.validators[0].command.shell = true;
      saveManifest();
    },
  },
];

for (const testCase of capabilityMutationCases) {
  test(`Capability manifest rejects ${testCase.name}`, async () => {
    await withCapabilityTree(testCase.mutate, async ({ skillRoot }) => {
      await expectContractFailure(() => loadCapability(skillRoot), testCase.fragment);
    });
  });
}

test("Capability manifest rejects duplicate YAML keys", async () => {
  await withCapabilityTree(
    ({ manifestPath }) => {
      fs.appendFileSync(manifestPath, "\nid: duplicate-id\n");
    },
    async ({ skillRoot }) => {
      await expectContractFailure(() => loadCapability(skillRoot), "Map keys must be unique");
    },
  );
});

test("Capability manifest rejects a symlink that resolves outside the Skill root", async () => {
  await withCapabilityTree(
    ({ manifest, skillRoot, temporaryRoot, saveManifest }) => {
      const outside = path.join(temporaryRoot, "outside.mjs");
      fs.writeFileSync(outside, "export default true;\n");
      fs.symlinkSync(outside, path.join(skillRoot, "validators/escape.mjs"));
      manifest.validators[0].command.script = "validators/escape.mjs";
      saveManifest();
    },
    async ({ skillRoot }) => {
      await expectContractFailure(() => loadCapability(skillRoot), "resolves outside its root");
    },
  );
});

const capability = await loadCapability(capabilityFixture);

test("Result Package v1 accepts a complete file tree", () => {
  const result = loadResultPackage(resultPackageFixture, capability);
  assert.equal(result.value.packageId, "pkg-001");
  assert.match(result.sourceDigest, /^[a-f0-9]{64}$/);
});

const resultMutationCases = [
  {
    name: "capability version mismatch",
    fragment: "capability must equal",
    mutate({ resultPackage, savePackage }) {
      resultPackage.capability.version = "9.9.9";
      savePackage();
    },
  },
  {
    name: "acceptance profile version mismatch",
    fragment: "acceptanceProfile must reference",
    mutate({ resultPackage, savePackage }) {
      resultPackage.acceptanceProfile.version = "9.9.9";
      savePackage();
    },
  },
  {
    name: "duplicate input and artifact id",
    fragment: "duplicate input/artifact id",
    mutate({ resultPackage, savePackage }) {
      resultPackage.artifacts[0].id = resultPackage.inputs[0].id;
      savePackage();
    },
  },
  {
    name: "duplicate input and artifact path",
    fragment: "duplicate input/artifact path",
    mutate({ resultPackage, savePackage }) {
      resultPackage.artifacts[0].path = resultPackage.inputs[0].path;
      resultPackage.artifacts[0].bytes = resultPackage.inputs[0].bytes;
      resultPackage.artifacts[0].sha256 = resultPackage.inputs[0].sha256;
      savePackage();
    },
  },
  {
    name: "undeclared artifact type",
    fragment: "undeclared type",
    mutate({ resultPackage, savePackage }) {
      resultPackage.artifacts[0].type = "unknown-result";
      savePackage();
    },
  },
  {
    name: "missing required artifact type",
    fragment: "missing required artifact type",
    mutate({ resultPackage, savePackage }) {
      resultPackage.artifacts[0].type = "convergence-trace";
      savePackage();
    },
  },
  {
    name: "incorrect byte count",
    fragment: ".bytes must equal",
    mutate({ resultPackage, savePackage }) {
      resultPackage.inputs[0].bytes += 1;
      savePackage();
    },
  },
  {
    name: "incorrect sha256",
    fragment: ".sha256 does not match",
    mutate({ resultPackage, savePackage }) {
      resultPackage.artifacts[0].sha256 = "c".repeat(64);
      savePackage();
    },
  },
  {
    name: "input JSON that violates the manifest schema",
    fragment: "violates its declared schema",
    mutate(context) {
      context.writePayload(context.resultPackage.inputs[0], { molecule: "LiH" });
      context.savePackage();
    },
  },
  {
    name: "artifact JSON that violates its declared schema",
    fragment: "violates its declared schema",
    mutate(context) {
      context.writePayload(context.resultPackage.artifacts[0], {
        energy: "not-a-number",
        unit: "hartree",
      });
      context.savePackage();
    },
  },
  {
    name: "absolute payload path",
    fragment: "must not be absolute",
    mutate({ resultPackage, packageRoot, savePackage }) {
      resultPackage.inputs[0].path = path.join(packageRoot, "inputs/request.json");
      savePackage();
    },
  },
  {
    name: "parent payload path traversal",
    fragment: "without '.' or '..'",
    mutate({ resultPackage, savePackage }) {
      resultPackage.inputs[0].path = "../outside.json";
      savePackage();
    },
  },
  {
    name: "scientific status in the fact-only package",
    fragment: "scientificStatus",
    mutate({ resultPackage, savePackage }) {
      resultPackage.scientificStatus = "passed";
      savePackage();
    },
  },
  {
    name: "aggregate score in the fact-only package",
    fragment: "score",
    mutate({ resultPackage, savePackage }) {
      resultPackage.score = 100;
      savePackage();
    },
  },
  {
    name: "credential-like value",
    fragment: "probable OpenAI-style key",
    mutate({ resultPackage, savePackage }) {
      resultPackage.provenance.models[0].model = `${"sk"}-${"abcdefghijklmnopqrstuv"}`;
      savePackage();
    },
  },
  {
    name: "credential-like value inside a JSON artifact payload",
    fragment: "probable OpenAI-style key",
    mutate(context) {
      const artifact = context.resultPackage.artifacts[0];
      context.writePayload(artifact, {
        energy: -1.137,
        unit: `${"sk"}-${"abcdefghijklmnopqrstuv"}`,
      });
      context.savePackage();
    },
  },
  {
    name: "artifact count beyond the manifest limit",
    fragment: "maxArtifacts",
    mutate({ resultPackage, savePackage }) {
      const original = resultPackage.artifacts[0];
      for (let index = 0; index < 5; index += 1) {
        resultPackage.artifacts.push({
          ...structuredClone(original),
          id: `overflow-${index}`,
          path: `artifacts/overflow-${index}.json`,
        });
      }
      savePackage();
    },
  },
  {
    name: "unversioned provenance tool",
    fragment: "version",
    mutate({ resultPackage, savePackage }) {
      resultPackage.provenance.tools[0].version = "";
      savePackage();
    },
  },
  {
    name: "invalid environment digest",
    fragment: "digest",
    mutate({ resultPackage, savePackage }) {
      resultPackage.provenance.environment[0].digest = "not-a-digest";
      savePackage();
    },
  },
];

for (const testCase of resultMutationCases) {
  test(`Result Package rejects ${testCase.name}`, async () => {
    await withResultTree(capability, testCase.mutate, async ({ packagePath }) => {
      await expectContractFailure(
        () => Promise.resolve(loadResultPackage(packagePath, capability)),
        testCase.fragment,
      );
    });
  });
}

test("Result Package rejects a payload symlink escaping the package root", async () => {
  await withResultTree(
    capability,
    ({ packageRoot, temporaryRoot }) => {
      const inputPath = path.join(packageRoot, "inputs/request.json");
      const outsidePath = path.join(temporaryRoot, "outside.json");
      fs.copyFileSync(inputPath, outsidePath);
      fs.unlinkSync(inputPath);
      fs.symlinkSync(outsidePath, inputPath);
    },
    async ({ packagePath }) => {
      await expectContractFailure(
        () => Promise.resolve(loadResultPackage(packagePath, capability)),
        "resolves outside its root",
      );
    },
  );
});

const validResult = loadResultPackage(resultPackageFixture, capability);
const passedObservationsDocument = JSON.parse(
  fs.readFileSync(observationsFixture, "utf8"),
);

function buildReport(checks, overrides = {}) {
  return buildAcceptanceReport({
    capability,
    resultPackage: validResult,
    validatorId: "deterministic-validator",
    profileId: "scientific-v1",
    reportId: "report-test",
    generatedAt: "2026-08-14T01:05:00.000Z",
    observations: checks,
    limitations: [],
    statement: "Fixture acceptance result.",
    ...overrides,
  });
}

test("Acceptance Report v1 loads a complete report tree", () => {
  const report = loadAcceptanceReport(
    acceptanceReportFixture,
    capability,
    validResult,
  );
  assert.equal(report.value.status, "passed");
});

test("Acceptance builder injects profile fields and derives passed", () => {
  const report = buildReport(clone(passedObservationsDocument.checks));
  assert.equal(report.status, "passed");
  assert.equal(report.checks[0].required, true);
  assert.equal(report.checks[0].category, "scientific");
  assert.equal(report.checks[1].required, false);
});

const acceptanceStatusCases = [
  { check: "energy-accuracy", checkStatus: "fail", expected: "failed" },
  { check: "energy-accuracy", checkStatus: "not_checked", expected: "failed" },
  { check: "energy-accuracy", checkStatus: "warn", expected: "conditional" },
  { check: "metadata-completeness", checkStatus: "warn", expected: "conditional" },
  { check: "metadata-completeness", checkStatus: "fail", expected: "conditional" },
  { check: "metadata-completeness", checkStatus: "not_checked", expected: "conditional" },
];

for (const testCase of acceptanceStatusCases) {
  test(`Acceptance builder derives ${testCase.expected} for ${
    testCase.check
  }=${testCase.checkStatus}`, () => {
    const checks = clone(passedObservationsDocument.checks);
    const check = checks.find((candidate) => candidate.id === testCase.check);
    check.status = testCase.checkStatus;
    check.nextAction = "Inspect the failed or incomplete evidence.";
    if (testCase.checkStatus === "not_checked") {
      check.evidenceRefs = [];
    }
    const report = buildReport(checks);
    assert.equal(report.status, testCase.expected);
  });
}

test("Acceptance status aggregation never lets optional checks override a hard failure", () => {
  const checks = [
    { id: "required", required: true, status: "fail" },
    { id: "optional", required: false, status: "pass" },
  ];
  assert.equal(deriveAcceptanceStatus(checks), "failed");
});

const builderFailureCases = [
  {
    name: "a missing profile check",
    fragment: "missing observation",
    mutate(checks) {
      checks.pop();
    },
  },
  {
    name: "an unknown profile check",
    fragment: "unknown observation",
    mutate(checks) {
      checks[0].id = "unknown-check";
    },
  },
  {
    name: "a duplicate profile check",
    fragment: "duplicate observation check id",
    mutate(checks) {
      checks[1].id = checks[0].id;
    },
  },
  {
    name: "domain-supplied required metadata",
    fragment: "unsupported fields: required",
    mutate(checks) {
      checks[0].required = false;
    },
  },
  {
    name: "domain-supplied category metadata",
    fragment: "unsupported fields: category",
    mutate(checks) {
      checks[0].category = "self-asserted";
    },
  },
  {
    name: "a non-pass check without nextAction",
    fragment: "must include nextAction",
    mutate(checks) {
      checks[0].status = "fail";
    },
  },
  {
    name: "an evaluated check without evidence",
    fragment: "must cite evidence",
    mutate(checks) {
      checks[0].evidenceRefs = [];
    },
  },
  {
    name: "an unknown input evidence reference",
    fragment: "unknown input",
    mutate(checks) {
      checks[1].evidenceRefs[0].id = "missing-input";
    },
  },
  {
    name: "an unknown artifact evidence reference",
    fragment: "unknown artifact",
    mutate(checks) {
      checks[0].evidenceRefs[0].id = "missing-artifact";
    },
  },
  {
    name: "a session event from another session",
    fragment: "session-event id",
    mutate(checks) {
      checks[0].evidenceRefs[1].id = "another-session";
    },
  },
  {
    name: "a session event outside the result range",
    fragment: "outside the result package event range",
    mutate(checks) {
      checks[0].evidenceRefs[1].sequence = 999;
    },
  },
];

for (const testCase of builderFailureCases) {
  test(`Acceptance builder rejects ${testCase.name}`, async () => {
    const checks = clone(passedObservationsDocument.checks);
    testCase.mutate(checks);
    await expectContractFailure(
      () => Promise.resolve(buildReport(checks)),
      testCase.fragment,
    );
  });
}

test("Acceptance builder rejects a domain-supplied final status", async () => {
  await expectContractFailure(
    () =>
      Promise.resolve(
        buildReport(clone(passedObservationsDocument.checks), { status: "passed" }),
      ),
    "unsupported fields: status",
  );
});

test("Acceptance builder rejects a report generated before its result package", async () => {
  await expectContractFailure(
    () =>
      Promise.resolve(
        buildReport(clone(passedObservationsDocument.checks), {
          generatedAt: "2026-08-14T00:59:59.000Z",
        }),
      ),
    "must not be earlier",
  );
});

test("Acceptance builder rejects credential-like report content", async () => {
  await expectContractFailure(
    () =>
      Promise.resolve(
        buildReport(clone(passedObservationsDocument.checks), {
          statement: `Leaked ${"sk"}-${"abcdefghijklmnopqrstuv"}`,
        }),
      ),
    "probable OpenAI-style key",
  );
});

const reportMutationCases = [
  {
    name: "tampered final status",
    fragment: "status must be derived",
    mutate(report) {
      report.status = "failed";
    },
  },
  {
    name: "tampered result package digest",
    fragment: "sha256 does not match",
    mutate(report) {
      report.resultPackage.sha256 = "d".repeat(64);
    },
  },
  {
    name: "tampered capability version",
    fragment: "capability must equal",
    mutate(report) {
      report.capability.version = "9.9.9";
    },
  },
  {
    name: "tampered validator version",
    fragment: "validator version",
    mutate(report) {
      report.validator.version = "9.9.9";
    },
  },
  {
    name: "tampered profile version",
    fragment: "profile version",
    mutate(report) {
      report.profile.version = "9.9.9";
    },
  },
  {
    name: "missing profile check",
    fragment: "missing profile check",
    mutate(report) {
      report.checks.pop();
    },
  },
  {
    name: "unknown profile check",
    fragment: "unknown report check",
    mutate(report) {
      report.checks[0].id = "unknown-check";
    },
  },
  {
    name: "duplicate profile check",
    fragment: "duplicate report check id",
    mutate(report) {
      report.checks[1].id = report.checks[0].id;
    },
  },
  {
    name: "self-asserted profile category",
    fragment: "category must be injected",
    mutate(report) {
      report.checks[0].category = "self-asserted";
    },
  },
  {
    name: "self-asserted required flag",
    fragment: "required must be injected",
    mutate(report) {
      report.checks[0].required = false;
    },
  },
];

for (const testCase of reportMutationCases) {
  test(`Acceptance Report rejects ${testCase.name}`, () => {
    const report = buildReport(clone(passedObservationsDocument.checks));
    testCase.mutate(report);
    const issues = validateAcceptanceReportValue(report, capability, validResult);
    assert.ok(
      issues.some((issue) => issue.includes(testCase.fragment)),
      `Expected ${testCase.fragment}; received:\n${issues.join("\n")}`,
    );
  });
}

test("CLI validates all three v1 contracts and builds a derived report", () => {
  const temporaryRoot = createTemporaryDirectory("cli");
  const outputPath = path.join(temporaryRoot, "built-report.json");
  try {
    const invocations = [
      ["validate-capability", capabilityFixture],
      ["validate-result", capabilityFixture, resultPackageFixture],
      [
        "validate-acceptance",
        capabilityFixture,
        resultPackageFixture,
        acceptanceReportFixture,
      ],
      [
        "build-acceptance",
        capabilityFixture,
        resultPackageFixture,
        "deterministic-validator",
        "scientific-v1",
        observationsFixture,
        outputPath,
      ],
    ];

    for (const args of invocations) {
      const result = spawnSync(process.execPath, [cliPath, ...args], {
        encoding: "utf8",
      });
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    }

    const built = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    assert.equal(built.status, "passed");
  } finally {
    removeTemporaryDirectory(temporaryRoot);
  }
});
