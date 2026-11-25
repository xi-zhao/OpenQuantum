import path from "node:path";
import { pathToFileURL } from "node:url";
import { Service } from "@deepseek-ai/cordis";
import { projectRoot } from "../project-root.mjs";

export const name = "openquantum-execution-boundary";
export const inject = ["tools", "sandboxPolicy"];

export async function apply(ctx) {
  const { protectExecutionRoots } = await import(pathToFileURL(path.join(projectRoot,
    "runtime/openquantum/agent-presets/openquantum/execution-boundary.mjs")));
  protectExecutionRoots(ctx);
  // All presets wait for this deployment-wide guard, including custom presets.
  class ExecutionBoundary extends Service {
    constructor() { super(ctx, "openquantumExecutionBoundary"); }
  }
  new ExecutionBoundary();
}
