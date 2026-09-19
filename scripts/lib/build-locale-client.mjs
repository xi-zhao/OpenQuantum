import { writeFile } from "node:fs/promises";
import { build } from "esbuild";

export async function buildLocaleClient(projectRoot, target) {
  const result = await build({
    absWorkingDir: projectRoot, entryPoints: ["runtime/openquantum/web-locales/client.js"],
    bundle: true, write: false, format: "cjs", platform: "browser", target: "es2022", minify: true,
  });
  await writeFile(target, `globalThis.__ModuleLoader__.load({id:"@openquantum/harness-web-locales",factory:(require)=>{const module={exports:{}};const exports=module.exports;\n${result.outputFiles[0].text}\nreturn module.exports;}});\n`);
}
