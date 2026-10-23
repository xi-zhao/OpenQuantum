import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { build } from "esbuild";
import { OPENMAIC_REVISION, patchOpenMaicUiSource } from "../scripts/lib/openmaic-ui-source.mjs";

const run = promisify(execFile), root = fileURLToPath(new URL("..", import.meta.url));
const upstream = process.env.OPENQUANTUM_OPENMAIC_SDK_ROOT || path.join(root, ".openquantum/external/openmaic");
let directory, classroom, importHook, pg, PGlite, missing;
const original = async (name) => (await run("git", ["show", `${OPENMAIC_REVISION}:${name}`], { cwd: upstream })).stdout;

before(async () => {
  const require = createRequire(path.join(upstream, "packages/@openmaic/storage/package.json"));
  try {
    ({ PGlite } = require("@electric-sql/pglite"));
    pg = await import(pathToFileURL(path.join(upstream, "packages/@openmaic/storage/dist/document/pg.js")));
  } catch (error) {
    if (error.code !== "MODULE_NOT_FOUND" || process.env.OPENQUANTUM_OPENMAIC_SDK_ROOT) throw error;
    missing = "Installed pinned OpenMAIC storage required; set OPENQUANTUM_OPENMAIC_SDK_ROOT";
    return;
  }
  assert.equal((await run("git", ["rev-parse", "HEAD"], { cwd: upstream })).stdout.trim(), OPENMAIC_REVISION);
  directory = await mkdtemp(path.join(tmpdir(), "oq-pptx-import-"));
  const canonicalize = await original("lib/document-store/canonicalize.ts");
  await build({
    entryPoints: [path.join(root, "runtime/openquantum/openmaic-ui/pptx-classroom.ts")], bundle: true, platform: "node", format: "esm", outfile: path.join(directory, "classroom.mjs"), logLevel: "silent",
    plugins: [{ name: "document-store-fixture", setup(builder) {
      builder.onResolve({ filter: /^@\/lib\/document-store$/ }, () => ({ path: "store", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ loader: "ts", contents: `${canonicalize}\nexport async function mutateDocument(id, work, _deps, options) { globalThis.__oqPptx.mutations.push({id,options}); return work(null, globalThis.__oqPptx.store); }` }));
    } }],
  });
  classroom = await import(pathToFileURL(path.join(directory, "classroom.mjs")));
  await writeFile(path.join(directory, "parser.mjs"), "export const importPptx = async () => globalThis.__oqPptx.slides;\n");
  const hookSource = patchOpenMaicUiSource("lib/import/use-import-pptx.ts", await original("lib/import/use-import-pptx.ts"))
    .replace("'/vendor/maic-importer/index.js'", JSON.stringify(pathToFileURL(path.join(directory, "parser.mjs")).href));
  const modules = {
    react: "export const useRef = () => ({current:null}); export const useCallback = f => f; export const useState = () => [false, ()=>{}];",
    sonner: "export const toast = Object.fromEntries(['loading','success','error'].map(kind=>[kind,text=>{globalThis.__oqPptx.notices.push({kind,text});return 1;}]));",
    "@/lib/hooks/use-i18n": "export const useI18n=()=>({t:key=>key});",
    "@/lib/logger": "export const createLogger=()=>({info(){},error(){}});",
  };
  await build({
    stdin: { contents: hookSource, resolveDir: upstream, loader: "ts" }, bundle: true, platform: "node", format: "esm", outfile: path.join(directory, "hook.mjs"), logLevel: "silent",
    plugins: [{ name: "hook-browser-fixture", setup(builder) {
      builder.onResolve({ filter: /^(react|sonner|@\/)/ }, (args) => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => { assert.ok(modules[args.path]); return { contents: modules[args.path], loader: "js" }; });
    } }],
  });
  importHook = await import(pathToFileURL(path.join(directory, "hook.mjs")));
});

after(async () => { delete globalThis.__oqPptx; if (directory) await rm(directory, { recursive: true, force: true }); });
function state(store, slides = []) { return globalThis.__oqPptx = { store, slides, notices: [], mutations: [] }; }
const event = () => ({ target: { files: [{ name: "Bell.PPTX" }], value: "chosen" } });
const slide = { id: "slide-one", elements: [], viewportSize: 1000, viewportRatio: 0.5625, script: "Keep these notes." };
function localFetch(context) { const previous = globalThis.fetch; globalThis.fetch = async () => ({ ok: true }); context.after(() => { globalThis.fetch = previous; }); }

