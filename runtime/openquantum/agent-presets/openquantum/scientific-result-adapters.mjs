import path from "node:path";
import { pathToFileURL } from "node:url";

import { defineScientificResultMaterializer } from "./scientific-result-materializer.mjs";

export const SOLVE_AND_VALIDATE_TOOL =
  "solve_and_validate_ground_state";
export const QUANTUM_INFORMATION_AUDIT_TOOL =
  "mcp__toqito_audit__audit_density_matrix";

const repositoryRoot = process.cwd();
const GROUND_STATE_SKILL = ".agents/skills/quantum-ground-state";
const QUANTUM_INFORMATION_SKILL =
  ".agents/skills/quantum-information-audit";
const GROUND_STATE_FACT_FILES = Object.freeze({
  problemSpec: "problem-spec.json",
  hamiltonianManifest: "hamiltonian-manifest.json",
  exactReference: "exact-reference.json",
  groundStateResult: "ground-state-result.json",
  convergenceTrace: "convergence-trace.json",
  resourceEstimate: "resource-estimate.json",
});

let groundStateRuntimePromise;
let quantumInformationRuntimePromise;

function moduleUrl(relativePath) {
  return pathToFileURL(path.join(repositoryRoot, relativePath)).href;
}

function groundStateRuntime() {
  groundStateRuntimePromise ??= Promise.all([
    import(moduleUrl(`${GROUND_STATE_SKILL}/core/contracts.mjs`)),
    import(moduleUrl(`${GROUND_STATE_SKILL}/validators/validate-result.mjs`)),
  ]).then(([mcpContracts, validator]) => ({
    ...mcpContracts,
    ...validator,
  }));
  return groundStateRuntimePromise;
}

function quantumInformationRuntime() {
  quantumInformationRuntimePromise ??= Promise.all([
    import(
      moduleUrl(`${QUANTUM_INFORMATION_SKILL}/validators/state-math.mjs`)
    ),
    import(
      moduleUrl(
        `${QUANTUM_INFORMATION_SKILL}/validators/validate-state-analysis.mjs`,
      )
    ),
  ]).then(([stateMath, validator]) => ({ ...stateMath, ...validator }));
  return quantumInformationRuntimePromise;
}

function validatorVersion(validatorId) {
  return (capability) => {
    const validator = capability.manifest.validators.find(
      (validator) => validator.id === validatorId,
    );
    if (!validator) {
      throw new Error(`Capability does not declare Validator ${validatorId}`);
    }
    return validator.version;
  };
}

const materializeGroundState = defineScientificResultMaterializer({
  capabilityId: "quantum-ground-state",
  skillPath: GROUND_STATE_SKILL,
  resultRoot: "results/openquantum/quantum-ground-state",
  packagePrefix: "qgs",
  inputId: "ground-state-request",
  profileId: "supplied-pauli-statevector",
  validatorId: "ground-state-validator",
  provenanceTools: [
    {
      id: "openquantum-native-quantum-tools",
      path: "runtime/openquantum/agent-presets/openquantum/native-quantum-tools.mjs",
      version: (capability) => capability.manifest.version,
    },
    {
      id: "ground-state-validator",
      path: `${GROUND_STATE_SKILL}/validators/validate-result.mjs`,
      version: validatorVersion("ground-state-validator"),
    },
  ],
  async prepare({ request, structuredContent }) {
    const runtime = await groundStateRuntime();
    const canonicalRequest = runtime.requireSolveAndValidateRequest({ request });
    const canonicalFacts = runtime.validateFacts(structuredContent?.facts);
    return {
      request: canonicalRequest,
      artifacts: Object.entries(GROUND_STATE_FACT_FILES).map(
        ([key, fileName]) => ({
          key,
          id: canonicalFacts[key].artifactType,
          type: canonicalFacts[key].artifactType,
          fileName,
          value: canonicalFacts[key],
        }),
      ),
      validate({ resultPackage, profile, request: persistedRequest, artifacts }) {
        return runtime.validateValidationBundle({
          schemaVersion: "1.0",
          resultPackage: {
            kind: resultPackage.kind,
            value: resultPackage.value,
          },
          profile,
          request: persistedRequest,
          facts: artifacts,
        });
      },
    };
  },
});

