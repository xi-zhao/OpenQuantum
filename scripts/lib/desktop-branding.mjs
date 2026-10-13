import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { assertNoLinks, sha256 } from "./desktop-distribution.mjs";

const execute = promisify(execFile);

/** Validate every destination before updating any installer-owned launcher file. */
export async function writeDesktopLauncher({ dataRoot, launcher, files }) {
  const receipt = path.join(dataRoot, "desktop-branding.json");
  await assertNoLinks(receipt);
  const previous = await readFile(receipt, "utf8").then(JSON.parse).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  if (previous && previous.kind !== "openquantum-launcher") throw new Error("Unmanaged Desktop branding receipt");
  const hashes = {};
  for (const [relative, { content }] of Object.entries(files)) {
    if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) throw new Error("Invalid launcher path");
    const target = path.join(dataRoot, relative);
    await assertNoLinks(target);
    const current = await readFile(target).catch(error => { if (error.code === "ENOENT") return null; throw error; });
    hashes[relative] = sha256(content);
    if (current && sha256(current) !== hashes[relative] && sha256(current) !== previous?.files?.[relative]) {
      throw new Error(`Preserve the existing or modified Desktop launcher file before upgrading: ${target}`);
    }
  }
  async function atomicWrite(target, content, mode) {
    await mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, content, { mode });
      await rename(temporary, target);
    } finally { await rm(temporary, { force: true }); }
  }
  for (const [relative, { content, mode = 0o644 }] of Object.entries(files)) await atomicWrite(path.join(dataRoot, relative), content, mode);
  const result = { kind: "openquantum-launcher", status: "installed", launcher, upstreamResourcesModified: false, files: hashes };
  await atomicWrite(receipt, JSON.stringify(result, null, 2), 0o600);
  return result;
}

/** PNG-backed ICO: keep the existing brand pixels, with no image dependency. */
export function pngIcon(png) {
  if (!png.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) || png.length < 24) throw new Error("Invalid brand PNG");
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  if (width !== height || width < 1 || width > 256) throw new Error("Windows icon must be a square PNG up to 256 pixels");
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = header[7] = width === 256 ? 0 : width;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(header.length, 18);
  return Buffer.concat([header, png]);
}

export function macIcon(png) {
  if (!png.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) || png.length < 24
    || png.readUInt32BE(16) !== 512 || png.readUInt32BE(20) !== 512) throw new Error("Mac icon requires the 512 pixel brand PNG");
  const header = Buffer.alloc(16);
  header.write("icns");
  header.writeUInt32BE(png.length + 16, 4);
  header.write("ic09", 8);
  header.writeUInt32BE(png.length + 8, 12);
  return Buffer.concat([header, png]);
}

/** A branded launch entry keeps upstream signed application resources intact. */
export async function installDesktopBranding({ projectRoot, dataRoot, node, version }) {
  if (process.platform === "darwin") {
    const application = path.join(dataRoot, "OpenQuantum.app");
    const escape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
    const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleName</key><string>OpenQuantum</string>
<key>CFBundleDisplayName</key><string>OpenQuantum</string>
<key>CFBundleIdentifier</key><string>org.openquantum.desktop.launcher</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleExecutable</key><string>OpenQuantum</string>
<key>CFBundleIconFile</key><string>OpenQuantum.icns</string>
<key>CFBundleShortVersionString</key><string>${escape(version)}</string>
<key>CFBundleVersion</key><string>${escape(version)}</string>
<key>LSUIElement</key><true/>
</dict></plist>\n`;
    return writeDesktopLauncher({ dataRoot, launcher: application, files: {
      "OpenQuantum.app/Contents/Info.plist": { content: plist },
      "OpenQuantum.app/Contents/MacOS/OpenQuantum": { content: `#!/bin/sh\nexec ${quote(node)} ${quote(path.join(projectRoot, "scripts/run-desktop.mjs"))}\n`, mode: 0o755 },
      "OpenQuantum.app/Contents/Resources/OpenQuantum.icns": { content: macIcon(await readFile(path.join(projectRoot, "packages/openquantum-web-branding/assets/icon-512.png"))) },
    } });
  }
  if (process.platform === "win32") {
    const iconFile = path.join(dataRoot, "OpenQuantum.ico");
    const shortcut = path.join(dataRoot, "OpenQuantum.lnk");
    const temporary = await mkdtemp(path.join(await realpath(tmpdir()), "oq-launcher-"));
    const script = [
      '$ErrorActionPreference = "Stop"',
      '$link = (New-Object -ComObject WScript.Shell).CreateShortcut($env:OQ_ICON_SHORTCUT)',
      '$link.TargetPath = $env:OQ_ICON_NODE',
      '$link.Arguments = \'"\' + $env:OQ_ICON_SCRIPT + \'"\'',
      '$link.WorkingDirectory = $env:OQ_ICON_PROJECT',
      '$link.IconLocation = $env:OQ_ICON_FILE + ",0"',
      '$link.Description = "OpenQuantum"',
      '$link.WindowStyle = 7',
      '$link.Save()',
    ].join("\n");
    try {
      const stagedShortcut = path.join(temporary, "OpenQuantum.lnk");
      await execute("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")], {
        env: { ...process.env, OQ_ICON_SHORTCUT: stagedShortcut, OQ_ICON_NODE: node, OQ_ICON_SCRIPT: path.join(projectRoot, "scripts/run-desktop.mjs"), OQ_ICON_PROJECT: projectRoot, OQ_ICON_FILE: iconFile },
      });
      return await writeDesktopLauncher({ dataRoot, launcher: shortcut, files: {
        "OpenQuantum.ico": { content: pngIcon(await readFile(path.join(projectRoot, "packages/openquantum-web-branding/assets/icon-192.png"))) },
        "OpenQuantum.lnk": { content: await readFile(stagedShortcut) },
      } });
    } finally { await rm(temporary, { recursive: true, force: true }); }
  }
  throw new Error("Unsupported Desktop icon platform");
}
