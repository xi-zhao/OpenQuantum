import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const outputRoot = path.join(projectRoot, "dist/homepage");

export async function buildHomepage() {
  const files = new Map([
    ["site/index.html", "index.html"],
    ["site/style.css", "style.css"],
    ["site/main.mjs", "main.mjs"],
    ["packages/openquantum-web-branding/assets/mark.svg", "assets/mark.svg"],
    ["site/assets/quantum-field-v3.png", "assets/quantum-field-v3.png"],
    ["public/openquantum/fonts/inter-latin.woff2", "assets/inter-latin.woff2"],
    ["docs/images/openquantum-desktop-20261013.jpg", "assets/desktop.jpg"],
    ["docs/images/openquantum-settings-categories-20261013.jpg", "assets/settings.jpg"],
    ["site/assets/wigner-comparison.svg", "assets/wigner-comparison.svg"],
    ["site/assets/qutip-timings.svg", "assets/qutip-timings.svg"],
    ["site/assets/pennylane-timings.svg", "assets/pennylane-timings.svg"],
    ["site/assets/benchmark-charts.json", "assets/benchmark-charts.json"],
  ]);
  await mkdir(path.join(outputRoot, "assets"), { recursive: true });
  // Retire the previous presentation files when rebuilding an existing export.
  await Promise.all(["wigner-comparison.png", "qutip-timings.png", "pennylane-timings.png"]
    .map((name) => rm(path.join(outputRoot, "assets", name), { force: true })));
  await Promise.all([...files].map(([source, destination]) =>
    copyFile(path.join(projectRoot, source), path.join(outputRoot, destination))));
  await writeFile(path.join(outputRoot, "provenance.json"), `${JSON.stringify({
    subject: "OpenQuantum product homepage",
    benchmarkSourceCommit: "9fa53e6523dee2c81380483b1aedb19819f218ac",
    conceptualHero: {
      asset: "assets/quantum-field-v3.png",
      kind: "generated pale quantum wave-field concept illustration",
      tool: "built-in image_gen",
      promptSource: "site/assets/quantum-field-v3.prompt.txt",
    },
    assets: [...files].filter(([, destination]) => destination.startsWith("assets/"))
      .map(([source, destination]) => ({ source, destination })),
  }, null, 2)}\n`);
  return outputRoot;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Homepage built: ${await buildHomepage()}`);
}