const materializeQuantumInformation = defineScientificResultMaterializer({
  capabilityId: "quantum-information-audit",
  skillPath: QUANTUM_INFORMATION_SKILL,
  resultRoot: "results/openquantum/quantum-information-audit",
  packagePrefix: "qia",
  inputId: "density-matrix-request",
  profileId: "density-matrix-audit",
  validatorId: "density-matrix-validator",
  provenanceTools: [
    {
      id: "quantum-information-audit-mcp",
      path: `${QUANTUM_INFORMATION_SKILL}/mcp/server.mjs`,
      version: (capability) => capability.manifest.version,
    },
    {
      id: "density-matrix-validator",
      path: `${QUANTUM_INFORMATION_SKILL}/validators/validate-state-analysis.mjs`,
      version: validatorVersion("density-matrix-validator"),
    },
    {
      id: "toqito-environment-lock",
      path: `${QUANTUM_INFORMATION_SKILL}/uv.lock`,
      version: "1.3.1",
    },
  ],
  async prepare({ request, structuredContent }) {
    const runtime = await quantumInformationRuntime();
    const canonicalRequest = runtime.normalizeAuditRequest(request);
    const analysis = structuredContent?.analysis;
    const computationalValidation = runtime.validateStateAnalysis({
      request: canonicalRequest,
      analysis,
    });
    return {
      request: canonicalRequest,
      artifacts: [
        {
          key: "analysis",
          id: "state-analysis",
          type: "state-analysis",
          fileName: "state-analysis.json",
          value: analysis,
        },
        {
          key: "computationalValidation",
          id: "validation-bundle",
          type: "validation-bundle",
          fileName: "validation-bundle.json",
          value: computationalValidation,
        },
      ],
      validate({ resultPackage, profile, request: persistedRequest, artifacts }) {
        return runtime.validateMaterializedStateAnalysis({
          request: persistedRequest,
          analysis: artifacts.analysis,
          computationalValidation: artifacts.computationalValidation,
          resultPackage,
          profile,
        });
      },
    };
  },
});

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function formatNumber(value) {
  return Number(value.toPrecision(10)).toString();
}

function formatComplex(value) {
  if (!isRecord(value) || !finiteNumber(value.real) || !finiteNumber(value.imag)) {
    return undefined;
  }
  if (Math.abs(value.imag) <= 1e-14) return formatNumber(value.real);
  return `${formatNumber(value.real)} ${value.imag < 0 ? "-" : "+"} ${formatNumber(Math.abs(value.imag))}i`;
}

function detail(label, value) {
  return Object.freeze({ label, value });
}

function observationCounts(validation) {
  if (!isRecord(validation) || !Array.isArray(validation.observations)) {
    return undefined;
  }
  const counts = { pass: 0, warn: 0, fail: 0, not_checked: 0 };
  for (const observation of validation.observations) {
    if (!isRecord(observation) || !Object.hasOwn(counts, observation.status)) {
      return undefined;
    }
    counts[observation.status] += 1;
  }
  const scopeStatus = validation.scopeMatch?.status;
  if (!["in_scope", "out_of_scope", "indeterminate"].includes(scopeStatus)) {
    return undefined;
  }
  return { counts, scopeStatus };
}

function validationDetails(validation) {
  const summary = observationCounts(validation);
  if (!summary) return undefined;
  return Object.freeze([
    detail("适用范围", summary.scopeStatus),
    detail("观察总数", String(validation.observations.length)),
    detail("通过", String(summary.counts.pass)),
    detail("警告", String(summary.counts.warn)),
    detail("失败", String(summary.counts.fail)),
    detail("未检查", String(summary.counts.not_checked)),
  ]);
}

