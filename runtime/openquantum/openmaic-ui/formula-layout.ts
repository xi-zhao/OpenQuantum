import { formulaHtml } from '@/components/openquantum-latex';

/** Use the classroom's natural formula size and fit both axes of its frame. */
export async function formulaFontSize(
  element: { latex?: string; html?: string; width: number; height: number },
  ratioPx2Pt: number,
): Promise<number> {
  const html = formulaHtml(element);
  const baseFontPx = 16;
  if (!html || typeof document === 'undefined') return baseFontPx / ratioPx2Pt;

  const measure = document.createElement('div');
  measure.className = 'slide-renderer-prose';
  Object.assign(measure.style, {
    position: 'fixed', left: '-100000px', top: '0', visibility: 'hidden',
    width: 'max-content', whiteSpace: 'nowrap', fontSize: `${baseFontPx}px`,
  });
  measure.innerHTML = html;
  // The renderer removes display margins; export may also run outside a slide.
  measure.querySelectorAll<HTMLElement>('.katex-display').forEach((display) => { display.style.margin = '0'; });
  document.body.appendChild(measure);
  try {
    measure.getBoundingClientRect(); // Start loading the actual KaTeX faces.
    await document.fonts?.ready;
    const naturalWidth = measure.scrollWidth;
    const naturalHeight = measure.scrollHeight;
    const math = measure.querySelector<HTMLElement>('.katex');
    const fontPx = math ? parseFloat(getComputedStyle(math).fontSize) : baseFontPx;
    if (!(naturalWidth > 0 && naturalHeight > 0 && fontPx > 0)) return baseFontPx / ratioPx2Pt;
    const scale = Math.min(element.width / naturalWidth, element.height / naturalHeight, 1);
    return Math.max(0.01, Math.round(fontPx * scale / ratioPx2Pt * 100) / 100);
  } finally { measure.remove(); }
}
