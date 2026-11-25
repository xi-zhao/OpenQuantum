#!/usr/bin/env node
import { isMainModule } from "../src/lib/cli-entrypoint.mjs";

import { parseArgs } from "node:util";
import { readExternalMcpReview, inspectReviewedMcpSource } from "../src/lib/reviewed-mcp-source.mjs";

export { readExternalMcpReview, inspectReviewedMcpSource };

if (isMainModule(import.meta.url)) {
  try {
    const { values } = parseArgs({
      options: { server: { type: "string" }, "source-root": { type: "string" } },
      strict: true,
      allowPositionals: false,
    });
    const review = readExternalMcpReview().servers.find((entry) => entry.serverName === values.server);
    if (!review || !values["source-root"]) {
      throw new Error("Use --server <reviewed serverName> --source-root <unpacked pinned source directory>");
    }
    const report = inspectReviewedMcpSource(review, values["source-root"]);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = report.status === "pass" ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
