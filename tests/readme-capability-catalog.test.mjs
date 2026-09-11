import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { auditCapabilityPackages } from "../scripts/lib/capability-package-audit.mjs";
import { mcpCatalogEntry } from "../src/settings/server/project-settings-catalog.mjs";
import { qpandaSkillIntegration } from "../src/settings/server/qpanda-skill.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const [readme, skillReadme, report] = await Promise.all([
  readFile(new URL("../README.md", import.meta.url), "utf8"),
  readFile(new URL("../.agents/skills/README.md", import.meta.url), "utf8"),
  auditCapabilityPackages({ projectRoot }),
]);
assert.equal(report.status, "pass", report.issues.join("\n"));

const trackedSkillIds = execFileSync("git", ["ls-files", "-z", "--", ".agents/skills"], {
  cwd: projectRoot,
  encoding: "utf8",
}).split("\0").flatMap((entry) => {
  const match = entry.match(/^\.agents\/skills\/([^/]+)\/SKILL\.md$/);
  return match ? [match[1]] : [];
}).sort();

function section(markdown, heading) {
  const start = markdown.indexOf(`${heading}\n`);
  assert.notEqual(start, -1, `Missing catalog section: ${heading}`);
  const level = heading.match(/^#+/)[0].length;
  const lines = markdown.slice(start + heading.length + 1).split("\n");
  const next = lines.findIndex((line) => new RegExp(`^#{1,${level}} `).test(line));
  return (next === -1 ? lines : lines.slice(0, next)).join("\n");
}

function catalogRows(markdown, heading) {
  const rows = section(markdown, heading).split("\n")
    .filter((line) => line.startsWith("|"))
    .slice(2)
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
  assert.ok(rows.length > 0, `${heading} must contain a visible catalog table`);
  const entries = new Map();
  for (const cells of rows) {
    const match = cells[0].match(/`([a-z0-9_-]+)`/);
    assert.ok(match, `${heading}: each row needs a canonical identifier`);
    assert.ok(!entries.has(match[1]), `${heading}: duplicate ${match[1]}`);
    entries.set(match[1], cells);
  }
  return entries;
}

const skills = catalogRows(readme, "### 内置 Skills");
const servers = catalogRows(readme, "### MCP 服务目录");
const nativeTools = catalogRows(readme, "### 原生量子 Tools");
const declaredServers = report.packages.flatMap((entry) => entry.execution.mcpServers);
const declaredNativeTools = report.packages.flatMap((entry) => entry.execution.nativeTools)
  .filter((tool) => tool.providerPlugin === "./native-quantum-tools.mjs");

test("both Skill catalogs enumerate every source-distributed Skill exactly once", () => {
  assert.deepEqual([...skills.keys()].sort(), trackedSkillIds);
  assert.deepEqual([...catalogRows(skillReadme, "## 当前 Skill").keys()].sort(), trackedSkillIds);
  assert.ok(skillReadme.includes(`以下 ${trackedSkillIds.length} 个 Skill 随源码分发`));
  for (const id of trackedSkillIds) {
    assert.ok(skills.get(id)[0].includes(`(.agents/skills/${id}/SKILL.md)`));
  }
});

test("README makes each Skill's declared MCP and native quantum actions identifiable", () => {
  for (const capability of report.packages.filter((entry) => entry.skill)) {
    const executionCell = skills.get(capability.id)[2];
    const actionIds = [
      ...capability.execution.mcpServers.map((server) => server.name),
      ...capability.execution.nativeTools
        .filter((tool) => tool.providerPlugin === "./native-quantum-tools.mjs")
        .map((tool) => tool.name),
    ];
    for (const id of actionIds) {
      assert.ok(executionCell.includes(`\`${id}\``), `${capability.id} must identify ${id}`);
    }
  }
});

test("README MCP catalog matches declared connections, activation policies and source links", () => {
  assert.deepEqual([...servers.keys()].sort(), declaredServers.map((entry) => entry.name).sort());
  const labels = { always: "默认开启", conditional: "默认开启¹", "opt-in": "默认关闭" };
  for (const server of declaredServers) {
    const cells = servers.get(server.name);
    assert.equal(cells[2], labels[server.activation], `${server.name}: stale default status`);
    assert.ok(cells[0].includes(`(${mcpCatalogEntry(server.name).sourceUrl})`));
  }
  assert.ok(section(readme, "### MCP 服务目录").includes("OPENQUANTUM_DISABLE_QISKIT_MCP=1"));
});

test("native quantum Tools are documented separately with their complete-call effects", () => {
  assert.deepEqual([...nativeTools.keys()].sort(), declaredNativeTools.map((tool) => tool.name).sort());
  for (const tool of declaredNativeTools) {
    assert.ok(nativeTools.get(tool.name)[2].includes(`\`${tool.effect}\``));
  }
  for (const id of ["qmclaw-workbench", "quantum-ground-state"]) {
    const row = catalogRows(skillReadme, "## 当前 Skill").get(id);
    assert.ok(row[2].includes("原生 Tool Provider"));
    assert.doesNotMatch(row[2], /MCP-exposed Tool|MCP Server \+ Harness MCP Client/);
  }
});

test("README counts and visible navigation stay aligned with the source inventory", () => {
  assert.ok(readme.includes(`${skills.size} 个内置 Skill、${servers.size} 个 MCP 服务连接、${nativeTools.size} 个原生量子 Tool`));
  const optIn = declaredServers.filter((entry) => entry.activation === "opt-in").length;
  assert.ok(readme.includes(`${servers.size - optIn} 个默认开启`));
  assert.ok(readme.includes(`${optIn} 个按需启用`));
  assert.ok(readme.includes('href="#内置-skills"'));
  assert.ok(readme.includes('href="#mcp-服务目录"'));
  for (const heading of ["### 内置 Skills", "### MCP 服务目录", "### 原生量子 Tools"]) {
    const before = readme.slice(0, readme.indexOf(heading));
    assert.equal([...before.matchAll(/<details\b/g)].length, [...before.matchAll(/<\/details>/g)].length);
    assert.doesNotMatch(section(readme, heading), /<details\b/);
  }
});

test("the upstream QPanda Skill remains an explicit optional installation", () => {
  const optional = section(readme, "### 可选上游 Skill 与开发证据");
  assert.ok(optional.includes(qpandaSkillIntegration.sourceUrl));
  assert.ok(optional.includes(qpandaSkillIntegration.setupCommand));
  assert.ok(optional.includes(`不计入上面的 ${skills.size} 个内置 Skill`));
  assert.ok(optional.includes("不会自动启用 `qpanda_runtime`"));
});
