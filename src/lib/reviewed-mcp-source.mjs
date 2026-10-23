import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const reviewPath = new URL("../../docs/integrations/evidence/opt-in-mcp-tool-contracts.json", import.meta.url);

export function readExternalMcpReview() {
  return JSON.parse(fs.readFileSync(reviewPath, "utf8"));
}

/** Check reviewed source bytes without importing code or starting a service. */
export function inspectReviewedMcpSource(review, sourceRoot) {
  const root = fs.realpathSync(sourceRoot);
  const issues = [];
  if (!Array.isArray(review.files) || review.files.length === 0) {
    throw new TypeError("review.files must contain reviewed source hashes");
  }
  const seen = new Set();
  for (const file of review.files) {
    if (
      typeof file.path !== "string" ||
      !file.path.split("/").every((part) => /^[A-Za-z0-9_.-]+$/.test(part) && ![".", ".."].includes(part)) ||
      !/^[a-f0-9]{64}$/.test(file.sha256) ||
      seen.has(file.path)
    ) {
      issues.push("review contains an unsafe, duplicate or invalid source reference");
      continue;
    }
    seen.add(file.path);
    try {
      const target = path.join(root, file.path);
      const stats = fs.lstatSync(target);
      const parts = file.path.split("/");
      const linked = parts.some((_, index) => fs.lstatSync(path.join(root, ...parts.slice(0, index + 1))).isSymbolicLink());
      if (linked || !stats.isFile() || !fs.realpathSync(target).startsWith(`${root}${path.sep}`)) {
        issues.push(`${file.path}: source must be a regular file inside sourceRoot`);
        continue;
      }
      const actual = createHash("sha256").update(fs.readFileSync(target)).digest("hex");
      if (actual !== file.sha256) issues.push(`${file.path}: reviewed source hash mismatch`);
    } catch {
      issues.push(`${file.path}: reviewed source is unavailable`);
    }
  }
  return {
    scope: "reviewed-source-bytes",
    serverName: review.serverName,
    status: issues.length ? "fail" : "pass",
    fileCount: review.files.length,
    runtimeExecuted: false,
    issues,
  };
}
