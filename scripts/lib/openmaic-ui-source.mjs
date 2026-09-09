import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
const run = promisify(execFile);
export const OPENMAIC_REVISION = "f50a25644c9c3893503cf0727ccf613c0ce1e748";
export const OPENMAIC_VERSION = "1.0.1";
export const sourceDirectory = (root) => path.join(root, ".openquantum/external/openmaic");

// Keep the original pages, styles, editor, quiz and import/export components.
// Only boundary wiring, deployment flags and Chinese defaults are patched.
const patches = {
  "instrumentation.ts": [],
  "app/page.tsx": [
    ["const log = createLogger('Home');", "import { OPENQUANTUM_EMBED, generateQuantumCourse, syncQuantumLibrary } from '@/components/openquantum-bridge';\n\nconst log = createLogger('Home');"],
    ["const hasUsableProvider = hasUsableLLMProvider(providersConfig);", "const hasUsableProvider = OPENQUANTUM_EMBED || hasUsableLLMProvider(providersConfig);"],
    ["void Promise.all([loadClassrooms(), loadFolders()]).finally(() => setHydrated(true));", "void syncQuantumLibrary().catch((error) => toast.error(error.message)).then(() => Promise.all([loadClassrooms(), loadFolders()])).finally(() => setHydrated(true));"],
    ["const userProfile = useUserProfileStore.getState();", "if (OPENQUANTUM_EMBED) {\n        const id = await generateQuantumCourse(form);\n        router.push(`/classroom/${id}`);\n        return;\n      }\n      const userProfile = useUserProfileStore.getState();"],
  ],
  "app/layout.tsx": [
    ["import { ProSwapWatcher }", "import { QuantumBridgeNotice } from '@/components/openquantum-bridge';\nimport { ProSwapWatcher }"],
    ["<ServerProvidersInit />", "<ServerProvidersInit />\n            <QuantumBridgeNotice />"],
  ],
  "lib/hooks/use-i18n.tsx": [
    ["const raw = stored || navigator.language || defaultLocale;", "const raw = stored || (process.env.NEXT_PUBLIC_OPENQUANTUM_EMBED === '1' ? 'zh-CN' : navigator.language) || defaultLocale;"],
  ],
  "components/generation/generation-toolbar.tsx": [
    ["// ─── Constants", "import { OPENQUANTUM_EMBED } from '@/components/openquantum-bridge';\n\n// ─── Constants"],
    ["{configuredProviders.length > 0 ? (", "{OPENQUANTUM_EMBED ? <span className={pillMuted}><Bot className=\"size-3.5\" />OpenQuantum 当前模型</span> : configuredProviders.length > 0 ? ("],
    ["() => [pdfProviderId, 'plain-text'] as const,", "() => OPENQUANTUM_EMBED ? ['plain-text'] as const : [pdfProviderId, 'plain-text'] as const,"],
  ],
  "next.config.ts": [
    ["const nextConfig: NextConfig = {", "const nextConfig: NextConfig = {\n  devIndicators: false,\n  outputFileTracingRoot: process.cwd(),\n  turbopack: { root: process.cwd() },"],
  ],
  "middleware.ts": [
    ["const { pathname } = request.nextUrl;", `const { pathname } = request.nextUrl;
  if (process.env.NEXT_PUBLIC_OPENQUANTUM_EMBED === '1') {
    const host = request.headers.get('host') || '';
    if (!/^(localhost|127\\.0\\.0\\.1):[0-9]+$/.test(host)) return new NextResponse('Invalid host', { status: 403 });
    // Match the upstream runtime-disabled answer before loading database code.
    if (pathname.startsWith('/api/stage-meta/')) return new NextResponse('Not found', { status: 404 });
    // The UI host owns local presentation/storage. Model actions belong to Harness.
    if (pathname.startsWith('/api/') && request.method !== 'GET') {
      return NextResponse.json({ success: false, errorCode: 'NOT_INTEGRATED', error: '此 AI 功能尚未接入 OpenQuantum。建课请使用首页入口；课堂编辑、导入、导出仍可使用。' }, { status: 501 });
    }
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
    let expected = name === "instrumentation.ts"
      ? "// OpenQuantum UI deployment: Harness owns Agent execution and lifecycle.\n// Browser-local course storage does not need a database or background collector.\nexport async function register(): Promise<void> {}\n"
      : original;
    for (const [before, after] of replacements) {
      if (expected.split(before).length !== 2) throw new Error(`OpenMAIC patch no longer matches ${name}`);
      expected = expected.replace(before, after);
    }
    const current = await readFile(path.join(directory, name), "utf8");
    const prior = previous?.files?.find((file) => file.name === name)?.sha256;
    const currentDigest = createHash("sha256").update(current).digest("hex");
    if (current !== original && current !== expected && currentDigest !== prior) throw new Error(`Preserving local changes in OpenMAIC ${name}; overlay not applied.`);
    writes.push([name, expected]);
  }
  writes.push(["components/openquantum-bridge.tsx", await readFile(path.join(root, "runtime/openquantum/openmaic-ui/bridge.tsx"), "utf8")]);
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
    await writeFile(path.join(directory, name), contents);
    digest.update(name).update(contents);
  }
  const manifest = { version: OPENMAIC_VERSION, revision: OPENMAIC_REVISION, overlayDigest: digest.digest("hex"), files: writes.map(([name, contents]) => ({ name, sha256: createHash("sha256").update(contents).digest("hex") })) };
  await writeFile(path.join(directory, ".openquantum-ui.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}
