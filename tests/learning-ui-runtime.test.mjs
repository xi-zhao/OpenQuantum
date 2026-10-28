import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { build } from "esbuild";
import { desktopPackageDirectory } from "../scripts/lib/desktop-source.mjs";
import { applyOpenMaicUiOverlay, OPENMAIC_REVISION, sourceDirectory } from "../scripts/lib/openmaic-ui-source.mjs";
import { verifyUiInstallation } from "../src/learning/ui-service.mjs";

const run = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));
const upstream = sourceDirectory(root);
const missingSource = !existsSync(path.join(upstream, ".git"));
const options = { skip: missingSource ? "Pinned OpenMAIC source is needed for this integration regression" : false };
let fixtureRoot, directory, manifest, hook;

before(async () => {
  const fixtures = process.env.OPENQUANTUM_TEST_ARTIFACT_DIR || path.join(root, ".openquantum/ui-repair-tests");
  await mkdir(fixtures, { recursive: true });
  fixtureRoot = await mkdtemp(path.join(fixtures, "runtime-"));
  if (missingSource) return;
  directory = sourceDirectory(fixtureRoot);
  await mkdir(path.dirname(directory), { recursive: true });
  await run("git", ["clone", "--shared", "--no-checkout", upstream, directory]);
  await run("git", ["checkout", "--detach", OPENMAIC_REVISION], { cwd: directory });
  for (const name of ["runtime/openquantum/openmaic-ui", "runtime/openquantum/web-locales/languages.json", "src/learning/ui-theme.mjs", "src/learning/ui-locale.mjs", "src/learning/library-migration.mjs", "packages/openquantum-web-branding/assets/mark.svg"]) {
    await mkdir(path.dirname(path.join(fixtureRoot, name)), { recursive: true });
    await cp(path.join(root, name), path.join(fixtureRoot, name), { recursive: true });
  }
  manifest = await applyOpenMaicUiOverlay(fixtureRoot);

  // Execute the actual patched hook with deterministic transports and stores.
  // No DOM, Next server, database, external service or model is started.
  const modules = {
    react: "export const useEffect = f => { globalThis.__learningHook.cleanup = f(); }; export const useLayoutEffect = () => {}; export const useRef = () => ({});",
    "@/lib/workbench/session-store": "export const useWorkbenchStore = f => f(globalThis.__learningHook.state); useWorkbenchStore.getState = () => globalThis.__learningHook.state; export const compactReplayEvents = x => x; export const appendCompactedReplayEvent = (a, x) => a.push(x);",
    "@/lib/agent-runtime/lifecycle": "export const HOST_AGENT_LIFECYCLE = ['session_start', 'session_end'];",
    "@/lib/document-store/store": "export const getDocumentStore = () => {};",
    "@/lib/store/stage": "export const useStageStore = () => {};",
    "@/lib/workbench/media-lifecycle": "export const applyMediaReadyFrame = () => {}; export const parseMediaReadyFrame = () => null;",
    "@/lib/workbench/stage-freshness": "export const diffStageManifest = () => {}; export const fetchScenesByIds = () => {}; export const fetchStageManifest = () => {}; export const mergeFetchedScenes = () => {};",
    "@/lib/workbench/tts-stage-sync": "export const applyGenerateTtsResultToScenes = () => {};",
  };
  const result = await build({
    stdin: { contents: `export { useWorkbenchStream } from ${JSON.stringify(path.join(directory, "lib/workbench/use-workbench-session.ts"))};`, resolveDir: root, loader: "ts" },
    bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
    plugins: [{ name: "isolated-hook-dependencies", setup(builder) {
      builder.onResolve({ filter: /^(react|@\/)/ }, (args) => ({ path: args.path, namespace: "fixture", sideEffects: false }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => {
        assert.ok(modules[args.path], `unhandled hook dependency: ${args.path}`);
        return { contents: modules[args.path], loader: "js" };
      });
    } }],
  });
  const hookPath = path.join(fixtureRoot, "hook.mjs");
  await writeFile(hookPath, result.outputFiles[0].text);
  hook = (await import(pathToFileURL(hookPath))).useWorkbenchStream;
});

after(async () => { if (fixtureRoot) await rm(fixtureRoot, { recursive: true, force: true }); });

test("UI installation refuses an old, uncompiled prompt loader", async () => {
  const project = path.join(fixtureRoot, "installation");
  const source = sourceDirectory(project);
  const files = ["node_modules/next/dist/bin/next", "packages/@openmaic/editor/dist/core/index.js", "packages/@openmaic/generation/dist/prompts/loader.js", "packages/@openmaic/generation/dist/pbl/prompts/loader.js"];
  for (const name of files) {
    await mkdir(path.dirname(path.join(source, name)), { recursive: true });
    await writeFile(path.join(source, name), "uncompiled");
  }
  await writeFile(path.join(source, ".openquantum-ui.json"), JSON.stringify({ revision: OPENMAIC_REVISION, files: [] }));
  await assert.rejects(verifyUiInstallation(project), /模板适配尚未编译/);
  for (const name of files.slice(2)) await writeFile(path.join(source, name), "process.env.OPENQUANTUM_GENERATION_RESOURCE_DIR");
  await assert.rejects(verifyUiInstallation(project), /测验适配尚未编译/);
  await writeFile(path.join(source, "packages/@openmaic/generation/dist/scene-generator.js"), "Generated quiz does not match the declared count or question types.");
  await assert.rejects(verifyUiInstallation(project), /公式适配尚未编译/);
  const renderer = path.join(source, "packages/@openmaic/renderer/dist/elements/latex/BaseLatexElement.js");
  await mkdir(path.dirname(renderer), { recursive: true });
  await writeFile(renderer, "formulaHtml");
  await assert.rejects(verifyUiInstallation(project), /数学导出适配尚未编译/);
  const converter = path.join(source, "packages/mathml2omml/dist/index.js");
  await mkdir(path.dirname(converter), { recursive: true });
  await writeFile(converter, "normal: 'p'");
  await assert.rejects(verifyUiInstallation(project), /公式括号适配尚未编译/);
  await writeFile(converter, "normal: 'p'\nchildren.length > 2");
  await assert.rejects(verifyUiInstallation(project), /公式排版适配尚未编译/);
  const pptx = path.join(source, "packages/pptxgenjs/dist/pptxgen.es.js");
  await mkdir(path.dirname(pptx), { recursive: true });
  await writeFile(pptx, 'wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr"');
  await assert.rejects(verifyUiInstallation(project), /字体导出适配尚未编译/);
  await writeFile(pptx, 'wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr"\ntypeface="${encodeXmlEntities(opts.fontFace)}"');
  assert.equal(await verifyUiInstallation(project), source);
});

test("source overlay replays identically and protects local source edits", options, async () => {
  assert.deepEqual(await applyOpenMaicUiOverlay(fixtureRoot), manifest);
  const file = path.join(directory, "lib/workbench/use-workbench-session.ts");
  const original = await readFile(file, "utf8");
  try {
    await writeFile(file, original + "\n// local edit preserved\n");
    await assert.rejects(applyOpenMaicUiOverlay(fixtureRoot), /Preserving local changes/);
    assert.equal(await readFile(file, "utf8"), original + "\n// local edit preserved\n");
  } finally { await writeFile(file, original); }
});

test("actual Pro failure presentation exposes only the gateway's safe network cause", options, async () => {
  const output = path.join(fixtureRoot, "pro-failure-copy.mjs");
  await build({
    entryPoints: [path.join(directory, "components/workbench/chat/system-notice.ts")],
    bundle: true, platform: "node", format: "esm", outfile: output, logLevel: "silent",
    alias: { "@/lib/i18n/workbench": path.join(directory, "lib/i18n/workbench.ts"), "@/components/openquantum-model-failure": path.join(directory, "components/openquantum-model-failure.ts") },
  });
  const { presentSystemNotice } = await import(pathToFileURL(output));
  const node = { kind: "system", tone: "error", text: "本轮生成失败", copyKey: "workbench.system.runFailed", hint: "可以再说一句让它重试", hintCopyKey: "workbench.system.retryHint", detail: "Failed after 3 attempts. Last error: OpenQuantum 当前模型网络连接失败，请检查网络连接后重试。" };
  const notice = presentSystemNotice(node);
  assert.equal(notice.summary, "模型网络连接失败");
  assert.ok(notice.hint.includes("请检查模型连接"));
  assert.equal(notice.detail, node.detail, "the original technical cause remains available without rewriting execution state");
  const generic = presentSystemNotice({ ...node, detail: "opaque error sk-private-example" });
  assert.equal(generic.summary, "本轮生成失败");
  assert.ok(!generic.summary.includes("sk-private-example") && !generic.hint.includes("sk-private-example"));
  const english = presentSystemNotice(node, (key) => ({ "workbench.system.modelNetworkFailed": "The model connection failed", "workbench.system.modelNetworkHint": "Check the model connection" })[key] || key);
  assert.equal(english.summary, "The model connection failed");
});

test("all three real slide renderers refresh stale formula HTML from source and preserve legacy SVG", options, async (context) => {
  if (!existsSync(path.join(upstream, "node_modules/react-dom/server.js"))) {
    context.skip("Installed original UI is needed for real React renderer regression");
    return;
  }
  const require = createRequire(path.join(upstream, "package.json"));
  const output = path.join(fixtureRoot, "formula-renderers.mjs");
  await build({
    stdin: { contents: `export { LatexElement, BaseLatexElement } from ${JSON.stringify(path.join(directory, "components/slide-renderer/components/element/LatexElement/index.tsx"))}; export { BaseLatexElement as PackageLatexElement } from ${JSON.stringify(path.join(directory, "packages/@openmaic/renderer/src/elements/latex/BaseLatexElement.tsx"))};`, resolveDir: root, loader: "ts" },
    bundle: true, format: "esm", platform: "node", outfile: output,
    jsx: "automatic", logLevel: "silent",
    alias: { "@/components/openquantum-latex": path.join(directory, "components/openquantum-latex.ts") },
    plugins: [{ name: "installed-renderer-dependencies", setup(builder) {
      builder.onResolve({ filter: /^(react(?:\/.*)?|katex)$/ }, (args) => ({ path: require.resolve(args.path), external: true }));
    } }],
  });
  const { LatexElement, BaseLatexElement, PackageLatexElement } = await import(pathToFileURL(output));
  const { createElement } = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const element = { type: "latex", latex: "\\rho=\\begin{pmatrix}\\frac{1}{2}&0\\\\0&\\frac{1}{2}\\end{pmatrix}", html: "<span>obsolete-render-cache</span>", width: 300, height: 100, left: 0, top: 0, rotate: 0 };
  for (const component of [LatexElement, BaseLatexElement, PackageLatexElement]) {
    const markup = renderToStaticMarkup(createElement(component, { elementInfo: element }));
    assert.ok(markup.includes('class="katex"'), "stored source is typeset by the current UI renderer");
    assert.ok(!markup.includes("obsolete-render-cache"));
    const legacy = renderToStaticMarkup(createElement(component, { elementInfo: { ...element, html: undefined, path: "M0 0L1 1", viewBox: [1, 1] } }));
    assert.ok(legacy.includes('d="M0 0L1 1"'));
    const unsupported = renderToStaticMarkup(createElement(component, { elementInfo: { ...element, latex: "\\unsupportedFormula" } }));
    assert.ok(unsupported.includes("obsolete-render-cache"));
  }
});

test("real outline and PBL prompts load after build output relocation, without a model call", options, async () => {
  const generation = path.join(directory, "packages/@openmaic/generation");
  const cache = path.join(fixtureRoot, "relocated-build-cache");
  await mkdir(cache);
  const outline = path.join(cache, "outline.mjs");
  const pbl = path.join(cache, "pbl.mjs");
  for (const [name, output, exported] of [["outline-generator.ts", outline, "buildOutlinePrompt"], ["pbl/prompts/loader.ts", pbl, "loadPBLV2Prompt"]]) {
    await build({ stdin: { contents: `export { ${exported} } from ${JSON.stringify(path.join(generation, "src", name))};`, resolveDir: root, loader: "ts" }, bundle: true, format: "esm", platform: "node", outfile: output, nodePaths: [path.join(upstream, "node_modules")], logLevel: "silent" });
  }
  const promptName = (await readdir(path.join(generation, "prompts-pbl"))).find((name) => name.endsWith(".md")).slice(0, -3);
  const script = `const { buildOutlinePrompt } = await import(${JSON.stringify(pathToFileURL(outline).href)}); const { loadPBLV2Prompt } = await import(${JSON.stringify(pathToFileURL(pbl).href)}); try { const p = buildOutlinePrompt({requirement:'Explain a Z measurement of |0> in three text pages.'}); console.log(JSON.stringify({system:p.system.length,user:p.user.length,pbl:loadPBLV2Prompt(${JSON.stringify(promptName)}).length})); } catch(e) { console.log(JSON.stringify({error:e.message})); }`;
  const environment = { ...process.env };
  delete environment.OPENQUANTUM_GENERATION_RESOURCE_DIR;
  const invoke = async (env) => JSON.parse((await run(process.execPath, ["--input-type=module", "-e", script], { cwd: cache, env })).stdout);
  assert.deepEqual(await invoke(environment), { error: "Prompt template not found" });
  const loaded = await invoke({ ...environment, OPENQUANTUM_GENERATION_RESOURCE_DIR: generation });
  assert.ok(loaded.system > 1000 && loaded.user > 1000 && loaded.pbl > 1000);
  assert.deepEqual(await invoke({ ...environment, OPENQUANTUM_GENERATION_RESOURCE_DIR: path.join(cache, "missing-assets") }), { error: "Prompt template not found" });
});

test("real PowerPoint formula conversion removes Word prefixes and keeps defined math styles", options, async (context) => {
  const require = createRequire(path.join(upstream, "package.json"));
  let temml;
  try { temml = require.resolve("temml"); }
  catch { context.skip("Installed original UI is needed for real formula conversion"); return; }
  const output = path.join(fixtureRoot, "powerpoint-formulas.mjs");
  await build({
    entryPoints: [path.join(directory, "lib/export/latex-to-omml.ts")],
    bundle: true, format: "esm", platform: "node", outfile: output, logLevel: "silent",
    nodePaths: [path.join(upstream, "node_modules"), path.join(upstream, "packages/mathml2omml/node_modules")],
    alias: { temml, mathml2omml: path.join(directory, "packages/mathml2omml/src/index.js") },
    plugins: [{ name: "isolated-export-logger", setup(builder) {
      builder.onResolve({ filter: /^@\/lib\/logger$/ }, () => ({ path: "logger", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const createLogger = () => ({ warn() {} });", loader: "js" }));
    } }],
  });
  const { latexToOmml } = await import(pathToFileURL(output));
  const formulas = ["\\rho_{\\Phi^+}^2=1", "\\begin{pmatrix}\\frac{1}{2}&0\\\\0&\\frac{1}{2}\\end{pmatrix}", "\\mathbf{x}+\\mathit{y}+\\mathrm{Z}"];
  for (const formula of formulas) {
    const omml = latexToOmml(formula, 12);
    assert.ok(omml?.startsWith("<m:oMath>"));
    assert.ok(!omml.includes("<w:"), "namespace removal must not leave undeclared Word elements");
    assert.ok(!omml.includes('="undefined"'));
    assert.ok(!/<m:r>(?!<a:rPr)/.test(omml), "styled runs also receive PowerPoint font properties");
    for (const match of omml.matchAll(/<m:sty m:val="([^"]+)"/g)) assert.ok(["p", "b", "i", "bi"].includes(match[1]));
  }
  for (const formula of ["\\left|\\right. \\psi \\rangle", "P \\left(\\right. 00 \\left.\\right)"]) {
    const omml = latexToOmml(formula, 12);
    assert.ok(!omml.includes("<m:d>"), "imported standalone punctuation must not create empty Office Math operands");
  }
  assert.ok(latexToOmml("\\left( x \\right)", 12).includes("<m:d>"), "non-empty grouped expressions keep native delimiters");
  assert.ok(latexToOmml("\\left. x \\right)", 12).includes('m:begChr m:val=""'), "invisible fences must not acquire a visible parenthesis");
  assert.ok(latexToOmml(formulas[0], 12).includes('<m:sty m:val="p"'));
});

function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
const flush = () => new Promise((resolve) => setImmediate(resolve));

async function withHook(response, body) {
  const original = { fetch: globalThis.fetch, EventSource: globalThis.EventSource, window: globalThis.window };
  const sources = [];
  class FakeEventSource {
    static CLOSED = 2;
    readyState = 1;
    closed = false;
    listeners = new Map();
    constructor() { sources.push(this); }
    addEventListener(name, listener) { this.listeners.set(name, listener); }
    removeEventListener(name) { this.listeners.delete(name); }
    close() { this.closed = true; }
  }
  const state = { sessionId: "session-a", sessionTitleRevision: 0, lastEventId: 0, attached: false, replaying: true, error: null, status: "connecting", applyEvent() {}, applyEvents() {} };
  Object.assign(state, {
    setAttached: (value) => { state.attached = value; }, setError: (value) => { state.error = value; },
    finishReplay: () => { state.replaying = false; }, setSessionBootstrap: (value) => Object.assign(state, value),
  });
  globalThis.__learningHook = { state };
  globalThis.fetch = () => response;
  globalThis.EventSource = FakeEventSource;
  globalThis.window = { setTimeout, clearTimeout };
  try { hook("session-a"); await body(state, sources[0]); }
  finally { globalThis.__learningHook.cleanup?.(); delete globalThis.__learningHook; Object.assign(globalThis, original); }
}

for (const status of [401, 403, 404]) test(`metadata ${status} surfaces a connection error and stops unusable SSE without inventing a run failure`, options, async () => {
  await withHook(Promise.resolve(new Response("Not found", { status })), async (state, source) => {
    await flush();
    assert.equal(state.error, `openquantum:session-connection:${status}`);
    assert.equal(state.status, "connecting");
    assert.equal(state.replaying, false);
    assert.equal(source.closed, true);
  });
});

test("temporary metadata failure keeps SSE recovery and clears the connection error when replay attaches", options, async () => {
  await withHook(Promise.resolve(new Response("Unavailable", { status: 503 })), async (state, source) => {
    await flush(); assert.equal(state.error, "openquantum:session-connection:503"); assert.equal(source.closed, false);
    source.listeners.get("caught_up")();
    assert.equal(state.attached, true); assert.equal(state.error, null);
  });
});

test("late metadata failures cannot corrupt a different conversation or a healthy event attachment", options, async () => {
  for (const alreadyAttached of [false, true]) {
    const result = deferred();
    await withHook(result.promise, async (state, source) => {
      if (alreadyAttached) source.listeners.get("caught_up")(); else state.sessionId = "session-b";
      result.resolve(new Response("Not found", { status: 404 })); await flush();
      assert.equal(state.error, null); assert.equal(source.closed, false);
    });
  }
});

test("a closed transport reports interruption only while runner status is not terminal", options, async () => {
  for (const status of ["connecting", "running", "failed", "succeeded", "cancelled"]) {
    await withHook(new Promise(() => {}), async (state, source) => {
      state.status = status; source.readyState = 2; source.onerror();
      assert.equal(state.error, ["connecting", "running"].includes(status) ? "openquantum:session-connection:0" : null);
      assert.equal(state.status, status);
    });
  }
});

test("actual Chromium formula measurement fits width and height without enlarging matrices", options, async (context) => {
  if (!process.env.OPENQUANTUM_TEST_ELECTRON && process.env.OPENQUANTUM_REAL_UI_BROWSER !== "1") { context.skip("Set OPENQUANTUM_REAL_UI_BROWSER=1 or OPENQUANTUM_TEST_ELECTRON to run Chromium fixtures"); return; }
  const require = createRequire(path.join(upstream, "package.json"));
  const electronPath = process.env.OPENQUANTUM_TEST_ELECTRON || path.join(desktopPackageDirectory(process.env.OPENQUANTUM_TEST_UI_INSTALLATION || root), "node_modules/electron");
  let katex;
  try { katex = require.resolve("katex"); }
  catch { context.skip("Installed UI fonts and KaTeX required for rendering regression"); return; }
  if (!existsSync(electronPath)) { context.skip("Official Desktop Electron installation required for rendering regression"); return; }
  const result = await build({
    entryPoints: [path.join(directory, "lib/export/openquantum-formula-layout.ts")],
    bundle: true, format: "iife", globalName: "FormulaLayout", platform: "browser", write: false, logLevel: "silent",
    alias: { katex, "@/components/openquantum-latex": path.join(directory, "components/openquantum-latex.ts") },
  });
  const textExport = await build({
    entryPoints: [path.join(directory, "lib/export/openquantum-text-export.ts")],
    bundle: true, format: "iife", globalName: "TextExport", platform: "browser", write: false, logLevel: "silent",
  });
  const cssPath = require.resolve("katex/dist/katex.css");
  let css = await readFile(cssPath, "utf8");
  for (const match of [...css.matchAll(/url\(([^)]+)\)/g)]) {
    const asset = match[1].replace(/^["']|["']$/g, "");
    const bytes = await readFile(path.resolve(path.dirname(cssPath), asset));
    css = css.replace(match[0], `url(data:font/${path.extname(asset).slice(1)};base64,${bytes.toString("base64")})`);
  }
  const page = path.join(fixtureRoot, "formula-layout.html");
  await writeFile(page, `<style>${css}</style><script>${result.outputFiles[0].text}\n${textExport.outputFiles[0].text}</script>`);
  const { stdout } = await run(require(electronPath), [path.join(root, "tests/fixtures/learning-formula-electron.cjs"), page, path.join(fixtureRoot, "formula-profile")], {
    env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR }, timeout: 60_000,
  });
  context.diagnostic(stdout.trim());
});

test("real PowerPoint serializer escapes font names in runs and slide numbers", options, async (context) => {
  const require = createRequire(path.join(upstream, "package.json"));
  let JSZip;
  try { JSZip = require("jszip"); }
  catch { context.skip("Installed original UI is needed for PowerPoint serializer regression"); return; }
  const output = path.join(fixtureRoot, "powerpoint-serializer.cjs");
  await build({
    entryPoints: [path.join(directory, "packages/pptxgenjs/src/pptxgen.ts")],
    bundle: true, format: "cjs", platform: "node", outfile: output, logLevel: "silent",
    nodePaths: [path.join(upstream, "packages/pptxgenjs/node_modules"), path.join(upstream, "node_modules")],
  });
  const PptxGenJS = require(output).default;
  const deck = new PptxGenJS();
  const slide = deck.addSlide();
  const fontFace = 'A&B "<test>"';
  slide.addText("Typeface attribute regression", { x: 1, y: 1, w: 5, h: 1, fontFace });
  slide.slideNumber = { x: 1, y: 2, w: 1, h: 1, fontFace };
  const zip = await JSZip.loadAsync(await deck.write({ outputType: "nodebuffer" }));
  const xml = await zip.file("ppt/slides/slide1.xml").async("string");
  assert.ok(xml.includes('typeface="A&amp;B &quot;&lt;test&gt;&quot;"'));
  assert.ok(!xml.includes('typeface="A&B'));
  assert.ok(!xml.includes('typeface="A&amp;B "'));
});

test("real quiz generator honors explicit count and supplies an unambiguous omitted type", options, async () => {
  const output = path.join(fixtureRoot, "quiz-generator.mjs");
  await build({
    entryPoints: [path.join(directory, "packages/@openmaic/generation/src/scene-generator.ts")],
    bundle: true, platform: "node", format: "esm", outfile: output, logLevel: "silent",
    nodePaths: [path.join(upstream, "node_modules")],
  });
  const prior = process.env.OPENQUANTUM_GENERATION_RESOURCE_DIR;
  process.env.OPENQUANTUM_GENERATION_RESOURCE_DIR = path.join(upstream, "packages/@openmaic/generation");
  try {
    const { generateSceneContent } = await import(pathToFileURL(output));
    const outline = { id: "p1", order: 1, title: "One question", type: "quiz", description: "Exactly one single-choice question.", keyPoints: [], quizConfig: { questionCount: 1, difficulty: "medium", questionTypes: ["single"] } };
    const question = { question: "Do equal Z statistics prove equal states?", options: [{ value: "A", label: "Yes" }, { value: "B", label: "No" }], answer: ["B"], points: 10, analysis: "Off-diagonal coherence also matters." };
    let prompt = "";
    const content = await generateSceneContent(outline, async (_system, user) => { prompt = user; return JSON.stringify([question]); });
    assert.ok(prompt.includes("1"));
    assert.equal(content.questions.length, 1);
    assert.equal(content.questions[0].type, "single");
    assert.deepEqual(content.questions[0].answer, ["B"]);
    assert.equal(question.type, undefined, "source response must not be mutated");
    const failures = [];
    const mismatch = await generateSceneContent(outline, async () => JSON.stringify([question, question]), { onFailure: failure => failures.push(failure.code) });
    assert.equal(mismatch, null, "an explicit one-question request must not save a larger quiz");
    const unsupported = await generateSceneContent(outline, async () => JSON.stringify([{ ...question, type: "unknown-question" }]), { onFailure: failure => failures.push(failure.code) });
    assert.equal(unsupported, null);
    const ambiguous = await generateSceneContent({ ...outline, quizConfig: { ...outline.quizConfig, questionTypes: ["single", "multiple"] } }, async () => JSON.stringify([question]));
    assert.equal(ambiguous, null, "missing type cannot be inferred from mixed requested types");
    assert.deepEqual(failures, ["invalid-model-output", "invalid-model-output"]);
  } finally {
    if (prior === undefined) delete process.env.OPENQUANTUM_GENERATION_RESOURCE_DIR;
    else process.env.OPENQUANTUM_GENERATION_RESOURCE_DIR = prior;
  }
});

test("actual quiz question card remains editable for existing missing-type records", options, async (context) => {
  const require = createRequire(path.join(upstream, "package.json"));
  if (!existsSync(path.join(upstream, "node_modules/react-dom/server.js"))) { context.skip("Installed original UI is needed for quiz editor regression"); return; }
  const output = path.join(fixtureRoot, "quiz-card.mjs");
  const modules = {
    "motion/react": "import React from 'react'; const Item = props => React.createElement('div', null, props.children); export const Reorder = { Item }; export const motion = { div: Item }; export const useDragControls = () => ({start(){}});",
    "@/lib/hooks/use-i18n": "export const useI18n = () => ({t:key=>key});",
    "@/lib/utils": "export const cn = (...values) => values.filter(Boolean).join(' ');",
    surface: "export const addQuizOption=()=>{},deleteQuizOption=()=>{},deleteQuizQuestion=()=>{},reorderQuizOptions=()=>{},setQuizQuestionType=()=>{},toggleQuizCorrect=()=>{},typeQuizOptionLabel=()=>{},typeQuizQuestion=()=>{};",
  };
  await build({
    entryPoints: [path.join(directory, "components/edit/surfaces/quiz/QuestionCard.tsx")],
    bundle: true, platform: "node", format: "esm", outfile: output, jsx: "automatic", logLevel: "silent",
    nodePaths: [path.join(upstream, "node_modules")],
    alias: { react: require.resolve("react"), "react/jsx-runtime": require.resolve("react/jsx-runtime") },
    plugins: [{ name: "isolated-editor-presentation", setup(builder) {
      builder.onResolve({ filter: /^(motion\/react|@\/)|\/use-quiz-surface$|^\.\/use-quiz-surface$/ }, args => args.path === "@/lib/edit/element-id" ? { path: path.join(directory, "lib/edit/element-id.ts") } : ({ path: args.path.endsWith("use-quiz-surface") ? "surface" : args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => {
        if (args.path.startsWith("@/components/ui/")) return { contents: "import React from 'react'; const C = props=>React.createElement('div',null,props.children); export const Input=C,Textarea=C,Select=C,SelectContent=C,SelectItem=C,SelectTrigger=C,SelectValue=C;", loader: "js" };
        assert.ok(modules[args.path], `unexpected editor dependency ${args.path}`);
        return { contents: modules[args.path], loader: "js" };
      });
    } }],
  });
  const { QuestionCard } = await import(pathToFileURL(output));
  const { createElement } = require("react"), { renderToStaticMarkup } = require("react-dom/server");
  const question = { id: "legacy-question", question: "Keep this original question", answer: ["B"], options: [{ value: "A", label: "Yes" }, { value: "B", label: "No" }], points: 10 };
  for (const expanded of [false, true]) {
    const markup = renderToStaticMarkup(createElement(QuestionCard, { question, index: 0, expanded, onToggle() {} }));
    assert.ok(markup.includes("Keep this original question"));
    assert.ok(markup.includes("edit.quiz.typeLabel"));
  }
  assert.equal(question.type, undefined, "viewing a damaged record must not silently choose a type");
});
