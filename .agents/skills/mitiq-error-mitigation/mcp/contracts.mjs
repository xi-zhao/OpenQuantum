import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";

const method = { type: "string", enum: ["zne", "rem", "pec", "cdr"], default: "zne" };
const gate = obj({
  name: { type: "string", enum: ["H", "X", "Y", "Z", "S", "RZ", "CX", "CZ"] },
  targets: arr(int(0,undefined), 1, 2),
  angle: num(undefined,undefined),
}, ["name", "targets"]);
const estimate = num(undefined,undefined);
const statistics = obj({ mean: estimate, bias: estimate, variance: num(0,undefined), rmse: num(0,undefined), meanStandardError: num(0,undefined) });
const trace = obj({
  stage: { type: "string", enum: ["baseline", "evaluation", "calibration", "training"] },
  shots: int(1,undefined), estimate, gateCount: int(0,undefined), depth: int(0,undefined),
  circuitSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
  coefficient: estimate,
}, ["stage", "shots", "estimate", "gateCount", "depth", "circuitSha256"]);

export const definition = defineScienceTool({
  name: "run_mitiq_experiment",
  description: "Compare Mitiq ZNE, REM, PEC or CDR with an equal-shot unmitigated baseline on local noisy circuits. Circuit size, repetitions and sampling budget follow user inputs. Return empirical error statistics and calibration/training costs.",
  source: { name: "mitiq", version: "1.1.0", repository: "https://github.com/unitaryfoundation/mitiq", license: "GPL-3.0-only" },
  inputSchema: obj({
    method, numQubits: int(1,undefined, 2),
    gates: { ...arr(gate, 1), default: [
      { name: "H", targets: [0] }, { name: "RZ", targets: [0], angle: 0.7 },
      { name: "H", targets: [0] }, { name: "CX", targets: [0, 1] },
    ] },
    observable: { type: "string", pattern: "^[IXYZ]+$", default: "ZI" },
    depolarizingProbability: num(0, 1, 0.02),
    readoutProbability: num(0, 1, 0),
    shotsBudget: { ...int(1024,undefined, 8192), description: "Shots per comparison arm per replicate, including calibration/training. Entire call uses exactly 2 * replicates * shotsBudget simulated shots." },
    replicates: { ...int(4,undefined, 8), description: "Independent repetitions of the complete procedure, including new training/calibration data." }, seed: int(0, 2147483647, 7),
    pecSamples: int(16,undefined), trainingCircuits: int(4,undefined),
  }, ["method", "numQubits", "gates", "observable", "depolarizingProbability", "readoutProbability", "shotsBudget", "replicates", "seed"]),
  checkInput(v) {
    if (v.observable.length !== v.numQubits || /^I+$/.test(v.observable)) throw new Error("observable must contain one Pauli per qubit and be nontrivial; leftmost character is q0");
    for (const g of v.gates) {
      const arity = ["CX", "CZ"].includes(g.name) ? 2 : 1;
      if (g.targets.length !== arity || new Set(g.targets).size !== arity || g.targets.some(q => q >= v.numQubits)) throw new Error("Gate targets must be distinct, in range, and match gate arity");
      if ((g.name === "RZ") !== Object.hasOwn(g, "angle")) throw new Error("Only RZ requires an angle in radians");
    }
    if (v.method !== "rem" && v.readoutProbability !== 0) throw new Error("Readout noise is supported only by REM in this first bounded implementation");
    if (v.method !== "pec" && Object.hasOwn(v, "pecSamples")) throw new Error("pecSamples applies only to PEC");
    if (v.method !== "cdr" && Object.hasOwn(v, "trainingCircuits")) throw new Error("trainingCircuits applies only to CDR");
    if (v.method === "pec") v.pecSamples ??= 64;
    if (v.method === "cdr") {
      v.trainingCircuits ??= 12;
      if (!/^[IZ]+$/.test(v.observable)) throw new Error("CDR currently supports only Z-diagonal Pauli observables");
      if (!v.gates.some(g => g.name === "RZ" && Math.abs(g.angle / (Math.PI / 2) - Math.round(g.angle / (Math.PI / 2))) > 1e-8)) throw new Error("CDR requires a non-Clifford RZ; the upstream ideal-simulator shortcut is not an error-mitigation experiment");
    }
  },
  resultSchema: obj({
    method: { type: "string", enum: ["zne", "rem", "pec", "cdr"] },
    backend: { const: "cirq-density-matrix-local" },
    idealExpectation: num(-1.00000001, 1.00000001), exactNoisyExpectation: num(-1.00000001, 1.00000001),
    noiseConvention: { type: "string", minLength: 1 },
    statistics: obj({ unmitigated: statistics, mitigated: statistics, rmseDifference: estimate }),
    totalShotsIncludingBaseline: int(8192,undefined),
    trials: arr(obj({
      seed: int(0, 4294967295), unmitigated: estimate, mitigated: estimate,
      baselineShots: int(1024,undefined), mitigationShots: int(1024,undefined),
      calibrationShots: int(0,undefined), trainingShots: int(0,undefined), evaluationShots: int(1,undefined),
      classicalReferenceEvaluations: int(0,undefined),
      circuits: arr(trace, 2),
      details: obj({
        scaleFactors: arr(num(1,undefined), 3, 3), pecOneNorm: num(1,undefined),
        sampledSigns: arr({ type: "integer", enum: [-1, 1] }, 16),
        confusionMatrices: arr(arr(arr(num(0, 1), 2, 2), 2, 2), 1),
        targetCounts: arr(int(0,undefined), 2),
        trainingIdeal: arr(num(-1.00000001, 1.00000001), 4),
        trainingNoisy: arr(num(-1, 1), 4),
        regressionConditionNumber: num(1,undefined),
      }, []),
    }), 4),
  }),
});
