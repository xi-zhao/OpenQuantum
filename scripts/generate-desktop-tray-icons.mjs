import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { desktopPackageDirectory } from "./lib/desktop-source.mjs";

// Reuse the pinned Desktop's existing SVG rasterizer; no product dependency.
const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(path.join(desktopPackageDirectory(root), "package.json"));
const sharp = require("sharp");
const assets = path.join(root, "packages/openquantum-web-branding/assets");
const source = await readFile(path.join(assets, "mark.svg"), "utf8");
const template = source.replaceAll(/url\(#oq-[a-z]+\)/g, "#000000");
for (const [name, size, svg] of [
  ["tray-iconTemplate.png", 16, template], ["tray-iconTemplate@2x.png", 32, template],
  ["tray-icon-color.png", 16, source], ["tray-icon-color@1.25x.png", 20, source],
  ["tray-icon-color@1.5x.png", 24, source], ["tray-icon-color@2x.png", 32, source],
]) {
  await sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(assets, name));
}
