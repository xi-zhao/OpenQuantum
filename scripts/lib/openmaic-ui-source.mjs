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
    ["'use client';", "'use client';\n\nimport { LearningWordmark } from '@/components/openquantum-wordmark';"],
    ["const log = createLogger('Home');", "import { syncQuantumLibrary } from '@/components/openquantum-bridge';\n\nconst log = createLogger('Home');"],
    ["void Promise.all([loadClassrooms(), loadFolders()]).finally(() => setHydrated(true));", "void syncQuantumLibrary().catch((error) => toast.error(error.message)).then(() => Promise.all([loadClassrooms(), loadFolders()])).finally(() => setHydrated(true));"],
    ['<motion.img\n            src="/logo-horizontal.png"\n            alt="OpenMAIC"', '<motion.div'],
    ['className="h-12 md:h-16 mb-2 -ml-2 md:-ml-3"\n          />', 'className="mb-2 -ml-2 md:-ml-3"\n          >\n            <LearningWordmark className="text-5xl md:text-[64px]" />\n          </motion.div>'],
    ["OpenMAIC Open Source Project", "量子学习通"],
    ['className="min-h-[100dvh] w-full bg-gradient-to-b', 'className="oq-learning-home min-h-[100dvh] w-full bg-gradient-to-b'],
    ['className="fixed top-4 right-4 z-50', 'className="oq-learning-topbar fixed top-4 right-4 z-50'],
    ['{/* Theme Selector */}\n        <div className="relative">', '{/* Appearance follows the parent when embedded. */}\n        <div data-oq-theme-selector className="relative">'],
    ['<div className="w-[1px] h-4 bg-gray-200 dark:bg-gray-700" />\n\n        {/* Settings Button */}', '<div data-oq-theme-selector className="w-[1px] h-4 bg-gray-200 dark:bg-gray-700" />\n\n        {/* Settings Button */}'],
    ['className="absolute inset-0 overflow-hidden pointer-events-none"', 'className="oq-learning-atmosphere absolute inset-0 overflow-hidden pointer-events-none"'],
    ['className="text-sm text-muted-foreground/60 mb-8"', 'className="oq-learning-slogan text-sm text-muted-foreground/60 mb-8"'],
  ],
  "app/layout.tsx": [
    ["title: 'OpenMAIC'", "title: '量子学习通'"],
    ["import './globals.css';", "import './globals.css';\nimport './openquantum-theme.css';"],
    ['<html lang="en" suppressHydrationWarning>', '<html lang="zh-CN" className="oq-learning-theme" suppressHydrationWarning>'],
    ["  title: '量子学习通',", "  title: '量子学习通',\n  icons: { icon: '/openquantum-mark.svg' },"],
  ],
  "lib/brand/brand-config.ts": [
    ["productName: 'OpenMAIC'", "productName: '量子学习通'"],
    ["shortName: 'OpenMAIC'", "shortName: '量子学习通'"],
    ["logoSrc: '/logo-horizontal.png'", "logoSrc: '/openquantum-mark.svg'"],
    ["markSrc: '/openmaic-mark.png'", "markSrc: '/openquantum-mark.svg'"],
    ["themeColor: '#722ed1'", "themeColor: '#061f38'"],
    ["logoHasWordmark: true", "logoHasWordmark: false"],
  ],
  "components/workbench/workspace/WorkspaceHome.tsx": [
    ["'use client';", "'use client';\n\nimport { LearningWordmark } from '@/components/openquantum-wordmark';"],
    ['<img src={brand.logoSrc} alt={brand.productName} className="h-5 w-auto" />', '<LearningWordmark brand={brand} className="text-xl" />'],
    ['<img\n                  src={brand.logoSrc}\n                  alt={brand.productName}\n                  data-testid="pro-workspace-hero-logo"\n                  className="ws-hero-logo"\n                />', '<LearningWordmark\n                  brand={brand}\n                  data-testid="pro-workspace-hero-logo"\n                  className="ws-hero-logo text-[46px] md:text-[56px]"\n                />'],
  ],
  "components/stage/scene-sidebar.tsx": [
    ["'use client';", "'use client';\n\nimport { LearningWordmark } from '@/components/openquantum-wordmark';"],
    ['<img src="/logo-horizontal.png" alt="OpenMAIC" className="h-6" />', '<LearningWordmark className="text-2xl" />'],
    ['className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r', 'className="oq-learning-navigation bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r'],
  ],
  "components/edit/SlideNavRail/SlideNavRail.tsx": [
    ["'use client';", "'use client';\n\nimport { LearningWordmark } from '@/components/openquantum-wordmark';"],
    ['<img src={brand.logoSrc} alt={brand.productName} className="h-6 w-auto" />', '<LearningWordmark brand={brand} className="text-2xl" />'],
    ["'relative flex h-full shrink-0 flex-col overflow-hidden'", "'oq-learning-navigation relative flex h-full shrink-0 flex-col overflow-hidden'"],
  ],
  "components/workbench/workspace/WorkspaceRail.tsx": [
    ["'use client';", "'use client';\n\nimport { LearningWordmark } from '@/components/openquantum-wordmark';"],
    ['<img\n            src={brand.logoSrc}\n            alt=""\n            aria-hidden="true"\n            className="h-[21px] w-auto max-w-[110px] shrink-0"\n          />', '<LearningWordmark brand={brand} className="text-2xl" />'],
  ],
  "components/access-code-modal.tsx": [
    ['\n                OpenMAIC\n', '\n                量子学习通\n'],
  ],
  "components/scene-renderers/pbl/v2/workspace.tsx": [
    ['alt="OpenMAIC"', 'alt="量子学习通"'],
    ['src="/openmaic-mark.png"', 'src="/openquantum-mark.svg"'],
  ],
  "lib/video-export/emit-hyperframes/index.ts": [
    [' — OpenMAIC video export', ' — 量子学习通视频导出'],
    [' — OpenMAIC video</title>', ' — 量子学习通视频</title>'],
  ],
  "lib/hooks/use-i18n.tsx": [
    ["const raw = stored || navigator.language || defaultLocale;", "const raw = stored || (process.env.NEXT_PUBLIC_OPENQUANTUM_EMBED === '1' ? 'zh-CN' : navigator.language) || defaultLocale;"],
  ],
  "lib/hooks/use-theme.tsx": [
    ["type Theme =", "import { useHostTheme } from '@/components/openquantum-use-host-theme';\n\ntype Theme ="],
    ["  const resolvedTheme = theme === 'system' ? systemTheme : theme;", "  const ancestor = useContext(ThemeContext);\n  const hostTheme = useHostTheme(!ancestor);\n  const resolvedTheme = ancestor?.resolvedTheme ?? hostTheme ?? (theme === 'system' ? systemTheme : theme);"],
    ["value={{ theme, setTheme: handleSetTheme, resolvedTheme }}", "value={ancestor ?? { theme: hostTheme ?? theme, setTheme: handleSetTheme, resolvedTheme }}"],
  ],
  "lib/workbench/pro-swap.ts": [
    ["  if (typeof doc.startViewTransition !== 'function' || prefersReducedMotion()) {", `  // Embedded WebViews can crash while capturing shared-element transitions.
  // Use the upstream immediate navigation path inside the OpenQuantum frame.
  const embedded = process.env.NEXT_PUBLIC_OPENQUANTUM_EMBED === '1' && window.parent !== window;
  if (embedded || typeof doc.startViewTransition !== 'function' || prefersReducedMotion()) {`],
  ],
  "components/generation/generation-toolbar.tsx": [
    ['<div className="flex items-center gap-1 flex-wrap">', '<div className="oq-learning-controls flex items-center gap-1 flex-wrap">'],
    ['className="flex min-w-0 shrink-0 items-center gap-1"', 'className="oq-learning-controls flex min-w-0 shrink-0 items-center gap-1"'],
  ],
  "components/stage/header-controls.tsx": [
    ['<div className="flex items-center gap-4">', '<div className="oq-learning-controls flex items-center gap-4">'],
    ["'shrink-0 flex items-center gap-1 backdrop-blur-md shadow-sm rounded-full'", "'oq-learning-topbar shrink-0 flex items-center gap-1 backdrop-blur-md shadow-sm rounded-full'"],
    ["aria-label={t('settings.theme')}", "data-oq-theme-selector aria-label={t('settings.theme')}"],
  ],
  "components/edit/EditShell/CommandBar.tsx": [
    ['<header className="flex h-20', '<header className="oq-learning-commandbar flex h-20'],
  ],
  "components/header.tsx": [
    ['<header className="h-20 px-8', '<header className="oq-learning-commandbar h-20 px-8'],
  ],
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
  // Localized product copy is separate from package names, storage keys,
  // protocol headers, upstream source links and license attribution.
  const { stdout: localePaths } = await run("git", ["ls-files", "lib/i18n/locales", "lib/i18n/workbench-locales"], { cwd: directory });
  const localizedFiles = new Set(["lib/i18n/workbench.ts", ...localePaths.trim().split("\n").filter((name) => name.endsWith(".json"))]);
  const appearanceFiles = new Set(["app/generation-preview/page.tsx", "components/edit/EditShell/EditShell.tsx", "components/edit/PlaybackChromeRoot.tsx"]);
  const files = { ...Object.fromEntries([...localizedFiles, ...appearanceFiles].map((name) => [name, []])), ...patches };
  for (const [name, replacements] of Object.entries(files)) {
    const { stdout: original } = await run("git", ["show", `${OPENMAIC_REVISION}:${name}`], { cwd: directory, maxBuffer: 2 * 1024 * 1024 });
    let expected = original;
    for (const [before, after] of replacements) {
      if (expected.split(before).length !== 2) throw new Error(`OpenMAIC patch no longer matches ${name}`);
      expected = expected.replace(before, after);
    }
    if (localizedFiles.has(name)) expected = expected.replaceAll("OpenMAIC", "量子学习通");
    if (appearanceFiles.has(name)) {
      expected = expected
        .replaceAll('bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900', 'bg-background')
        .replaceAll('bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-950 dark:to-zinc-900', 'bg-muted')
        .replaceAll('bg-gray-50 dark:bg-gray-900', 'bg-background')
        .replaceAll('bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl', 'bg-card')
        .replaceAll('fixed inset-0 overflow-hidden pointer-events-none z-0', 'oq-learning-atmosphere fixed inset-0 overflow-hidden pointer-events-none z-0');
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
  writes.push(["components/openquantum-wordmark.tsx", await readFile(path.join(root, "runtime/openquantum/openmaic-ui/wordmark.tsx"), "utf8")]);
  writes.push(["components/openquantum-use-host-theme.ts", await readFile(path.join(root, "runtime/openquantum/openmaic-ui/use-host-theme.ts"), "utf8")]);
  writes.push(["tests/openquantum/pro-swap.test.ts", await readFile(path.join(root, "runtime/openquantum/openmaic-ui/pro-swap.test.ts"), "utf8")]);
  writes.push(["app/openquantum-theme.css", await readFile(path.join(root, "runtime/openquantum/openmaic-ui/theme.css"), "utf8")]);
  writes.push(["lib/openquantum-ui-theme.mjs", await readFile(path.join(root, "src/learning/ui-theme.mjs"), "utf8")]);
  writes.push(["public/openquantum-mark.svg", await readFile(path.join(root, "packages/openquantum-web-branding/assets/mark.svg"), "utf8")]);
  writes.push(["lib/openquantum-library-migration.mjs", await readFile(path.join(root, "src/learning/library-migration.mjs"), "utf8")]);
  writes.push(["app/api/openquantum/status/route.ts", `export function GET() { return Response.json({ revision: '${OPENMAIC_REVISION}', instance: process.env.OPENQUANTUM_UI_INSTANCE }); }\n`]);
  const digest = createHash("sha256");
  for (const [name, contents] of writes.filter(([name]) => !Object.hasOwn(files, name))) {
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
