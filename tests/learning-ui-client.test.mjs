import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { build } from "esbuild";
import { desktopPackageDirectory } from "../scripts/lib/desktop-source.mjs";
import { dictionariesFor } from "../runtime/openquantum/web-locales/catalog.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
test("actual classroom launcher waits for its peer, exposes disconnection, and reopens only on user retry", async (context) => {
  if (!process.env.OPENQUANTUM_TEST_ELECTRON && process.env.OPENQUANTUM_REAL_UI_BROWSER !== "1") { context.skip("Set OPENQUANTUM_REAL_UI_BROWSER=1 or OPENQUANTUM_TEST_ELECTRON to run Chromium fixtures"); return; }
  const installation = process.env.OPENQUANTUM_TEST_UI_INSTALLATION || root;
  const electron = process.env.OPENQUANTUM_TEST_ELECTRON || path.join(desktopPackageDirectory(installation), "node_modules/electron");
  const require = createRequire(path.join(installation, ".openquantum/external/openmaic/package.json"));
  let react, reactDom;
  try { react = require.resolve("react"); reactDom = require.resolve("react-dom/client"); }
  catch { context.skip("Installed UI React needed for actual launcher regression"); return; }
  if (!existsSync(electron)) { context.skip("Official Desktop Electron installation needed for actual launcher regression"); return; }
  const fixtures = process.env.OPENQUANTUM_TEST_ARTIFACT_DIR || path.join(root, ".openquantum/ui-repair-tests");
  await mkdir(fixtures, { recursive: true });
  const fixture = await mkdtemp(path.join(fixtures, "launcher-recovery-"));
  context.after(() => rm(fixture, { recursive: true, force: true }));
  const client = path.join(root, "runtime/openquantum/web-learning/client.jsx");
  const monitor = path.join(root, "src/learning/ui-connection.mjs");
  const output = await build({
    stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {apply} from ${JSON.stringify(client)};const translations=${JSON.stringify(dictionariesFor("zh")["openquantum.learning"])};const ctx={locale:{bind:()=>key=>translations[key]||key,getSnapshot:()=>({active:'zh'}),subscribe:()=>()=>{},setLocale(){}},theme:{getTheme:()=>({active:{colorScheme:'light'}})},on:()=>()=>{},slots:{inject(_slot,f){f();},register(_definition,render){createRoot(document.getElementById('root')).render(render({wide:true}));}}};apply(ctx);`, resolveDir: root, loader: "jsx" },
    bundle: true, platform: "browser", format: "iife", write: false, jsx: "transform", logLevel: "silent",
    alias: { react, "react-dom/client": reactDom }, loader: { ".css": "text" }, define: { "process.env.NODE_ENV": '"production"' },
    plugins: [{ name: "accelerated-read-only-polling", setup(builder) {
      builder.onResolve({ filter: /ui-connection\.mjs$/ }, (args) => args.namespace === "fixture" ? { path: monitor, namespace: "file" } : { path: "monitor", namespace: "fixture" });
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: `import {watchLearningUi as actual} from ${JSON.stringify(monitor)};export const watchLearningUi=options=>actual({...options,intervalMs:20});`, loader: "js" }));
    } }],
  });
  const bundle = path.join(fixture, "launcher.js"); await writeFile(bundle, output.outputFiles[0].text);
  const { stdout } = await promisify(execFile)(require(electron), [path.join(root, "tests/fixtures/learning-launcher-electron.cjs"), bundle, path.join(fixture, "profile"), root], {
    env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, OPENQUANTUM_PROJECT_ROOT: root }, timeout: 60_000,
  });
  const report = JSON.parse(stdout.trim()); assert.equal(report.openRequests, 2);
  context.diagnostic(JSON.stringify(report));
});
