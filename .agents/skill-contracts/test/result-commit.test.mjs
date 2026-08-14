import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadAcceptanceReport } from "../src/acceptance-report.mjs";
import { loadCapability } from "../src/capability.mjs";
import {
  buildResultCommit,
  RESULT_COMMIT_MAX_BYTES,
  validateResultCommitValue,
} from "../src/result-commit.mjs";
import { loadResultPackage } from "../src/result-package.mjs";

const testRoot = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(testRoot, "fixtures");
const capabilityRoot = path.join(
  fixtureRoot,
  "capabilities",
  "fixture-capability",
);
const resultRoot = path.join(fixtureRoot, "results", "valid");

const capability = await loadCapability(capabilityRoot);
const resultPackage = loadResultPackage(
  path.join(resultRoot, "result-package.json"),
  capability,
);
const acceptanceReport = loadAcceptanceReport(
  path.join(resultRoot, "acceptance-report.json"),
  capability,
  resultPackage,
);

function trustedContext({
  report,
  scoreReport,
  reproductionReport,
  artifactRoot = resultRoot,
  trustedResultPackage = resultPackage,
} = {}) {
  return {
    capability,
    resultPackage: trustedResultPackage,
    ...(report ? { acceptanceReport: report } : {}),
    ...(scoreReport ? { scoreReport } : {}),
    ...(reproductionReport ? { reproductionReport } : {}),
    artifactRoot,
  };
}

function writeLoadedReport(root, fileName, kind, value) {
  const reportPath = path.join(root, fileName);
  fs.writeFileSync(reportPath, `${JSON.stringify(value, null, 2)}\n`);
  return { kind, value, path: fs.realpathSync(reportPath) };
}

