import { projectRoot as openQuantumProjectRoot } from "../../project-root.mjs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { harnessSchema } from "./tool-schema.mjs";

// Presets are copied to DSH_HOME; definitions remain in the distribution source.
const { toolDefinitions: shared } = await import(pathToFileURL(path.join(
  openQuantumProjectRoot, "src/capabilities/metriq-data-tools.mjs",
)).href);
export const name = "openquantum-metriq-data-tools";
export const inject = ["tools"];
export const toolDefinitions = Object.freeze(shared.map(tool => ({
  ...tool, parameters: harnessSchema(tool.parameters),
  output: { ...tool.output, schema: harnessSchema(tool.output.schema) },
})));
export function apply(ctx) { for (const tool of toolDefinitions) ctx.tools.register(tool); }
