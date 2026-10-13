import { writeFile } from "node:fs/promises";
import { build } from "esbuild";

export async function capabilityClientSource(projectRoot) {
  const result = await build({
    absWorkingDir: projectRoot, entryPoints: ["runtime/openquantum/web-capabilities/client.js"],
    bundle: true, write: false, format: "iife", platform: "browser", target: "es2022",
  });
  return result.outputFiles[0].text;
}

export async function buildCapabilityClient(projectRoot, target) {
  await writeFile(target, await capabilityClientSource(projectRoot));
}
