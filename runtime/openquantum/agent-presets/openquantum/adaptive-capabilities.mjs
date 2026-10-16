import path from "node:path";
import { pathToFileURL } from "node:url";
import { projectRoot } from "../../project-root.mjs";

export const name = "openquantum-adaptive-capabilities";
export const inject = ["tools", "skills", "openquantumCapabilities"];
export async function apply(ctx) {
  const implementation = await import(pathToFileURL(path.join(projectRoot, "src/settings/desktop/provider.mjs")));
  return implementation.apply(ctx);
}
