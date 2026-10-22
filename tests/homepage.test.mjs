import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildHomepage } from "../scripts/build-homepage.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const html = await readFile(path.join(root, "site/index.html"), "utf8");
const json = async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"));
const caseHtml = (id) => html.match(new RegExp(`<article[^>]+id="case-${id}"[\\s\\S]+?</article>`))[0];

test("QuTiP displayed timing, speedup and check scope agree with the frozen measured data", async () => {
  const measured = await json("experiments/qutip-rust-wigner/results/summary.json");
  const section = caseHtml("qutip");
  assert.ok(section.includes(`${measured.baseline_ms.toFixed(2)}<span>ms</span>`));
  assert.ok(section.includes(`${measured.rust_ms.toFixed(2)}<span>ms</span>`));
  assert.ok(section.includes(`${(measured.baseline_ms / measured.rust_ms).toFixed(2)}×`));
  assert.ok(section.includes(`${measured.task.dimension} 维单模 Fock 空间`));
  assert.ok(section.includes(`${measured.task.nx} × ${measured.task.ny} 网格`));
  assert.ok(section.includes(`${measured.checks} 项独立、解析及拒绝路径检查`));
  assert.ok(section.includes("最大绝对差 <strong>6.52 × 10<sup>−16</sup>"));
  assert.equal(measured.max_default_error.toExponential(2), "6.52e-16");
  assert.ok(section.includes("提速仅对应此项固定输入计算"));
});

test("PennyLane copy uses full calls and the declared input rather than the faster isolated kernel", async () => {
  const measured = await json("experiments/pennylane-rust-commutator/results/benchmark.json");
  const chosen = measured.cases.find((item) => item.id === "local-32q-pool512");
  const section = caseHtml("pennylane");
  const baseline = chosen.timings.pennylane.median_seconds * 1000;
  const rust = chosen.timings.rust_end_to_end.median_seconds * 1000;
  assert.ok(section.includes(`${baseline.toFixed(2)}<span>ms</span>`));
  assert.ok(section.includes(`${rust.toFixed(2)}<span>ms</span>`));
  assert.ok(section.includes(`${(baseline / rust).toFixed(2)}×`));
  assert.ok(section.includes(`${chosen.qubits} 量子位`));
  assert.ok(section.includes(`${chosen.actual_left_terms} 项 Hamiltonian × ${chosen.actual_right_terms} 项算符池`));
  assert.ok(measured.cases.every((item) => item.correctness.rust_end_to_end.passed));
  assert.ok(section.includes(`${measured.cases.length} 个基准输入`));
  assert.ok(section.includes("5.09 倍仅对应此项输入"));
  assert.ok(section.includes("包含双向转换与结果构造"));
});

test("portable output contains every referenced asset, intact original evidence and valid local anchors", async () => {
  const output = await buildHomepage();
  const built = await readFile(path.join(output, "index.html"), "utf8");
  const css = await readFile(path.join(output, "style.css"), "utf8");
  assert.equal(built, html);
  const ids = [...built.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const [, href] of built.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (href.startsWith("./")) await access(path.join(output, href));
    if (href.startsWith("#") && href.length > 1) assert.ok(ids.includes(href.slice(1)), href);
    assert.ok(!href.startsWith("file:") && !href.includes("localhost"));
  }
  for (const [, url] of css.matchAll(/url\("([^"]+)"\)/g)) await access(path.join(output, url));
  const manifest = JSON.parse(await readFile(path.join(output, "provenance.json"), "utf8"));
  for (const item of manifest.assets) {
    assert.deepEqual(await readFile(path.join(root, item.source)), await readFile(path.join(output, item.destination)), item.source);
  }
});
