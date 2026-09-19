import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { DESKTOP_SOURCE, requireDesktopBuild } from "./desktop-source.mjs";

const PRODUCT_NAME = "OpenQuantum Desktop";
const PACKAGE_FILES = ["package.json", "cordis.patch.yml", "lib", "LICENSE", "THIRD_PARTY_NOTICES.md"];

// The pinned Desktop has no public native-branding configuration. Adapt only
// its presentation in a separate local package; never edit the upstream tree or
// access desktopRuntime from an OpenQuantum plugin. Missing matches fail closed.
const PRESENTATION_PATCHES = [
  ["product name", /const DESKTOP_PRODUCT_NAME = DESKTOP_PRODUCT_IDENTITY\.productName;/g,
    `const DESKTOP_PRODUCT_NAME = ${JSON.stringify(PRODUCT_NAME)};`],
  ["window title", /windowTitle: "DeepSeek Harness Desktop"/g,
    `windowTitle: ${JSON.stringify(PRODUCT_NAME)}`],
  ["frame title", /(className: "dshDesktopFrameProduct",\s*children: )"DSH Desktop"/g,
    `$1${JSON.stringify(PRODUCT_NAME)}`],
  // Preserve the existing native settings/logs directory (including an explicit
  // app.setPath override) before changing Electron's visible application name.
  ["native data location", /app\.setName\(PRODUCT_NAME\);/g,
    'app.setName("DSH Desktop");\n\tapp.setPath("userData", app.getPath("userData"));\n\tapp.setName(PRODUCT_NAME);'],
];

async function filesUnder(root, relative) {
  if (relative !== "lib" && !relative.startsWith(`lib${path.sep}`)) return [relative];
  const result = [];
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const filename = path.join(relative, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(root, filename));
    else if (entry.isFile()) result.push(filename);
    else throw new Error(`Unexpected Desktop runtime link: ${filename}`);
  }
  return result.sort();
}

/** Apply the bounded visual changes, rejecting a changed upstream contract. */
export function brandDesktopJavaScript(files) {
  const counts = PRESENTATION_PATCHES.map(() => 0);
  const result = new Map();
  for (const [filename, source] of files) {
    let branded = source;
    PRESENTATION_PATCHES.forEach(([, pattern, replacement], index) => {
      counts[index] += [...source.matchAll(pattern)].length;
      branded = branded.replace(pattern, replacement);
    });
    if (branded !== source) {
      // The upstream source map no longer describes this adapted file.
      result.set(filename, branded.replace(/^\/\/# sourceMappingURL=.*$/gm, ""));
    }
  }
  counts.forEach((count, index) => {
    if (count !== 1) throw new Error(`Desktop branding contract changed: ${PRESENTATION_PATCHES[index][0]} matched ${count} times; expected 1.`);
  });
  return result;
}

async function renderIcons(upstreamRoot, directory, mark) {
  const require = createRequire(path.join(upstreamRoot, "package.json"));
  const sharp = require("sharp");
  await mkdir(directory);
  // Reuse the canonical OQ artwork; the native macOS canvas includes the same
  // 100 px safe area as upstream. Rasterization is part of preparing app assets.
  const artwork = mark.replace(/<svg\b/, '<svg x="150" y="150" width="724" height="724"');
  const appSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect x="100" y="100" width="824" height="824" rx="184" fill="#f7fbff"/>${artwork}</svg>`);
  await sharp(appSvg).png().toFile(path.join(directory, "app-icon-mac.png"));
  await sharp(Buffer.from(mark)).resize(512, 512).png().toFile(path.join(directory, "app-icon.png"));
  await writeFile(path.join(directory, "tray-icon.svg"), mark);
  const monochrome = mark.replace(/url\(#oq-[a-z]+\)/g, "#000000");
  const variants = [
    ["tray-iconTemplate.png", 16, monochrome],
    ["tray-iconTemplate@2x.png", 32, monochrome],
    ["tray-icon-blue.png", 16, mark],
    ["tray-icon-blue@1.25x.png", 20, mark],
    ["tray-icon-blue@1.5x.png", 24, mark],
    ["tray-icon-blue@2x.png", 32, mark],
  ];
  for (const [filename, size, svg] of variants) {
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(directory, filename));
  }
}

/** Prepare a reproducible native presentation package without changing upstream. */
export async function prepareOpenQuantumDesktop(projectRoot) {
  const upstreamRoot = await realpath(await requireDesktopBuild(projectRoot));
  const mark = await readFile(path.join(projectRoot, "packages/openquantum-web-branding/assets/mark.svg"), "utf8");
  const files = (await Promise.all(PACKAGE_FILES.map((entry) => filesUnder(upstreamRoot, entry)))).flat().sort();
  const hash = createHash("sha256").update(JSON.stringify(DESKTOP_SOURCE)).update(upstreamRoot).update(mark);
  hash.update(await readFile(new URL(import.meta.url)));
  const scripts = new Map();
  for (const filename of files) {
    const source = await readFile(path.join(upstreamRoot, filename));
    hash.update(filename.replaceAll(path.sep, "/")).update("\0").update(source);
    if (path.dirname(filename) === "lib" && filename.endsWith(".js")) scripts.set(filename, source.toString("utf8"));
  }
  const patched = brandDesktopJavaScript(scripts);
  const digest = hash.digest("hex");
  const root = path.join(projectRoot, ".openquantum/desktop");
  const target = path.join(root, digest.slice(0, 20));
  const markerPath = path.join(target, ".openquantum-branding.json");
  try {
    if (JSON.parse(await readFile(markerPath, "utf8")).digest === digest) return target;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await mkdir(root, { recursive: true });
  const staging = await mkdtemp(path.join(root, ".preparing-"));
  try {
    for (const entry of PACKAGE_FILES) await cp(path.join(upstreamRoot, entry), path.join(staging, entry), { recursive: true });
    for (const [filename, source] of patched) {
      await writeFile(path.join(staging, filename), source);
      await rm(path.join(staging, `${filename}.map`), { force: true });
    }
    await renderIcons(upstreamRoot, path.join(staging, "build"), mark);
    await symlink(path.join(upstreamRoot, "node_modules"), path.join(staging, "node_modules"), process.platform === "win32" ? "junction" : "dir");
    await writeFile(path.join(staging, ".openquantum-branding.json"), JSON.stringify({
      digest, upstream: DESKTOP_SOURCE, productName: PRODUCT_NAME,
      patchedFiles: [...patched.keys()], artwork: "packages/openquantum-web-branding/assets/mark.svg",
    }, null, 2));
    try {
      await rename(staging, target);
    } catch (error) {
      // Another launcher can finish the identical immutable package first.
      if (!["EEXIST", "ENOTEMPTY"].includes(error.code)
        || JSON.parse(await readFile(markerPath, "utf8")).digest !== digest) throw error;
    }
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  return target;
}
