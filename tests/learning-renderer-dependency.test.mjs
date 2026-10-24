import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const generationRequire = createRequire(import.meta.resolve("@openmaic/generation"));
const renderer = generationRequire("katex");

test("the generation dependency does not inherit trusted rendering from options prototypes", () => {
  const options = Object.assign(Object.create({ trust: true }), { throwOnError: false, output: "html" });
  const html = renderer.renderToString(String.raw`\includegraphics{https://untrusted.invalid/tracker}`, options);
  assert.doesNotMatch(html, /<img\b/);
});

test("the generation dependency retains display math and invalid-input behavior", () => {
  const options = { throwOnError: false, displayMode: true, output: "html" };
  for (const formula of [String.raw`\sum_{n=0}^{\infty} \frac{x^n}{n!}`, String.raw`\begin{pmatrix}0 & 1 \\ 1 & 0\end{pmatrix}`]) {
    assert.match(renderer.renderToString(formula, options), /class="katex-display"/);
  }
  assert.match(renderer.renderToString(String.raw`\frac{`, options), /katex-error/);
});

// The original Desktop baseline also brings KaTeX through its UI primitives.
test("the pinned Harness renderer uses the same safe formula dependency", () => {
  const harnessRequire = createRequire(import.meta.resolve("@deepseek-ai/dsh-client-ui-primitives"));
  const nativeRenderer = harnessRequire("katex");
  assert.equal(nativeRenderer.version, renderer.version);
  const options = Object.assign(Object.create({ trust: true }), { throwOnError: false, output: "html" });
  assert.doesNotMatch(nativeRenderer.renderToString(String.raw`\includegraphics{https://untrusted.invalid/tracker}`, options), /<img\b/);
  assert.match(nativeRenderer.renderToString(String.raw`\frac{1}{2}`, { displayMode: true }), /katex-display/);
});
