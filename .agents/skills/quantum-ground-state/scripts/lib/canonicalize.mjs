import crypto from "node:crypto";

import { failInput } from "./domain-error.mjs";

const ID_PATTERN = /^[A-Za-z0-9]+(?:[._:-][A-Za-z0-9]+)*$/;
const VERSION_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const PAULI_PATTERN = /^[IXZ]{2}$/;

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertObject(value, label) {
  if (!isPlainObject(value)) {
    failInput("INVALID_REQUEST", `${label} must be an object`, { path: label });
  }
}

function assertOnlyKeys(value, allowedKeys, label) {
  assertObject(value, label);
  const allowed = new Set(allowedKeys);
  const extras = Object.keys(value).filter((key) => !allowed.has(key));
  if (extras.length > 0) {
    failInput("INVALID_REQUEST", `${label} contains unsupported fields: ${extras.join(", ")}`, {
      path: label,
      fields: extras,
    });
  }
}

function assertExact(value, expected, label) {
  if (value !== expected) {
    failInput("INVALID_REQUEST", `${label} must equal ${JSON.stringify(expected)}`, {
      path: label,
      received: value,
    });
  }
}

function assertString(value, label, options = {}) {
  const { maxLength = 240, pattern } = options;
  if (typeof value !== "string" || value.length === 0 || value.length > maxLength) {
    failInput("INVALID_REQUEST", `${label} must be a non-empty string of at most ${maxLength} characters`, {
      path: label,
    });
  }
  if (pattern && !pattern.test(value)) {
    failInput("INVALID_REQUEST", `${label} has an invalid format`, { path: label, received: value });
  }
}

function assertFiniteNumber(value, label, options = {}) {
  const { minimum = -1_000_000, maximum = 1_000_000 } = options;
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    failInput(
      "INVALID_REQUEST",
      `${label} must be finite and between ${minimum} and ${maximum}`,
      { path: label, received: value },
    );
  }
}

function assertInteger(value, label, options = {}) {
  const { minimum, maximum } = options;
  if (
    !Number.isSafeInteger(value) ||
    (minimum !== undefined && value < minimum) ||
    (maximum !== undefined && value > maximum)
  ) {
    failInput("INVALID_REQUEST", `${label} must be an integer in the declared range`, {
      path: label,
      received: value,
    });
  }
}

function normalizeCoefficient(value) {
  return Object.is(value, -0) ? 0 : value;
}

export function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

export function digestCanonicalJson(value) {
  return crypto.createHash("sha256").update(stableStringify(value), "utf8").digest("hex");
}

