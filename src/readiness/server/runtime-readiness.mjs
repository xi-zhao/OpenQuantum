const DEFAULT_PRESET_ID = "openquantum";
const DEFAULT_TIMEOUT_MS = 1_500;

const LIMITATIONS = Object.freeze([
  "MODEL_ENDPOINT_REACHABILITY_NOT_CHECKED",
  "MCP_CONNECTION_STATE_NOT_CHECKED",
  "DOWNSTREAM_SERVICE_REACHABILITY_NOT_CHECKED",
]);

function requiredFunction(target, name) {
  if (typeof target?.[name] !== "function") {
    throw new TypeError(`Runtime readiness observer requires ${name}()`);
  }
}

function normalizeTimeout(timeoutMs) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10_000) {
    throw new TypeError("Runtime readiness timeoutMs must be between 1 and 10000");
  }
  return timeoutMs;
}

function normalizeIdentifier(value) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (normalized === "" || normalized.length > 256) return undefined;
  return normalized;
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function normalizeNamedItems(values, { label = false } = {}) {
  if (!Array.isArray(values)) return undefined;
  const byId = new Map();
  for (const value of values) {
    const id = normalizeIdentifier(value?.id ?? value?.name);
    if (id === undefined) continue;
    const item = { id };
    const itemLabel = label ? normalizeIdentifier(value?.name) : undefined;
    if (itemLabel !== undefined && itemLabel !== id) item.label = itemLabel;
    byId.set(id, item);
  }
  return [...byId.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

function toolGroups(items) {
  const grouped = new Map();
  for (const item of items) {
    if (!item.id.startsWith("mcp__")) continue;
    const [, serverId] = item.id.split("__", 3);
    if (!serverId) continue;
    const names = grouped.get(serverId) ?? [];
    names.push(item.id);
    grouped.set(serverId, names);
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, names]) => ({
      id,
      itemCount: names.length,
      items: sortedUnique(names).map((name) => ({ id: name })),
    }));
}

