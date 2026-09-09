import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { build } from "esbuild";

const run = promisify(execFile);

/** Bundle only the application UI; React and all runtime services stay Harness-owned. */
export async function buildLearningClient(projectRoot, target) {
  const require = createRequire(path.join(projectRoot, "package.json"));
  const temporary = await mkdtemp(path.join(tmpdir(), "openquantum-learning-build-"));
  try {
    const cssInput = path.join(temporary, "renderer.css");
    const cssOutput = path.join(temporary, "renderer-built.css");
    const cssPath = (p) => p.replaceAll("\\", "/");
    await writeFile(cssInput, `@import "${cssPath(require.resolve("tailwindcss/theme.css"))}";\n@import "${cssPath(require.resolve("tailwindcss/utilities.css"))}" source(none);\n@source "${cssPath(path.join(projectRoot, "node_modules/@openmaic/renderer/dist"))}";\n`);
    await run(process.execPath, [path.join(projectRoot, "node_modules/@tailwindcss/cli/dist/index.mjs"), "-i", cssInput, "-o", cssOutput, "--minify"], { cwd: projectRoot });
    // KaTeX fonts are bundled locally, with no remote CDN/font requests.
    const katexPath = require.resolve("katex/dist/katex.min.css");
    let katexCss = await readFile(katexPath, "utf8");
    const fonts = [...new Set([...katexCss.matchAll(/url\((fonts\/[^)]+)\)/g)].map((m) => m[1]))];
    for (const font of fonts) {
      const bytes = await readFile(path.join(path.dirname(katexPath), font));
      const mime = font.endsWith("woff2") ? "font/woff2" : font.endsWith("woff") ? "font/woff" : "font/ttf";
      katexCss = katexCss.replaceAll(`url(${font})`, `url(data:${mime};base64,${bytes.toString("base64")})`);
    }
    const rendererCss = (await readFile(cssOutput, "utf8")).replaceAll(":root,:host", ":scope") + "\n" + katexCss;
    const result = await build({
      absWorkingDir: projectRoot, entryPoints: ["runtime/openquantum/web-learning/client.jsx"],
      bundle: true, write: false, format: "cjs", platform: "browser", target: "es2022",
      minify: true, jsx: "transform", jsxFactory: "React.createElement", jsxFragment: "React.Fragment",
      external: ["react", "react-dom"], define: { "process.env.NODE_ENV": '"production"' },
      loader: { ".css": "text" }, legalComments: "inline",
      plugins: [{ name: "harness-shared-react-and-renderer-styles", setup(builder) {
        builder.onResolve({ filter: /^(react\/jsx-runtime|shiki|openquantum:renderer-css)$/ }, (args) => ({ path: args.path, namespace: "openquantum" }));
        builder.onLoad({ filter: /.*/, namespace: "openquantum" }, (args) => {
          if (args.path === "openquantum:renderer-css") return { contents: rendererCss, loader: "text" };
          // Optional Shiki highlighting falls back to escaped plain code in the
          // upstream renderer. Do not ship its entire language/wasm runtime.
          if (args.path === "shiki") return { contents: 'export function createHighlighter(){return Promise.reject(new Error("Syntax highlighting is unavailable"))}', loader: "js" };
          return { contents: 'import React from "react"; export const Fragment=React.Fragment; export function jsx(type, props, key){return React.createElement(type, key===undefined ? props : {...props,key});} export const jsxs=jsx;', loader: "js" };
        });
      } }],
    });
    await writeFile(target, `// Generated from web-learning/client.jsx; React is supplied by Harness.\nglobalThis.__ModuleLoader__.load({id:"@openquantum/harness-web-learning",factory:(require)=>{const module={exports:{}};const exports=module.exports;\n${result.outputFiles[0].text}\nreturn module.exports;}});\n`);
  } finally { await rm(temporary, { recursive: true, force: true }); }
}
