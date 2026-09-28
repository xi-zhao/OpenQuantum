import { defineScienceTool, objectSchema as obj, arraySchema as arr, integerSchema as int } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";
const bases = { aliceBasis: { type: "string", enum: ["X", "Z"], default: "Z" }, bobBasis: { type: "string", enum: ["X", "Z"], default: "Z" } };
const source = { name: "netqasm + optional squidasm", version: "2.0.0 + 0.13.6", repository: "https://github.com/QuTech-Delft/squidasm" };
export const definition = defineScienceTool({
  name: "prepare_netqasm_bell_program",
  description: "Compile two-node EPR create/receive and X/Z measurement programs using the real NetQASM SDK debug backend. Return compiled text and binary subroutines for Alice and Bob; no connection or simulation takes place. Requires explicit prepared public dependencies; commercial use must consider upstream patent notice.",
  source, inputSchema: obj(bases),
  resultSchema: obj({
    programs: arr(obj({ node: { type: "string", enum: ["Alice", "Bob"] }, basis: { type: "string", enum: ["X", "Z"] }, subroutineText: { type: "string" }, subroutineBase64: { type: "string" }, instructions: count(1) }), 2, 2),
    backend: { const: "NetQASM DebugConnection compiler" }, simulated: { const: false }, networkUsed: { const: false },
  }),
});
export const simulationDefinition = defineScienceTool({
  name: "simulate_squidasm_bell_pairs",
  description: "Run two-node EPR generation and X/Z measurements in user-prepared SquidASM 0.13.6 / NetSquid. Return finite-shot joint counts and observed agreement; link noise is the depolarization probability, delay is nanoseconds. The licensed NetSquid stack must be installed by the user before calling; no dependency download, authentication, QPU or network connection occurs inside the action.",
  source,
  inputSchema: obj({ ...bases, shots: { ...count(1), default: 100 }, seed: int(0, 4294967295, 42), linkNoise: { ...finite(0), maximum: 1, default: 0 }, linkDelayNs: { ...finite(Number.MIN_VALUE), default: 10 } }),
  resultSchema: obj({
    shots: count(1), counts: arr(obj({ bits: { type: "string", enum: ["00", "01", "10", "11"] }, count: count(0) }), 4, 4),
    agreementFraction: { ...finite(0), maximum: 1 }, bitOrder: { const: "Alice,Bob from left to right" },
    simulationVersions: arr(obj({ package: { type: "string" }, version: { type: "string" } }), 3),
    simulationDependenciesLocked: { const: false }, networkUsed: { const: false },
  }),
});
export const definitions = [definition, simulationDefinition];
