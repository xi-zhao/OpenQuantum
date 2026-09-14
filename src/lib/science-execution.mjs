// Representation limits, not computational size budgets.
export const countSchema = (minimum = 1, value) => ({ type: "integer", minimum, maximum: Number.MAX_SAFE_INTEGER, ...(value === undefined ? {} : { default: value }) });
export const finiteSchema = (minimum = -Number.MAX_VALUE, value) => ({ type: "number", minimum, maximum: Number.MAX_VALUE, ...(value === undefined ? {} : { default: value }) });
export const listSchema = (items, minItems = 1) => ({ type: "array", items, minItems });
export const executionSchema = {
  type: "object", additionalProperties: false, default: {}, required: [],
  properties: {
    timeoutMs: { ...countSchema(0), description: "Worker deadline; 0 disables it. Omitted inherits the deployment setting." },
    maxOutputBytes: { ...countSchema(0), description: "Combined stdout/stderr budget; 0 disables it. Omitted inherits the deployment setting." },
    threads: { ...countSchema(1), description: "Thread count for supported numerical kernels. Omitted preserves the user's environment and library defaults." },
  },
};
