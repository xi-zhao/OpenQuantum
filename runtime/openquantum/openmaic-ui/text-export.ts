/** Decode the editor's HTML attribute before asking the browser to parse CSS. */
export function exportCssProperties(value: string): Record<string, string> {
  const decoder = document.createElement('textarea');
  decoder.innerHTML = value;
  const element = document.createElement('span');
  element.style.cssText = decoder.value;
  return Object.fromEntries(Array.from(element.style).map((name) => [name, element.style.getPropertyValue(name).trim()]));
}

/** PowerPoint takes one typeface, while CSS can include quoting and fallbacks. */
export function pptxFontFace(value: string): string {
  const match = value.match(/^\s*(?:"([^"]*)"|'([^']*)'|([^,]+))/);
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim();
}
