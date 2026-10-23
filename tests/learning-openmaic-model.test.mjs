import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";
import { createModelGateway, GATEWAY_MODEL } from "../src/learning/model-gateway.mjs";
import { OPENMAIC_REVISION, patchOpenMaicUiSource } from "../scripts/lib/openmaic-ui-source.mjs";

const run = promisify(execFile);
const selection = { provider: "fixture", model: "fixture" };
const partialOutline = '{"outlines":[{"id":"one","title":"First","type":"slide","description":"First scene","keyPoints":[]}]';

async function installedSdk(context) {
  const root = process.env.OPENQUANTUM_OPENMAIC_SDK_ROOT || fileURLToPath(new URL("../.openquantum/external/openmaic", import.meta.url));
  const require = createRequire(path.join(root, "package.json"));
  try {
    const ai = require("ai"), openai = require("@ai-sdk/openai");
    assert.equal(require("ai/package.json").version, "6.0.168");
    assert.equal(require("@ai-sdk/openai/package.json").version, "3.0.84");
    assert.equal((await run("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim(), OPENMAIC_REVISION);
    return { ...ai, ...openai, root };
  } catch (error) {
    if (error.code !== "MODULE_NOT_FOUND" || process.env.OPENQUANTUM_OPENMAIC_SDK_ROOT) throw error;
    context.skip("Installed pinned OpenMAIC SDK required; set OPENQUANTUM_OPENMAIC_SDK_ROOT");
    return null;
  }
}

async function outlineConsumer(root) {
  const name = "app/api/generate/scene-outlines-stream/route.ts";
  const { stdout } = await run("git", ["show", `${OPENMAIC_REVISION}:${name}`], { cwd: root });
  const source = patchOpenMaicUiSource(name, stdout);
  const helpers = source.slice(source.indexOf("function extractLanguageDirective("), source.indexOf("export async function POST("));
  const start = source.indexOf("    const encoder = new TextEncoder();");
  const end = source.indexOf("\n    return new Response(stream, {", start);
  assert.ok(start >= 0 && end > start);
  // The actual upstream parser, retry loop and finalization are executed.
  // Only prompt construction and presentation helpers outside that path are fixtures.
  const code = `const nanoid = () => crypto.randomUUID(); ${helpers}
    export function createStream(dependencies) {
      const { languageModel, req, streamLLM } = dependencies;
      const visionImages = undefined, prompts = {system:"Fixture",user:"Fixture"}, modelInfo = {}, thinkingConfig = undefined;
      const taskEngineMode = false, requirements = {requirement:"Fixture"}, log = {warn(){},error(){}};
      const uniquifyMediaElementIds = value => value, DEFAULT_LANGUAGE_DIRECTIVE = "Fixture";
      ${source.slice(start, end)} return stream;
    }`;
  const compiled = await transform(code, { loader: "ts", format: "esm" });
  return (await import(`data:text/javascript;base64,${Buffer.from(compiled.code).toString("base64")}`)).createStream;
}

test("real SDK and pinned outline consumer reject startup and partial failures, then recover on retry", async (context) => {
  const sdk = await installedSdk(context);
  if (!sdk) return;
  const createStream = await outlineConsumer(sdk.root);
  let mode, calls = 0;
  const gateway = await createModelGateway({ selection: () => selection, llm: { async *stream() {
    calls++;
    if (mode !== "startup") yield { type: "text-delta", text: partialOutline + (mode === "recovery" && calls === 3 ? "}" : "") };
    yield { type: "finish", reason: mode === "recovery" && calls === 3 ? { kind: "stop" } : { kind: "error", failure: { code: "NETWORK_ERROR", message: "private-provider-detail" } } };
  } } });
  context.after(() => gateway.dispose());
  for (mode of ["startup", "partial", "recovery"]) {
    calls = 0;
    const statuses = [];
    const model = sdk.createOpenAI({ baseURL: gateway.url, apiKey: gateway.token, fetch: async (input, init) => {
      assert.equal(new URL(input instanceof Request ? input.url : input).origin, new URL(gateway.url).origin);
      const response = await fetch(input, { ...init, redirect: "error" });
      statuses.push(response.status);
      return response;
    } }).chat(GATEWAY_MODEL);
    const stream = createStream({ languageModel: model, req: { signal: new AbortController().signal }, streamLLM: (params) => sdk.streamText({ ...params, maxRetries: 0, onError() {} }) });
    const events = (await new Response(stream).text()).split("\n\n").filter((line) => line.startsWith("data: ")).map((line) => JSON.parse(line.slice(6)));
    assert.equal(calls, 3, "the original three-attempt policy remains authoritative");
    assert.deepEqual(statuses, [1, 2, 3].map(() => mode === "startup" ? 502 : 200));
    assert.equal(events.filter((event) => event.type === "retry").length, 2);
    assert.equal(events.some((event) => event.type === "done"), mode === "recovery");
    if (mode === "recovery") assert.equal(events.at(-1).outlines.length, 1);
    else {
      assert.match(events.at(-1).error, /连接未完成/);
      assert.doesNotMatch(events.at(-1).error, /empty response|private-provider-detail|\[object Object\]/);
    }
  }
});
