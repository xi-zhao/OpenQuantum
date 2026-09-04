import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { auditCapabilityPackages } from "../scripts/lib/capability-package-audit.mjs";
import { scientificResultAdapter } from "../runtime/openquantum/agent-presets/openquantum/scientific-result-adapters.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

test("Tool effects include evidence writes performed by the composed Host hook", async () => {
  const report = await auditCapabilityPackages({ projectRoot });
  assert.equal(report.status, "pass", report.issues.join("\n"));
  const materializingTools = [];
  for (const capability of report.packages) {
    const tools = [
      ...capability.execution.nativeTools,
      ...capability.execution.mcpServers.flatMap((server) =>
        server.tools.map((tool) => ({
          ...tool,
          name: `mcp__${server.name}__${tool.name}`,
        })),
      ),
    ];
    for (const tool of tools) {
      const adapter = scientificResultAdapter(tool.name);
      if (typeof adapter?.materialize !== "function") continue;
      materializingTools.push(tool.name);
      assert.ok(
        ["workspace-write", "external-write"].includes(tool.effect),
        `${tool.name} writes evidence after execution; its complete call cannot be read-only`,
      );
    }
  }
  assert.ok(materializingTools.includes("solve_and_validate_ground_state"));
  assert.ok(materializingTools.includes("mcp__toqito_audit__audit_density_matrix"));
});