function withReportContracts(action) {
  const temporaryRoot = fs.mkdtempSync("/tmp/openquantum-report-commit-");
  try {
    fs.cpSync(resultRoot, temporaryRoot, { recursive: true });
    const temporaryResultPackage = loadResultPackage(
      path.join(temporaryRoot, "result-package.json"),
      capability,
    );
    const packageReference = {
      packageId: temporaryResultPackage.value.packageId,
      sha256: temporaryResultPackage.sourceDigest,
    };
    const temporaryAcceptanceReport = loadAcceptanceReport(
      path.join(temporaryRoot, "acceptance-report.json"),
      capability,
      temporaryResultPackage,
    );
    const reportCapability = {
      id: capability.manifest.id,
      version: capability.manifest.version,
    };
    const scoreReport = writeLoadedReport(
      temporaryRoot,
      "score-report.json",
      "openquantum-score-report-v1.1",
      {
        reportId: "score-001",
        capability: reportCapability,
        resultPackages: [packageReference],
        status: "valid",
      },
    );
    const reproductionReport = writeLoadedReport(
      temporaryRoot,
      "reproduction-report.json",
      "openquantum-reproduction-report-v1.1",
      {
        reportId: "reproduction-001",
        capability: reportCapability,
        sourceResultPackage: packageReference,
        reproducedResultPackage: {
          packageId: "pkg-reproduced",
          sha256: "d".repeat(64),
        },
        status: "reproduced",
      },
    );
    return action({
      temporaryRoot,
      temporaryResultPackage,
      temporaryAcceptanceReport,
      scoreReport,
      reproductionReport,
    });
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

test("Result Commit builds a bounded reference-only envelope", () => {
  const commit = buildResultCommit({
    capability,
    resultPackage,
    acceptanceReport,
  });

  assert.equal(commit.kind, "openquantum.result-commit");
  assert.equal(commit.resultPackage.packageId, "pkg-001");
  assert.equal(commit.acceptanceReport.status, "passed");
  assert.equal(commit.artifacts.length, resultPackage.value.artifacts.length);
  assert.ok(Buffer.byteLength(JSON.stringify(commit)) < RESULT_COMMIT_MAX_BYTES);
  assert.equal(Object.hasOwn(commit, "sessionId"), false);
  assert.equal(Object.hasOwn(commit, "callId"), false);
  assert.deepEqual(
    validateResultCommitValue(
      commit,
      trustedContext({ report: acceptanceReport }),
    ),
    [],
  );
});

test("Result Commit can represent a valid but not-yet-evaluated package", () => {
  const commit = buildResultCommit({ capability, resultPackage });

  assert.equal(Object.hasOwn(commit, "acceptanceReport"), false);
  assert.deepEqual(validateResultCommitValue(commit, trustedContext()), []);
});

test("Result Commit carries optional typed score and reproduction report references", () => {
  withReportContracts(
    ({
      temporaryRoot,
      temporaryResultPackage,
      temporaryAcceptanceReport,
      scoreReport,
      reproductionReport,
    }) => {
      const commit = buildResultCommit({
        capability,
        resultPackage: temporaryResultPackage,
        acceptanceReport: temporaryAcceptanceReport,
        scoreReport,
        reproductionReport,
        artifactRoot: temporaryRoot,
      });

      assert.equal(commit.acceptanceReport.status, "passed");
      assert.equal(commit.scoreReport.status, "valid");
      assert.equal(commit.reproductionReport.status, "reproduced");
      assert.deepEqual(
        validateResultCommitValue(
          commit,
          trustedContext({
            report: temporaryAcceptanceReport,
            scoreReport,
            reproductionReport,
            artifactRoot: temporaryRoot,
            trustedResultPackage: temporaryResultPackage,
          }),
        ),
        [],
      );
    },
  );
});

test("Result Commit report axes use absence instead of self-reported empty states", () => {
  const commit = buildResultCommit({ capability, resultPackage });
  assert.equal(Object.hasOwn(commit, "scoreReport"), false);
  assert.equal(Object.hasOwn(commit, "reproductionReport"), false);

  commit.scoreReport = {
    reportId: "forged-score",
    status: "invalid",
    ...commit.resultPackage,
  };
  delete commit.scoreReport.packageId;
  assert.ok(
    validateResultCommitValue(commit, trustedContext()).some((issue) =>
      issue.includes("scoreReport must be absent"),
    ),
  );
});

test("Result Commit rejects score and reproduction reports for another target package", () => {
  withReportContracts(
    ({
      temporaryRoot,
      temporaryResultPackage,
      scoreReport,
      reproductionReport,
    }) => {
      const commit = buildResultCommit({
        capability,
        resultPackage: temporaryResultPackage,
        scoreReport,
        reproductionReport,
        artifactRoot: temporaryRoot,
      });
      const mismatchedScore = structuredClone(scoreReport);
      mismatchedScore.value.resultPackages[0].packageId = "pkg-other";
      const mismatchedReproduction = structuredClone(reproductionReport);
      mismatchedReproduction.value.sourceResultPackage.packageId = "pkg-other";

      const scoreIssues = validateResultCommitValue(
        commit,
        trustedContext({
          scoreReport: mismatchedScore,
          reproductionReport,
          artifactRoot: temporaryRoot,
          trustedResultPackage: temporaryResultPackage,
        }),
      );
      const reproductionIssues = validateResultCommitValue(
        commit,
        trustedContext({
          scoreReport,
          reproductionReport: mismatchedReproduction,
          artifactRoot: temporaryRoot,
          trustedResultPackage: temporaryResultPackage,
        }),
      );
      assert.ok(
        scoreIssues.some((issue) =>
          issue.includes("scoreReport must reference the trusted Result Package"),
        ),
      );
      assert.ok(
        reproductionIssues.some((issue) =>
          issue.includes(
            "reproductionReport must reference the trusted Result Package",
          ),
        ),
      );
    },
  );
});

test("Result Commit rejects forged typed report statuses", () => {
  withReportContracts(
    ({
      temporaryRoot,
      temporaryResultPackage,
      temporaryAcceptanceReport,
      scoreReport,
      reproductionReport,
    }) => {
      const base = buildResultCommit({
        capability,
        resultPackage: temporaryResultPackage,
        acceptanceReport: temporaryAcceptanceReport,
        scoreReport,
        reproductionReport,
        artifactRoot: temporaryRoot,
      });
      const context = trustedContext({
        report: temporaryAcceptanceReport,
        scoreReport,
        reproductionReport,
        artifactRoot: temporaryRoot,
        trustedResultPackage: temporaryResultPackage,
      });
      for (const field of [
        "acceptanceReport",
        "scoreReport",
        "reproductionReport",
      ]) {
        const commit = structuredClone(base);
        commit[field].status = "self-asserted";
        assert.ok(
          validateResultCommitValue(commit, context).some((issue) =>
            issue.includes(`/${field}/status`),
          ),
          `${field} accepted a self-asserted status`,
        );
      }
    },
  );
});

test("Result Commit builder rejects report files outside the controlled root", () => {
  const temporaryRoot = fs.mkdtempSync("/tmp/openquantum-commit-root-");
  try {
    assert.throws(
      () =>
        buildResultCommit({
          capability,
          resultPackage,
          acceptanceReport,
          artifactRoot: temporaryRoot,
        }),
      (error) =>
        error?.issues?.some((issue) => issue.includes("resultPackage.path")),
    );
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("Result Commit validation requires loaded trusted contracts", () => {
  const commit = buildResultCommit({ capability, resultPackage });

  assert.ok(
    validateResultCommitValue(commit).some((issue) =>
      issue.includes("trustedContext"),
    ),
  );
});

test("Result Commit rejects self-reported Harness identity", () => {
  const commit = buildResultCommit({ capability, resultPackage });
  commit.sessionId = "forged-session";

  assert.ok(
    validateResultCommitValue(commit, trustedContext()).some((issue) =>
      issue.includes("sessionId"),
    ),
  );
});

test("Result Commit rejects an arbitrary capability manifest digest", () => {
  const commit = buildResultCommit({ capability, resultPackage });
  commit.capability.manifestSha256 = "c".repeat(64);

  assert.ok(
    validateResultCommitValue(commit, trustedContext()).some((issue) =>
      issue.includes("capability.manifestSha256"),
    ),
  );
});

test("Result Commit rejects an empty artifact projection", () => {
  const commit = buildResultCommit({ capability, resultPackage });
  commit.artifacts = [];

  assert.ok(
    validateResultCommitValue(commit, trustedContext()).some((issue) =>
      issue.includes("artifacts"),
    ),
  );
});

test("Result Commit rejects a file reference disguised as acceptance", () => {
  const commit = buildResultCommit({ capability, resultPackage });
  const artifact = commit.artifacts[0];
  commit.acceptanceReport = {
    reportId: "forged-report",
    status: "passed",
    path: artifact.path,
    bytes: artifact.bytes,
    sha256: artifact.sha256,
  };

  assert.ok(
    validateResultCommitValue(commit, trustedContext()).some((issue) =>
      issue.includes("without a trusted Acceptance Report"),
    ),
  );
});

test("Result Commit rejects a forged trusted Acceptance Report over artifact bytes", () => {
  const commit = buildResultCommit({ capability, resultPackage });
  const artifact = commit.artifacts[0];
  const disguisedReport = {
    kind: "openquantum-acceptance-report-v1",
    path: path.join(resultRoot, artifact.path),
    value: {
      reportId: "forged-report",
      capability: {
        id: capability.manifest.id,
        version: capability.manifest.version,
      },
      resultPackage: {
        packageId: resultPackage.value.packageId,
        sha256: resultPackage.sourceDigest,
      },
      status: "passed",
    },
  };
  commit.acceptanceReport = {
    reportId: disguisedReport.value.reportId,
    status: disguisedReport.value.status,
    path: artifact.path,
    bytes: artifact.bytes,
    sha256: artifact.sha256,
  };

  assert.ok(
    validateResultCommitValue(
      commit,
      trustedContext({ report: disguisedReport }),
    ).some((issue) =>
      issue.includes("Acceptance Report.value must match"),
    ),
  );
});

test("Result Commit rejects an Acceptance Report linked to another package", () => {
  const commit = buildResultCommit({
    capability,
    resultPackage,
    acceptanceReport,
  });
  const mismatchedReport = structuredClone(acceptanceReport);
  mismatchedReport.value.resultPackage.packageId = "pkg-other";

  assert.ok(
    validateResultCommitValue(
      commit,
      trustedContext({ report: mismatchedReport }),
    ).some((issue) =>
      issue.includes("must reference the trusted Result Package"),
    ),
  );
});

test("Result Commit rejects duplicate artifact references", () => {
  const commit = buildResultCommit({ capability, resultPackage });
  commit.artifacts.push(structuredClone(commit.artifacts[0]));

  const issues = validateResultCommitValue(commit, trustedContext());
  assert.ok(issues.some((issue) => issue.includes("duplicate artifact id")));
  assert.ok(issues.some((issue) => issue.includes("duplicate artifact path")));
});

test("Result Commit verifies file bytes and digest against its controlled root", () => {
  const commit = buildResultCommit({ capability, resultPackage });
  commit.resultPackage.sha256 = "c".repeat(64);

  assert.ok(
    validateResultCommitValue(commit, trustedContext()).some((issue) =>
      issue.includes("resultPackage.sha256 does not match"),
    ),
  );
});

test("Result Commit rejects path traversal before any file read", () => {
  const commit = buildResultCommit({ capability, resultPackage });
  commit.artifacts[0].path = "../outside.json";

  assert.ok(
    validateResultCommitValue(commit, trustedContext()).some((issue) =>
      issue.includes("artifacts/0/path") || issue.includes("artifacts[0].path"),
    ),
  );
});

test("Result Commit rejects URL-like paths at the schema boundary", () => {
  const commit = buildResultCommit({ capability, resultPackage });
  commit.artifacts[0].path = "https://example.invalid/artifact.json";

  assert.ok(
    validateResultCommitValue(commit, trustedContext()).some((issue) =>
      issue.includes("artifacts/0/path"),
    ),
  );
});

test("Result Commit refuses a symlink that escapes the controlled root", () => {
  const temporaryRoot = fs.mkdtempSync("/tmp/openquantum-result-commit-");
  try {
    const outside = path.join(temporaryRoot, "outside.json");
    fs.writeFileSync(outside, "{}\n");
    const packageRoot = path.join(temporaryRoot, "package");
    fs.mkdirSync(packageRoot);
    fs.symlinkSync(outside, path.join(packageRoot, "escape.json"));
    const commit = buildResultCommit({ capability, resultPackage });
    commit.artifacts[0] = {
      ...commit.artifacts[0],
      path: "escape.json",
      bytes: fs.statSync(outside).size,
    };

    assert.ok(
      validateResultCommitValue(
        commit,
        trustedContext({ artifactRoot: packageRoot }),
      ).some((issue) =>
        issue.includes("resolves outside its root"),
      ),
    );
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
