import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ContractValidationError } from "../src/errors.mjs";
import {
  buildReproductionReport,
  validateReproductionReportValue,
} from "../src/reproduction-report.mjs";
import {
  buildScoreReport,
  validateScoreReportValue,
} from "../src/score-report.mjs";
import { projectTrustState } from "../src/trust-state.mjs";

const testRoot = path.dirname(fileURLToPath(import.meta.url));
const definitions = JSON.parse(
  fs.readFileSync(
    path.join(testRoot, "fixtures", "reports-v1.1", "definitions.json"),
    "utf8",
  ),
);
const capability = {
  manifest: {
    id: "fixture-capability",
    version: "1.2.3",
    evals: {
      runner: {
        executable: "node",
        script: "runner.mjs",
        args: [],
        shell: false,
      },
    },
  },
  referencedFiles: new Map([
    [
      "evals.runner.script",
      path.join(testRoot, "fixtures", "reports-v1.1", "runner.mjs"),
    ],
  ]),
  acceptanceProfileDefinitions: new Map([
    [definitions.acceptanceProfile.id, definitions.acceptanceProfile],
  ]),
  reproductionProfileDefinitions: new Map([
    [definitions.reproductionProfile.id, definitions.reproductionProfile],
  ]),
  evaluationSuite: definitions.evaluationSuite,
};

function resultContract(packageId, digestCharacter, sessionId) {
  return {
    value: {
      packageId,
      capability: { id: "fixture-capability", version: "1.2.3" },
      acceptanceProfile: { id: "scientific-v1", version: "1.0.0" },
      createdAt: "2026-08-14T01:00:00Z",
      executionRef: { sessionId, eventRange: { from: 1, to: 20 } },
      inputs: [{ id: "request", type: "request" }],
      artifacts: [{ id: "energy", type: "energy-result" }],
    },
    sourceDigest: digestCharacter.repeat(64),
  };
}

const sourceResult = resultContract("pkg-source", "a", "session-source");
const reproducedResult = resultContract("pkg-reproduced", "b", "session-reproduced");
const sourceEnergy = { packageId: "pkg-source", kind: "artifact", id: "energy" };
const reproducedEnergy = {
  packageId: "pkg-reproduced",
  kind: "artifact",
  id: "energy",
};

function scoreOptions(overrides = {}) {
  return {
    capability,
    resultPackages: [sourceResult, reproducedResult],
    profileId: "scientific-v1",
    reportId: "score-001",
    generatedAt: "2026-08-14T02:00:00Z",
    scope: {
      status: "in_scope",
      evidenceRefs: [sourceEnergy],
      statement: "The suite covers this fixture claim.",
    },
    caseObservations: [
      {
        id: "scientific-gate",
        outcome: "pass",
        evidenceRefs: [sourceEnergy],
      },
      {
        id: "optional-quality",
        outcome: "fail",
        evidenceRefs: [reproducedEnergy],
        failure: "Optional metadata was incomplete.",
      },
    ],
    limitations: [],
    statement: "Fixture score report.",
    ...overrides,
  };
}

function reproductionOptions(overrides = {}) {
  return {
    capability,
    sourceResultPackage: sourceResult,
    reproducedResultPackage: reproducedResult,
    profileId: "reproduction-v1",
    reportId: "reproduction-001",
    generatedAt: "2026-08-14T02:00:00Z",
    scope: {
      status: "in_scope",
      evidenceRefs: [sourceEnergy, reproducedEnergy],
      statement: "Both packages cover the same fixture claim.",
    },
    observations: [
      {
        id: "independent-run",
        observed: "Different session ids",
        evidenceRefs: [
          {
            packageId: "pkg-source",
            kind: "session-event",
            id: "session-source",
            sequence: 2,
          },
          {
            packageId: "pkg-reproduced",
            kind: "session-event",
            id: "session-reproduced",
            sequence: 2,
          },
        ],
      },
      {
        id: "energy-agreement",
        status: "pass",
        observed: 0.0001,
        evidenceRefs: [sourceEnergy, reproducedEnergy],
      },
      {
        id: "metadata-match",
        status: "fail",
        observed: "partial",
        evidenceRefs: [sourceEnergy, reproducedEnergy],
        nextAction: "Normalize optional metadata.",
      },
    ],
    limitations: [],
    statement: "Independent fixture reproduction.",
    ...overrides,
  };
}

