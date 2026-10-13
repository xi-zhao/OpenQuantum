import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFile, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { desktopAssetRoot, installDesktopIcon } from "../packages/openquantum-web-branding/desktop.mjs";
import { pngIcon, macIcon, installDesktopBranding, writeDesktopLauncher } from "../scripts/lib/desktop-branding.mjs";

function fixture(platform) {
  const original = { isEmpty: () => false, identity: "original" };
  const brand = { isEmpty: () => false, identity: "OpenQuantum" };
  const app = new EventEmitter();
  let dock = original;
  app.dock = { setIcon: icon => { dock = icon; } };
  app.getAppPath = () => "/original-client";
  const makeWindow = () => {
    const window = new EventEmitter();
    window.icon = original;
    window.setIcon = icon => { window.icon = icon; };
    window.destroyed = false;
    window.isDestroyed = () => window.destroyed;
    return window;
  };
  const first = makeWindow();
  const dispose = installDesktopIcon({ app, BrowserWindow: { getAllWindows: () => [first] },
    nativeImage: { createFromPath: file => /app-icon(?:-mac)?\.png$/.test(file) ? original : brand },
  }, platform);
  return { app, dock: () => dock, first, makeWindow, dispose, original, brand };
}

test("Desktop icon follows recreated windows and releases its listeners on Profile changes", () => {
  const f = fixture("darwin");
  assert.equal(f.dock(), f.brand);
  f.app.dock.setIcon(f.original);
  const second = f.makeWindow();
  f.app.emit("browser-window-created", null, second);
  assert.equal(f.dock(), f.brand);
  f.app.dock.setIcon(f.original);
  second.emit("ready-to-show");
  assert.equal(f.dock(), f.brand);
  f.first.destroyed = true;
  f.first.emit("closed");
  assert.equal(f.first.listenerCount("ready-to-show"), 0);
  f.dispose();
  assert.equal(f.dock(), f.original);
  assert.equal(f.app.listenerCount("browser-window-created"), 0);
  assert.equal(second.listenerCount("ready-to-show"), 0);
  assert.equal(second.listenerCount("closed"), 0);
  f.app.emit("browser-window-created", null, f.makeWindow());
  assert.equal(f.dock(), f.original);
});

test("Windows window icons apply to existing and new windows without touching the Dock", () => {
  const f = fixture("win32");
  assert.equal(f.first.icon, f.brand);
  const second = f.makeWindow();
  f.app.emit("browser-window-created", null, second);
  assert.equal(second.icon, f.brand);
  assert.equal(f.dock(), f.original);
  f.dispose();
  assert.equal(second.icon, f.original);
});

test("default icon restoration supports both packaged and verified upstream source entry points", async t => {
  const root = await mkdtemp(path.join(await realpath(tmpdir()), "oq-source-icon-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(desktopAssetRoot(path.join(root, "app.asar")), path.join(root, "app.asar"));
  await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "dsh-plugin-desktop" }));
  assert.equal(desktopAssetRoot(path.join(root, "lib")), root);
  await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "unrelated-app" }));
  assert.throws(() => desktopAssetRoot(path.join(root, "lib")), /Unexpected Desktop source package/);
});

test("Windows launcher embeds the existing OpenQuantum brand PNG unchanged", async () => {
  const png = await readFile(new URL("../packages/openquantum-web-branding/assets/icon-192.png", import.meta.url));
  const icon = pngIcon(png);
  assert.equal(icon.readUInt16LE(2), 1);
  assert.equal(icon.readUInt16LE(4), 1);
  assert.equal(icon[6], 192);
  assert.equal(icon.readUInt32LE(14), png.length);
  assert.deepEqual(icon.subarray(icon.readUInt32LE(18)), png);
  assert.throws(() => pngIcon(Buffer.from("invalid")), /Invalid/);
});

test("Mac launcher uses the brand icon and bundled runtime across repeated installs", { skip: process.platform !== "darwin" }, async t => {
  const dataRoot = await mkdtemp(path.join(await realpath(tmpdir()), "OpenQuantum launch ' "));
  t.after(() => rm(dataRoot, { recursive: true, force: true }));
  const projectRoot = fileURLToPath(new URL("..", import.meta.url));
  const options = { projectRoot, dataRoot, node: "/custom runtime/bin/node", version: "0.8.2" };
  const first = await installDesktopBranding(options);
  assert.deepEqual(await installDesktopBranding(options), first);
  assert.equal(first.upstreamResourcesModified, false);
  const plist = await readFile(path.join(first.launcher, "Contents/Info.plist"), "utf8");
  assert.match(plist, /CFBundleIconFile<\/key><string>OpenQuantum.icns/);
  assert.match(plist, /LSUIElement<\/key><true\/>/);
  const shell = await readFile(path.join(first.launcher, "Contents/MacOS/OpenQuantum"), "utf8");
  assert.match(shell, /exec '\/custom runtime\/bin\/node'/);
  assert.ok(shell.includes(path.join(projectRoot, "scripts/run-desktop.mjs")));
  const png = await readFile(path.join(projectRoot, "packages/openquantum-web-branding/assets/icon-512.png"));
  const icon = await readFile(path.join(first.launcher, "Contents/Resources/OpenQuantum.icns"));
  assert.deepEqual(icon, macIcon(png));
  assert.equal(icon.subarray(8, 12).toString(), "ic09");
  assert.deepEqual(icon.subarray(16), png);
});

test("launcher upgrades reject modified files before any write and retain recoverable install ownership", async t => {
  const dataRoot = await mkdtemp(path.join(await realpath(tmpdir()), "oq-owned-launcher-"));
  t.after(() => rm(dataRoot, { recursive: true, force: true }));
  const install = version => writeDesktopLauncher({ dataRoot, launcher: path.join(dataRoot, "OpenQuantum.lnk"), files: {
    "OpenQuantum.ico": { content: `icon-${version}` }, "OpenQuantum.lnk": { content: `link-${version}` },
  } });
  await writeFile(path.join(dataRoot, "OpenQuantum.lnk"), "user shortcut");
  await assert.rejects(install(1), /Preserve the existing/);
  await assert.rejects(readFile(path.join(dataRoot, "OpenQuantum.ico")), { code: "ENOENT" });
  await rm(path.join(dataRoot, "OpenQuantum.lnk"));
  await install(1);
  await install(2);
  assert.equal(await readFile(path.join(dataRoot, "OpenQuantum.lnk"), "utf8"), "link-2");
  await writeFile(path.join(dataRoot, "OpenQuantum.lnk"), "custom edited shortcut");
  await assert.rejects(install(3), /Preserve the existing/);
  assert.equal(await readFile(path.join(dataRoot, "OpenQuantum.ico"), "utf8"), "icon-2");
});

test("launcher receipt refuses symlinks before modifying other files", { skip: process.platform === "win32" }, async t => {
  const dataRoot = await mkdtemp(path.join(await realpath(tmpdir()), "oq-linked-launcher-"));
  t.after(() => rm(dataRoot, { recursive: true, force: true }));
  const other = path.join(dataRoot, "user-file");
  await writeFile(other, "user data");
  await symlink(other, path.join(dataRoot, "desktop-branding.json"));
  await assert.rejects(writeDesktopLauncher({ dataRoot, launcher: "test", files: { "OpenQuantum.ico": { content: "icon" } } }), /Refusing to write through a link/);
  assert.equal(await readFile(other, "utf8"), "user data");
  await assert.rejects(readFile(path.join(dataRoot, "OpenQuantum.ico")), { code: "ENOENT" });
});
