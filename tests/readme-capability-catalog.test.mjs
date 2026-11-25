import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { auditCapabilityPackages } from "../scripts/lib/capability-package-audit.mjs";
import { mcpCatalogEntry } from "../src/settings/server/project-settings-catalog.mjs";
import { qpandaSkillIntegration } from "../src/settings/server/qpanda-skill.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const [readme, catalog, skillReadme, report] = await Promise.all([
  readFile(new URL("../README.md", import.meta.url), "utf8"),
  readFile(new URL("../docs/CAPABILITIES.md", import.meta.url), "utf8"),
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
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
  assert.ok(rows.length > 0, `${heading} must contain a visible catalog table`);
  const header = rows[0];
  const entries = new Map();
  for (const cells of rows) {
    if (cells.every((cell) => /^:?-+:?$/.test(cell))) continue;
    if (cells.length === header.length && cells.every((cell, index) => cell === header[index])) continue;
    const match = cells[0].match(/`([a-z0-9_-]+)`/);
    assert.ok(match, `${heading}: each row needs a canonical identifier`);
    assert.ok(!entries.has(match[1]), `${heading}: duplicate ${match[1]}`);
    entries.set(match[1], cells);
  }
  assert.ok(entries.size > 0, `${heading} must contain catalog entries`);
  return entries;
}

const skills = catalogRows(catalog, "## 内置 Skills");
const servers = catalogRows(catalog, "## MCP 服务目录");
const nativeTools = catalogRows(catalog, "## 原生量子 Tools");
const declaredServers = report.packages.flatMap((entry) => entry.execution.mcpServers);
const declaredNativeTools = report.packages.flatMap((entry) => entry.execution.nativeTools)
  .filter((tool) => ["./native-quantum-tools.mjs", "./quantum-practices-tools.mjs", "./metriq-data-tools.mjs"].includes(tool.providerPlugin));

// Read the prose already maintained by each edition; counts come from the
// capability declarations above, not a second generated inventory.
const countPatterns = {
  zh: [/(\d+) 个内置 Skill/g, /(\d+) 个 MCP 服务连接/g, /(\d+) 个原生量子 Tool/g],
  en: [/(\d+) built-in Skills/g, /(\d+) MCP service connections/g, /(\d+) native quantum Tools/g],
  ja: [/(\d+) 個の組み込み Skill/g, /(\d+) 個の MCP サービス接続/g, /(\d+) 個のネイティブ量子 Tool/g],
  ko: [/내장 Skill (\d+)개/g, /MCP 서비스 연결 (\d+)개/g, /네이티브 양자 Tool (\d+)개/g],
  es: [/(\d+) Skills integradas/g, /(\d+) conexiones de servicios MCP/g, /(\d+) Tools cuánticas nativas/g],
  fr: [/(\d+) Skills intégrés/g, /(\d+) connexions de services MCP/g, /(\d+) Tools quantiques natifs/g],
  de: [/(\d+) integrierte[n]? Skills/g, /(\d+) MCP-Dienstverbindungen/g, /(\d+) native Quanten-Tools/g],
  pt: [/(\d+) Skills integradas/g, /(\d+) conexões de serviços MCP/g, /(\d+) Tools quânticas nativas/g],
  ru: [/(\d+) встроенных Skill/g, /(\d+) подключение сервисов MCP/g, /(\d+) нативных квантовых Tools/g],
  ar: [/(\d+) Skill مدمجة/g, /(\d+) اتصال خدمة MCP/g, /(\d+) Tools كمية أصلية/g],
};
const languages = JSON.parse(await readFile(new URL("../runtime/openquantum/web-locales/languages.json", import.meta.url), "utf8"));
const { version } = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
for (const { id } of languages) {
  test(`${id} README counts and Codex installation links match the current distribution`, async () => {
    const filename = id === "zh" ? "README.md" : `docs/readme/README.${id}.md`;
    const markdown = await readFile(new URL(`../${filename}`, import.meta.url), "utf8");
    const prose = markdown.replace(/<[^>]+>/g, "");
    assert.ok(countPatterns[id], `${id}: missing translated inventory checks`);
    const expected = [trackedSkillIds.length, declaredServers.length, declaredNativeTools.length];
    for (const [index, pattern] of countPatterns[id].entries()) {
      const matches = [...prose.matchAll(pattern)];
      assert.ok(matches.length, `${filename}: missing inventory count ${index}`);
      for (const match of matches) assert.equal(Number(match[1]), expected[index], `${filename}: stale count in ${match[0]}`);
    }
    const release = "https://github.com/xi-zhao/OpenQuantum";
    assert.ok(markdown.includes(`${release}/blob/codex-v${version}/docs/integrations/CODEX_AGENT_INSTALL.md`));
    assert.ok(markdown.includes(`${release}/releases/tag/codex-v${version}`));
    const links = [...markdown.matchAll(/https:\/\/github\.com\/xi-zhao\/OpenQuantum\/[^\s)]+\/codex-v(\d+\.\d+\.\d+)/g)];
    assert.ok(links.length);
    for (const link of links) assert.equal(link[1], version, `${filename}: stale Codex URL`);
    if (id !== "zh") {
      assert.ok(markdown.includes(`${release}/releases/download/codex-v${version}/openquantum-${version}-codex-install.zip`));
    }
  });
}

