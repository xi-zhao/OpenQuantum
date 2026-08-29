import assert from "node:assert/strict";
import test from "node:test";

import {
  createRuntimeReadinessReader,
} from "../src/readiness/server/runtime-readiness.mjs";
import {
  createHarnessRuntimeObserver,
} from "../runtime/openquantum/web-capabilities/runtime-readiness.mjs";

const FIXED_NOW = new Date("2026-08-29T08:00:00.000Z");

function observer(overrides = {}) {
  return {
    listActivePresetScopes: () => [],
    listSkills: async () => ({ complete: true, skills: [] }),
    listTools: () => [],
    listModelRoutes: () => [
      { id: "openquantum-public", name: "OpenQuantum Public" },
    ],
    ...overrides,
  };
}

function reader(runtimeObserver, options = {}) {
  return createRuntimeReadinessReader({
    observer: runtimeObserver,
    now: () => FIXED_NOW,
    ...options,
  });
}

test("reports host evidence without mounting an unobserved Agent preset", async () => {
  let scopedReads = 0;
  const snapshot = await reader(observer({
    listSkills() {
      scopedReads += 1;
      return { complete: true, skills: [] };
    },
    listTools() {
      scopedReads += 1;
      return [];
    },
  }))();

  assert.equal(snapshot.schemaVersion, "1.0");
  assert.equal(snapshot.mode, "passive");
  assert.equal(snapshot.observedAt, FIXED_NOW.toISOString());
  assert.equal(snapshot.status, "not_observed");
  assert.deepEqual(snapshot.preset, {
    id: "openquantum",
    state: "not_observed",
    generationCount: 0,
    reasonCodes: ["PRESET_NOT_MOUNTED"],
  });
  assert.equal(snapshot.checks[0].id, "model-routes");
  assert.equal(snapshot.checks[0].state, "observed");
  assert.deepEqual(snapshot.checks[0].items, [
    { id: "openquantum-public", label: "OpenQuantum Public" },
  ]);
  assert.deepEqual(
    snapshot.checks.slice(1).map((check) => check.state),
    ["not_observed", "not_observed"],
  );
  assert.equal(scopedReads, 0);
});

test("keeps a Host Registry failure visible when the Agent is not mounted", async () => {
  const secret = "provider-key-value";
  const snapshot = await reader(observer({
    listModelRoutes() {
      throw new Error(secret);
    },
  }))();

  assert.equal(snapshot.preset.state, "not_observed");
  assert.equal(snapshot.status, "partial");
  assert.equal(snapshot.checks[0].state, "failed");
  assert.deepEqual(snapshot.checks[0].reasonCodes, [
    "MODEL_ROUTE_REGISTRY_READ_FAILED",
  ]);
  assert.equal(JSON.stringify(snapshot).includes(secret), false);
});

test("projects sorted Skill, Tool, MCP namespace and Model Registry evidence", async () => {
  const scope = Symbol("openquantum-generation");
  const snapshot = await reader(observer({
    listActivePresetScopes: () => [scope],
    listSkills(observedScope) {
      assert.equal(observedScope, scope);
      return {
        complete: true,
        skills: [
          { name: "quantum-sdk-advisor" },
          { name: "platform-diagnostics" },
          { name: "platform-diagnostics" },
        ],
      };
    },
    listTools(observedScope) {
      assert.equal(observedScope, scope);
      return [
        { name: "mcp__qiskit_docs__search_docs_tool" },
        { name: "read_file" },
        { name: "mcp__qiskit__transpile_circuit_tool" },
      ];
    },
  }))();

  assert.equal(snapshot.status, "observed");
  assert.deepEqual(snapshot.preset, {
    id: "openquantum",
    state: "observed",
    generationCount: 1,
    reasonCodes: [],
  });
  const skillCheck = snapshot.checks.find(
    (check) => check.id === "skill-registry",
  );
  assert.deepEqual(skillCheck.items, [
    { id: "platform-diagnostics" },
    { id: "quantum-sdk-advisor" },
  ]);
  const toolCheck = snapshot.checks.find(
    (check) => check.id === "tool-registry",
  );
  assert.deepEqual(toolCheck.items.map((item) => item.id), [
    "mcp__qiskit__transpile_circuit_tool",
    "mcp__qiskit_docs__search_docs_tool",
    "read_file",
  ]);
  assert.deepEqual(
    toolCheck.groups.map((group) => ({ id: group.id, itemCount: group.itemCount })),
    [
      { id: "qiskit", itemCount: 1 },
      { id: "qiskit_docs", itemCount: 1 },
    ],
  );
  assert.deepEqual(snapshot.limitations, [
    "MODEL_ENDPOINT_REACHABILITY_NOT_CHECKED",
    "MCP_CONNECTION_STATE_NOT_CHECKED",
    "DOWNSTREAM_SERVICE_REACHABILITY_NOT_CHECKED",
  ]);
});

