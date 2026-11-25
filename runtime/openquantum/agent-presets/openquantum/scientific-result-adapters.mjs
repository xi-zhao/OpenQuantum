import path from "node:path";
import { projectRoot as repositoryRoot } from "../../project-root.mjs";
import { pathToFileURL } from "node:url";

import { defineScientificResultMaterializer } from "./scientific-result-materializer.mjs";
import { confinedMcpLaunch } from "./execution-boundary.mjs";

export const SOLVE_AND_VALIDATE_TOOL =
  "solve_and_validate_ground_state";
export const QUANTUM_INFORMATION_AUDIT_TOOL =
  "mcp__toqito_audit__audit_density_matrix";
export const QUANTUM_CIRCUIT_VERIFICATION_TOOL =
  "mcp__qcec_local__verify_circuit_equivalence";
export const QEC_MEMORY_TOOL = "mcp__qec_local__run_qec_memory_experiment";
export const HAMILTONIAN_SIMULATION_TOOL = "mcp__hamiltonian_local__simulate_hamiltonian";
export const QUBO_SOLVE_TOOL = "mcp__qpanda_qubo__solve_qpanda_qubo";
export const QUBO_MODEL_TOOL = "mcp__qpanda_qubo__model_and_solve_qpanda_qubo";
export const LDPC_DECODING_TOOL = "mcp__ldpc_local__decode_ldpc_syndromes";
export const PYZX_OPTIMIZATION_TOOL = "mcp__pyzx_local__optimize_pyzx_circuit";
export const SYMMER_TAPERING_TOOL = "mcp__symmer_local__taper_symmer_hamiltonian";
export const PAULIE_ALGEBRA_TOOL = "mcp__paulie_local__analyze_paulie_algebra";
export const GRAPHIX_MBQC_TOOL = "mcp__graphix_local__simulate_graphix_pattern";

const GROUND_STATE_SKILL = ".agents/skills/quantum-ground-state";
const QUANTUM_INFORMATION_SKILL =
  ".agents/skills/quantum-information-audit";
const QUANTUM_CIRCUIT_SKILL = ".agents/skills/quantum-circuit-verification";
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
let quantumCircuitRuntimePromise;

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
    import(moduleUrl(`${QUANTUM_INFORMATION_SKILL}/core/render-report.mjs`)),
  ]).then(([stateMath, validator, report]) => ({ ...stateMath, ...validator, ...report }));
  return quantumInformationRuntimePromise;
}

function quantumCircuitRuntime() {
  quantumCircuitRuntimePromise ??= Promise.all([
    import(moduleUrl(`${QUANTUM_CIRCUIT_SKILL}/core/request-contract.mjs`)),
    import(moduleUrl(`${QUANTUM_CIRCUIT_SKILL}/validators/validate-qcec-analysis.mjs`)),
    import(moduleUrl(`${QUANTUM_CIRCUIT_SKILL}/core/render-report.mjs`)),
    import(moduleUrl("src/lib/local-json-process.mjs")),
  ]).then(modules => Object.assign({}, ...modules));
  return quantumCircuitRuntimePromise;
}

function createConfinedReferenceRunner(processSandbox, runLocalJsonProcess) {
  return async function runReferenceProcess(options) {
    options.signal?.throwIfAborted();
    const launch = await confinedMcpLaunch(processSandbox, options);
    try {
      return await runLocalJsonProcess({
        ...options,
        command: launch.command,
        args: launch.args,
        env: { ...options.env, ...launch.env },
      });
    } finally {
      await launch.dispose();
    }
  };
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
    {
      id: "density-matrix-readable-report",
      path: `${QUANTUM_INFORMATION_SKILL}/core/render-report.mjs`,
      version: "1.0.0",
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
      renderReport(context) { return runtime.renderStateAuditReport(context); },
    };
  },
});

