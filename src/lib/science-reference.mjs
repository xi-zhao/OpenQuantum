import { objectSchema } from "./bounded-science-mcp.mjs";

// Reference work has its own cost envelope; it does not bound the main solver.
export const referenceModeSchema = {
  type: "string",
  enum: ["auto", "required", "skip"],
  default: "auto",
  description: "auto computes an independent reference within its cost limit; required rejects an unavailable reference; skip explicitly omits it.",
};

export const referenceResultSchema = objectSchema({
  mode: { type: "string", enum: ["auto", "required", "skip"] },
  status: { type: "string", enum: ["computed", "not_run"] },
  method: { type: "string", minLength: 1, maxLength: 160 },
  reason: { type: "string", minLength: 1, maxLength: 400 },
});

export const nullable = (schema) => ({ anyOf: [schema, { type: "null" }] });

export function referenceAwareResultSchema(properties, referenceFields) {
  return {
    ...objectSchema({ ...properties, reference: referenceResultSchema }),
    allOf: [
      {
        if: { properties: { reference: { properties: { status: { const: "computed" } } } } },
        then: { properties: Object.fromEntries(referenceFields.map(key => [key, { not: { type: "null" } }])) },
        else: { properties: Object.fromEntries(referenceFields.map(key => [key, { type: "null" }])) },
      },
      ...[["required", "computed"], ["skip", "not_run"]].map(([mode, status]) => ({
        if: { properties: { reference: { properties: { mode: { const: mode } } } } },
        then: { properties: { reference: { properties: { status: { const: status } } } } },
      })),
    ],
  };
}

export function checkReferenceRequest(mode, size, maximum, label) {
  if (mode === "required" && size > maximum) {
    throw new Error(`${label} reference requires size <= ${maximum}; use referenceMode=auto or skip for the larger main calculation`);
  }
}
