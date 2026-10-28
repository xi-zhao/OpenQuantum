import { isDeepStrictEqual } from "node:util";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeAuditRequest } from "../core/request-contract.mjs";
import { independentReference } from "./independent-reference.mjs";

export const REPLAY_TOLERANCE = 1e-9;
export const NEGATIVE_MARGIN = 1e-8;
const CERTAIN = new Set(["equivalent", "equivalent_up_to_global_phase", "not_equivalent"]);
const VERDICTS = new Set([...CERTAIN, "equivalent_up_to_phase", "probably_equivalent", "probably_not_equivalent", "no_information"]);
const CHECK_IDS = ["request.scope", "inputs.digest", "backend.version", "qcec.conclusive", "classification.replayed", "provenance.complete"];
const finite = value => typeof value === "number" && Number.isFinite(value) && value >= 0;

export function prepareQcecAnalysis(request, value) {
  normalizeAuditRequest(request);
  if (value?.schemaVersion !== "1.0" || value.scientificValidation !== "observations_available"
    || !VERDICTS.has(value.result?.equivalence)) throw new Error("Invalid QCEC computational envelope");
  return {
    schemaVersion: "1.0", artifactType: "qcec-analysis", packageVersion: value.packageVersion,
    inputs: structuredClone(value.inputs),
    result: {
      equivalence: value.result.equivalence, inputDigests: structuredClone(value.result.inputDigests),
      statistics: structuredClone(value.result.statistics), timeoutSeconds: value.result.timeoutSeconds,
    },
  };
}

function replayObservation(request, normalized, reference, verdict) {
  const item = { id: "classification.replayed", status: "warn", observed: { verdict } };
  if (reference?.mode === "unavailable") {
    return { ...item, observed: { verdict, referenceChecked: false, reason: reference.reason } };
  }
  const engineValid = reference?.engine?.name === "qiskit" && reference.engine.version === "2.5.2";
  const envelopeValid = reference?.schemaVersion === "1.0" && engineValid && reference.maxDenseQubits === 8
    && isDeepStrictEqual(reference.inputDigests, {
      circuitA: normalized.summaries.circuitA.sha256, circuitB: normalized.summaries.circuitB.sha256,
    }) && finite(reference.strictResidual) && finite(reference.globalPhaseResidual)
    && Number.isFinite(reference.phase?.real) && Number.isFinite(reference.phase?.imag)
    && Math.abs(Math.hypot(reference.phase.real, reference.phase.imag) - 1) <= REPLAY_TOLERANCE
    && (reference.mode === "input-identity"
      ? request.circuitAOpenQasm2 === request.circuitBOpenQasm2 && reference.unitaryDomainChecked === true
        && reference.qubits === normalized.summaries.circuitA.qubits && reference.strictResidual === 0 && reference.globalPhaseResidual === 0
      : reference.mode === "dense-unitary" && reference.qubits === normalized.summaries.circuitA.qubits && reference.qubits <= 8);
  if (!envelopeValid) return { ...item, status: "fail", observed: { verdict, referenceEnvelopeValid: false } };
  item.observed = { verdict, referenceChecked: true, engine: reference.engine, mode: reference.mode,
    strictResidual: reference.strictResidual, globalPhaseResidual: reference.globalPhaseResidual,
    phase: reference.phase, positiveTolerance: REPLAY_TOLERANCE, negativeMargin: NEGATIVE_MARGIN };
  if (verdict === "equivalent") item.status = reference.strictResidual <= REPLAY_TOLERANCE ? "pass" : "fail";
  if (verdict === "equivalent_up_to_global_phase") item.status = reference.globalPhaseResidual <= REPLAY_TOLERANCE ? "pass" : "fail";
  if (verdict === "not_equivalent") item.status = reference.globalPhaseResidual > NEGATIVE_MARGIN ? "pass"
    : reference.globalPhaseResidual <= REPLAY_TOLERANCE ? "fail" : "warn";
  // Generic phase, probabilistic and no-information classifications retain their
  // uncertainty even when the numerical reference happens to be conclusive.
  return item;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const source = fs.readFileSync(0);
    if (source.length > 1048576) throw new Error("Validator input exceeds its bounded envelope");
    const input = JSON.parse(source);
    const reference = await independentReference(input.request);
    process.stdout.write(JSON.stringify(auditQcecAnalysis({ ...input, reference })) + "\n");
  } catch {
    process.stderr.write("QCEC Validator could not audit the supplied evidence\n");
    process.exitCode = 1;
  }
}

