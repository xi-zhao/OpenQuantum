import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  checkExtensionGovernance,
  collectExtensionGovernanceMetrics,
  validateExtensionGovernanceMetrics,
} from "../scripts/audit-extension-governance.mjs";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const script = path.join(projectRoot, "scripts/audit-extension-governance.mjs");

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "oq-governance-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file, value) => {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, value);
  };
  write(".agents/capability-packages.yml", `packages:
  - level: L0
    id: auto
  - { id: manual, level: L0 }
  - id: worker
    level: L1
    execution: { mcpServers: [{ tools: [{ name: run }, { name: check }] }] }
`);
  write(".agents/skills/auto/SKILL.md", "---\r\nname: auto\r\ndescription: |\r\n  disable-model-invocation: true\r\n---\r\n");
  write(".agents/skills/manual/SKILL.md", "---\nname: manual\nmanual: &manual true\n'disable-model-invocation': *manual # YAML boolean\n---\n");
  write("runtime/openquantum/agent-presets/openquantum/agent.cordis.yml", `
- config: { serverName: first, disabled: true }
  id: first
- id: optional
  disabled: true # explicit opt-in
  config: { serverName: optional }
- config: { serverName: conditional }
  disabled: !!js >-
    (() => { throw new Error('must not execute'); })()
- id: unrelated
  disabled: true
`);
  write(".agents/sdk-libraries.json", JSON.stringify({ libraries: [{ id: "one" }, { id: "two", language: "julia", nativeOnly: true }] }));
  return { root, write };
}

test("live extension declarations remain internally consistent without a document count gate", () => {
  const result = checkExtensionGovernance(projectRoot);
  assert.equal(result.status, "pass", result.issues.join("\n"));
});

test("YAML syntax, field order, comments, aliases and inert Cordis tags preserve metrics", t => {
  const { root } = fixture(t);
  const metrics = collectExtensionGovernanceMetrics(root);
  assert.deepEqual(metrics, {
    capabilities: 3,
    levels: { L0: 2, L1: 1, L2: 0, L3: 0 },
    toolOnlyCapabilities: ["worker"],
    skills: { total: 2, auto: 1, manual: 1 },
    mcp: { total: 3, always: 1, conditional: 1, optIn: 1, policyTools: 2 },
    sdk: { total: 2, nativeOnly: 1, byLanguage: { python: 1, julia: 1 } },
  });
  assert.equal(checkExtensionGovernance(root).status, "pass");
});

test("adding a Skill requires consistent declarations but no snapshot document edit", t => {
  const { root, write } = fixture(t);
  const document = "docs/architecture/EXTENSION_GOVERNANCE.md";
  write(document, "# 2026-11-24 snapshot\nHistorical counts stay unchanged.\n");
  const before = readFileSync(path.join(root, document), "utf8");
  write(".agents/skills/new-skill/SKILL.md", "---\nname: new-skill\n---\n");
  assert.equal(checkExtensionGovernance(root).status, "fail");
  const policy = readFileSync(path.join(root, ".agents/capability-packages.yml"), "utf8");
  write(".agents/capability-packages.yml", `${policy}  - { id: new-skill, level: L0 }\n`);
  assert.equal(checkExtensionGovernance(root).status, "pass");
  assert.equal(readFileSync(path.join(root, document), "utf8"), before);
});

for (const [label, change] of [
  ["capability levels", metrics => metrics.levels.L0++],
  ["Skill activation", metrics => metrics.skills.auto++],
  ["Skills + Tool-only capabilities", metrics => metrics.toolOnlyCapabilities.push("missing")],
  ["MCP activation", metrics => metrics.mcp.always++],
  ["SDK languages", metrics => metrics.sdk.byLanguage.python++],
]) {
  test(`audit rejects inconsistent ${label}`, t => {
    const metrics = collectExtensionGovernanceMetrics(fixture(t).root);
    change(metrics);
    const result = validateExtensionGovernanceMetrics(metrics);
    assert.equal(result.status, "fail");
    assert.equal(result.issues.length, 1);
    assert.ok(result.issues[0].startsWith(`${label}:`));
  });
}

test("invalid YAML and unknown maturity levels fail the check rather than yielding partial counts", t => {
  const { root, write } = fixture(t);
  write(".agents/capability-packages.yml", "packages: [\n");
  assert.throws(() => collectExtensionGovernanceMetrics(root), /capability-packages.yml/);
  write(".agents/capability-packages.yml", "packages: [{id: auto, level: L9}, {id: manual, level: L0}]\n");
  const result = spawnSync(process.execPath, [script, "--check"], { cwd: root, encoding: "utf8" });
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /capability levels/);
});

test("CLI preserves JSON and Markdown metric output", t => {
  const { root } = fixture(t);
  const metrics = collectExtensionGovernanceMetrics(root);
  for (const args of [[], ["--check"], ["--markdown"]]) {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8" });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    if (args[0] === "--markdown") assert.match(result.stdout, /2 个默认开启.*1 个按需启用/);
    else assert.deepEqual(args.length ? JSON.parse(result.stdout).metrics : JSON.parse(result.stdout), metrics);
  }
});
