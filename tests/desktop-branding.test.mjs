import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import { readFile, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import * as branding from "../packages/openquantum-web-branding/desktop.mjs";
import { pngIcon, macIcon, installDesktopBranding, writeDesktopLauncher } from "../scripts/lib/desktop-branding.mjs";

test("public shell branding preserves native callbacks and restores the service after Profile disposal", async () => {
  const calls = [];
  const events = [];
  const cleanupStarted = Promise.withResolvers();
  const finishCleanup = Promise.withResolvers();
  class Runtime {
    #platform = "darwin";
    schedule(spec) {
      calls.push({ spec, platform: this.#platform });
      return async () => {
        cleanupStarted.resolve();
        await finishCleanup.promise;
        events.push("shell-disposed");
      };
    }
  }
  const runtime = new Runtime();
  const originalSchedule = runtime.schedule;
  const ctx = new Context();
  ctx.provide("desktopRuntime", runtime);
  let indexTransform;
  ctx.provide("webServer", { tapIndex(transform) { indexTransform = transform; return () => { indexTransform = undefined; }; } });
  const spec = Object.freeze({ iconPath: "/upstream.png", productName: "DSH Desktop", requestQuit: () => {}, readThemeSource: () => "system" });
  const shell = ctx.plugin({ name: "shell-fixture", inject: ["desktopRuntime", "openquantumDesktopIcon"], apply(ctx) {
    ctx.effect(() => ctx.get("desktopRuntime").schedule(spec));
  } });
  assert.equal(calls.length, 0, "shell waits until the icon provider is active");
  const icon = ctx.plugin(branding);
  await icon.await();
  await shell.await();
  const brandedIndex = indexTransform("<head></head>");
  assert.match(brandedIndex, /openquantum-minimal-settings/);
  assert.equal(indexTransform(brandedIndex), brandedIndex);
  assert.deepEqual(calls[0], { spec: { ...spec, productName: "OpenQuantum", windowTitle: "OpenQuantum", iconPath: fileURLToPath(new URL("../packages/openquantum-web-branding/assets/icon-512.png", import.meta.url)) }, platform: "darwin" });
  assert.equal(spec.iconPath, "/upstream.png");
  let disposed = false;
  const disposal = icon.dispose().then(() => { disposed = true; });
  await cleanupStarted.promise;
  await setImmediate();
  assert.equal(disposed, false, "Profile disposal waits for native shell cleanup");
  assert.deepEqual(events, []);
  finishCleanup.resolve();
  await disposal;
  assert.deepEqual(events, ["shell-disposed"]);
  assert.equal(runtime.schedule, originalSchedule);
  runtime.schedule(spec);
  assert.equal(calls[1].spec, spec, "next native Profile retains the upstream icon");
  await shell.dispose();
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
