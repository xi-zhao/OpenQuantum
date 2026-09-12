import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { MAX_OUTPUT_CHARS, retrieveQuantumPractice, SOURCE } from "../src/quantum-practices/index.mjs";
import { skills } from "../src/quantum-practices/upstream/generated/skill-catalog.js";
import manifest from "../src/quantum-practices/upstream/source.json" with { type: "json" };
import { apply, toolDefinitions } from "../runtime/openquantum/agent-presets/openquantum/quantum-practices-tools.mjs";
import { readDeclaredNativeToolContracts } from "../scripts/lib/capability-tool-contract.mjs";

test("pinned MIT catalog retains exact source digests and a single declared read-only Tool", async () => {
  for (const file of manifest.files) {
    const bytes = await readFile(new URL(`../src/quantum-practices/upstream/${file.path}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256, file.path);
  }
  assert.equal(SOURCE.commit, "572a24c9b5c9787caec98810351f5cb17c82250e");
  assert.equal(skills.length, SOURCE.catalogEntries);
  assert.equal(new Set(skills.map(skill => skill.id)).size, 60);
  const contracts = readDeclaredNativeToolContracts({
    projectRoot: fileURLToPath(new URL("..", import.meta.url)),
    capabilityId: "quantum-practices",
  });
  const registered = [];
  apply({ tools: { register: (tool) => registered.push(tool) } });
  assert.deepEqual(registered, toolDefinitions);
  assert.deepEqual(registered.map(tool => tool.name), contracts.map(tool => tool.name));
  assert.equal(contracts[0].effect, "read-only");
  assert.equal(registered[0].parameters.additionalProperties, false);
  assert.doesNotMatch(registered[0].description, /Use this whenever/);
});

test("English and Chinese requests retrieve the intended guides with source and execution boundaries", () => {
  for (const [query, id] of [
    ["HHL matrix constraints", "algorithms/linear-systems/hhl"],
    ["一维热方程的假设", "algorithms/schrodingerization/heat-1d-schrodingerization"],
    ["二维热方程", "algorithms/schrodingerization/heat-2d-schrodingerization"],
    ["参数位移梯度", "algorithms/gradients/parameter-shift"],
  ]) {
    const result = retrieveQuantumPractice({ action: "get", query });
    assert.ok(result.includes(`id: ${id}`), query);
    assert.ok(result.includes(`${SOURCE.repository}/blob/${SOURCE.commit}/${id}/SKILL.md`));
    assert.match(result, /not active Skill instructions or execution evidence/);
    assert.match(result, /separately licensed dependency/);
    assert.match(result, /BEGIN UPSTREAM REFERENCE/);
  }
  const hhl = retrieveQuantumPractice({ action: "get", id: "algorithms/linear-systems/hhl", detail: "full" });
  assert.match(hhl, /Hermitian/);
  assert.match(hhl, /power of 2/);
  assert.match(retrieveQuantumPractice({ action: "search", query: "HHL", limit: 2 }), /algorithms\/linear-systems\/hhl/);
  assert.match(retrieveQuantumPractice({ action: "list", limit: 20 }), /Quantum practice catalog/);
});

test("all guides respect output bounds in brief and full modes", () => {
  for (const skill of skills) {
    for (const detail of ["brief", "full"]) {
      const result = retrieveQuantumPractice({ action: "get", id: skill.id, detail });
      assert.ok(result.length <= MAX_OUTPUT_CHARS, `${skill.id}: ${detail}`);
      assert.ok(result.endsWith("--- END UPSTREAM REFERENCE ---"));
    }
  }
});

test("invalid paths, oversized or ambiguous requests and unknown actions fail explicitly", async () => {
  const cases = [
    [null, /object/],
    [{ action: "execute" }, /action/],
    [{ action: "get", id: "../../.env" }, /not a filesystem path/],
    [{ action: "get", id: "algorithms/nonexistent" }, /unknown skill/],
    [{ action: "get", query: "zzzzzzzz-nonexistent" }, /no skill matched/],
    [{ action: "get" }, /query is required/],
    [{ action: "get", query: "x".repeat(257) }, /256/],
    [{ action: "get", id: "root", query: "HHL" }, /either id or query/],
    [{ action: "get", id: "root", detail: "verbose" }, /detail/],
    [{ action: "search", query: "HHL", path: "/tmp" }, /unsupported argument/],
    [{ action: "list", limit: 0 }, /between 1 and 20/],
    [{ action: "list", limit: 21 }, /between 1 and 20/],
    [{ action: "list", limit: 1.5 }, /integer/],
    [{ action: "list", query: "HHL" }, /use search/],
    [{ action: "search", query: "HHL", detail: "full" }, /only supported by get/],
  ];
  for (const [args, error] of cases) {
    await assert.rejects(toolDefinitions[0].execute(args), error);
  }
});

test("retrieval does not access network, filesystem, subprocess or simulator APIs", async () => {
  for (const name of ["index.mjs", "upstream/skill-store.js"]) {
    const code = await readFile(new URL(`../src/quantum-practices/${name}`, import.meta.url), "utf8");
    assert.doesNotMatch(code, /node:(fs|child_process|http|https|net|tls|worker_threads)/);
    assert.doesNotMatch(code, /\b(fetch|spawn|execFile|writeFile|readFile|eval)\s*\(/);
  }
});
