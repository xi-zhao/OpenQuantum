import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { retrieveQuantumPractice } from "../src/quantum-practices/index.mjs";
import coverage from "../examples/quantum-algorithms/coverage.json" with { type: "json" };
import reference from "../src/quantum-practices/upstream/source.json" with { type: "json" };

const root = fileURLToPath(new URL("../", import.meta.url));

test("all pinned guides and algorithm modules map to distinct native workflows", () => {
  assert.equal(coverage.guides.length, 66);
  assert.equal(new Set(coverage.guides.map(row => row.skill)).size, 66);
  assert.equal(coverage.guides.filter(row => row.invocation === "manual").length, 13);
  const algorithms = coverage.guides.filter(row => row.algorithm);
  assert.equal(algorithms.length, 49);
  assert.equal(new Set(algorithms.map(row => row.algorithm)).size, 49);
  assert.equal(algorithms.filter(row => row.sourceAlgorithm).length, 39);
  assert.equal(new Set(algorithms.flatMap(row => row.sourceAlgorithm ? [row.sourceAlgorithm.path] : [])).size, 39);
  assert.deepEqual(coverage.guides.map(row => [row.guideId, row.guideSha256]), reference.guides.map(row => [row.id, row.sha256]));
  const policy = parse(readFileSync(path.join(root, ".agents/capability-packages.yml"), "utf8"));
  for (const row of coverage.guides) {
    const filename = path.join(root, ".agents/skills", row.skill, "SKILL.md");
    const content = readFileSync(filename, "utf8");
    const frontmatter = parse(content.split("---")[1]);
    assert.equal(frontmatter.name, row.skill);
    assert.ok(frontmatter.description.length > 20);
    assert.ok(["manual", "automatic"].includes(row.invocation));
    assert.equal(frontmatter["disable-model-invocation"] === true, row.invocation === "manual");
    assert.notEqual(frontmatter["user-invocable"], false, "Existing user invocation must remain available");
    const declaration = policy.packages.find(entry => entry.id === row.skill);
    assert.equal(declaration.level, row.skill === "quantum-algorithms" ? "L1" : "L0");
    if (row.algorithm) {
      assert.equal(row.invocation, "automatic", "Computational methods must remain directly selectable");
      assert.ok(existsSync(path.join(root, row.exampleFile)));
      assert.ok(content.includes(`--algorithm ${row.algorithm}`));
      assert.ok(Array.isArray(row.dependencyGroups));
      assert.ok(row.dependencyGroups.every(group => ["gradients", "pennylane", "tensor", "chemistry"].includes(group)));
      assert.ok(content.includes(row.dependencyGroups.length ? `--group ${row.dependencyGroups[0]}` : "--minimal"));
    }
    for (const link of content.matchAll(/\]\((\.\.?\/[^)]+)\)/g)) {
      assert.ok(existsSync(path.resolve(path.dirname(filename), link[1])), `${row.skill}: missing ${link[1]}`);
    }
  }
  const execution = policy.packages.find(entry => entry.id === "quantum-algorithms").execution;
  assert.deepEqual(execution.mcpServers, []);
  assert.deepEqual(execution.nativeTools.map(tool => tool.name), ["bash", "pwsh"]);
  assert.ok(execution.nativeTools.every(tool => tool.effect === "external-write"));
});

test("each reference lookup points to its adapted execution or routing Skill", () => {
  for (const row of coverage.guides) {
    const text = retrieveQuantumPractice({ action: "get", id: row.guideId });
    assert.ok(text.includes(`Adapted native Skill: ${row.skill}.`));
    if (row.algorithm) assert.ok(text.includes(`--algorithm ${row.algorithm}`));
    assert.match(text, /reference material only/);
    if (row.invocation === "manual") assert.match(text, /For automatic tasks use quantum-algorithms/);
  }
});

test("workflow resources reproduce from the pinned coverage manifest", () => {
  execFileSync(process.execPath, ["scripts/build-open-algorithm-skills.mjs", "--check"], { cwd: root });
});

test("executable SDK examples and lock do not import or depend on the proprietary runtime", () => {
  const directory = path.join(root, "examples/quantum-algorithms");
  const lock = readFileSync(path.join(directory, "uv.lock"), "utf8");
  assert.doesNotMatch(lock, /name\s*=\s*"unitarylab(?:[-_]algorithms)?"/);
  for (const name of ["qiskit", "qiskit-algorithms", "pennylane", "quimb", "pyscf"]) {
    assert.ok(lock.includes(`name = "${name}"`));
  }
  for (const filename of readdirSync(directory).filter(name => name.endsWith(".py"))) {
    const text = readFileSync(path.join(directory, filename), "utf8");
    assert.doesNotMatch(text, /^\s*(?:from|import)\s+unitarylab(?:[._\s]|$)/m);
    assert.doesNotMatch(text, /(?:pip\s+install|uv\s+(?:sync|run))/);
  }
});