function groundStateSolvePresentation(structuredContent) {
  if (!isRecord(structuredContent)) return undefined;
  const problem = structuredContent.problemSpec;
  const result = structuredContent.groundStateResult;
  const exact = structuredContent.exactReference;
  if (
    !isRecord(problem) ||
    !isRecord(result) ||
    !isRecord(exact) ||
    result.artifactType !== "ground-state-result" ||
    exact.artifactType !== "exact-reference" ||
    typeof problem.requestId !== "string" ||
    !finiteNumber(result.energyHartree) ||
    !finiteNumber(exact.groundEnergyHartree) ||
    typeof result.converged !== "boolean" ||
    !Number.isSafeInteger(result.evaluationCount)
  ) {
    return undefined;
  }
  const difference = Math.abs(result.energyHartree - exact.groundEnergyHartree);
  return {
    schemaVersion: "1.0",
    capabilityId: "quantum-ground-state",
    operation: "solve",
    title: "量子基态事实",
    summary: `已生成请求 ${problem.requestId} 的六类确定性事实；尚未形成科学验收结论。`,
    scientificStatus: "not_evaluated",
    details: Object.freeze([
      detail("VQE 扇区能量", `${formatNumber(result.energyHartree)} Ha`),
      detail("精确参考能量", `${formatNumber(exact.groundEnergyHartree)} Ha`),
      detail("绝对能量差", `${formatNumber(difference)} Ha`),
      detail("优化事实", result.converged ? "已收敛" : "未收敛"),
      detail("函数评估次数", String(result.evaluationCount)),
    ]),
  };
}

function groundStateValidationPresentation(structuredContent) {
  const details = validationDetails(structuredContent);
  if (!details) return undefined;
  return {
    schemaVersion: "1.0",
    capabilityId: "quantum-ground-state",
    operation: "validate",
    title: "量子基态科学观察",
    summary:
      "独立 Validator 已生成逐项观察；整体科学验收仍由中央规则单独派生。",
    scientificStatus: "observations_available",
    details,
  };
}

function groundStateAtomicPresentation(structuredContent) {
  if (!isRecord(structuredContent)) return undefined;
  const solve = groundStateSolvePresentation(structuredContent.facts);
  const validation = groundStateValidationPresentation(
    structuredContent.validation,
  );
  if (!solve || !validation) return undefined;
  return {
    schemaVersion: "1.0",
    capabilityId: "quantum-ground-state",
    operation: "solve-and-validate",
    title: "量子基态求解与科学观察",
    summary:
      "已生成六类确定性事实并完成计算级独立检查；来源链和整体科学验收仍需 Harness 物化后单独推导。",
    scientificStatus: "observations_available",
    details: Object.freeze([
      ...solve.details.slice(0, 3),
      ...validation.details.filter((item) => item.label !== "观察总数"),
    ]),
  };
}

function quantumInformationPresentation(structuredContent) {
  if (!isRecord(structuredContent)) return undefined;
  const state = structuredContent.analysis?.state;
  const transpose = structuredContent.analysis?.partialTranspose;
  const validation = validationDetails(structuredContent.validation);
  const purity = formatComplex(state?.purity);
  if (
    !isRecord(state) ||
    !isRecord(transpose) ||
    !validation ||
    !Number.isSafeInteger(state.dimension) ||
    !Number.isSafeInteger(state.numericalRank) ||
    typeof state.toqitoDensity !== "boolean" ||
    !purity ||
    !finiteNumber(transpose.minimumEigenvalue) ||
    !finiteNumber(transpose.negativity)
  ) {
    return undefined;
  }
  return {
    schemaVersion: "1.0",
    capabilityId: "quantum-information-audit",
    operation: "audit-density-matrix",
    title: "量子信息数值审计",
    summary:
      "toqito 已生成密度矩阵事实，独立 Validator 已重算关键不变量；最终验收仍需 Harness 物化后推导。",
    scientificStatus: "observations_available",
    details: Object.freeze([
      detail("矩阵维数", String(state.dimension)),
      detail("纯度", purity),
      detail("数值秩", String(state.numericalRank)),
      detail("toqito 密度矩阵判定", state.toqitoDensity ? "是" : "否"),
      detail("部分转置最小本征值", formatNumber(transpose.minimumEigenvalue)),
      detail("Negativity", formatNumber(transpose.negativity)),
      detail("失败", validation.find((item) => item.label === "失败").value),
      detail("未检查", validation.find((item) => item.label === "未检查").value),
    ]),
  };
}