async function boundedObservation(read, timeoutMs) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve({ ok: false, reasonCode: "OBSERVATION_TIMEOUT" });
    }, timeoutMs);
  });
  const observation = Promise.resolve()
    .then(() => read(controller.signal))
    .then(
      (value) => ({ ok: true, value }),
      () => ({ ok: false, reasonCode: "OBSERVATION_FAILED" }),
    );
  try {
    return await Promise.race([observation, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function failedCheck(id, scope, reasonCode) {
  return {
    id,
    scope,
    state: "failed",
    itemCount: 0,
    items: [],
    reasonCodes: [reasonCode],
  };
}

function notObservedCheck(id) {
  return {
    id,
    scope: "preset",
    state: "not_observed",
    itemCount: 0,
    items: [],
    reasonCodes: ["PRESET_NOT_MOUNTED"],
  };
}

function aggregateSkillCheck(results) {
  const successful = results.filter((result) => result.ok);
  if (successful.length === 0) {
    const timedOut = results.some(
      (result) => result.reasonCode === "OBSERVATION_TIMEOUT",
    );
    return failedCheck(
      "skill-registry",
      "preset",
      timedOut ? "SKILL_REGISTRY_TIMEOUT" : "SKILL_REGISTRY_READ_FAILED",
    );
  }

  const valid = successful.filter(
    (result) =>
      Array.isArray(result.value?.skills) &&
      typeof result.value.complete === "boolean",
  );
  if (valid.length === 0) {
    return failedCheck(
      "skill-registry",
      "preset",
      "SKILL_REGISTRY_INVALID_OBSERVATION",
    );
  }
  const items = normalizeNamedItems(
    valid.flatMap((result) => result.value.skills),
  );
  const reasonCodes = [];
  if (successful.length !== results.length) {
    reasonCodes.push("SKILL_REGISTRY_GENERATION_FAILED");
  }
  if (valid.length !== successful.length) {
    reasonCodes.push("SKILL_REGISTRY_GENERATION_INVALID");
  }
  if (valid.some((result) => result.value.complete !== true)) {
    reasonCodes.push("SKILL_CATALOG_INCOMPLETE");
  }
  if (items.length === 0) reasonCodes.push("NO_SKILLS_OBSERVED");
  return {
    id: "skill-registry",
    scope: "preset",
    state: reasonCodes.length === 0 ? "observed" : "incomplete",
    itemCount: items.length,
    items,
    reasonCodes,
  };
}

function aggregateToolCheck(results) {
  const successful = results.filter((result) => result.ok);
  if (successful.length === 0) {
    const timedOut = results.some(
      (result) => result.reasonCode === "OBSERVATION_TIMEOUT",
    );
    return failedCheck(
      "tool-registry",
      "preset",
      timedOut ? "TOOL_REGISTRY_TIMEOUT" : "TOOL_REGISTRY_READ_FAILED",
    );
  }

  const valid = successful.filter((result) => Array.isArray(result.value));
  if (valid.length === 0) {
    return failedCheck(
      "tool-registry",
      "preset",
      "TOOL_REGISTRY_INVALID_OBSERVATION",
    );
  }
  const items = normalizeNamedItems(valid.flatMap((result) => result.value));
  const reasonCodes = [];
  if (successful.length !== results.length) {
    reasonCodes.push("TOOL_REGISTRY_GENERATION_FAILED");
  }
  if (valid.length !== successful.length) {
    reasonCodes.push("TOOL_REGISTRY_GENERATION_INVALID");
  }
  if (items.length === 0) reasonCodes.push("NO_TOOLS_OBSERVED");
  return {
    id: "tool-registry",
    scope: "preset",
    state: reasonCodes.length === 0 ? "observed" : "incomplete",
    itemCount: items.length,
    items,
    groups: toolGroups(items),
    reasonCodes,
  };
}

async function observeModelRoutes(observer, timeoutMs) {
  const result = await boundedObservation(
    () => observer.listModelRoutes(),
    timeoutMs,
  );
  if (!result.ok) {
    return failedCheck(
      "model-routes",
      "host",
      result.reasonCode === "OBSERVATION_TIMEOUT"
        ? "MODEL_ROUTE_REGISTRY_TIMEOUT"
        : "MODEL_ROUTE_REGISTRY_READ_FAILED",
    );
  }
  const items = normalizeNamedItems(result.value, { label: true });
  if (items === undefined) {
    return failedCheck(
      "model-routes",
      "host",
      "MODEL_ROUTE_REGISTRY_INVALID_OBSERVATION",
    );
  }
  return {
    id: "model-routes",
    scope: "host",
    state: items.length === 0 ? "incomplete" : "observed",
    itemCount: items.length,
    items,
    reasonCodes: items.length === 0 ? ["NO_MODEL_ROUTES_OBSERVED"] : [],
  };
}

async function observePreset(observer, presetId, timeoutMs) {
  const scopeResult = await boundedObservation(
    () => observer.listActivePresetScopes(presetId),
    timeoutMs,
  );
  if (!scopeResult.ok || !Array.isArray(scopeResult.value)) {
    const reasonCode = scopeResult.reasonCode === "OBSERVATION_TIMEOUT"
      ? "PRESET_REGISTRY_TIMEOUT"
      : "PRESET_REGISTRY_READ_FAILED";
    return {
      preset: {
        id: presetId,
        state: "failed",
        generationCount: 0,
        reasonCodes: [reasonCode],
      },
      checks: [
        failedCheck("skill-registry", "preset", reasonCode),
        failedCheck("tool-registry", "preset", reasonCode),
      ],
    };
  }

  const scopes = [...new Set(scopeResult.value)];
  if (scopes.length === 0) {
    return {
      preset: {
        id: presetId,
        state: "not_observed",
        generationCount: 0,
        reasonCodes: ["PRESET_NOT_MOUNTED"],
      },
      checks: [
        notObservedCheck("skill-registry"),
        notObservedCheck("tool-registry"),
      ],
    };
  }

  const observations = await Promise.all(scopes.map(async (scope) => {
    const [skills, tools] = await Promise.all([
      boundedObservation(
        (signal) => observer.listSkills(scope, { signal }),
        timeoutMs,
      ),
      boundedObservation(
        () => observer.listTools(scope),
        timeoutMs,
      ),
    ]);
    return { skills, tools };
  }));
  const multiple = scopes.length > 1;
  return {
    preset: {
      id: presetId,
      state: multiple ? "multiple_generations" : "observed",
      generationCount: scopes.length,
      reasonCodes: multiple ? ["MULTIPLE_PRESET_GENERATIONS"] : [],
    },
    checks: [
      aggregateSkillCheck(observations.map((entry) => entry.skills)),
      aggregateToolCheck(observations.map((entry) => entry.tools)),
    ],
  };
}

function overallStatus(preset, checks) {
  if (checks.some((check) => check.scope === "host" && check.state !== "observed")) {
    return "partial";
  }
  if (preset.state === "not_observed") return "not_observed";
  if (
    preset.state !== "observed" ||
    checks.some((check) => check.state !== "observed")
  ) {
    return "partial";
  }
  return "observed";
}

/**
 * Create the one read-only Runtime Readiness Application Interface.
 *
 * The injected observer owns Harness-specific scope addressing. Reading never
 * mounts a preset, starts an MCP Server, executes a Tool, calls a model, or
 * reads a credential value.
 */
export function createRuntimeReadinessReader({
  observer,
  presetId = DEFAULT_PRESET_ID,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  now = () => new Date(),
} = {}) {
  requiredFunction(observer, "listActivePresetScopes");
  requiredFunction(observer, "listSkills");
  requiredFunction(observer, "listTools");
  requiredFunction(observer, "listModelRoutes");
  const boundedTimeoutMs = normalizeTimeout(timeoutMs);
  const boundedPresetId = normalizeIdentifier(presetId);
  if (boundedPresetId === undefined) {
    throw new TypeError("Runtime readiness presetId is invalid");
  }

  return async function readRuntimeReadiness() {
    const [modelCheck, presetObservation] = await Promise.all([
      observeModelRoutes(observer, boundedTimeoutMs),
      observePreset(observer, boundedPresetId, boundedTimeoutMs),
    ]);
    const observedAt = now();
    if (!(observedAt instanceof Date) || Number.isNaN(observedAt.valueOf())) {
      throw new TypeError("Runtime readiness clock returned an invalid date");
    }
    const checks = [modelCheck, ...presetObservation.checks];
    return {
      schemaVersion: "1.0",
      observedAt: observedAt.toISOString(),
      mode: "passive",
      status: overallStatus(presetObservation.preset, checks),
      preset: presetObservation.preset,
      checks,
      limitations: [...LIMITATIONS],
    };
  };
}
