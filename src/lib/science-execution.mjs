import { constants } from "node:buffer";
import { objectSchema, integerSchema, numberSchema, arraySchema } from "./bounded-science-mcp.mjs";

// Representation limits, not a choice of how much compute a deployment may use.
export const countSchema = (minimum = 1, value) => integerSchema(minimum, Number.MAX_SAFE_INTEGER, value);
export const finiteSchema = (minimum = -Number.MAX_VALUE, value) => numberSchema(minimum, Number.MAX_VALUE, value);
export const listSchema = (items, minimum = 1) => arraySchema(items, minimum, Number.MAX_SAFE_INTEGER);
export const executionSchema = {
  ...objectSchema({
    timeoutMs: { ...integerSchema(0, 2147483647, 180000), description: "Worker timeout; 0 disables this timer. The Harness connection may have its own request timeout." },
    maxOutputBytes: { ...integerSchema(1, constants.MAX_LENGTH, 2 * 1024 * 1024), description: "Maximum combined worker stdout/stderr bytes accepted for this call." },
    threads: { ...integerSchema(1, 2147483647, 1), description: "CPU thread budget for supported numerical kernels; not distributed or trajectory parallelism." },
  }),
  default: {},
};
