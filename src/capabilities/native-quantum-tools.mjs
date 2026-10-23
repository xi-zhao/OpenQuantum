/**
 * Shared deterministic quantum Tool definitions. Each host adapter owns
 * registration, transport, execution lifecycle and evidence materialization.
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Shared deterministic definitions. Host adapters own registration and evidence.
const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));

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
function text(text) {
  return [{ type: "text", text }];
}

function groundStateTool() {
  const parameters = structuredClone(SOLVE_AND_VALIDATE_INPUT_SCHEMA);
  const outputSchema = structuredClone(SOLVE_AND_VALIDATE_OUTPUT_SCHEMA);
  return Object.freeze({
    name: "solve_and_validate_ground_state",
    description:
      "Preferred atomic tool for ordinary requests. Deterministically compute six two-qubit ground-state facts and immediately run the independent scientific Validator. Computation reports observations and leaves provenance not_checked until materialization; it never derives overall Acceptance.",
    parameters,
    output: Object.freeze({
      schema: outputSchema,
      render(_arguments, value) {
        const counts = { pass: 0, fail: 0, not_checked: 0 };
        for (const observation of value.validation.observations) {
          counts[observation.status] += 1;
        }
        return text(
          `Computed six deterministic facts and ${value.validation.observations.length} independent observations for request ${value.facts.problemSpec.requestId}. ${counts.pass} pass, ${counts.fail} fail, ${counts.not_checked} not checked; scope fact: ${value.validation.scopeMatch.status}. Execution provenance remains not checked until the host materializes a Result Package. No overall Acceptance decision was produced.`,
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
  const parameters = structuredClone({
    type: "object",
    properties: {},
    additionalProperties: false,
  });
  const outputSchema = structuredClone(LIST_OUTPUT_SCHEMA);
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
  const parameters = structuredClone(SIMULATE_INPUT_SCHEMA);
  const outputSchema = structuredClone(SIMULATE_OUTPUT_SCHEMA);
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