test("actual import callback persists through the PostgreSQL store and a disk database reopen", async (context) => {
  if (missing) return context.skip(missing);
  localFetch(context);
  const dataDirectory = path.join(directory, "postgres");
  let database = new PGlite(dataDirectory);
  context.after(async () => { if (database) await database.close(); });
  await pg.ensureDocumentSchema(database);
  const store = new pg.PgDocumentStore(database, { ownerId: "fixture-owner", withTransaction: (work) => database.transaction(work) });
  const media = await classroom.embedPptxMedia(new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }), "image.png");
  const slides = [{ ...slide, elements: [{ id: "image-one", type: "image", src: media, left: 0, top: 0, width: 120, height: 80, rotate: 0, fixedRatio: true }] }, { ...slide, id: "slide-two", script: "Second note." }];
  const saved = state(store, slides);
  let id;
  await importHook.useImportPptx({ upload: classroom.embedPptxMedia, onImported: async (pages, filename) => {
    id = await classroom.savePptxClassroom(pages, filename, (index) => `Page ${index}`);
  } }).handleFileChange(event());
  assert.ok(id);
  assert.equal(saved.notices.at(-1).kind, "success");
  assert.equal(saved.mutations.length, 1);
  await database.close();
  database = new PGlite(dataDirectory);
  const reopened = new pg.PgDocumentStore(database, { ownerId: "fixture-owner", withTransaction: (work) => database.transaction(work) });
  const document = await reopened.loadDocument(id);
  assert.equal(document.stage.name, "Bell");
  assert.deepEqual(document.scenes.map((scene) => scene.order), [1, 2]);
  assert.deepEqual(document.scenes.map((scene) => scene.content.canvas), slides);
  assert.deepEqual(document.scenes.map((scene) => scene.actions[0].text), [slide.script, "Second note."]);
  assert.equal(document.scenes[0].content.canvas.elements[0].src, media);
  assert.equal(document.outline.generationComplete, true);
  assert.equal((await reopened.listDocuments()).length, 1);
});

test("the actual hook waits for the save and reports its failure instead of success", async (context) => {
  if (missing) return context.skip(missing);
  localFetch(context);
  const gate = Promise.withResolvers(), entered = Promise.withResolvers();
  const saved = state({ async saveDocument() { entered.resolve(); await gate.promise; } }, [slide]);
  const pending = importHook.useImportPptx({ onImported: (pages, filename) => classroom.savePptxClassroom(pages, filename, String) }).handleFileChange(event());
  await entered.promise;
  assert.equal(saved.notices.some((notice) => notice.kind === "success"), false);
  gate.reject(new Error("storage unavailable"));
  await pending;
  assert.equal(saved.notices.at(-1).text, "import.error.savePptx");
  assert.equal(saved.notices.some((notice) => notice.kind === "success"), false);
});

test("empty decks, tab-only media and missing consumers cannot report a saved course", async (context) => {
  if (missing) return context.skip(missing);
  localFetch(context);
  const saved = state({ saveDocument() { assert.fail("invalid import reached persistence"); } });
  await assert.rejects(classroom.savePptxClassroom([], "empty.pptx", String), /no slides/);
  await assert.rejects(classroom.savePptxClassroom([{ ...slide, elements: [{ src: "blob:temporary" }] }], "media.pptx", String), /durably/);
  await importHook.useImportPptx().handleFileChange(event());
  assert.equal(saved.notices.some((notice) => notice.kind === "success"), false);
  assert.equal(saved.mutations.length, 0);
});

test("the homepage and emitted overlay wire the durable importer", async (context) => {
  if (missing) return context.skip(missing);
  const homepage = patchOpenMaicUiSource("app/page.tsx", await original("app/page.tsx"));
  assert.match(homepage, /onImported: async \(slides, filename\)/);
  assert.match(homepage, /await savePptxClassroom\(slides, filename/);
  assert.match(homepage, /upload: embedPptxMedia/);
  assert.match(await readFile(path.join(root, "scripts/lib/openmaic-ui-source.mjs"), "utf8"), /writes\.push\(\["lib\/import\/openquantum-pptx-classroom\.ts"/);
});
