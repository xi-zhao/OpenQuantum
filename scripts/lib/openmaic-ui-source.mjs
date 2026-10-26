import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { dictionariesFor, languages } from "../../runtime/openquantum/web-locales/catalog.mjs";
const run = promisify(execFile);
export const OPENMAIC_REVISION = "29735f10d0081859ac3db1a50a0cc92f46436004";
export const OPENMAIC_VERSION = "1.0.1";
export const sourceDirectory = (root) => path.join(root, ".openquantum/external/openmaic");

// Preserve the full upstream product. Empty replacement lists restore former
// UI-only patches (including the disabled instrumentation and API blockers).
const patches = {
  "components/edit/surfaces/quiz/QuestionCard.tsx": [
    ["  const accent = TYPE_ACCENT[q.type];", "  const accent = TYPE_ACCENT[q.type] ?? { badge: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300', rail: 'from-neutral-400 to-neutral-500' };"],
    ["{t(`edit.quiz.type.${q.type}`)}", "{TYPES.includes(q.type) ? t(`edit.quiz.type.${q.type}`) : t('edit.quiz.typeLabel')}"],
    ["<SelectValue />", "<SelectValue placeholder={t('edit.quiz.typeLabel')} />"],
  ],
  "lib/server/agent-runtime/generation-tools.ts": [
    ["  brief: Type.String({ minLength: 1 }),", `  quizConfig: Type.Optional(Type.Object({
    questionCount: Type.Integer({ minimum: 1 }),
    difficulty: Type.Union([Type.Literal('easy'), Type.Literal('medium'), Type.Literal('hard')]),
    questionTypes: Type.Array(Type.Union([Type.Literal('single'), Type.Literal('multiple'), Type.Literal('text')]), { minItems: 1, maxItems: 3, uniqueItems: true }),
  }, { description: 'Quiz pages only. Supply the exact requested number and question types here; the brief does not override the default quiz count.' })),
  brief: Type.String({ minLength: 1 }),`],
    ["      const requestedMedia = params.media ?? [];", "      if (params.quizConfig && params.type !== 'quiz') return result('quizConfig is only accepted for quiz pages.', { error: 'quiz-config-requires-quiz' }, true);\n      const requestedMedia = params.media ?? [];"],
    ["        keyPoints: params.materialFacts ?? [],", "        keyPoints: params.materialFacts ?? [],\n        ...(params.type === 'quiz' && params.quizConfig ? { quizConfig: params.quizConfig } : {}),"],
  ],
  "packages/@openmaic/generation/src/scene-generator.ts": [
    ["  // Ensure each question has an ID and normalize options format\n  const questions: QuizQuestion[] = generatedQuestions.map((q) => {", `  // A single declared type is unambiguous when the model omits its type field.
  const requestedTypes = quizConfig.questionTypes.map((type) => type === 'text' ? 'short_answer' : type);
  if (generatedQuestions.some((q) => !q || typeof q !== 'object' || Array.isArray(q))) {
    onFailure?.({ code: 'invalid-model-output' });
    return null;
  }
  const typedQuestions = generatedQuestions.map((q) => ({ ...q, type: q.type ?? (requestedTypes.length === 1 ? requestedTypes[0] : undefined) }));
  if ((outline.quizConfig && typedQuestions.length !== quizConfig.questionCount) || typedQuestions.some((q) => !q.type || !['single', 'multiple', 'short_answer'].includes(q.type) || (outline.quizConfig && !requestedTypes.includes(q.type)))) {
    log.error('Generated quiz does not match the declared count or question types.');
    onFailure?.({ code: 'invalid-model-output' });
    return null;
  }
  // Ensure each question has an ID and normalize options format.
  const questions: QuizQuestion[] = typedQuestions.map((item) => {
    const q = { ...item, type: item.type as QuizQuestion['type'] };`],
  ],
  "components/slide-renderer/components/element/LatexElement/BaseLatexElement.tsx": [
    ["import { useRef, useState, useLayoutEffect } from 'react';", "import { useRef, useState, useLayoutEffect, useMemo } from 'react';\nimport { formulaHtml } from '@/components/openquantum-latex';"],
    ["export function BaseLatexElement({ elementInfo }: BaseLatexElementProps) {", "export function BaseLatexElement({ elementInfo }: BaseLatexElementProps) {\n  const html = useMemo(() => formulaHtml(elementInfo), [elementInfo.latex, elementInfo.html]);"],
    ["{elementInfo.html ? (", "{html ? ("],
    ["html={elementInfo.html}", "html={html}"],
  ],
  "components/slide-renderer/components/element/LatexElement/index.tsx": [
    ["import { useRef, useState, useLayoutEffect } from 'react';", "import { useRef, useState, useLayoutEffect, useMemo } from 'react';\nimport { formulaHtml } from '@/components/openquantum-latex';"],
    ["  const handleSelectElement =", "  const html = useMemo(() => formulaHtml(elementInfo), [elementInfo.latex, elementInfo.html]);\n  const handleSelectElement ="],
    ["{elementInfo.html ? (", "{html ? ("],
    ["html={elementInfo.html}", "html={html}"],
  ],
  "packages/@openmaic/renderer/src/elements/latex/BaseLatexElement.tsx": [
    ["import { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';", "import { useCallback, useEffect, useRef, useState, useLayoutEffect, useMemo } from 'react';\nimport { formulaHtml } from '../../formula-html';"],
    ["export function BaseLatexElement({ elementInfo }: BaseLatexElementProps) {", "export function BaseLatexElement({ elementInfo }: BaseLatexElementProps) {\n  const html = useMemo(() => formulaHtml(elementInfo), [elementInfo.latex, elementInfo.html]);"],
    ["{elementInfo.html ? (", "{html ? ("],
    ["html={elementInfo.html}", "html={html}"],
  ],
  "packages/mathml2omml/src/mathml/text_container.js": [
    ["const STYLES = {", "const STYLES = {\n  normal: 'p',"],
  ],
  "packages/mathml2omml/src/mathml/mrow.js": [
    ["  if (children.length >= 2) {", "  // Empty fence pairs are visible punctuation, not editable empty operands.\n  if (children.length > 2) {"],
    ["const begChar = first.children?.[0]?.data || '('", "const begChar = first.children?.[0]?.data || ''"],
    ["const endChar = last.children?.[0]?.data || ')'", "const endChar = last.children?.[0]?.data || ''"],
  ],
  "lib/export/latex-to-omml.ts": [
    ["  // Strip DOCX-only xmlns:w and redundant xmlns:m from <m:oMath>", "  // Math styles remain in m:rPr. Remove Word run properties before dropping\n  // their namespace, then supply PowerPoint's DrawingML run properties.\n  result = result.replace(/<w:rPr(?:\\/>|>[\\s\\S]*?<\\/w:rPr>)/g, '');\n\n  // Strip DOCX-only xmlns:w and redundant xmlns:m from <m:oMath>"],
    ["  result = result.replace(/<m:r>(\\s*)<m:t/g, `<m:r>$1${rpr}$1<m:t`);", "  result = result.replace(/<m:r>(?!<a:rPr)/g, `<m:r>${rpr}`);"],
  ],
  "lib/export/use-export-pptx.ts": [
    ["import { type AST, toAST } from '@/lib/export/html-parser';", "import { type AST, toAST } from '@/lib/export/html-parser';\nimport { exportCssProperties, pptxFontFace } from '@/lib/export/openquantum-text-export';"],
    ["        const styleArr = styleAttr.value.split(';');\n        for (const styleItem of styleArr) {\n          const match = styleItem.match(/([^:]+):\\s*(.+)/);\n          if (match) {\n            const [key, value] = [match[1].trim(), match[2].trim()];\n            if (key && value) styleObj[key] = value;\n          }\n        }", "        Object.assign(styleObj, exportCssProperties(styleAttr.value));"],
    ["if (styleObj['font-family']) options.fontFace = styleObj['font-family'];", "if (styleObj['font-family']) options.fontFace = pptxFontFace(styleObj['font-family']);"],
    ["import { latexToOmml } from '@/lib/export/latex-to-omml';", "import { latexToOmml } from '@/lib/export/latex-to-omml';\nimport { formulaFontSize } from '@/lib/export/openquantum-formula-layout';"],
    ["        // Try native OMML formula first (editable in PowerPoint)\n        // Estimate line count from \\\\ line breaks to compute a fitting font size.\n        // Formula rendered height ≈ lines * 1.5 * fontSize, so fontSize ≈ boxHeight / (lines * 1.5)\n        const lineBreaks = (el.latex?.match(/\\\\\\\\/g) || []).length;\n        const lines = lineBreaks + 1;\n        const boxHeightPt = el.height / ratioPx2Pt;\n        const fontSize = Math.round(boxHeightPt / (lines * 3));", "        // Keep native editable math at the classroom's measured size.\n        const fontSize = await formulaFontSize(el, ratioPx2Pt);"],
  ],
  "components/workbench/chat/system-notice.ts": [
    ["import type { ChatNode, SystemTone }", "import { modelFailureCopy } from '@/components/openquantum-model-failure';\nimport type { ChatNode, SystemTone }"],
    ["  return {\n    tone,\n    summary,", "  const modelFailure = tone === 'error' && node.copyKey === 'workbench.system.runFailed' ? modelFailureCopy(detail) : undefined;\n  if (modelFailure) return { tone, summary: oneLine(t(modelFailure.summary)), hint: oneLine(t(modelFailure.hint)), ...(detail ? { detail } : {}) };\n  return {\n    tone,\n    summary,"],
  ],
  "lib/i18n/workbench.ts": [
    ["    runFailed: 'This build failed',", "    runFailed: 'This build failed',\n    modelNetworkFailed: 'The model connection failed',\n    modelNetworkHint: 'Check the model connection, then send a message to continue. Saved content remains available',"],
    ["    runFailed: '本轮生成失败',", "    runFailed: '本轮生成失败',\n    modelNetworkFailed: '模型网络连接失败',\n    modelNetworkHint: '请检查模型连接，恢复后再发送消息继续；已保存的内容仍可查看',"],
  ],
  "packages/pptxgenjs/src/gen-xml.ts": [
    ["strSlideXml += '  <a:bodyPr wrap=\"square\" rtlCol=\"0\"><a:spAutoFit/></a:bodyPr>'\n\t\t\t\tstrSlideXml += '  <a:lstStyle/>'\n\t\t\t\tstrSlideXml += '  <a:p>'", "strSlideXml += '  <a:bodyPr wrap=\"none\" lIns=\"0\" tIns=\"0\" rIns=\"0\" bIns=\"0\" anchor=\"ctr\" rtlCol=\"0\"><a:noAutofit/></a:bodyPr>'\n\t\t\t\tstrSlideXml += '  <a:lstStyle/>'\n\t\t\t\tstrSlideXml += '  <a:p>'"],
  ],
  "packages/@openmaic/generation/src/prompts/loader.ts": [
    ["const DEFAULT_PROMPTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..');", "const DEFAULT_PROMPTS_DIR = process.env.OPENQUANTUM_GENERATION_RESOURCE_DIR || resolve(dirname(fileURLToPath(import.meta.url)), '../..');"],
  ],
  "packages/@openmaic/generation/src/pbl/prompts/loader.ts": [
    ["const PROMPTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../prompts-pbl');", "const PROMPTS_DIR = process.env.OPENQUANTUM_GENERATION_RESOURCE_DIR ? resolve(process.env.OPENQUANTUM_GENERATION_RESOURCE_DIR, 'prompts-pbl') : resolve(dirname(fileURLToPath(import.meta.url)), '../../../prompts-pbl');"],
  ],
  "lib/workbench/use-workbench-session.ts": [
    ["      .then((r) => (r.ok ? r.json() : null))", `      .then((r) => {
        if (!r.ok) throw r;
        return r.json();
      })`],
    ["      .catch(() => {});\n    // Read the resume point", `      .catch((error: unknown) => {
        if (!isCurrent() || connected) return;
        const status = error instanceof Response ? error.status : 0;
        // A denied/missing conversation cannot recover by replaying this URL.
        // Network/server errors retain upstream EventSource retry behavior.
        if ([401, 403, 404].includes(status)) {
          source.close();
          window.clearTimeout(replayWatchdog);
        }
        setAttached(false);
        finishReplayState();
        setError('openquantum:session-connection:' + status);
      });
    // Read the resume point`],
    ["setError('event stream closed');", `const terminal = ['succeeded', 'failed', 'cancelled'].includes(useWorkbenchStore.getState().status);
        if (!terminal) setError('openquantum:session-connection:0');`],
  ],
  "components/workbench/workspace/WorkspaceChatPane.tsx": [
    ["import { LoaderCircle } from 'lucide-react';", "import { LoaderCircle } from 'lucide-react';\nimport { SessionConnectionNotice, isSessionConnectionError, sessionConnectionTitle } from '@/components/openquantum-session-connection';"],
    ["  const { t } = useI18n();\n  const sessionPrompt", "  const { t, locale } = useI18n();\n  const connectionError = useWorkbenchStore((s) => isSessionConnectionError(s.error) && !s.attached);\n  const sessionPrompt"],
    ["presentation.tone === 'live' ? (", "presentation.tone === 'live' && !connectionError ? ("],
    ["presentation.tone === 'error' && 'ws-dot-fail'", "(connectionError || presentation.tone === 'error') && 'ws-dot-fail'"],
    ["{t(presentation.labelKey)}", "{connectionError ? sessionConnectionTitle(locale) : t(presentation.labelKey)}"],
    ["      </header>\n\n      <div", "      </header>\n      <SessionConnectionNotice />\n\n      <div"],
  ],
  "pnpm-lock.yaml": [],
  "package.json": [
    ['"next": "16.2.11"', '"next": "16.3.4"'],
    ['"react": "19.2.3"', '"react": "19.3.0"'],
    ['"react-dom": "19.2.3"', '"react-dom": "19.3.0"'],
    ['"katex": "^0.16.33"', '"katex": "0.18.7"'],
    ['"pnpm": {', '"pnpm": {\n    "overrides": { "katex": "0.18.7" },'],
  ],
  "app/api/generate/scene-outlines-stream/route.ts": [
    ["const textStream = streamLLM(", "const fullStream = streamLLM("],
    [").textStream;", ").fullStream;"],
    ["for await (const chunk of textStream)", "for await (const part of fullStream)"],
    ["                fullText += chunk;", `                // textStream omits SDK error events. A failed request must
                // not finalize the successfully parsed prefix of its output.
                if (part.type === 'error') throw part.error;
                if (part.type !== 'text-delta') continue;
                const chunk = part.text;
                fullText += chunk;`],
    ["              lastError = error instanceof Error ? error.message : String(error);", `              parsedOutlines = [];
              languageDirective = null;
              courseTitle = null;
              lastError = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
                ? error.message : String(error);`],
  ],
  "instrumentation.ts": [],
  "app/page.tsx": [
    ["import { useImportPptx } from '@/lib/import/use-import-pptx';", "import { useImportPptx } from '@/lib/import/use-import-pptx';\nimport { embedPptxMedia, savePptxClassroom } from '@/lib/import/openquantum-pptx-classroom';"],
    ["// PPTX import is still scaffolding: `useImportPptx` has no `onImported` consumer\n// yet, so the flow only logs the parsed slides. Hide the entry point behind a\n// flag until it's wired end-to-end, so the UI doesn't expose a no-op button.", "// PPTX imports persist complete classroom documents before reporting success."],
    ["  const handleImportSuccess = async (importedStageId: string) => {\n    const folderId = importFolderRef.current;\n    importFolderRef.current = undefined;", "  const pptxImportFolderRef = useRef<string | undefined>(undefined);\n  const handleImportSuccess = async (importedStageId: string, folderId?: string) => {"],
    ["useImportClassroom(handleImportSuccess)", `useImportClassroom((id) => {
    const folderId = importFolderRef.current;
    importFolderRef.current = undefined;
    return handleImportSuccess(id, folderId);
  })`],
    ["  } = useImportPptx();", `  } = useImportPptx({
    upload: embedPptxMedia,
    onImported: async (slides, filename) => {
      const id = await savePptxClassroom(slides, filename, (index) => t('import.pptxPage', { index }));
      await handleImportSuccess(id, pptxImportFolderRef.current);
    },
  });
  const triggerPptxImport = () => {
    pptxImportFolderRef.current = currentFolderId;
    triggerPptxFileSelect();
  };`],
    ["onClick={triggerPptxFileSelect}", "onClick={triggerPptxImport}"],
    ["'use client';", "'use client';\n\nimport { LearningWordmark } from '@/components/openquantum-wordmark';"],
    ["const log = createLogger('Home');", "import { syncQuantumLibrary } from '@/components/openquantum-bridge';\n\nconst log = createLogger('Home');"],
    ["void Promise.all([loadClassrooms(), loadFolders()]).finally(() => setHydrated(true));", "void syncQuantumLibrary().catch((error) => toast.error(error.message)).then(() => Promise.all([loadClassrooms(), loadFolders()])).finally(() => setHydrated(true));"],
    ['<motion.img\n            src="/logo-horizontal.png"\n            alt="OpenMAIC"', '<motion.div'],
    ['className="h-12 md:h-16 mb-2 -ml-2 md:-ml-3"\n          />', 'className="mb-2 -ml-2 md:-ml-3"\n          >\n            <LearningWordmark className="text-5xl md:text-[64px]" />\n          </motion.div>'],
    ["OpenMAIC Open Source Project", "OpenQuantum"],
    ['className="min-h-[100dvh] w-full bg-gradient-to-b', 'className="oq-learning-home min-h-[100dvh] w-full bg-gradient-to-b'],
    ['className="fixed top-4 right-4 z-50', 'className="oq-learning-topbar fixed top-4 right-4 z-50'],
    ['{/* Theme Selector */}\n        <div className="relative">', '{/* Appearance follows the parent when embedded. */}\n        <div data-oq-theme-selector className="relative">'],
    ['<div className="w-[1px] h-4 bg-gray-200 dark:bg-gray-700" />\n\n        {/* Settings Button */}', '<div data-oq-theme-selector className="w-[1px] h-4 bg-gray-200 dark:bg-gray-700" />\n\n        {/* Settings Button */}'],
    ['className="absolute inset-0 overflow-hidden pointer-events-none"', 'className="oq-learning-atmosphere absolute inset-0 overflow-hidden pointer-events-none"'],
    ['className="text-sm text-muted-foreground/60 mb-8"', 'className="oq-learning-slogan text-sm text-muted-foreground/60 mb-8"'],
  ],
  "lib/import/use-import-pptx.ts": [
    ["   * Until a caller wires this, the hook just logs the slides for inspection.", "   * Await the consumer's durable save before reporting success."],
    ["onImported?: (slides: Slide[]) => void;", "onImported?: (slides: Slide[], filename: string) => void | Promise<void>;"],
    ["      try {\n        // Static URL", "      let saving = false;\n      try {\n        if (!onImported) throw new Error('PPTX import has no persistence consumer.');\n        // Static URL"],
    ["        onImported?.(slides);", "        if (!slides.length) throw new Error('PPTX contains no slides.');\n        saving = true;\n        toast.loading(t('import.writingCourse'), { id: toastId });\n        await onImported(slides, file.name);"],
    ["t(notDeployed ? 'import.error.parserUnavailable' : 'import.error.invalidPptx')", "t(notDeployed ? 'import.error.parserUnavailable' : saving ? 'import.error.savePptx' : 'import.error.invalidPptx')"],
  ],
  "lib/i18n/locales/zh-CN.json": [
    ['"pptxSuccess": "PPTX 解析成功（共 {{count}} 页，输出已打印到控制台）",', '"pptxSuccess": "PPTX 已导入并保存（共 {{count}} 页）",\n    "pptxPage": "第 {{index}} 页",'],
    ['"invalidPptx": "PPTX 解析失败，请检查文件是否有效。",', '"invalidPptx": "PPTX 解析失败，请检查文件是否有效。",\n      "savePptx": "PPTX 未能保存为课程，请检查存储连接后重新导入。",'],
  ],
  "lib/i18n/locales/en-US.json": [
    ['"pptxSuccess": "PPTX parsed successfully ({{count}} slides, output logged to console)",', '"pptxSuccess": "PPTX imported and saved ({{count}} slides)",\n    "pptxPage": "Page {{index}}",'],
    ['"invalidPptx": "Failed to parse PPTX. Please check the file is valid.",', '"invalidPptx": "Failed to parse PPTX. Please check the file is valid.",\n      "savePptx": "Could not save the PPTX as a classroom. Check the storage connection and import again.",'],
  ],
  "app/layout.tsx": [
    ["title: 'OpenMAIC'", "title: 'Quantum Learning · OpenQuantum'"],
    ["import './globals.css';", "import './globals.css';\nimport './openquantum-theme.css';"],
    ['<html lang="en" suppressHydrationWarning>', '<html lang="en" className="oq-learning-theme" suppressHydrationWarning>'],
    ["  title: 'Quantum Learning · OpenQuantum',", "  title: 'Quantum Learning · OpenQuantum',\n  icons: { icon: '/openquantum-mark.svg' },"],
  ],
  "lib/brand/brand-config.ts": [
    ["productName: 'OpenMAIC'", "productName: 'Quantum Learning'"],
    ["shortName: 'OpenMAIC'", "shortName: 'Quantum Learning'"],
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
    ['\n                OpenMAIC\n', "\n                {t('openquantum.name')}\n"],
  ],
  "components/scene-renderers/pbl/v2/workspace.tsx": [
    ['alt="OpenMAIC"', "alt={t('openquantum.name')}"],
    ['src="/openmaic-mark.png"', 'src="/openquantum-mark.svg"'],
  ],
  "lib/video-export/emit-hyperframes/index.ts": [
    [' — OpenMAIC video export', ' — Quantum Learning video export'],
    [' — OpenMAIC video</title>', ' — Quantum Learning video</title>'],
  ],
  "lib/hooks/use-i18n.tsx": [
    ["const LOCALE_STORAGE_KEY", "import { isEmbedded, requestHostLocale, useHostLocale } from '@/components/openquantum-use-host-locale';\n\nconst LOCALE_STORAGE_KEY"],
    ["  const locale = (i18n.language || defaultLocale) as Locale;", "  useHostLocale(i18n);\n  const locale = (i18n.language || defaultLocale) as Locale;"],
    ["  useEffect(() => {\n    try {", "  useEffect(() => {\n    if (isEmbedded()) return;\n    try {"],
    ["  const setLocale = (newLocale: Locale) => {", "  const setLocale = (newLocale: Locale) => {\n    if (requestHostLocale(newLocale)) return;"],
  ],
  "lib/i18n/locales.ts": [
    ["export const supportedLocales = [", "import languages from '@/lib/openquantum-languages.json';\n\nconst upstreamLocales = ["],
    ["] as const satisfies readonly LocaleEntry[];", `] as const satisfies readonly LocaleEntry[];

// Keep the embedded selector in sync with the deployment's single language list.
export const supportedLocales = languages.map(({ learningLocale }) => {
  const locale = upstreamLocales.find(({ code }) => code === learningLocale);
  if (!locale) throw new Error('Missing learning locale: ' + learningLocale);
  return locale;
});`],
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
    models: [{ id: 'harness-default', name: 'OpenQuantum' }],
  },`],
  ],
  "lib/server/resolve-model.ts": [
    ["import type { NextRequest } from 'next/server';", "import type { NextRequest } from 'next/server';\nimport { resolveOpenQuantumModelInfo, assertOpenQuantumMaterialSupport } from '@/lib/server/openquantum-model-info';"],
    ["  const { model, modelInfo } = getModel({", "  const { model, modelInfo: catalogModelInfo } = getModel({"],
    ["  // Thinking arbitration mirrors model routing", "  const modelInfo = await resolveOpenQuantumModelInfo(providerId, modelId, catalogModelInfo);\n\n  // Thinking arbitration mirrors model routing"],
    ["  return resolveModelFromHeaders(req, stage, getThinkingConfigFromBody(body));", "  const resolved = await resolveModelFromHeaders(req, stage, getThinkingConfigFromBody(body));\n  assertOpenQuantumMaterialSupport(resolved, body);\n  return resolved;"],
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

export function patchOpenMaicUiSource(name, original) {
  let expected = original;
  for (const [before, after] of patches[name] || []) {
    if (expected.split(before).length !== 2) throw new Error(`OpenMAIC patch no longer matches ${name}`);
    expected = expected.replace(before, after);
  }
  if (name === "packages/pptxgenjs/src/gen-xml.ts") {
    // Typeface names are XML attributes, including user-authored quotes and '&'.
    expected = expected.replaceAll('typeface="${opts.fontFace}"', 'typeface="${encodeXmlEntities(opts.fontFace)}"')
      .replaceAll('typeface="${slide._slideNumberProps.fontFace}"', 'typeface="${encodeXmlEntities(slide._slideNumberProps.fontFace)}"');
  }
  return expected;
}

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
  for (const name of Object.keys(files)) {
    const { stdout: original } = await run("git", ["show", `${OPENMAIC_REVISION}:${name}`], { cwd: directory, maxBuffer: 2 * 1024 * 1024 });
    let expected = patchOpenMaicUiSource(name, original);
    if (name === "pnpm-lock.yaml") expected = await readFile(path.join(root, "runtime/openquantum/openmaic-ui/pnpm-lock.yaml"), "utf8");
    if (localizedFiles.has(name)) {
      expected = expected.replaceAll("OpenMAIC", /\/zh[-.]|\/zh-CN\./.test(name) ? "量子学习通" : "Quantum Learning");
      const language = languages.find(({ learningLocale }) => name === `lib/i18n/locales/${learningLocale}.json`);
      if (language) expected = JSON.stringify({ ...JSON.parse(expected), openquantum: dictionariesFor(language.id)["openquantum.learning"] }, null, 2) + "\n";
    }
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
  writes.push(["lib/server/openquantum-model-info.ts", await readFile(path.join(root, "runtime/openquantum/openmaic-ui/model-info.ts"), "utf8")]);
  writes.push(["lib/import/openquantum-pptx-classroom.ts", await readFile(path.join(root, "runtime/openquantum/openmaic-ui/pptx-classroom.ts"), "utf8")]);
  writes.push(["components/openquantum-wordmark.tsx", await readFile(path.join(root, "runtime/openquantum/openmaic-ui/wordmark.tsx"), "utf8")]);
  writes.push(["components/openquantum-use-host-theme.ts", await readFile(path.join(root, "runtime/openquantum/openmaic-ui/use-host-theme.ts"), "utf8")]);
  writes.push(["components/openquantum-session-connection.tsx", await readFile(path.join(root, "runtime/openquantum/openmaic-ui/session-connection.tsx"), "utf8")]);
  writes.push(["components/openquantum-latex.ts", await readFile(path.join(root, "runtime/openquantum/openmaic-ui/latex.ts"), "utf8")]);
  writes.push(["components/openquantum-model-failure.ts", await readFile(path.join(root, "runtime/openquantum/openmaic-ui/model-failure.ts"), "utf8")]);
  writes.push(["lib/export/openquantum-formula-layout.ts", await readFile(path.join(root, "runtime/openquantum/openmaic-ui/formula-layout.ts"), "utf8")]);
  writes.push(["lib/export/openquantum-text-export.ts", await readFile(path.join(root, "runtime/openquantum/openmaic-ui/text-export.ts"), "utf8")]);
  writes.push(["packages/@openmaic/renderer/src/formula-html.ts", await readFile(path.join(root, "runtime/openquantum/openmaic-ui/latex.ts"), "utf8")]);
  writes.push(["components/openquantum-use-host-locale.ts", await readFile(path.join(root, "runtime/openquantum/openmaic-ui/use-host-locale.ts"), "utf8")]);
  writes.push(["lib/openquantum-ui-locale.mjs", (await readFile(path.join(root, "src/learning/ui-locale.mjs"), "utf8")).replace("../../runtime/openquantum/web-locales/languages.json", "./openquantum-languages.json")]);
  writes.push(["lib/openquantum-languages.json", await readFile(path.join(root, "runtime/openquantum/web-locales/languages.json"), "utf8")]);
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