function materializedPresentation({
  computational,
  materialized,
  title,
  leadingDetails,
}) {
  if (
    !computational ||
    !isRecord(materialized) ||
    !["passed", "conditional", "failed"].includes(
      materialized.acceptanceStatus,
    ) ||
    !isRecord(materialized.resultCommit) ||
    materialized.resultPackagePath !==
      materialized.resultCommit.resultPackage?.path
  ) {
    return undefined;
  }
  const validation = validationDetails(materialized.validation);
  if (!validation) return undefined;
  return {
    ...computational,
    title,
    summary: `Harness 已物化并复核 Result Package；中央规则派生整体验收：${materialized.acceptanceStatus}。`,
    scientificStatus: "acceptance_available",
    acceptanceStatus: materialized.acceptanceStatus,
    details: Object.freeze([
      ...leadingDetails(computational.details),
      detail("整体验收", materialized.acceptanceStatus),
      ...validation.filter((item) =>
        ["通过", "警告", "失败", "未检查"].includes(item.label),
      ),
      detail("Result Package", materialized.resultPackagePath),
    ]),
    resultCommit: materialized.resultCommit,
  };
}

const adapters = new Map([
  [
    SOLVE_AND_VALIDATE_TOOL,
    Object.freeze({
      descriptor: Object.freeze({
        capabilityId: "quantum-ground-state",
        operation: "solve-and-validate",
        title: "量子基态求解与科学观察",
        scientificStatuses: Object.freeze([
          "observations_available",
          "acceptance_available",
        ]),
        materializedArtifactTypes: Object.freeze([
          "problem-spec",
          "hamiltonian-manifest",
          "exact-reference",
          "ground-state-result",
          "convergence-trace",
          "resource-estimate",
        ]),
      }),
      project: groundStateAtomicPresentation,
      materialize(context) {
        return materializeGroundState({
          ...context,
          request: context.arguments?.request,
          structuredContent:
            context.canonicalValue?.structuredContent ?? context.canonicalValue,
        });
      },
      projectMaterialized(canonicalValue, materialized) {
        return materializedPresentation({
          computational: groundStateAtomicPresentation(
            canonicalValue?.structuredContent ?? canonicalValue,
          ),
          materialized,
          title: "量子基态科学验收",
          leadingDetails: (details) => details.slice(0, 3),
        });
      },
    }),
  ],
  [
    QUANTUM_INFORMATION_AUDIT_TOOL,
    Object.freeze({
      descriptor: Object.freeze({
        capabilityId: "quantum-information-audit",
        operation: "audit-density-matrix",
        title: "量子信息数值审计",
        scientificStatuses: Object.freeze([
          "observations_available",
          "acceptance_available",
        ]),
        materializedArtifactTypes: Object.freeze([
          "state-analysis",
          "validation-bundle",
        ]),
      }),
      project: quantumInformationPresentation,
      materialize(context) {
        return materializeQuantumInformation({
          ...context,
          request: context.arguments,
          structuredContent: context.canonicalValue?.structuredContent,
        });
      },
      projectMaterialized(canonicalValue, materialized) {
        return materializedPresentation({
          computational: quantumInformationPresentation(
            canonicalValue?.structuredContent,
          ),
          materialized,
          title: "量子信息科学验收",
          leadingDetails: (details) => details.slice(0, 2),
        });
      },
    }),
  ],
]);

export function scientificResultAdapter(toolName) {
  return adapters.get(toolName);
}
