import { objectSchema } from "./bounded-science-mcp.mjs";

// Reference work has its own cost envelope; it does not bound the main solver.
export const referenceModeSchema = {
  type: "string",
  enum: ["auto", "required", "skip"],
  default: "auto",
  description: "auto computes the reference for default small-system cases; required attempts it at the requested size using the user's resources; skip omits it. A failed reference is an error, never a successful skip.",
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
