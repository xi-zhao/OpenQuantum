// Presentation only: the canonical scientific result and its schema stay intact.
export const SCIENCE_SUMMARY_THRESHOLD = 8192;
export const SCIENCE_SUMMARY_MAX_CHARS = 6144;

const pointerChild = (pointer, key) => `${pointer}/${String(key).replaceAll("~", "~0").replaceAll("/", "~1")}`;

function shape(value) {
  if (!Array.isArray(value)) return [];
  if (!value.length) return [0];
  const childShape = shape(value[0]);
  if (!value.every(item => JSON.stringify(shape(item)) === JSON.stringify(childShape))) return [value.length, null];
  return [value.length, ...childShape];
}

function omitted(value, pointer) {
  if (Array.isArray(value)) return { omitted: true, jsonPointer: pointer, type: "array", length: value.length, shape: shape(value) };
  if (typeof value === "string") return { omitted: true, jsonPointer: pointer, type: "string", characters: value.length };
  return { omitted: true, jsonPointer: pointer, type: "object", properties: Object.keys(value).length };
}

function compact(value, pointer, arrayChars, depth = 0, budget = { nodes: 160 }) {
  if (value === null || typeof value !== "object" && typeof value !== "string") return value;
  if (typeof value === "string") return value.length <= 512 ? value : omitted(value, pointer);
  if (depth >= 8 || --budget.nodes < 0) return omitted(value, pointer);
  if (Array.isArray(value)) {
    if (value.length > 16 || JSON.stringify(value).length > arrayChars) return omitted(value, pointer);
    return value.map((item, index) => compact(item, pointerChild(pointer, index), arrayChars, depth + 1, budget));
  }
  if (Object.keys(value).length > 48) return omitted(value, pointer);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, compact(item, pointerChild(pointer, key), arrayChars, depth + 1, budget)]));
}

/** Keep small numerical results, units and interpretation fields; describe bulky data explicitly. */
export function scienceResultSummary(value, serialized = JSON.stringify(value)) {
  if (serialized.length <= SCIENCE_SUMMARY_THRESHOLD) return undefined;
  for (const arrayChars of [1024, 256, 0]) {
    const summary = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, compact(item, pointerChild("", key), arrayChars)]));
    if (JSON.stringify(summary).length <= SCIENCE_SUMMARY_MAX_CHARS) return summary;
  }
  // Unusual large object maps still have a lossless file. Do not truncate JSON
  // or imply that a generic text prefix contains all the scientific facts.
  return {
    schemaVersion: value.schemaVersion,
    source: compact(value.source, "/source", 0),
    inputSha256: value.inputSha256,
    dependencyLockSha256: value.dependencyLockSha256,
    scientificValidation: value.scientificValidation,
    input: omitted(value.input, "/input"),
    result: omitted(value.result, "/result"),
    limitations: omitted(value.limitations, "/limitations"),
  };
}
