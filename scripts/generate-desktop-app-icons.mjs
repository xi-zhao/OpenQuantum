import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { desktopPackageDirectory } from "./lib/desktop-source.mjs";

// Reuse the original vector mark and the pinned Desktop's existing rasterizer.
const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(path.join(desktopPackageDirectory(root), "package.json"));
const sharp = require("sharp");
const assets = path.join(root, "packages/openquantum-web-branding/assets");
const mark = await readFile(path.join(assets, "mark.svg"), "utf8");
const artwork = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect x="40" y="40" width="432" height="432" rx="96" fill="#ffffff" />
  ${mark.replace("<svg ", '<svg x="88" y="88" width="336" height="336" ')}
</svg>`;
for (const size of [192, 512]) {
  await sharp(Buffer.from(artwork)).resize(size, size).png({ compressionLevel: 9 })
    .toFile(path.join(assets, `desktop-icon-${size}.png`));
}