function expectContractFailure(action, fragment) {
  assert.throws(action, (error) => {
    assert.ok(error instanceof ContractValidationError, String(error));
    assert.ok(
      error.issues.some((issue) => issue.includes(fragment)),
      `Expected ${JSON.stringify(fragment)} in:\n${error.issues.join("\n")}`,
    );
    return true;
  });
}

test("Score Report derives a valid bounded score and injects suite fields", () => {
  const report = buildScoreReport(scoreOptions());
  assert.equal(report.status, "valid");
  assert.deepEqual(report.score, {
    value: 60,
    metric: "weighted-pass-rate",
    unit: "percent",
  });
  assert.equal(report.earnedWeight, 3);
  assert.equal(report.totalWeight, 5);
  assert.equal(report.cases[0].hardGate, true);
  assert.equal(report.runner.version, capability.manifest.version);
  assert.match(report.runner.digest, /^[a-f0-9]{64}$/);
  assert.deepEqual(
    validateScoreReportValue(report, capability, [sourceResult, reproducedResult]),
    [],
  );
});

test("Score Report accepts informational zero-weight cases without changing the score", () => {
  const zeroWeightCapability = {
    ...capability,
    evaluationSuite: structuredClone(capability.evaluationSuite),
  };
  zeroWeightCapability.evaluationSuite.cases.push({
    id: "informational-observation",
    weight: 0,
    hardGate: false,
    expectedOutcome: "recorded",
  });
  const options = scoreOptions({ capability: zeroWeightCapability });
  options.caseObservations.push({
    id: "informational-observation",
    outcome: "pass",
    evidenceRefs: [sourceEnergy],
    observed: "recorded",
  });

  const report = buildScoreReport(options);
  assert.equal(report.status, "valid");
  assert.equal(report.earnedWeight, 3);
  assert.equal(report.totalWeight, 5);
  assert.equal(report.score.value, 60);
  assert.deepEqual(
    validateScoreReportValue(report, zeroWeightCapability, [
      sourceResult,
      reproducedResult,
    ]),
    [],
  );
});

test("a high weighted score cannot override a failed hard gate", () => {
  const options = scoreOptions();
  options.caseObservations[0].outcome = "fail";
  options.caseObservations[0].failure = "The hard gate failed.";
  options.caseObservations[1].outcome = "pass";
  delete options.caseObservations[1].failure;
  const report = buildScoreReport(options);
  assert.equal(report.status, "invalid");
  assert.equal(report.score, undefined);
  expectContractFailure(
    () => buildScoreReport({ ...options, score: 100 }),
    "unsupported fields: score",
  );
});

test("Score Report derives runner identity and rejects caller overrides", () => {
  expectContractFailure(
    () =>
      buildScoreReport({
        ...scoreOptions(),
        runner: { version: "forged", digest: "4".repeat(64) },
      }),
    "unsupported fields: runner",
  );
  const report = buildScoreReport(scoreOptions());
  report.runner.digest = "4".repeat(64);
  assert.ok(
    validateScoreReportValue(
      report,
      capability,
      [sourceResult, reproducedResult],
    ).some((issue) => issue.includes("runner.digest")),
  );
});

test("Score Report requires evidence for determined scope and consistent failures", () => {
  const emptyScopeEvidence = scoreOptions();
  emptyScopeEvidence.scope.evidenceRefs = [];
  expectContractFailure(
    () => buildScoreReport(emptyScopeEvidence),
    "in_scope status must cite evidence",
  );

  const missingFailure = scoreOptions();
  delete missingFailure.caseObservations[1].failure;
  expectContractFailure(
    () => buildScoreReport(missingFailure),
    "with fail outcome must include failure",
  );

  const passWithFailure = scoreOptions();
  passWithFailure.caseObservations[0].failure = "A pass cannot carry a failure.";
  expectContractFailure(
    () => buildScoreReport(passWithFailure),
    "with pass outcome must not include failure",
  );
});

