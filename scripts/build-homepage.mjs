import { copyFile, mkdir, writeFile } from "node:fs/promises";
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
    ["packages/openquantum-web-branding/assets/mark-inverse.svg", "assets/mark-inverse.svg"],
    ["site/assets/quantum-state-v2.png", "assets/quantum-state-v2.png"],
    ["public/openquantum/fonts/inter-latin.woff2", "assets/inter-latin.woff2"],
    ["docs/images/openquantum-desktop-20261013.jpg", "assets/desktop.jpg"],
    ["docs/images/openquantum-settings-categories-20261013.jpg", "assets/settings.jpg"],
    ["experiments/qutip-rust-wigner/results/wigner-comparison.png", "assets/wigner-comparison.png"],
    ["experiments/qutip-rust-wigner/results/timings.png", "assets/qutip-timings.png"],
    ["experiments/pennylane-rust-commutator/results/timings.png", "assets/pennylane-timings.png"],
  ]);
  await mkdir(path.join(outputRoot, "assets"), { recursive: true });
  await Promise.all([...files].map(([source, destination]) =>
    copyFile(path.join(projectRoot, source), path.join(outputRoot, destination))));
  await writeFile(path.join(outputRoot, "provenance.json"), `${JSON.stringify({
    subject: "OpenQuantum product homepage",
    benchmarkSourceCommit: "9fa53e6523dee2c81380483b1aedb19819f218ac",
    conceptualHero: {
      asset: "assets/quantum-state-v2.png",
      kind: "generated quantum-state geometry concept illustration",
      tool: "built-in image_gen",
      promptSource: "site/assets/quantum-state-v2.prompt.txt",
    },
    assets: [...files].filter(([, destination]) => destination.startsWith("assets/"))
      .map(([source, destination]) => ({ source, destination })),
  }, null, 2)}\n`);
  return outputRoot;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Homepage built: ${await buildHomepage()}`);
}
