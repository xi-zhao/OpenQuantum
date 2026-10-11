const SUPPORTED_SCHEMA_KEYS = new Set([
  "type",
  "oneOf",
  "properties",
  "required",
  "additionalProperties",
  "items",
  "enum",
  "const",
  "description",
  "title",
  "default",
  "examples",
]);

/**
 * DSH intentionally accepts a portable JSON Schema subset. Domain modules may
 * keep tighter numeric and array bounds because their validators enforce them;
 * this projection removes only keywords the Registry cannot represent.
 */
export function harnessSchema(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Tool schema nodes must be objects");
  }
  if (Array.isArray(value.type)) {
    const shared = Object.fromEntries(
      Object.entries(value).filter(
        ([key]) => key !== "type" && SUPPORTED_SCHEMA_KEYS.has(key),
      ),
    );
    return {
      oneOf: value.type.map((type) => harnessSchema({ ...shared, type })),
    };
  }
  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!SUPPORTED_SCHEMA_KEYS.has(key)) continue;
    if (key === "properties") {
      result.properties = Object.fromEntries(
        Object.entries(entry).map(([property, schema]) => [
          property,
          harnessSchema(schema),
        ]),
      );
    } else if (key === "items") {
      result.items = harnessSchema(entry);
    } else if (key === "oneOf") {
      result.oneOf = entry.map((schema) => harnessSchema(schema));
    } else {
      result[key] = structuredClone(entry);
    }
  }
  return result;
}
