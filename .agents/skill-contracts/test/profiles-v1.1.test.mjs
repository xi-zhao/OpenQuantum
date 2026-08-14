import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parse, stringify } from "yaml";

import {
  buildAcceptanceReport,
  ContractValidationError,
  digestFile,
  loadAcceptanceReport,
  loadCapability,
  loadResultPackage,
  validateAcceptanceReportValue,
} from "../index.mjs";

const testRoot = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.join(testRoot, "fixtures");
const v10CapabilityFixture = path.join(
  fixturesRoot,
  "capabilities",
  "fixture-capability",
);
const v10ResultFixture = path.join(fixturesRoot, "results", "valid");

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createV11CapabilityTree() {
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "openquantum-profiles-v11-"),
  );
  const skillRoot = path.join(temporaryRoot, "fixture-capability");
  fs.cpSync(v10CapabilityFixture, skillRoot, { recursive: true });
  const manifestPath = path.join(skillRoot, "capability.yaml");
  const manifest = parse(fs.readFileSync(manifestPath, "utf8"));
  const acceptancePath = path.join(skillRoot, "profiles/acceptance.json");
  const reproductionPath = path.join(skillRoot, "profiles/reproduction.json");
  const suitePath = path.join(skillRoot, "evals/suite.json");
  const acceptanceProfile = {
    schemaVersion: "1.0",
    id: "scientific-v1",
    version: "1.0.0",
    scope: {
      supportedClaims: ["Synthetic fixture energy is within tolerance"],
      outOfScope: ["Real scientific claims"],
    },
    checks: [
      {
        id: "energy-accuracy",
        category: "scientific",
        required: true,
        criterion: "Energy is within the fixture tolerance.",
        threshold: 0.01,
        unit: "hartree",
      },
      {
        id: "metadata-completeness",
        category: "reproducibility",
        required: false,
        criterion: "The input snapshot is present.",
      },
    ],
  };
  const reproductionProfile = {
    schemaVersion: "1.0",
    id: "independent-v1",
    version: "1.0.0",
    scope: {
      supportedClaims: ["The fixture can be independently repeated"],
      outOfScope: ["Cross-hardware reproducibility"],
    },
    checks: [
      {
        id: "independent-execution",
        category: "independence",
        required: true,
        criterion: "A separate execution produced the result.",
      },
      {
        id: "energy-agreement",
        category: "scientific",
        required: true,
        criterion: "Repeated energy is within tolerance.",
        threshold: 0.01,
        unit: "hartree",
      },
    ],
    independenceCheck: "independent-execution",
  };
  const evaluationSuite = {
    schemaVersion: "1.0",
    id: "fixture-eval-v1",
    version: "1.0.0",
    metric: {
      id: "energy-quality",
      unit: "fraction",
      direction: "higher_is_better",
      minimum: 0,
      maximum: 1,
    },
    cases: [
      {
        id: "h2-ground-state",
        weight: 1,
        hardGate: true,
        expectedOutcome: { status: "pass", maxErrorHartree: 0.01 },
      },
    ],
  };
  writeJson(acceptancePath, acceptanceProfile);
  writeJson(reproductionPath, reproductionProfile);
  writeJson(suitePath, evaluationSuite);

  manifest.schemaVersion = "1.1";
  manifest.acceptanceProfiles = [
    {
      id: acceptanceProfile.id,
      version: acceptanceProfile.version,
      validator: "deterministic-validator",
      definition: {
        path: "profiles/acceptance.json",
        sha256: digestFile(acceptancePath),
      },
    },
  ];
  manifest.reproductionProfiles = [
    {
      id: reproductionProfile.id,
      version: reproductionProfile.version,
      validator: "deterministic-validator",
      definition: {
        path: "profiles/reproduction.json",
        sha256: digestFile(reproductionPath),
      },
    },
  ];
  manifest.evals = {
    runner: manifest.evals.runner,
    suite: {
      id: evaluationSuite.id,
      version: evaluationSuite.version,
      path: "evals/suite.json",
      sha256: digestFile(suitePath),
    },
  };
  manifest.compatibility.contract = "1.1";

  const context = {
    temporaryRoot,
    skillRoot,
    manifestPath,
    manifest,
    acceptancePath,
    reproductionPath,
    suitePath,
    acceptanceProfile,
    reproductionProfile,
    evaluationSuite,
    saveManifest() {
      fs.writeFileSync(manifestPath, stringify(manifest));
    },
    saveAcceptanceProfile({ refreshDigest = true } = {}) {
      writeJson(acceptancePath, acceptanceProfile);
      if (refreshDigest) {
        manifest.acceptanceProfiles[0].definition.sha256 = digestFile(acceptancePath);
      }
      context.saveManifest();
    },
    saveReproductionProfile({ refreshDigest = true } = {}) {
      writeJson(reproductionPath, reproductionProfile);
      if (refreshDigest) {
        manifest.reproductionProfiles[0].definition.sha256 = digestFile(reproductionPath);
      }
      context.saveManifest();
    },
    saveEvaluationSuite({ refreshDigest = true } = {}) {
      writeJson(suitePath, evaluationSuite);
      if (refreshDigest) {
        manifest.evals.suite.sha256 = digestFile(suitePath);
      }
      context.saveManifest();
    },
    cleanup() {
      fs.rmSync(temporaryRoot, { recursive: true, force: true });
    },
  };
  context.saveManifest();
  return context;
}

