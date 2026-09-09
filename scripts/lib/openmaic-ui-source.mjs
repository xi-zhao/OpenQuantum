import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
const run = promisify(execFile);
export const OPENMAIC_REVISION = "f50a25644c9c3893503cf0727ccf613c0ce1e748";
export const OPENMAIC_VERSION = "1.0.1";
export const sourceDirectory = (root) => path.join(root, ".openquantum/external/openmaic");

// Preserve the full upstream product. Empty replacement lists restore former
// UI-only patches (including the disabled instrumentation and API blockers).
const patches = {
  "instrumentation.ts": [],
  "app/page.tsx": [
    ["const log = createLogger('Home');", "import { syncQuantumLibrary } from '@/components/openquantum-bridge';\n\nconst log = createLogger('Home');"],
    ["void Promise.all([loadClassrooms(), loadFolders()]).finally(() => setHydrated(true));", "void syncQuantumLibrary().catch((error) => toast.error(error.message)).then(() => Promise.all([loadClassrooms(), loadFolders()])).finally(() => setHydrated(true));"],
  ],
  "app/layout.tsx": [],
  "lib/hooks/use-i18n.tsx": [
    ["const raw = stored || navigator.language || defaultLocale;", "const raw = stored || (process.env.NEXT_PUBLIC_OPENQUANTUM_EMBED === '1' ? 'zh-CN' : navigator.language) || defaultLocale;"],
  ],
  "components/generation/generation-toolbar.tsx": [],
  "lib/ai/providers.ts": [
    ["export const PROVIDERS: Record<ProviderId, ProviderConfig> = {", `export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  'custom-openquantum': {
    id: 'custom-openquantum', name: 'OpenQuantum', type: 'openai',
    requiresApiKey: true, defaultBaseUrl: '',
    models: [{ id: 'harness-default', name: 'OpenQuantum 当前模型' }],
  },`],
  ],
  "lib/server/provider-config.ts": [
    ["  return {\n    providers,\n    tts:", `  if (process.env.OPENQUANTUM_MODEL_GATEWAY_URL && process.env.OPENQUANTUM_MODEL_GATEWAY_TOKEN) {
    providers['custom-openquantum'] = {
      apiKey: process.env.OPENQUANTUM_MODEL_GATEWAY_TOKEN,
      baseUrl: process.env.OPENQUANTUM_MODEL_GATEWAY_URL,
      models: ['harness-default'],
    };
  }
  return {
    providers,
    tts:`],
  ],
  "next.config.ts": [
    ["const nextConfig: NextConfig = {", "const nextConfig: NextConfig = {\n  devIndicators: false,\n  outputFileTracingRoot: process.cwd(),\n  turbopack: { root: process.cwd() },"],
  ],
  "middleware.ts": [
    ["const { pathname } = request.nextUrl;", `const { pathname } = request.nextUrl;
  if (process.env.NEXT_PUBLIC_OPENQUANTUM_EMBED === '1') {
    const host = request.headers.get('host') || '';
    if (!/^(localhost|127\\.0\\.0\\.1):[0-9]+$/.test(host)) return new NextResponse('Invalid host', { status: 403 });
    const origin = request.headers.get('origin');
    if (pathname.startsWith('/api/') && origin && origin !== 'http://' + host) return new NextResponse('Invalid origin', { status: 403 });
  }`],
  ],
};

export async function applyOpenMaicUiOverlay(root) {
  const directory = sourceDirectory(root);
  const { stdout } = await run("git", ["rev-parse", "HEAD"], { cwd: directory });
  if (stdout.trim() !== OPENMAIC_REVISION) throw new Error("OpenMAIC source revision differs from the pinned release; no files changed.");
  let previous;
  try { previous = JSON.parse(await readFile(path.join(directory, ".openquantum-ui.json"), "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const writes = [];
  for (const [name, replacements] of Object.entries(patches)) {
    const { stdout: original } = await run("git", ["show", `${OPENMAIC_REVISION}:${name}`], { cwd: directory, maxBuffer: 2 * 1024 * 1024 });
    let expected = original;
    for (const [before, after] of replacements) {
      if (expected.split(before).length !== 2) throw new Error(`OpenMAIC patch no longer matches ${name}`);
      expected = expected.replace(before, after);
    }
    if (name === "instrumentation.ts") {
      // Preserve every upstream startup/shutdown action while keeping Node
      // APIs out of Next's Edge compilation (the early-return form still warns).
      writes.push(["instrumentation-node.ts", original]);
      expected = "export async function register(): Promise<void> {\n  if (process.env.NEXT_RUNTIME === 'nodejs') {\n    const node = await import('./instrumentation-node');\n    await node.register();\n  }\n}\n";
    }
    const current = await readFile(path.join(directory, name), "utf8");
    const prior = previous?.files?.find((file) => file.name === name)?.sha256;
    const currentDigest = createHash("sha256").update(current).digest("hex");
    if (current !== original && current !== expected && currentDigest !== prior) throw new Error(`Preserving local changes in OpenMAIC ${name}; overlay not applied.`);
    writes.push([name, expected]);
  }
  writes.push(["components/openquantum-bridge.tsx", await readFile(path.join(root, "runtime/openquantum/openmaic-ui/bridge.tsx"), "utf8")]);
  writes.push(["lib/openquantum-library-migration.mjs", await readFile(path.join(root, "src/learning/library-migration.mjs"), "utf8")]);
  writes.push(["app/api/openquantum/status/route.ts", `export function GET() { return Response.json({ revision: '${OPENMAIC_REVISION}', instance: process.env.OPENQUANTUM_UI_INSTANCE }); }\n`]);
  const digest = createHash("sha256");
  for (const [name, contents] of writes.filter(([name]) => !Object.hasOwn(patches, name))) {
    try {
      const current = await readFile(path.join(directory, name), "utf8");
      const prior = previous?.files?.find((file) => file.name === name)?.sha256;
      if (current !== contents && createHash("sha256").update(current).digest("hex") !== prior) throw new Error(`Preserving local changes in OpenMAIC ${name}; overlay not applied.`);
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  for (const [name, contents] of writes) {
    await mkdir(path.dirname(path.join(directory, name)), { recursive: true });
    let current;
    try { current = await readFile(path.join(directory, name), "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
    if (current !== contents) await writeFile(path.join(directory, name), contents);
    digest.update(name).update(contents);
  }
  const manifest = { version: OPENMAIC_VERSION, revision: OPENMAIC_REVISION, overlayDigest: digest.digest("hex"), files: writes.map(([name, contents]) => ({ name, sha256: createHash("sha256").update(contents).digest("hex") })) };
  await writeFile(path.join(directory, ".openquantum-ui.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}