test("keeps partial generation failures inside the snapshot and redacts errors", async () => {
  const secret = "https://token-value@example.invalid";
  const snapshot = await reader(observer({
    listActivePresetScopes: () => ["old", "new"],
    listSkills(scope) {
      if (scope === "old") throw new Error(secret);
      return {
        complete: false,
        skills: [{ name: "platform-diagnostics" }],
      };
    },
    listTools(scope) {
      if (scope === "old") throw new Error(secret);
      return [{ name: "read_file" }];
    },
  }))();

  assert.equal(snapshot.status, "partial");
  assert.equal(snapshot.preset.state, "multiple_generations");
  assert.equal(snapshot.preset.generationCount, 2);
  assert.deepEqual(snapshot.preset.reasonCodes, [
    "MULTIPLE_PRESET_GENERATIONS",
  ]);
  assert.deepEqual(
    snapshot.checks.slice(1).map((check) => check.state),
    ["incomplete", "incomplete"],
  );
  assert.equal(JSON.stringify(snapshot).includes(secret), false);
});

test("bounds slow Registry observations without executing a repair path", async () => {
  const snapshot = await reader(observer({
    listActivePresetScopes: () => ["current"],
    listSkills: () => new Promise(() => {}),
    listTools: () => [{ name: "read_file" }],
  }), { timeoutMs: 5 })();

  assert.equal(snapshot.status, "partial");
  const skillCheck = snapshot.checks.find(
    (check) => check.id === "skill-registry",
  );
  assert.equal(skillCheck.state, "failed");
  assert.deepEqual(skillCheck.reasonCodes, ["SKILL_REGISTRY_TIMEOUT"]);
});

test("requires the complete bounded observer Interface", () => {
  assert.throws(
    () => createRuntimeReadinessReader({ observer: {} }),
    /requires listActivePresetScopes/,
  );
  assert.throws(
    () => reader(observer(), { timeoutMs: 0 }),
    /timeoutMs must be between 1 and 10000/,
  );
});

test("Harness observer keeps live preset scopes inside its Cordis root", async () => {
  const root = {};
  const foreignRoot = {};
  const ownScope = Symbol("own-openquantum");
  const foreignScope = Symbol("foreign-openquantum");
  const observed = [];
  const runtimeObserver = createHarnessRuntimeObserver({
    ctx: {
      root,
      skills: {
        snapshot(options) {
          observed.push({ kind: "skills", options });
          return { complete: true, skills: [] };
        },
      },
      tools: {
        schemas(scope) {
          observed.push({ kind: "tools", scope });
          return [];
        },
      },
      llm: {
        listProviders() {
          return [];
        },
      },
    },
    projectRoot: "/bounded/project",
    livePresetMounts: () => [
      {
        presetId: "openquantum",
        key: ownScope,
        fiber: { ctx: { root } },
      },
      {
        presetId: "openquantum",
        key: foreignScope,
        fiber: { ctx: { root: foreignRoot } },
      },
      {
        presetId: "openquantum",
        key: undefined,
        fiber: { ctx: { root } },
      },
      {
        presetId: "another-preset",
        key: Symbol("another"),
        fiber: { ctx: { root } },
      },
    ],
  });

  assert.deepEqual(
    runtimeObserver.listActivePresetScopes("openquantum"),
    [ownScope],
  );
  const controller = new AbortController();
  await runtimeObserver.listSkills(ownScope, { signal: controller.signal });
  runtimeObserver.listTools(ownScope);
  assert.deepEqual(observed, [
    {
      kind: "skills",
      options: {
        scope: ownScope,
        cwd: "/bounded/project",
        signal: controller.signal,
      },
    },
    { kind: "tools", scope: ownScope },
  ]);
});