function createV11ResultTree(capability) {
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "openquantum-result-v11-"),
  );
  const packageRoot = path.join(temporaryRoot, "result");
  fs.cpSync(v10ResultFixture, packageRoot, { recursive: true });
  const packagePath = path.join(packageRoot, "result-package.json");
  const resultPackage = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  resultPackage.schemaVersion = "1.1";
  resultPackage.acceptanceProfile.sha256 =
    capability.manifest.acceptanceProfiles[0].definition.sha256;
  resultPackage.provenance.dependencies = structuredClone(
    capability.manifest.dependencies ?? [],
  );
  const context = {
    temporaryRoot,
    packageRoot,
    packagePath,
    resultPackage,
    savePackage() {
      writeJson(packagePath, resultPackage);
    },
    cleanup() {
      fs.rmSync(temporaryRoot, { recursive: true, force: true });
    },
  };
  context.savePackage();
  return context;
}

async function expectContractFailure(action, fragment) {
  try {
    await action();
    assert.fail("Expected ContractValidationError");
  } catch (error) {
    assert.ok(error instanceof ContractValidationError, String(error));
    assert.ok(
      error.issues.some((issue) => issue.includes(fragment)),
      `Expected issue containing ${fragment}; received:\n${error.issues.join("\n")}`,
    );
  }
}

async function withV11Capability(action) {
  const context = createV11CapabilityTree();
  try {
    return await action(context);
  } finally {
    context.cleanup();
  }
}

async function withV11Result(action) {
  return withV11Capability(async (capabilityContext) => {
    const capability = await loadCapability(capabilityContext.skillRoot);
    const resultContext = createV11ResultTree(capability);
    try {
      const result = loadResultPackage(resultContext.packagePath, capability);
      return await action({ capabilityContext, capability, resultContext, result });
    } finally {
      resultContext.cleanup();
    }
  });
}

test("Capability loader dual-reads v1.0 and expands digest-locked v1.1 definitions", async () => {
  const v10 = await loadCapability(v10CapabilityFixture);
  assert.equal(v10.kind, "openquantum-capability-v1");
  assert.equal(v10.acceptanceProfileDefinitions.size, 0);

  await withV11Capability(async ({ skillRoot }) => {
    const capability = await loadCapability(skillRoot);
    assert.equal(capability.kind, "openquantum-capability-v1.1");
    assert.equal(
      capability.acceptanceProfileDefinitions.get("scientific-v1").checks[0].unit,
      "hartree",
    );
    assert.equal(
      capability.reproductionProfileDefinitions.get("independent-v1")
        .independenceCheck,
      "independent-execution",
    );
    assert.equal(capability.evaluationSuite.metric.maximum, 1);
    assert.match(capability.evaluationSuite.sha256, /^[a-f0-9]{64}$/);
  });
});

