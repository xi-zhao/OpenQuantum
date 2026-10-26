import katex from 'katex';

/** Stored HTML is a cache. Render its original source with the UI's CSS version. */
export function formulaHtml(element: { latex?: string; html?: string }): string | undefined {
  if (!element.html || !element.latex?.trim()) return element.html;
  try {
    return katex.renderToString(element.latex, { displayMode: true, throwOnError: true, trust: false });
  } catch {
    // Keep legacy or unsupported user-authored formulas without rewriting data.
    return element.html;
  }
}