test("an indeterminate score scope derives invalid without a score", () => {
  const options = scoreOptions();
  options.scope.status = "indeterminate";
  const report = buildScoreReport(options);
  assert.equal(report.status, "invalid");
  assert.equal(report.score, undefined);
});

test("Score Report rejects tampered digest, secrets, and cross-package evidence", () => {
  const report = buildScoreReport(scoreOptions());
  const digestTamper = structuredClone(report);
  digestTamper.resultPackages[0].sha256 = "9".repeat(64);
  assert.ok(
    validateScoreReportValue(
      digestTamper,
      capability,
      [sourceResult, reproducedResult],
    ).some((issue) => issue.includes("sha256")),
  );

  const secretTamper = structuredClone(report);
  secretTamper.statement = `Leaked ${"sk"}-${"abcdefghijklmnopqrstuv"}`;
  assert.ok(
    validateScoreReportValue(
      secretTamper,
      capability,
      [sourceResult, reproducedResult],
    ).some((issue) => issue.includes("OpenAI-style key")),
  );

  const evidenceTamper = structuredClone(report);
  evidenceTamper.cases[0].evidenceRefs[0].packageId = "pkg-reproduced";
  evidenceTamper.cases[0].evidenceRefs[0].id = "source-only-artifact";
  assert.ok(
    validateScoreReportValue(
      evidenceTamper,
      capability,
      [sourceResult, reproducedResult],
    ).some((issue) => issue.includes("unknown artifact")),
  );
});

test("Reproduction Report derives reproduced and records optional failures as limitations", () => {
  const report = buildReproductionReport(reproductionOptions());
  assert.equal(report.status, "reproduced");
  assert.ok(report.limitations.includes("Optional reproduction check metadata-match did not pass."));
  assert.equal(report.checks[1].required, true);
  assert.equal(report.checks[1].threshold, 0.001);
  assert.deepEqual(
    validateReproductionReportValue(
      report,
      capability,
      sourceResult,
      reproducedResult,
    ),
    [],
  );
});

test("a required scientific failure derives not_reproduced", () => {
  const options = reproductionOptions();
  const observation = options.observations.find(
    (item) => item.id === "energy-agreement",
  );
  observation.status = "fail";
  observation.nextAction = "Run the required check again.";
  assert.equal(buildReproductionReport(options).status, "not_reproduced");
});

test("an indeterminate reproduction scope derives not_reproduced", () => {
  const options = reproductionOptions();
  options.scope.status = "indeterminate";
  assert.equal(buildReproductionReport(options).status, "not_reproduced");
});

test("Reproduction Report rejects self-reproduction and injected-field overrides", () => {
  expectContractFailure(
    () =>
      buildReproductionReport(
        reproductionOptions({ reproducedResultPackage: sourceResult }),
      ),
    "package ids must be different",
  );
  const options = reproductionOptions();
  options.observations[0].required = false;
  expectContractFailure(
    () => buildReproductionReport(options),
    "unsupported fields: required",
  );
});

test("Reproduction Report derives independence from distinct sessions and both event traces", () => {
  const forgedStatus = reproductionOptions();
  forgedStatus.observations[0].status = "pass";
  expectContractFailure(
    () => buildReproductionReport(forgedStatus),
    "unsupported fields: status",
  );

  const sameSession = resultContract("pkg-reproduced-2", "c", "session-source");
  expectContractFailure(
    () =>
      buildReproductionReport(
        reproductionOptions({ reproducedResultPackage: sameSession }),
      ),
    "sessionIds must be different",
  );

  const sameDigest = resultContract("pkg-reproduced-2", "a", "session-reproduced-2");
  expectContractFailure(
    () =>
      buildReproductionReport(
        reproductionOptions({ reproducedResultPackage: sameDigest }),
      ),
    "package digests must be different",
  );

  for (const missingPackageId of ["pkg-source", "pkg-reproduced"]) {
    const options = reproductionOptions();
    const independence = options.observations.find(
      (item) => item.id === "independent-run",
    );
    independence.evidenceRefs = independence.evidenceRefs.filter(
      (reference) => reference.packageId !== missingPackageId,
    );
    expectContractFailure(
      () => buildReproductionReport(options),
      `session-event evidence for ${missingPackageId}`,
    );
  }
});