const materializeQuantumCircuit = defineScientificResultMaterializer({
  capabilityId: "quantum-circuit-verification", skillPath: QUANTUM_CIRCUIT_SKILL,
  resultRoot: "results/openquantum/quantum-circuit-verification", packagePrefix: "qcec",
  inputId: "circuit-equivalence-request", profileId: "unitary-classification-audit",
  validatorId: "qcec-classification-validator",
  provenanceTools: [
    { id: "qcec-mcp", path: `${QUANTUM_CIRCUIT_SKILL}/mcp/server.mjs`, version: capability => capability.manifest.version },
    { id: "qcec-python-bridge", path: `${QUANTUM_CIRCUIT_SKILL}/mcp/bridge.py`, version: "3.10.0" },
    { id: "qcec-request-boundary", path: `${QUANTUM_CIRCUIT_SKILL}/core/request-contract.mjs`, version: "1.0.0" },
    { id: "qcec-validator", path: `${QUANTUM_CIRCUIT_SKILL}/validators/validate-qcec-analysis.mjs`, version: "1.0.0" },
    { id: "independent-reference-driver", path: `${QUANTUM_CIRCUIT_SKILL}/validators/independent-reference.mjs`, version: "1.0.0" },
    { id: "qiskit-unitary-reference", path: `${QUANTUM_CIRCUIT_SKILL}/validators/reference.py`, version: "2.5.2" },
    { id: "qcec-environment-lock", path: `${QUANTUM_CIRCUIT_SKILL}/uv.lock`, version: "3.10.0+qiskit.2.5.2" },
  ],
  async prepare({ request, structuredContent, processSandbox }) {
    const runtime = await quantumCircuitRuntime();
    const normalized = runtime.normalizeAuditRequest(request);
    const canonicalRequest = { circuitAOpenQasm2: normalized.circuitAOpenQasm2, circuitBOpenQasm2: normalized.circuitBOpenQasm2 };
    const analysis = runtime.prepareQcecAnalysis(canonicalRequest, structuredContent);
    return {
      request: canonicalRequest,
      artifacts: [{ key: "analysis", id: "qcec-analysis", type: "qcec-analysis", fileName: "qcec-analysis.json", value: analysis }],
      validate({ resultPackage, profile, request: persistedRequest, artifacts, signal }) {
        return runtime.validateMaterializedQcec({
          request: persistedRequest, analysis: artifacts.analysis, resultPackage, profile, signal,
          runReferenceProcess: createConfinedReferenceRunner(processSandbox, runtime.runLocalJsonProcess),
        });
      },
      renderReport(context) { return runtime.renderClassificationReport(context); },
    };
  },
});

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Both numerical capabilities already own independent computational Validators.
// This internal Adapter adds only their persisted-evidence boundary and projection.
function numericalAdapter({ capabilityId, tool, operation, title, profileId, validatorId, artifactType, artifactKey, referenceFile, describe, selectArtifact = value => value?.[artifactKey] }) {
  const skillPath = `.agents/skills/${capabilityId}`;
  let runtimePromise;
  const runtime = () => runtimePromise ??= Promise.all([
    import(moduleUrl(`${skillPath}/validators/validate-materialized.mjs`)),
    import(moduleUrl(`${skillPath}/core/render-report.mjs`)),
    import(moduleUrl("src/lib/local-json-process.mjs")),
  ]).then(modules => Object.assign({}, ...modules));
  const project = value => {
    if (value?.scientificValidation !== "observations_available" || !Array.isArray(value.validation?.observations)
      || !isRecord(selectArtifact(value))) return undefined;
    const details = describe(selectArtifact(value));
    if (!details) return undefined;
    return { schemaVersion: "1.0", capabilityId, operation, title,
      summary: "已生成计算事实与独立观察；最终科学验收需物化证据后由中央规则推导。",
      scientificStatus: "observations_available", details };
  };
  const materialize = defineScientificResultMaterializer({
    capabilityId, skillPath, resultRoot: `results/openquantum/${capabilityId}`,
    packagePrefix: capabilityId, inputId: "experiment-request", profileId, validatorId,
    provenanceTools: ["mcp/server.mjs", "mcp/bridge.py", "validators/validate-result.mjs",
      "validators/validate-materialized.mjs", referenceFile, "core/render-report.mjs", "uv.lock"].filter(Boolean).map(file => ({
      id: `${capabilityId}-${file.replaceAll(/[/.]/g, "-")}`, path: `${skillPath}/${file}`,
      version: capability => capability.manifest.version,
    })),
    async prepare({ request, structuredContent, processSandbox }) {
      const implementation = await runtime();
      const canonicalRequest = implementation.normalizeAuditRequest(request);
      if (!project(structuredContent)) throw new Error(`Invalid ${capabilityId} computational envelope`);
      return {
        request: canonicalRequest,
        artifacts: [{ key: artifactKey, id: artifactType, type: artifactType,
          fileName: `${artifactType}.json`, value: selectArtifact(structuredContent) }],
        validate({ request: persistedRequest, artifacts, ...context }) {
          return implementation.validateMaterializedResult({
            ...context,
            request: persistedRequest,
            [artifactKey]: artifacts[artifactKey],
            // The reference starts in the Host, outside the MCP process tree.
            // Reuse its temp-only, full-confinement boundary before spawning;
            // shared Validators receive a runner, never a Harness dependency.
            runReferenceProcess: createConfinedReferenceRunner(processSandbox, implementation.runLocalJsonProcess),
          });
        },
        renderReport: implementation.renderReport,
      };
    },
  });
  return [tool, Object.freeze({
    descriptor: Object.freeze({ capabilityId, operation, title,
      scientificStatuses: Object.freeze(["observations_available", "acceptance_available"]),
      materializedArtifactTypes: Object.freeze([artifactType]) }),
    project,
    materialize(context) { return materialize({ ...context, request: context.arguments, structuredContent: context.canonicalValue?.structuredContent }); },
    projectMaterialized(canonicalValue, materialized) {
      const presentation = materializedPresentation({ computational: project(canonicalValue?.structuredContent),
        materialized, title, leadingDetails: details => details.slice(0, 2) });
      return presentation && { ...presentation, details: [...presentation.details,
        ...(materialized.readableReport ? [detail("可读验收报告", materialized.readableReport.path)] : [])] };
    },
  })];
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

function quantumCircuitPresentation(value) {
  const verdict = value?.result?.equivalence;
  if (value?.schemaVersion !== "1.0" || value.scientificValidation !== "observations_available"
    || !["equivalent", "equivalent_up_to_global_phase", "equivalent_up_to_phase", "not_equivalent", "probably_equivalent", "probably_not_equivalent", "no_information"].includes(verdict)
    || typeof value.packageVersion !== "string" || value.packageVersion.length > 80
    || !finiteNumber(value.result.statistics?.checkSeconds)) return undefined;
  return {
    schemaVersion: "1.0", capabilityId: "quantum-circuit-verification", operation: "verify-circuit-equivalence",
    title: "电路判定观察", summary: `QCEC 判定：${verdict}；尚未形成中央科学验收。`,
    scientificStatus: "observations_available",
    details: [detail("电路判定", verdict), detail("MQT QCEC", value.packageVersion), detail("检查用时", `${formatNumber(value.result.statistics.checkSeconds)} 秒`)],
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
  ...[QUBO_SOLVE_TOOL, QUBO_MODEL_TOOL].map(tool => numericalAdapter({ capabilityId: "qpanda-qubo", tool,
    operation: "qubo-audit", title: "QUBO 代数与最优性验收", profileId: "qubo-algebraic-optimality-audit",
    validatorId: "qpanda-qubo-observations", artifactType: "qubo-result", artifactKey: "result",
    selectArtifact: value => value,
    describe: result => Number.isSafeInteger((result.solver ?? result).problem?.size)
      ? [detail("变量数", String((result.solver ?? result).problem.size)), detail("主算法", (result.solver ?? result).quantum ? "QAOA" : "traversal")] : undefined })),
  numericalAdapter({ capabilityId: "ldpc-decoding", tool: LDPC_DECODING_TOOL,
    operation: "syndrome-audit", title: "LDPC syndrome 重放验收", profileId: "ldpc-syndrome-replay-audit",
    validatorId: "ldpc-decoding-observations", artifactType: "ldpc-result", artifactKey: "result", referenceFile: "validators/reference.py",
    describe: result => Number.isSafeInteger(result.statistics?.shots)
      ? [detail("样本数", String(result.statistics.shots)), detail("syndrome 匹配数", String(result.statistics.syndromeMatchedCount))] : undefined }),
  numericalAdapter({ capabilityId: "pyzx-optimization", tool: PYZX_OPTIMIZATION_TOOL,
    operation: "zx-optimization", title: "PyZX 酉优化验收", profileId: "pyzx-unitary-optimization-audit",
    validatorId: "pyzx-optimization-observations", artifactType: "numerical-result", artifactKey: "result",
    describe: result => Number.isSafeInteger(result.before?.gates) && Number.isSafeInteger(result.after?.gates)
      && Number.isSafeInteger(result.before?.tCount) && Number.isSafeInteger(result.after?.tCount)
      ? [detail("门数变化", `${result.before.gates} -> ${result.after.gates}`), detail("T 门变化", `${result.before.tCount} -> ${result.after.tCount}`)] : undefined }),
  numericalAdapter({ capabilityId: "symmer-tapering", tool: SYMMER_TAPERING_TOOL,
    operation: "symmetry-tapering", title: "Symmer 对称性降比特验收", profileId: "symmer-sector-spectrum-audit",
    validatorId: "symmer-tapering-observations", artifactType: "numerical-result", artifactKey: "result", referenceFile: "validators/reference.py",
    describe: result => Number.isSafeInteger(result.reducedQubits)
      && (Number.isSafeInteger(result.sectorDimension) || (typeof result.sectorDimension === "string" && /^[1-9][0-9]*$/.test(result.sectorDimension)))
      ? [detail("降维量子位数", String(result.reducedQubits)), detail("扇区维数", String(result.sectorDimension))] : undefined }),
  numericalAdapter({ capabilityId: "paulie-algebra", tool: PAULIE_ALGEBRA_TOOL,
    operation: "lie-closure", title: "PauLie 动力学 Lie 代数验收", profileId: "paulie-lie-closure-audit",
    validatorId: "paulie-algebra-observations", artifactType: "numerical-result", artifactKey: "result",
    describe: result => (Number.isSafeInteger(result.dimension) || (typeof result.dimension === "string" && /^[1-9][0-9]*$/.test(result.dimension)))
      && typeof result.classification === "string" && result.classification.length > 0 && result.classification.length <= 160
      ? [detail("DLA 维数", String(result.dimension)), detail("分类标记", result.classification)] : undefined }),
  numericalAdapter({ capabilityId: "graphix-mbqc", tool: GRAPHIX_MBQC_TOOL,
    operation: "mbqc-pattern", title: "Graphix MBQC 模式验收", profileId: "graphix-mbqc-pattern-audit",
    validatorId: "graphix-mbqc-observations", artifactType: "numerical-result", artifactKey: "result",
    describe: result => Array.isArray(result.nodes) && Number.isSafeInteger(result.maxSpace) && Array.isArray(result.branches)
      ? [detail("资源节点数", String(result.nodes.length)), detail("模拟分支数", String(result.branches.length))] : undefined }),
  numericalAdapter({ capabilityId: "qec-memory-experiment", tool: QEC_MEMORY_TOOL,
    operation: "memory-experiment", title: "QEC 存储实验验收", profileId: "rotated-surface-memory-audit",
    validatorId: "memory-observations", artifactType: "memory-result", artifactKey: "facts", referenceFile: "validators/replay.py",
    describe: facts => Number.isSafeInteger(facts.result?.shots) && Number.isSafeInteger(facts.result?.logicalErrors)
      ? [detail("采样数", String(facts.result.shots)), detail("逻辑失败数", String(facts.result.logicalErrors))] : undefined }),
  numericalAdapter({ capabilityId: "hamiltonian-simulation", tool: HAMILTONIAN_SIMULATION_TOOL,
    operation: "pauli-evolution", title: "Hamiltonian 演化验收", profileId: "pauli-evolution-reference-audit",
    validatorId: "hamiltonian-observations", artifactType: "hamiltonian-result", artifactKey: "result", referenceFile: "validators/reference.py",
    describe: result => ["trotter", "qdrift"].includes(result.method) && Number.isSafeInteger(result.numQubits)
      ? [detail("演化方法", result.method), detail("量子位数", String(result.numQubits))] : undefined }),
  [QUANTUM_CIRCUIT_VERIFICATION_TOOL, Object.freeze({
    descriptor: Object.freeze({ capabilityId: "quantum-circuit-verification", operation: "verify-circuit-equivalence",
      title: "电路判定复核", scientificStatuses: Object.freeze(["observations_available", "acceptance_available"]),
      materializedArtifactTypes: Object.freeze(["qcec-analysis"]) }),
    project: quantumCircuitPresentation,
    materialize(context) { return materializeQuantumCircuit({ ...context, request: context.arguments, structuredContent: context.canonicalValue?.structuredContent }); },
    projectMaterialized(canonicalValue, materialized) {
      const presentation = materializedPresentation({ computational: quantumCircuitPresentation(canonicalValue?.structuredContent), materialized,
        title: "电路判定复核", leadingDetails: details => details.slice(0, 2) });
      if (!presentation) return undefined;
      const verdict = canonicalValue.structuredContent.result.equivalence;
      return { ...presentation, summary: `电路判定：${verdict}；判定的数值与来源复核：${materialized.acceptanceStatus}。复核通过不将“不等价”改成“等价”。`,
        details: [...presentation.details, ...(materialized.readableReport ? [detail("可读验收报告", materialized.readableReport.path)] : [])] };
    },
  })],
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
        const presentation = materializedPresentation({
          computational: quantumInformationPresentation(
            canonicalValue?.structuredContent,
          ),
          materialized,
          title: "量子信息科学验收",
          leadingDetails: (details) => details.slice(0, 2),
        });
        if (!presentation) return undefined;
        return { ...presentation, details: [...presentation.details,
          ...(materialized.readableReport ? [detail("可读验收报告", materialized.readableReport.path)] : [])] };
      },
    }),
  ],
]);

export function scientificResultAdapter(toolName) {
  const name = toolName === "audit_density_matrix" ? QUANTUM_INFORMATION_AUDIT_TOOL
    : toolName === "verify_circuit_equivalence" ? QUANTUM_CIRCUIT_VERIFICATION_TOOL
    : toolName === "run_qec_memory_experiment" ? QEC_MEMORY_TOOL
    : toolName === "solve_qpanda_qubo" ? QUBO_SOLVE_TOOL
    : toolName === "model_and_solve_qpanda_qubo" ? QUBO_MODEL_TOOL
    : toolName === "decode_ldpc_syndromes" ? LDPC_DECODING_TOOL
    : toolName === "optimize_pyzx_circuit" ? PYZX_OPTIMIZATION_TOOL
    : toolName === "taper_symmer_hamiltonian" ? SYMMER_TAPERING_TOOL
    : toolName === "analyze_paulie_algebra" ? PAULIE_ALGEBRA_TOOL
    : toolName === "simulate_graphix_pattern" ? GRAPHIX_MBQC_TOOL
    : toolName === "simulate_hamiltonian" ? HAMILTONIAN_SIMULATION_TOOL : toolName;
  return adapters.get(name);
}