export function canonicalizeRequest(request) {
  assertOnlyKeys(
    request,
    [
      "schemaVersion",
      "requestId",
      "claim",
      "system",
      "hamiltonian",
      "method",
      "acceptanceProfile",
    ],
    "request",
  );
  assertExact(request.schemaVersion, "1.0", "request.schemaVersion");
  assertString(request.requestId, "request.requestId", { maxLength: 160, pattern: ID_PATTERN });
  assertExact(
    request.claim,
    "sector-ground-energy-of-supplied-hamiltonian",
    "request.claim",
  );

  assertOnlyKeys(request.system, ["kind", "label", "source"], "request.system");
  assertExact(request.system.kind, "qubit-model", "request.system.kind");
  assertString(request.system.label, "request.system.label", { maxLength: 240 });
  assertOnlyKeys(request.system.source, ["kind"], "request.system.source");
  assertExact(
    request.system.source.kind,
    "supplied-pauli-sum",
    "request.system.source.kind",
  );

  assertOnlyKeys(
    request.hamiltonian,
    [
      "format",
      "qubitCount",
      "qubitOrder",
      "basisOrder",
      "coefficientUnit",
      "sector",
      "terms",
    ],
    "request.hamiltonian",
  );
  assertExact(
    request.hamiltonian.format,
    "openquantum-pauli-sum-v1",
    "request.hamiltonian.format",
  );
  assertExact(request.hamiltonian.qubitCount, 2, "request.hamiltonian.qubitCount");
  assertExact(
    request.hamiltonian.qubitOrder,
    "left-to-right-msb",
    "request.hamiltonian.qubitOrder",
  );
  assertExact(
    request.hamiltonian.basisOrder,
    "00-01-10-11",
    "request.hamiltonian.basisOrder",
  );
  assertExact(
    request.hamiltonian.coefficientUnit,
    "hartree",
    "request.hamiltonian.coefficientUnit",
  );

  assertOnlyKeys(request.hamiltonian.sector, ["kind", "value"], "request.hamiltonian.sector");
  assertExact(
    request.hamiltonian.sector.kind,
    "fixed-hamming-weight",
    "request.hamiltonian.sector.kind",
  );
  assertExact(request.hamiltonian.sector.value, 1, "request.hamiltonian.sector.value");

  if (
    !Array.isArray(request.hamiltonian.terms) ||
    request.hamiltonian.terms.length < 1 ||
    request.hamiltonian.terms.length > 32
  ) {
    failInput("INVALID_REQUEST", "request.hamiltonian.terms must contain between 1 and 32 terms", {
      path: "request.hamiltonian.terms",
    });
  }
  const seenTerms = new Set();
  const terms = request.hamiltonian.terms.map((term, index) => {
    const label = `request.hamiltonian.terms[${index}]`;
    assertOnlyKeys(term, ["pauli", "coefficient"], label);
    assertString(term.pauli, `${label}.pauli`, { maxLength: 2 });
    if (!PAULI_PATTERN.test(term.pauli)) {
      failInput(
        "UNSUPPORTED_PAULI",
        `${label}.pauli must contain exactly two characters from I, X, and Z; Y is out of scope`,
        { path: `${label}.pauli`, received: term.pauli },
      );
    }
    if (seenTerms.has(term.pauli)) {
      failInput("DUPLICATE_PAULI_TERM", `duplicate Pauli term ${term.pauli}`, {
        path: label,
        pauli: term.pauli,
      });
    }
    seenTerms.add(term.pauli);
    assertFiniteNumber(term.coefficient, `${label}.coefficient`);
    return { pauli: term.pauli, coefficient: normalizeCoefficient(term.coefficient) };
  });
  if (terms.every((term) => term.coefficient === 0)) {
    failInput("ZERO_HAMILTONIAN", "Hamiltonian must contain at least one non-zero coefficient");
  }
  terms.sort((left, right) => {
    if (left.pauli < right.pauli) return -1;
    if (left.pauli > right.pauli) return 1;
    return 0;
  });

  assertOnlyKeys(
    request.method,
    ["algorithm", "simulator", "ansatz", "optimizer", "randomness"],
    "request.method",
  );
  assertExact(request.method.algorithm, "vqe", "request.method.algorithm");
  assertExact(request.method.simulator, "statevector", "request.method.simulator");
  assertExact(request.method.randomness, "none", "request.method.randomness");
  assertOnlyKeys(request.method.ansatz, ["id", "version"], "request.method.ansatz");
  assertExact(
    request.method.ansatz.id,
    "two-qubit-single-excitation-givens",
    "request.method.ansatz.id",
  );
  assertExact(request.method.ansatz.version, "1.0.0", "request.method.ansatz.version");
  assertOnlyKeys(
    request.method.optimizer,
    ["id", "version", "coarsePoints", "angleToleranceRadians", "maxEvaluations"],
    "request.method.optimizer",
  );
  assertExact(
    request.method.optimizer.id,
    "coarse-grid-golden-refine",
    "request.method.optimizer.id",
  );
  assertExact(request.method.optimizer.version, "1.0.0", "request.method.optimizer.version");
  assertExact(request.method.optimizer.coarsePoints, 65, "request.method.optimizer.coarsePoints");
  assertFiniteNumber(
    request.method.optimizer.angleToleranceRadians,
    "request.method.optimizer.angleToleranceRadians",
    { minimum: 1e-14, maximum: 1e-2 },
  );
  assertInteger(request.method.optimizer.maxEvaluations, "request.method.optimizer.maxEvaluations", {
    minimum: 8,
    maximum: 256,
  });

  assertOnlyKeys(
    request.acceptanceProfile,
    ["id", "version"],
    "request.acceptanceProfile",
  );
  assertExact(
    request.acceptanceProfile.id,
    "supplied-pauli-statevector",
    "request.acceptanceProfile.id",
  );
  assertString(request.acceptanceProfile.version, "request.acceptanceProfile.version", {
    maxLength: 80,
    pattern: VERSION_PATTERN,
  });
  assertExact(
    request.acceptanceProfile.version,
    "1.0.0",
    "request.acceptanceProfile.version",
  );

  const hamiltonian = {
    format: request.hamiltonian.format,
    qubitCount: 2,
    qubitOrder: request.hamiltonian.qubitOrder,
    basisOrder: request.hamiltonian.basisOrder,
    coefficientUnit: request.hamiltonian.coefficientUnit,
    sector: { kind: request.hamiltonian.sector.kind, value: 1 },
    terms,
  };
  const normalized = {
    schemaVersion: "1.0",
    requestId: request.requestId,
    claim: request.claim,
    system: {
      kind: request.system.kind,
      label: request.system.label,
      source: { kind: request.system.source.kind },
    },
    hamiltonian,
    method: {
      algorithm: request.method.algorithm,
      simulator: request.method.simulator,
      ansatz: { ...request.method.ansatz },
      optimizer: { ...request.method.optimizer },
      randomness: request.method.randomness,
    },
    acceptanceProfile: { ...request.acceptanceProfile },
  };
  return {
    normalized,
    requestDigest: digestCanonicalJson(normalized),
    hamiltonianDigest: digestCanonicalJson(hamiltonian),
  };
}
