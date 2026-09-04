/**
 * Agent-scoped Tool Provider for bounded, in-process quantum capabilities.
 *
 * Keep process-local JavaScript behind native Harness Tools. MCP remains the
 * boundary for independent processes, cross-language runtimes and remote
 * services; it is not an extra wrapper around ordinary local modules.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";

// Agent presets are copied into DSH_HOME before loading. Project-owned domain
// modules therefore resolve from the Harness process cwd, not from this copied
// Provider file's physical location.
const repositoryRoot = process.cwd();

function moduleUrl(relativePath) {
  return pathToFileURL(path.join(repositoryRoot, relativePath)).href;
}

const [groundStateContracts, groundStateSolver, groundStateValidator, qmclaw] =
  await Promise.all([
    import(
      moduleUrl(".agents/skills/quantum-ground-state/core/contracts.mjs")
    ),
    import(
      moduleUrl(".agents/skills/quantum-ground-state/scripts/solve.mjs")
    ),
    import(
      moduleUrl(
        ".agents/skills/quantum-ground-state/validators/validate-result.mjs",
      )
    ),
    import(moduleUrl(".agents/skills/qmclaw-workbench/core/experiments.mjs")),
  ]);

const {
  requireSolveAndValidateRequest,
  SOLVE_AND_VALIDATE_INPUT_SCHEMA,
  SOLVE_AND_VALIDATE_OUTPUT_SCHEMA,
  trustedAcceptanceProfile,
  validateFacts,
} = groundStateContracts;
const { solveGroundState } = groundStateSolver;
const { validateGroundStateComputation } = groundStateValidator;
const {
  LIST_OUTPUT_SCHEMA,
  listQmclawExperiments,
  SIMULATE_INPUT_SCHEMA,
  SIMULATE_OUTPUT_SCHEMA,
  simulateQmclawExperiment,
} = qmclaw;

export const name = "openquantum-native-quantum-tools";
export const inject = ["tools"];

const SUPPORTED_SCHEMA_KEYS = new Set([
  "type",
  "oneOf",
  "properties",
  "required",
  "additionalProperties",
  "items",
  "enum",
  "const",
  "description",
  "title",
  "default",
  "examples",
]);

/**
 * DSH intentionally accepts a portable JSON Schema subset. Domain modules may
 * keep tighter numeric and array bounds because their validators enforce them;
 * this projection removes only keywords the Registry cannot represent.
 */
function harnessSchema(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Tool schema nodes must be objects");
  }
  if (Array.isArray(value.type)) {
    const shared = Object.fromEntries(
      Object.entries(value).filter(
        ([key]) => key !== "type" && SUPPORTED_SCHEMA_KEYS.has(key),
      ),
    );
    return {
      oneOf: value.type.map((type) => harnessSchema({ ...shared, type })),
    };
  }
  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!SUPPORTED_SCHEMA_KEYS.has(key)) continue;
    if (key === "properties") {
      result.properties = Object.fromEntries(
        Object.entries(entry).map(([property, schema]) => [
          property,
          harnessSchema(schema),
        ]),
      );
    } else if (key === "items") {
      result.items = harnessSchema(entry);
    } else if (key === "oneOf") {
      result.oneOf = entry.map((schema) => harnessSchema(schema));
    } else {
      result[key] = structuredClone(entry);
    }
  }
  return result;
}

function text(text) {
  return [{ type: "text", text }];
}

function groundStateTool() {
  const parameters = harnessSchema(SOLVE_AND_VALIDATE_INPUT_SCHEMA);
  const outputSchema = harnessSchema(SOLVE_AND_VALIDATE_OUTPUT_SCHEMA);
  return Object.freeze({
    name: "solve_and_validate_ground_state",
    description:
      "Preferred atomic tool for ordinary requests. Deterministically compute six two-qubit ground-state facts and immediately run the independent scientific Validator. The composed call saves scientific evidence in the session workspace through the trusted Harness post-execute Host Plugin. Computation reports observations and leaves provenance not_checked until materialization; it never derives overall Acceptance.",
    parameters,
    output: Object.freeze({
      schema: outputSchema,
      render(_arguments, value) {
        const counts = { pass: 0, fail: 0, not_checked: 0 };
        for (const observation of value.validation.observations) {
          counts[observation.status] += 1;
        }
        return text(
          `Computed six deterministic facts and ${value.validation.observations.length} independent observations for request ${value.facts.problemSpec.requestId}. ${counts.pass} pass, ${counts.fail} fail, ${counts.not_checked} not checked; scope fact: ${value.validation.scopeMatch.status}. Execution provenance remains not checked until Harness materializes a Result Package. No overall Acceptance decision was produced.`,
        );
      },
    }),
    async execute(argumentsValue) {
      const request = requireSolveAndValidateRequest(argumentsValue);
      const facts = validateFacts(solveGroundState(request));
      const validation = validateGroundStateComputation({
        profile: trustedAcceptanceProfile(),
        request,
        facts,
      });
      return { facts, validation };
    },
  });
}

function qmclawCatalogTool() {
  const parameters = harnessSchema({
    type: "object",
    properties: {},
    additionalProperties: false,
  });
  const outputSchema = harnessSchema(LIST_OUTPUT_SCHEMA);
  return Object.freeze({
    name: "list_qmclaw_experiments",
    description:
      "List the 13 bounded QMClaw experiment simulations, their reviewed upstream mappings, accepted SI parameters, defaults, axes and series. No hardware or network is accessed.",
    parameters,
    output: Object.freeze({
      schema: outputSchema,
      render(_arguments, value) {
        return text(
          `Listed ${value.experiments.length} bounded QMClaw experiment simulations with SI-unit contracts.`,
        );
      },
    }),
    async execute(argumentsValue) {
      if (
        argumentsValue === null ||
        typeof argumentsValue !== "object" ||
        Array.isArray(argumentsValue) ||
        Object.keys(argumentsValue).length > 0
      ) {
        throw new TypeError("list_qmclaw_experiments accepts no arguments");
      }
      return listQmclawExperiments();
    },
  });
}

function qmclawSimulationTool() {
  const parameters = harnessSchema(SIMULATE_INPUT_SCHEMA);
  const outputSchema = harnessSchema(SIMULATE_OUTPUT_SCHEMA);
  return Object.freeze({
    name: "simulate_qmclaw_experiment",
    description:
      "Generate bounded deterministic synthetic data for one reviewed QMClaw experiment using local JavaScript. Results are explicitly simulations and remain scientifically not evaluated; no hardware, network, credential or parameter mutation is available.",
    parameters,
    output: Object.freeze({
      schema: outputSchema,
      render(_arguments, value) {
        return text(
          `Generated deterministic ${value.experiment} synthetic data for ${value.execution.qubits.join(", ")}; sourceKind=simulation and scientificValidation=not_evaluated. No hardware or network was accessed.`,
        );
      },
    }),
    async execute(argumentsValue) {
      return simulateQmclawExperiment(argumentsValue);
    },
  });
}

export const toolDefinitions = Object.freeze([
  groundStateTool(),
  qmclawCatalogTool(),
  qmclawSimulationTool(),
]);

export function apply(ctx) {
  for (const definition of toolDefinitions) {
    ctx.tools.register(definition);
  }
}