test("both Skill catalogs enumerate every source-distributed Skill exactly once", () => {
  assert.deepEqual([...skills.keys()].sort(), trackedSkillIds);
  assert.deepEqual([...catalogRows(skillReadme, "## 当前 Skill").keys()].sort(), trackedSkillIds);
  assert.ok(skillReadme.includes(`以下 ${trackedSkillIds.length} 个 Skill 随源码分发`));
  for (const id of trackedSkillIds) {
    assert.ok(skills.get(id)[0].includes(`(../.agents/skills/${id}/SKILL.md)`));
  }
});

test("capability reference makes each Skill's declared MCP and native quantum actions identifiable", () => {
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

test("capability reference MCP catalog matches declared connections, activation policies and source links", () => {
  assert.deepEqual([...servers.keys()].sort(), declaredServers.map((entry) => entry.name).sort());
  const labels = { always: "默认开启", conditional: "默认开启¹", "opt-in": "默认关闭" };
  for (const server of declaredServers) {
    const cells = servers.get(server.name);
    assert.equal(cells[2], labels[server.activation], `${server.name}: stale default status`);
    const sourceUrl = mcpCatalogEntry(server.name).sourceUrl;
    const relativeSource = sourceUrl.startsWith("https://") ? sourceUrl : `../${sourceUrl}`;
    assert.ok(cells[0].includes(`(${relativeSource})`));
  }
  assert.ok(section(catalog, "## MCP 服务目录").includes("OPENQUANTUM_DISABLE_QISKIT_MCP=1"));
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

test("README summary and reference navigation stay aligned with the source inventory", () => {
  assert.ok(readme.includes(`${skills.size} 个内置 Skill、${servers.size} 个 MCP 服务连接、${nativeTools.size} 个原生量子 Tool`));
  const optIn = declaredServers.filter((entry) => entry.activation === "opt-in").length;
  assert.ok(catalog.includes(`${servers.size - optIn} 个默认开启`));
  assert.ok(catalog.includes(`${optIn} 个按需启用`));
  for (const anchor of ["内置-skills", "mcp-服务目录", "原生量子-tools"]) {
    assert.ok(readme.includes(`(docs/CAPABILITIES.md#${anchor})`));
  }
  for (const heading of ["## 内置 Skills", "## MCP 服务目录", "## 原生量子 Tools"]) {
    const before = catalog.slice(0, catalog.indexOf(heading));
    // Catalogs are deliberately expandable; each heading belongs to one named fold.
    assert.equal([...before.matchAll(/<details\b/g)].length - [...before.matchAll(/<\/details>/g)].length, 1);
    const opening = before.slice(before.lastIndexOf("<details>"));
    assert.match(opening, /<summary><strong>[^<]+<\/strong><\/summary>/);
    const content = section(catalog, heading);
    assert.ok(content.includes("</details>"));
    assert.doesNotMatch(content.slice(0, content.indexOf("</details>")), /<details\b/);
  }
});

test("the upstream QPanda Skill remains an explicit optional installation", () => {
  const optional = section(catalog, "## 可选上游 Skill");
  assert.ok(optional.includes(qpandaSkillIntegration.sourceUrl));
  assert.ok(optional.includes(qpandaSkillIntegration.setupCommand));
  assert.ok(optional.includes(`不计入上面的 ${skills.size} 个内置 Skill`));
  assert.ok(optional.includes("不会自动启用 `qpanda_runtime`"));
});
