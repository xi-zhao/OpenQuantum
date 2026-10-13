import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { assertNoLinks } from "./desktop-distribution.mjs";

const execute = promisify(execFile);

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
    const marker = path.join(application, "Contents/openquantum-launcher.json");
    const files = ["Info.plist", "MacOS/OpenQuantum", "Resources/OpenQuantum.icns", "openquantum-launcher.json"];
    for (const file of files) await assertNoLinks(path.join(application, "Contents", file));
    const existing = await readFile(path.join(application, "Contents/Info.plist"), "utf8").catch(error => { if (error.code === "ENOENT") return null; throw error; });
    if (existing && await readFile(marker, "utf8").then(JSON.parse).then(value => value.kind !== "openquantum-launcher").catch(() => true)) throw new Error("An unmanaged OpenQuantum.app blocks launcher installation");
    const escape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
    await mkdir(path.join(application, "Contents/MacOS"), { recursive: true });
    await mkdir(path.join(application, "Contents/Resources"), { recursive: true });
    await writeFile(path.join(application, "Contents/Info.plist"), `<?xml version="1.0" encoding="UTF-8"?>
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
</dict></plist>\n`);
    await writeFile(path.join(application, "Contents/MacOS/OpenQuantum"), `#!/bin/sh\nexec ${quote(node)} ${quote(path.join(projectRoot, "scripts/run-desktop.mjs"))}\n`, { mode: 0o755 });
    await writeFile(path.join(application, "Contents/Resources/OpenQuantum.icns"), macIcon(await readFile(path.join(projectRoot, "packages/openquantum-web-branding/assets/icon-512.png"))));
    await writeFile(marker, JSON.stringify({ kind: "openquantum-launcher", version }));
    return { status: "installed", launcher: application, upstreamResourcesModified: false };
  }
  if (process.platform === "win32") {
    const iconFile = path.join(dataRoot, "OpenQuantum.ico");
    const shortcut = path.join(dataRoot, "OpenQuantum.lnk");
    await assertNoLinks(iconFile);
    await assertNoLinks(shortcut);
    await writeFile(iconFile, pngIcon(await readFile(path.join(projectRoot, "packages/openquantum-web-branding/assets/icon-192.png"))));
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
    await execute("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")], {
      env: { ...process.env, OQ_ICON_SHORTCUT: shortcut, OQ_ICON_NODE: node, OQ_ICON_SCRIPT: path.join(projectRoot, "scripts/run-desktop.mjs"), OQ_ICON_PROJECT: projectRoot, OQ_ICON_FILE: iconFile },
    });
    return { status: "installed", launcher: shortcut, upstreamResourcesModified: false };
  }
  throw new Error("Unsupported Desktop icon platform");
}
