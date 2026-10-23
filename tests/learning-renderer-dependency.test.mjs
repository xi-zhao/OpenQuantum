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
