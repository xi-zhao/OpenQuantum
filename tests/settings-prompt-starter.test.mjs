import assert from "node:assert/strict";
import test from "node:test";
import { starterPromptFor } from "../runtime/chatgpt/ui/prompt-starter.mjs";

test("audit, navigation, and host-scoped Skills receive scope-accurate starter prompts", () => {
  const emlint = starterPromptFor({ id: "emlint-dem-audit", title: "emlint DEM 审计" }, "qec");
  assert.match(emlint, /DEM/);
  assert.doesNotMatch(emlint, /采样预算/);

  const mlGuide = starterPromptFor(
    { id: "quantum-guide-algorithms-quantum-machine-learning", title: "量子机器学习方法选择" },
    "learning",
  );
  assert.match(mlGuide, /筛选最合适的子 Skill/);
  assert.doesNotMatch(mlGuide, /核对数值梯度/);

  const codexDiag = starterPromptFor({ id: "platform-diagnostics", title: "OpenQuantum 平台诊断" }, "reference", { desktop: false });
  assert.match(codexDiag, /Codex/);
  assert.doesNotMatch(codexDiag, /Harness/);

  const desktopDiag = starterPromptFor({ id: "platform-diagnostics", title: "OpenQuantum 平台诊断" }, "reference", { desktop: true });
  assert.match(desktopDiag, /Harness/);

  const qcec = starterPromptFor({ id: "quantum-circuit-verification", title: "量子电路等价性验证" }, "circuits");
  assert.match(qcec, /OPENQASM 2\.0/);
  assert.match(qcec, /h q\[0\]/);
  assert.match(qcec, /u2\(0,pi\)/);

  assert.equal(starterPromptFor({ id: "unknown-custom-skill", title: "Custom" }, "other"), "");
});