export function auditQcecAnalysis({ request, analysis, reference }) {
  const normalized = normalizeAuditRequest(request);
  const verdict = analysis?.result?.equivalence;
  const digests = { circuitA: normalized.summaries.circuitA.sha256, circuitB: normalized.summaries.circuitB.sha256 };
  const digestMatch = isDeepStrictEqual(analysis?.inputs, normalized.summaries)
    && isDeepStrictEqual(analysis?.result?.inputDigests, digests);
  const backendValid = analysis?.schemaVersion === "1.0" && analysis.artifactType === "qcec-analysis"
    && analysis.packageVersion === "3.10.0" && analysis.result?.timeoutSeconds === 0
    && VERDICTS.has(verdict) && finite(analysis.result.statistics?.checkSeconds);
  return {
    scopeMatch: { status: "in_scope" },
    observations: [
      { id: "request.scope", status: "pass", observed: { qubits: normalized.summaries.circuitA.qubits, maximumQubits: 16 } },
      { id: "inputs.digest", status: digestMatch ? "pass" : "fail", observed: { digestsMatch: digestMatch } },
      { id: "backend.version", status: backendValid ? "pass" : "fail", observed: { packageVersion: analysis?.packageVersion ?? "missing", valid: backendValid } },
      { id: "qcec.conclusive", status: CERTAIN.has(verdict) ? "pass" : "warn", observed: { verdict: verdict ?? "missing", conclusive: CERTAIN.has(verdict) } },
      replayObservation(request, normalized, reference, verdict),
      { id: "provenance.complete", status: "not_checked", observed: { materialized: false } },
    ],
  };
}

export async function validateMaterializedQcec({ request, analysis, resultPackage, profile, signal,
  referenceImplementation = independentReference }) {
  if (!isDeepStrictEqual(profile?.checks?.map(check => check.id), CHECK_IDS)
    || profile.checks.find(check => check.id === "classification.replayed")?.threshold !== REPLAY_TOLERANCE) {
    throw new Error("QCEC Validator and Acceptance Profile differ");
  }
  let reference;
  try { reference = await referenceImplementation(request, signal); } catch (error) {
    if (signal?.aborted) throw error;
    reference = { mode: "unavailable", reason: "reference_process_failed" };
  }
  const computational = auditQcecAnalysis({ request, analysis, reference });
  const value = resultPackage?.value;
  const input = value?.inputs?.[0], artifact = value?.artifacts?.[0];
  const provenanceComplete = resultPackage?.kind === "openquantum-result-package-v1.1"
    && value.capability?.id === "quantum-circuit-verification"
    && value.inputs?.length === 1 && input?.type === "circuit-equivalence-request"
    && value.artifacts?.length === 1 && artifact?.type === "qcec-analysis"
    && typeof value.executionRef?.sessionId === "string" && value.executionRef.sessionId.length > 0
    && Number.isSafeInteger(value.executionRef.eventRange?.from) && Number.isSafeInteger(value.executionRef.eventRange?.to)
    && value.executionRef.eventRange.from < value.executionRef.eventRange.to;
  const inputRefs = input ? [{ kind: "input", id: input.id }] : [];
  const artifactRefs = artifact ? [{ kind: "artifact", id: artifact.id }] : [];
  return {
    scopeMatch: { ...computational.scopeMatch, evidenceRefs: inputRefs,
      statement: "The scientific audit covers at most 16 qubits, 65536 bytes and 512 statements per circuit; computation has no such size cap. Dense independent matrices cover at most 8 qubits, and exact input identity covers the audit scope." },
    observations: computational.observations.map(item => ({
      ...item,
      ...(item.id === "provenance.complete" ? { status: provenanceComplete ? "pass" : "fail", observed: { materialized: provenanceComplete } } : {}),
      evidenceRefs: item.id === "request.scope" ? inputRefs : [...inputRefs, ...artifactRefs],
      ...(item.status !== "pass" && item.id !== "provenance.complete" ? { nextAction: "Inspect the persisted circuit pair and QCEC classification; obtain a conclusive independent reference before claiming passed Acceptance." } : {}),
    })),
    limitations: [
      "Passed Acceptance audits the reported classification; not_equivalent remains a negative circuit verdict.",
      "Global-phase equivalence is preserved and is never presented as strict equality; generic phase and probabilistic results remain conditional.",
      "Independent dense unitaries are limited to 8 qubits; unchanged input identity is checked across the full 16-qubit audit scope. Other larger pairs remain conditional.",
      "This is local numerical and provenance validation, not hardware, noise, measurement or arbitrary-input entanglement validation.",
    ],
    statement: "Persisted QCEC facts were bound to Harness execution and independently checked from the persisted input; the central Builder alone derives Acceptance.",
  };
}
