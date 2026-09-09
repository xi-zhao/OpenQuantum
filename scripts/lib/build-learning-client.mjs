import { writeFile } from "node:fs/promises";
import { build } from "esbuild";

/** The Harness bundle contains only the launcher and session bridge. */
export async function buildLearningClient(projectRoot, target) {
  const result = await build({
    absWorkingDir: projectRoot, entryPoints: ["runtime/openquantum/web-learning/client.jsx"],
    bundle: true, write: false, format: "cjs", platform: "browser", target: "es2022",
    minify: true, jsx: "transform", external: ["react", "react-dom"],
    define: { "process.env.NODE_ENV": '"production"' }, loader: { ".css": "text" },
  });
  await writeFile(target, `// Launcher only; OpenMAIC's original Next.js app owns the classroom UI.\nglobalThis.__ModuleLoader__.load({id:"@openquantum/harness-web-learning",factory:(require)=>{const module={exports:{}};const exports=module.exports;\n${result.outputFiles[0].text}\nreturn module.exports;}});\n`);
}