test("Capability v1.1 rejects a profile whose locked digest no longer matches", async () => {
  await withV11Capability(async (context) => {
    context.acceptanceProfile.scope.supportedClaims.push("Tampered claim");
    context.saveAcceptanceProfile({ refreshDigest: false });
    await expectContractFailure(
      () => loadCapability(context.skillRoot),
      "definition sha256 does not match",
    );
  });
});

test("Capability v1.1 binds profile id, version, path, uniqueness, and validator", async () => {
  const cases = [
    {
      fragment: "definition id must equal scientific-v1",
      mutate(context) {
        context.acceptanceProfile.id = "another-profile";
        context.saveAcceptanceProfile();
      },
    },
    {
      fragment: "definition version must equal 1.0.0",
      mutate(context) {
        context.acceptanceProfile.version = "2.0.0";
        context.saveAcceptanceProfile();
      },
    },
    {
      fragment: "duplicate check id",
      mutate(context) {
        context.acceptanceProfile.checks.push(
          structuredClone(context.acceptanceProfile.checks[0]),
        );
        context.saveAcceptanceProfile();
      },
    },
    {
      fragment: "without '.' or '..'",
      mutate(context) {
        context.manifest.acceptanceProfiles[0].definition.path =
          "../profiles/acceptance.json";
        context.saveManifest();
      },
    },
    {
      fragment: "references unknown validator",
      mutate(context) {
        context.manifest.acceptanceProfiles[0].validator = "missing-validator";
        context.saveManifest();
      },
    },
  ];

  for (const candidate of cases) {
    await withV11Capability(async (context) => {
      candidate.mutate(context);
      await expectContractFailure(
        () => loadCapability(context.skillRoot),
        candidate.fragment,
      );
    });
  }
});

test("Capability v1.1 requires a unit for every declared threshold", async () => {
  await withV11Capability(async (context) => {
    delete context.acceptanceProfile.checks[0].unit;
    context.saveAcceptanceProfile();
    await expectContractFailure(
      () => loadCapability(context.skillRoot),
      "must have property unit",
    );
  });
});

test("Capability v1.1 requires reproduction independence to be a required check", async () => {
  await withV11Capability(async (context) => {
    context.reproductionProfile.checks[0].required = false;
    context.saveReproductionProfile();
    await expectContractFailure(
      () => loadCapability(context.skillRoot),
      "independenceCheck must reference a required check",
    );
  });
});

test("Capability v1.1 validates evaluation metric range and non-null outcomes", async () => {
  await withV11Capability(async (context) => {
    context.evaluationSuite.metric.maximum = 0;
    context.saveEvaluationSuite();
    await expectContractFailure(
      () => loadCapability(context.skillRoot),
      "maximum must be greater",
    );
  });

  await withV11Capability(async (context) => {
    context.evaluationSuite.cases[0].expectedOutcome = null;
    context.saveEvaluationSuite();
    await expectContractFailure(
      () => loadCapability(context.skillRoot),
      "must NOT be valid",
    );
  });

  await withV11Capability(async (context) => {
    context.evaluationSuite.cases[0].weight = 0;
    context.saveEvaluationSuite();
    await expectContractFailure(
      () => loadCapability(context.skillRoot),
      "weights must have a positive total",
    );
  });

  await withV11Capability(async (context) => {
    context.evaluationSuite.cases[0].expectedOutcome = {
      note: `Do not leak ${"sk"}-${"abcdefghijklmnopqrstuv"}`,
    };
    context.saveEvaluationSuite();
    await expectContractFailure(
      () => loadCapability(context.skillRoot),
      "probable OpenAI-style key",
    );
  });
});

