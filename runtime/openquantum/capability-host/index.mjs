import path from "node:path";
import { pathToFileURL } from "node:url";
import { projectRoot, nodeExecutable } from "../project-root.mjs";

export const name = "openquantum-capability-host";
export const inject = ["credentials", "webServer", "connection"];
export async function apply(ctx, config = {}) {
  const implementation = await import(pathToFileURL(path.join(projectRoot, "src/settings/desktop/host.mjs")));
  return implementation.apply(ctx, { ...config, root: projectRoot, nodeExecutable });
}
