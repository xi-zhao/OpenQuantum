import { createHash } from "node:crypto";

export const MAX_QASM_BYTES = 64 * 1024;
export const MAX_AUDIT_QUBITS = 16;
export const MAX_AUDIT_STATEMENTS = 512;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function strippedQasm(value) {
  // Consume strings and comments in lexical order: a block marker inside a
  // line comment must not hide executable statements on following lines.
  return value.replace(/"[^"\r\n]*"|\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g,
    token => token.startsWith('"') ? token : " ");
}

function summarizeQasm(value, field) {
  if (typeof value !== "string") throw new TypeError(`${field} must be a string`);
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes < 1 || value.includes("\0")) {
    throw new TypeError(`${field} must be a nonempty OpenQASM string without NUL bytes`);
  }
  const source = strippedQasm(value);
  if (!/^\s*OPENQASM\s+2\.0\s*;/i.test(source)) {
    throw new TypeError(`${field} must declare OPENQASM 2.0`);
  }
  if (/\b(measure|reset|if|opaque|creg)\b/i.test(source)) {
    throw new TypeError(`${field} must be unitary and contain no measurement or classical control`);
  }
  const includeStatements = [...source.matchAll(/\binclude\s+"([^"]+)"\s*;/gi)];
  const includeTokens = source.match(/\binclude\b/gi) ?? [];
  if (
    includeStatements.length !== includeTokens.length ||
    includeStatements.some((match) => match[1] !== "qelib1.inc")
  ) {
    throw new TypeError(`${field} may include only qelib1.inc`);
  }
  const qregs = [...source.matchAll(/\bqreg\s+([a-z][A-Za-z0-9_]*)\s*\[\s*(\d+)\s*\]\s*;/g)];
  if (qregs.length < 1) throw new TypeError(`${field} must declare at least one qreg`);
  if (qregs.length !== (source.match(/\bqreg\b/g) ?? []).length
    || new Set(qregs.map(match => match[1])).size !== qregs.length
    || qregs.some(match => !Number.isSafeInteger(Number(match[2])) || Number(match[2]) < 1)) {
    throw new TypeError(`${field} contains an invalid qreg declaration`);
  }
  const qubits = qregs.reduce((total, match) => total + Number(match[2]), 0);
  if (!Number.isSafeInteger(qubits) || qubits < 1) {
    throw new TypeError(`${field} must declare a positive, exactly representable qubit count`);
  }
  const statements = (source.match(/;/g) ?? []).length;
  return {
    bytes,
    sha256: createHash("sha256").update(value).digest("hex"),
    qubits,
    statements,
  };
}

// Execution scale remains caller-controlled; these limits cover only the
// independently validated scientific Acceptance Profile.
export function normalizeAuditRequest(value) {
  const normalized = normalizeVerificationRequest(value);
  for (const summary of Object.values(normalized.summaries)) {
    if (summary.qubits > MAX_AUDIT_QUBITS || summary.bytes > MAX_QASM_BYTES
      || summary.statements > MAX_AUDIT_STATEMENTS) {
      throw new TypeError("QCEC scientific audit scope is at most 16 qubits, 65536 bytes and 512 statements per circuit; computation is not restricted by this profile");
    }
  }
  return normalized;
}

export function normalizeVerificationRequest(value) {
  if (
    !isRecord(value) ||
    Object.keys(value).some(
      (key) => !["circuitAOpenQasm2", "circuitBOpenQasm2"].includes(key),
    )
  ) {
    throw new TypeError("circuit equivalence request is invalid");
  }
  const circuitA = summarizeQasm(value.circuitAOpenQasm2, "circuitAOpenQasm2");
  const circuitB = summarizeQasm(value.circuitBOpenQasm2, "circuitBOpenQasm2");
  if (circuitA.qubits !== circuitB.qubits) {
    throw new TypeError("both circuits must declare the same total qubit count in this profile");
  }
  return {
    circuitAOpenQasm2: value.circuitAOpenQasm2,
    circuitBOpenQasm2: value.circuitBOpenQasm2,
    summaries: { circuitA, circuitB },
  };
}
