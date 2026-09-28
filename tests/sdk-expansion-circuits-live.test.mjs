import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { preparedPythonLaunch } from "../src/lib/prepared-python.mjs";
import { SDK_EXPANSION_CIRCUITS } from "./fixtures/sdk-expansion-circuits.mjs";

const enabled = process.env.OPENQUANTUM_REAL_SDK_EXPANSION_CIRCUITS === "1";
const root = process.cwd();
const evidence = path.join(root, ".openquantum/sdk-expansion-evidence/circuits");
for (const c of SDK_EXPANSION_CIRCUITS) {
  test(`${c.id}: real SDK numerical references without network`, { skip: !enabled, timeout: 300000 }, async () => {
    const launch = await preparedPythonLaunch({ skillRoot: path.join(root, ".agents/skills", c.id), args: [path.join(root, ".agents/skills", c.id, "test/science_test.py")] });
    const result = spawnSync(launch.command, launch.args, { cwd: root, env: { ...process.env, OPENQUANTUM_SDK_EXPANSION_CIRCUITS_EVIDENCE: evidence, MPLBACKEND: "Agg", MPLCONFIGDIR: path.join(root, ".openquantum/cache", c.id + "-matplotlib") }, encoding: "utf8", timeout: 270000 });
    assert.equal(result.status, 0, `${result.error?.message ?? ""}\n${result.stdout}\n${result.stderr}`);
    assert.match(result.stderr, /\nOK\n/);
  });
  test(`${c.id}: real MCP example, defaults and failure`, { skip: !enabled, timeout: 180000 }, async t => {
    const { definition } = await import(`../.agents/skills/${c.id}/mcp/contracts.mjs`);
    const client = new Client({ name: "sdk-expansion-circuits-live", version: "1" }, { capabilities: {} });
    t.after(() => client.close());
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, ".agents/skills", c.id, "mcp/server.mjs")] }));
    await mkdir(evidence, { recursive: true });
    const cases = [["example", c.input], ["defaults", {}]];
    if (c.id === "qrisp-arithmetic") cases.push(["large-integer", { bitWidth: 54, initialBits: "1" + "0".repeat(52) + "1", addendBits: "1", preparation: "basis" }]);
    for (const [label, input] of cases) {
      const response = await client.callTool({ name: c.tool, arguments: input }, undefined, { timeout: 120000 });
      assert.notEqual(response.isError, true, JSON.stringify(response));
      const output = response.structuredContent;
      assert.ok(definition.validateOutput(output), JSON.stringify(definition.validateOutput.errors));
      assert.deepEqual(output.input, definition.normalize(c.tool, input));
      assert.equal(output.scientificValidation, "not_evaluated");
      if (c.id.endsWith("-simulation")) assert.ok(output.result.normError < 1e-10);
      if (c.id === "quairkit-information") assert.ok(Math.abs(output.result.trace[0] - 1) < 1e-10);
      if (["qrisp-arithmetic", "lightworks-photonics"].includes(c.id)) assert.ok(Math.abs(output.result.totalProbability - 1) < 1e-7);
      if (c.id === "qrisp-arithmetic" && label === "large-integer") {
        const expected = "1" + "0".repeat(51) + "10";
        assert.ok(Math.abs(output.result.outcomes.find(row => row.bits === expected)?.probability - 1) < 1e-7);
      }
      await writeFile(path.join(evidence, `mcp-${c.id}-${label}.json`), JSON.stringify(output, null, 2) + "\n");
    }
    assert.equal((await client.callTool({ name: c.tool, arguments: { backend: "cloud" } })).isError, true);
  });
}
