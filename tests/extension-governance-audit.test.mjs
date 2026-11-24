import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  checkGovernanceDocument,
  collectExtensionGovernanceMetrics,
} from "../scripts/audit-extension-governance.mjs";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

test("extension governance metrics stay internally consistent", () => {
  const metrics = collectExtensionGovernanceMetrics(projectRoot);
  const levelSum =
    metrics.levels.L0 + metrics.levels.L1 + metrics.levels.L2 + metrics.levels.L3;
  assert.equal(levelSum, metrics.capabilities);
  assert.equal(metrics.skills.auto + metrics.skills.manual, metrics.skills.total);
  assert.equal(
    metrics.skills.total + metrics.toolOnlyCapabilities.length,
    metrics.capabilities,
  );
  assert.equal(
    metrics.mcp.always + metrics.mcp.conditional + metrics.mcp.optIn,
    metrics.mcp.total,
  );
  const languageSum = Object.values(metrics.sdk.byLanguage).reduce((sum, n) => sum + n, 0);
  assert.equal(languageSum, metrics.sdk.total);
});

test("EXTENSION_GOVERNANCE.md matches the live repository baseline", () => {
  const result = checkGovernanceDocument(projectRoot);
  assert.equal(result.status, "pass", result.issues.join("\n"));
});