test("Reproduction Report requires evidence for determined scope and in-range events", () => {
  const emptyScopeEvidence = reproductionOptions();
  emptyScopeEvidence.scope.evidenceRefs = [];
  expectContractFailure(
    () => buildReproductionReport(emptyScopeEvidence),
    "in_scope status must cite evidence",
  );

  const outOfRange = reproductionOptions();
  outOfRange.observations[0].evidenceRefs[1].sequence = 21;
  expectContractFailure(
    () => buildReproductionReport(outOfRange),
    "event range",
  );
});

test("Reproduction Report rejects secrets, digest tampering, and cross-package evidence", () => {
  const report = buildReproductionReport(reproductionOptions());
  const tampered = structuredClone(report);
  tampered.reproducedResultPackage.sha256 = "8".repeat(64);
  tampered.statement = `Authorization: Bearer ${"a".repeat(20)}`;
  tampered.checks[0].evidenceRefs[0] = {
    packageId: "pkg-source",
    kind: "artifact",
    id: "missing-reproduced-evidence",
  };
  const issues = validateReproductionReportValue(
    tampered,
    capability,
    sourceResult,
    reproducedResult,
  );
  assert.ok(issues.some((issue) => issue.includes("reproducedResultPackage")));
  assert.ok(issues.some((issue) => issue.includes("Bearer token")));
  assert.ok(issues.some((issue) => issue.includes("unknown artifact")));

  const forgedIndependence = structuredClone(report);
  forgedIndependence.checks[0].status = "fail";
  forgedIndependence.checks[0].nextAction = "Run again.";
  assert.ok(
    validateReproductionReportValue(
      forgedIndependence,
      capability,
      sourceResult,
      reproducedResult,
    ).some((issue) => issue.includes("must be derived as pass")),
  );
});

test("Trust State keeps all four axes orthogonal and defaults missing reports", () => {
  assert.deepEqual(projectTrustState({ runtimeCompletion: "idle" }), {
    runtimeCompletion: "idle",
    validScore: "unscored",
    scientificAcceptance: "not_evaluated",
    reproduction: "not_attempted",
  });

  const reproductionReport = buildReproductionReport(reproductionOptions());
  assert.deepEqual(
    projectTrustState({
      runtimeCompletion: "idle",
      acceptanceReport: { reportId: "acceptance-001", status: "failed" },
      reproductionReport,
    }),
    {
      runtimeCompletion: "idle",
      validScore: "unscored",
      scientificAcceptance: "failed",
      reproduction: "reproduced",
    },
  );
});

test("Trust State rejects unsupported source states", () => {
  expectContractFailure(
    () => projectTrustState({ runtimeCompletion: "complete" }),
    "runtimeCompletion has unsupported state",
  );
  expectContractFailure(
    () =>
      projectTrustState({
        runtimeCompletion: "idle",
        acceptanceReport: { status: "not_evaluated" },
      }),
    "acceptanceReport.status has unsupported state",
  );

  expectContractFailure(
    () =>
      projectTrustState({
        runtimeCompletion: "idle",
        scoreReport: {
          reportId: "forged-score",
          status: "invalid",
          score: { value: 100, metric: "quality", unit: "percent" },
        },
      }),
    "must be absent when status is invalid",
  );

  expectContractFailure(
    () =>
      projectTrustState({
        runtimeCompletion: "idle",
        scoreReport: { reportId: "score-without-value", status: "valid" },
      }),
    "must be a finite value",
  );
});

test("Trust State rejects malformed score report shapes", () => {
  expectContractFailure(
    () =>
      projectTrustState({
        runtimeCompletion: "idle",
        scoreReport: { reportId: "score-001", status: "invalid", score: 100 },
      }),
    "must be absent when status is invalid",
  );
  expectContractFailure(
    () =>
      projectTrustState({
        runtimeCompletion: "idle",
        scoreReport: { reportId: "score-001", status: "valid" },
      }),
    "must be a finite value",
  );
  expectContractFailure(
    () =>
      projectTrustState({
        runtimeCompletion: "idle",
        scoreReport: {
          status: "valid",
          score: { value: 100, metric: "quality", unit: "percent" },
        },
      }),
    "reportId",
  );
});