test("Result Package v1.1 locks its acceptance profile and exact dependencies", async () => {
  await withV11Result(async ({ capability, result }) => {
    assert.equal(result.kind, "openquantum-result-package-v1.1");
    assert.deepEqual(
      result.value.provenance.dependencies,
      capability.manifest.dependencies,
    );
  });

  await withV11Result(async ({ capability, resultContext }) => {
    resultContext.resultPackage.provenance.dependencies[0].version = "9.9.9";
    resultContext.savePackage();
    await expectContractFailure(
      () => Promise.resolve(loadResultPackage(resultContext.packagePath, capability)),
      "must exactly match the manifest",
    );
  });

  await withV11Result(async ({ capability, resultContext }) => {
    resultContext.resultPackage.acceptanceProfile.sha256 = "c".repeat(64);
    resultContext.savePackage();
    await expectContractFailure(
      () => Promise.resolve(loadResultPackage(resultContext.packagePath, capability)),
      "sha256 must match the declared profile definition",
    );
  });
});

test("Acceptance Report v1.1 injects profile rules and keeps scope orthogonal", async () => {
  await withV11Result(async ({ capability, result, resultContext }) => {
    const report = buildAcceptanceReport({
      capability,
      resultPackage: result,
      validatorId: "deterministic-validator",
      profileId: "scientific-v1",
      reportId: "report-v11",
      generatedAt: "2026-08-14T01:05:00.000Z",
      scopeMatch: {
        status: "out_of_scope",
        statement: "The request exceeds the synthetic fixture claim.",
        evidenceRefs: [{ kind: "input", id: "request-001" }],
      },
      observations: [
        {
          id: "energy-accuracy",
          status: "pass",
          observed: -1.137,
          evidenceRefs: [{ kind: "artifact", id: "energy-001" }],
        },
        {
          id: "metadata-completeness",
          status: "pass",
          observed: true,
          evidenceRefs: [{ kind: "input", id: "request-001" }],
        },
      ],
      limitations: [],
      statement: "All checks passed, but the requested claim is out of scope.",
    });
    assert.equal(report.status, "conditional");
    assert.equal(report.checks[0].criterion, "Energy is within the fixture tolerance.");
    assert.equal(report.checks[0].threshold, 0.01);
    assert.equal(report.checks[0].unit, "hartree");
    assert.equal(report.profile.sha256, result.value.acceptanceProfile.sha256);

    const reportPath = path.join(resultContext.packageRoot, "acceptance-report-v11.json");
    writeJson(reportPath, report);
    const loaded = loadAcceptanceReport(reportPath, capability, result);
    assert.equal(loaded.kind, "openquantum-acceptance-report-v1.1");

    report.checks[0].criterion = "A self-authored replacement criterion.";
    const tamperIssues = validateAcceptanceReportValue(report, capability, result);
    assert.ok(
      tamperIssues.some((issue) => issue.includes("criterion must be injected")),
    );
  });
});

test("Acceptance v1.1 observations cannot author profile rules or not_evaluated", async () => {
  await withV11Result(async ({ capability, result }) => {
    const options = {
      capability,
      resultPackage: result,
      validatorId: "deterministic-validator",
      profileId: "scientific-v1",
      reportId: "report-v11",
      generatedAt: "2026-08-14T01:05:00.000Z",
      scopeMatch: {
        status: "in_scope",
        statement: "The fixture request matches the declared scope.",
        evidenceRefs: [{ kind: "input", id: "request-001" }],
      },
      observations: [
        {
          id: "energy-accuracy",
          status: "pass",
          criterion: "Validator-authored criterion is forbidden.",
          observed: -1.137,
          evidenceRefs: [{ kind: "artifact", id: "energy-001" }],
        },
        {
          id: "metadata-completeness",
          status: "pass",
          observed: true,
          evidenceRefs: [{ kind: "input", id: "request-001" }],
        },
      ],
      limitations: [],
      statement: "Fixture report.",
    };
    await expectContractFailure(
      () => Promise.resolve(buildAcceptanceReport(options)),
      "unsupported fields: criterion",
    );

    delete options.observations[0].criterion;
    const report = buildAcceptanceReport(options);
    report.status = "not_evaluated";
    const issues = validateAcceptanceReportValue(report, capability, result);
    assert.ok(issues.some((issue) => issue.includes("must be equal to one of")));
  });
});
