import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { createModelGateway, GATEWAY_MODEL } from "../src/learning/model-gateway.mjs";
import { OPENMAIC_REVISION, patchOpenMaicUiSource } from "../scripts/lib/openmaic-ui-source.mjs";

const run = promisify(execFile);
const image = "data:image/png;base64,AQID";
const textBody = { model: GATEWAY_MODEL, messages: [{ role: "user", content: "Read this" }] };
const imageBody = { ...textBody, messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: image } }] }] };

async function pinnedRoute(context) {
  const root = process.env.OPENQUANTUM_OPENMAIC_SDK_ROOT || fileURLToPath(new URL("../.openquantum/external/openmaic", import.meta.url));
  const require = createRequire(path.join(root, "package.json"));
  let sdkPath, openaiPath;
  try {
    sdkPath = pathToFileURL(require.resolve("ai")).href;
    openaiPath = pathToFileURL(require.resolve("@ai-sdk/openai")).href;
    assert.equal(require("ai/package.json").version, "6.0.168");
    assert.equal(require("@ai-sdk/openai/package.json").version, "3.0.84");
  } catch (error) {
    if (error.code !== "MODULE_NOT_FOUND" || process.env.OPENQUANTUM_OPENMAIC_SDK_ROOT) throw error;
    context.skip("Installed pinned OpenMAIC SDK required; set OPENQUANTUM_OPENMAIC_SDK_ROOT");
    return null;
  }
  assert.equal((await run("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim(), OPENMAIC_REVISION);
  const source = async (name) => (await run("git", ["show", `${OPENMAIC_REVISION}:${name}`], { cwd: root, maxBuffer: 1024 * 1024 })).stdout;
  const sortSource = await source("lib/document/bundle.ts");
  const generation = pathToFileURL(path.join(root, "packages/@openmaic/generation/dist/index.js")).href;
  const modules = {
    entry: "export {POST} from 'route'; export {resolveModel} from '@/lib/server/resolve-model';",
    route: patchOpenMaicUiSource("app/api/generate/scene-outlines-stream/route.ts", await source("app/api/generate/scene-outlines-stream/route.ts")),
    "@/lib/server/resolve-model": patchOpenMaicUiSource("lib/server/resolve-model.ts", await source("lib/server/resolve-model.ts")),
    "@/lib/server/openquantum-model-info": await readFile(new URL("../runtime/openquantum/openmaic-ui/model-info.ts", import.meta.url), "utf8"),
    "@/lib/ai/providers": `import {createOpenAI} from ${JSON.stringify(openaiPath)};
      export const parseModelString = value => {const [providerId,modelId] = value.split('/');return {providerId,modelId}};
      export const getProvider = () => ({type:'openai'});
      export const getModel = ({modelId,baseUrl,apiKey}) => ({model:createOpenAI({baseURL:baseUrl,apiKey}).chat(modelId),modelInfo:{id:modelId,name:'OpenQuantum'}});`,
    "@/lib/server/provider-config": `export const isServerConfiguredProvider = () => true;
      export const resolveApiKey = () => process.env.OPENQUANTUM_MODEL_GATEWAY_TOKEN;
      export const resolveBaseUrl = () => process.env.OPENQUANTUM_MODEL_GATEWAY_URL;
      export const resolveProxy = () => undefined;`,
    "@/lib/server/ssrf-guard": "export const validateUrlForSSRF = () => null;",
    "@/lib/server/fetch-with-redirect-validation": "export const fetchWithRedirectValidation = fetch;",
    "@/lib/server/model-routes": "export const getStageRoute = () => undefined;",
    "@/lib/ai/llm": `import {streamText} from ${JSON.stringify(sdkPath)}; export const streamLLM = params => streamText({...params,maxRetries:0,onError(){}});`,
    "@openmaic/generation": `export * from ${JSON.stringify(generation)}; export const buildOutlinePrompt = () => ({system:'Fixture',user:'Read the material'});`,
    "@/lib/prompts": "export const PROMPT_IDS = {}; export const buildPrompt = () => ({system:'Fixture',user:'Read the material'});",
    "@/lib/constants/generation": "export const MAX_PDF_CONTENT_CHARS = 10000, MAX_VISION_IMAGES = 20;",
    "@/lib/server/api-response": "export const apiError = (errorCode,status,error) => Response.json({success:false,errorCode,error},{status});",
    "@/lib/logger": "export const createLogger = () => ({info(){},warn(){},error(){}});",
    "@/lib/document/bundle": sortSource.slice(sortSource.indexOf("export function sortDocumentImagesForVision<"), sortSource.indexOf("export function buildDocumentBundle(")),
    // Inline material bytes need no asset store. The real route still chooses,
    // assembles and sends the image via the real generation helper and AI SDK.
    "@/lib/persistence/resolve-vision-images": "export const resolveVisionImagesForPrompt = async images => images;",
    "@/lib/config/feature-flags": "export const resolveVocationalActive = () => false;",
    nanoid: "export const nanoid = () => crypto.randomUUID();",
  };
  const compiled = await build({ entryPoints: ["entry"], bundle: true, write: false, format: "esm", platform: "node", plugins: [{ name: "pinned-route", setup(plugin) {
    plugin.onResolve({ filter: /.*/ }, ({ path: name }) => name.startsWith("file:") ? { path: name, external: true } : { path: name, namespace: "fixture" });
    plugin.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path: name }) => {
      assert.ok(Object.hasOwn(modules, name), `Unexpected route dependency: ${name}`);
      return { contents: modules[name], loader: "ts" };
    });
  } }] });
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
}

function configureGateway(context, gateway) {
  for (const [name, value] of Object.entries({ OPENQUANTUM_MODEL_GATEWAY_URL: gateway.url, OPENQUANTUM_MODEL_GATEWAY_TOKEN: gateway.token, DEFAULT_MODEL: "custom-openquantum/harness-default" })) {
    const previous = process.env[name];
    process.env[name] = value;
    context.after(() => { if (previous === undefined) delete process.env[name]; else process.env[name] = previous; });
  }
}

test("pinned outlines route follows current Harness vision metadata and sends image bytes through the real SDK", async (context) => {
  const route = await pinnedRoute(context);
  if (!route) return;
  let mode = "vision";
  const calls = [], images = [], resolutions = [];
  const gateway = await createModelGateway({ selection: () => ({ provider: "private-provider", model: mode }), attachments: { async saveImage(value) { images.push(value); return { attachmentId: "material-image" }; } }, llm: {
    async resolveModelInfo(provider, model) { resolutions.push({ provider, model }); return { inputModalities: mode === "unknown" ? undefined : mode === "vision" ? ["text", "image"] : ["text"] }; },
    async *stream(options) { calls.push(options); yield { type: "text-delta", text: '{"outlines":[{"id":"one","title":"One","type":"slide","description":"One","keyPoints":[]}]}' }; yield { type: "finish", reason: { kind: "stop" } }; },
  } });
  context.after(() => gateway.dispose());
  configureGateway(context, gateway);
  const material = { requirements: { requirement: "Read the attached figure" }, pdfImages: [{ id: "img_1", pageNumber: 1, src: image }], imageMapping: { img_1: image } };
  const post = (body) => route.POST(new Request("http://localhost/api/generate/scene-outlines-stream", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  assert.match(await (await post(material)).text(), /"type":"done"/);
  assert.equal(calls[0].model, "vision");
  assert.equal(calls[0].messages[0].content.filter((part) => part.type === "image").length, 1);
  assert.deepEqual(images[0].data, Buffer.from([1, 2, 3]));
  assert.equal(resolutions.length, 2, "metadata lookup plus final send-time image guard");
  for (mode of ["text", "unknown"]) {
    const rejected = await post(material);
    assert.equal(rejected.status, 500);
    assert.match((await rejected.json()).error, mode === "text" ? /不支持图片输入/ : /无法确认.*支持图片输入/);
  }
  assert.equal(calls.length, 1);
  assert.equal(images.length, 1, "rejected material is never saved or sent");
  mode = "text";
  assert.match(await (await post({ requirements: material.requirements })).text(), /"type":"done"/);
  assert.equal(calls.at(-1).model, "text");
  mode = "vision";
  assert.match(await (await post(material)).text(), /"type":"done"/);
  assert.equal(images.length, 2, "switching back refreshes the capability without restart");
  const beforeOtherProvider = resolutions.length;
  const other = await route.resolveModel({ modelString: "openai/other-model" });
  assert.equal(other.modelInfo.id, "other-model");
  assert.equal(resolutions.length, beforeOtherProvider, "unrelated providers retain their own catalog");
});

test("private metadata and the final image guard reject stale capability, unknown support and raw resolver failures", async (context) => {
  let mode = "vision", failed = false, saved = 0, streamed = 0;
  const gateway = await createModelGateway({ selection: () => ({ provider: "private-provider", model: mode }), attachments: { saveImage() { saved++; return {}; } }, llm: {
    async resolveModelInfo() { if (failed) throw new Error("secret-token private-url"); return mode === "unknown" ? {} : { inputModalities: mode === "vision" ? ["text", "image"] : ["text"] }; },
    async *stream() { streamed++; yield { type: "finish", reason: { kind: "stop" } }; },
  } });
  context.after(() => gateway.dispose());
  const headers = { authorization: `Bearer ${gateway.token}` };
  const metadata = (extra) => fetch(`${gateway.url}/models`, { headers: { ...headers, ...extra } });
  assert.equal((await metadata({ authorization: "Bearer wrong" })).status, 403);
  assert.equal((await metadata({ origin: "http://localhost" })).status, 403);
  const info = await (await metadata()).json();
  assert.equal(info.data[0].capabilities.vision, true);
  assert.doesNotMatch(JSON.stringify(info), /private-provider|vision".*model|secret/);
  for (mode of ["text", "unknown"]) {
    const response = await fetch(`${gateway.url}/chat/completions`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(imageBody) });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error.message, mode === "text" ? /不支持图片输入/ : /无法确认/);
  }
  assert.equal(saved, 0);
  assert.equal(streamed, 0);
  failed = true;
  const failedMetadata = await metadata();
  assert.equal(failedMetadata.status, 502);
  assert.doesNotMatch(await failedMetadata.text(), /secret-token|private-url/);
});
