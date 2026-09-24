import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, "examples/quantum-algorithms/coverage.json"), "utf8"));
const reference = JSON.parse(await readFile(path.join(root, "src/quantum-practices/upstream/source.json"), "utf8"));
const check = process.argv.includes("--check");
assert.equal(manifest.guides.length, 66);
assert.equal(manifest.guides.filter(row => row.algorithm).length, 49);
assert.equal(manifest.guides.filter(row => row.sourceAlgorithm).length, 39);
assert.equal(manifest.guides.filter(row => row.invocation === "manual").length, 13);
assert.ok(manifest.guides.every(row => ["manual", "automatic"].includes(row.invocation)));
assert.deepEqual(manifest.guides.map(row => [row.guideId, row.guideSha256]), reference.guides.map(row => [row.id, row.sha256]));
assert.equal(new Set(manifest.guides.map(row => row.skill)).size, 66);

function children(row) {
  const candidates = manifest.guides.filter(item => item.guideId.startsWith(`${row.guideId}/`));
  if (row.invocation === "manual") return candidates.filter(item => item.invocation !== "manual");
  return candidates.filter(item => !candidates.some(parent => item.guideId.startsWith(`${parent.guideId}/`)));
}

function render(row) {
  const title = row.algorithm ?? row.guideId;
  const description = row.algorithm
    ? `使用开源 SDK 完成 ${row.algorithm.replaceAll("_", " ")} 的解释、计算和修改。${row.scope}`
    : row.kind === "open-migration"
      ? "把 UnitaryLab 电路、算法和模拟器调用迁移到 Qiskit、PennyLane、quimb、PySCF 开源后端。"
      : `为 ${row.guideId === "root" ? "量子计算任务" : row.guideId} 选择完整的开源算法工作流，路由到本地可发现的专用 Skills。`;
  let body = `---\nname: ${row.skill}\ndescription: ${JSON.stringify(description)}\n${row.invocation === "manual" ? "disable-model-invocation: true\nuser-invocable: true\n" : ""}---\n\n# ${title}\n\n`;
  body += `本地开源适配。上游指南 ID：\`${row.guideId}\`。\n\n`;
  if (row.invocation === "manual") body += "分类导航：保留用户显式调用；自动任务直接选择叶子方法 Skill，或使用 `quantum-algorithms` 查找。\n\n";
  if (row.algorithm) {
    body += `## 适用方法\n\n${row.scope}\n\n`;
    if (["trotter", "qdrift", "vqd", "numpy_eigensolver", "numpy_minimum_eigensolver"].includes(row.algorithm)) body += "相近入口的选择、共用实现和位序约定见[共同选择说明](../../../docs/integrations/CAPABILITY_SELECTION.md)。\n\n";
    body += `## 使用步骤\n\n1. 先识别用户是在询问原理、要求运行，还是要求生成/修改代码；仅解释时不自动开始计算。\n`;
    body += `2. 阅读[共同运行说明](../../../examples/quantum-algorithms/README.md)和[本地实现](../../../${row.exampleFile})。可通过已有 \`quantum_practices\` Tool 的 \`get\` 动作、\`id=${row.guideId}\` 读取完整理论、原始参数和推导；其中的外部安装命令及 UnitaryLab 后端要求不适用于本地执行。\n`;
    body += `3. 根据任务准备实际输入，核对下面的参数签名。省略输入只会运行教学示例，不能把它冒充用户数据的结果。需要示例以外的 ansatz、oracle、边界条件或输出时，基于开源 SDK 生成可审查的任务代码。\n`;
    body += `4. 使用 Harness 已有的 \`bash\`（Windows 为 \`pwsh\`）Tool 执行。在 OpenQuantum 仓库根目录，先检查示例 Python 环境；缺少依赖时显式执行 \`npm run capability:algorithms:setup -- ${row.dependencyGroups.length ? row.dependencyGroups.map(group => `--group ${group}`).join(" ") : "--minimal"}\`。执行和安装均受现有 Harness 权限、审批、超时及 Job 管理约束。Skill 不启动服务。\n`;
    body += `5. 读取实际结果和错误；保留输入、依赖版本、种子、近似参数与输出。优化未收敛、后选择概率低、码距未计算或样本不足都必须按实际字段报告。通过经典对照或收敛检查支持数值结论；最终科学验收仍为 \`not_evaluated\`。\n\n`;
    body += `参数：\n\n\`\`\`text\n${row.algorithm}${row.signature}\n\`\`\`\n\n`;
    body += `最小可运行示例（macOS/Linux；Windows Python 路径见共同说明）：\n\n\`\`\`bash\nexamples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --algorithm ${row.algorithm}\n\`\`\`\n\n`;
    body += `用户参数写入 JSON 文件，追加 \`--input <path>\`；需要保留报告时追加 \`--output <path>\`。输入规模由用户选择，不能把示例默认值当成算法上限。\n\n`;
    if (row.algorithm === "molecular_dmrg") {
      body += `分子工作流继续步骤：检查粒子数方差和 sweep 收敛后，可把输出态交给 \`quantum-mps\` 或 \`quantum-multiplexer\` 的开源态制备；用 Qiskit Pauli 测量估计能量并与 DMRG 期望值比较。生成电路时保留映射和位序，按需要导出 QASM。闭源 CVD 优化器的压缩效果不属于本地已验证结果。\n\n`;
    }

  } else if (row.kind === "open-migration") {
    body += `## 开源迁移\n\n按用户所需的物理问题选择下列已有入口：\n\n- Circuit / QFT / QPE / oracle：Qiskit，读取 \`quantum-guide-simulators-qiskit\` 和对应算法 Skill。\n- 可微电路 / 态制备 / QSP、QSVT：PennyLane，读取 \`quantum-guide-simulators-pennylane\`。\n- TensorNet / Ising：quimb CircuitMPS，读取 \`quantum-ising\`。\n- 分子积分和 DMRG：PySCF + quimb，读取 \`quantum-molecular-dmrg\`。\n- 算法入口：读取 \`quantum-algorithms\`，按名称查找完整覆盖表。\n\n不安装或导入 \`unitarylab\` / \`unitarylab_algorithms\`；它们的原始 API 不能仅通过修改 backend 字符串变成开源执行。显式转换位序、初始化、控制门、期望值和输出合同；先运行本地小例子，再改写任务代码。\n\n`;
  } else if (row.guideId === "simulators/qiskit" || row.guideId === "simulators/pennylane") {
    const isQiskit = row.guideId.endsWith("qiskit");
    body += `## 后端工作流\n\n阅读[共同运行说明](../../../examples/quantum-algorithms/README.md)，使用锁定的 ${isQiskit ? "Qiskit" : "PennyLane"} 环境。${isQiskit ? "电路审查、格式转换、MCP 连接与本地 SDK 的选择统一按[共同选择说明](../../../docs/integrations/CAPABILITY_SELECTION.md)。最小本地电路例子见 quantum-hadamard-transform、quantum-qpe。" : "最小可运行例子见 quantum-mottonen、quantum-qsvt-qlsa、quantum-pauli。"}\n\n根据问题加载一个对应算法 Skill，再通过已有 bash/pwsh Tool 执行开源任务代码。明确量子位顺序、shots 与解析态矢量的区别、后端和版本。先运行 CPU 小例子；只有用户要求且授权时才选择额外的设备或网络后端。\n\n`;
  } else if (row.guideId === "root") {
    body += `## 选择工作流\n\n按用户的数学问题、输入、计算规模和输出要求选择实际方法。先用已有 \`quantum_practices\` Tool 的 search/get 查询方法，返回结果包含本地叶子 Skill；直接加载该方法 Skill。所有入口见[覆盖表](../../../docs/integrations/UNITARYLAB_OPEN_COVERAGE.md)，参数与准备步骤见[共同运行说明](../../../examples/quantum-algorithms/README.md)。\n\n13 个分类索引保留为用户手动导航，不进入模型自动选择目录。无需按目录层级逐级加载。Qiskit/PennyLane 后端指南和开源迁移指南仍可自动选择。知识解释不自动开始计算；计算任务使用已有 Harness Tool，按实际依赖组合方法。\n\n`;
  } else {
    body += `## 选择工作流\n\n按用户的数学问题、输入表示、计算规模和需要的输出选择一个叶子 Skill。知识解释可直接使用原理；计算任务加载叶子 Skill，使用其中的开源实现和现有代码执行 Tool。无需为阅读指南启动额外服务。\n\n`;
    for (const child of children(row)) {
      body += `- [${child.skill}](../${child.skill}/SKILL.md)：${child.algorithm ? child.scope : child.guideId}\n`;
    }
    body += `\n全量条目见[覆盖表](../../../docs/integrations/UNITARYLAB_OPEN_COVERAGE.md)。如果用户描述跨领域，按实际依赖组合相关叶子 Skill；不要要求用户先阅读整条目录链。\n\n`;
  }
  body += `## 来源与边界\n\n上游 MIT 指南：[${row.guideId}](${manifest.skillsSource.repository}/blob/${manifest.skillsSource.commit}/${row.guidePath})。原文作为参考保存在固定检索库，本文件将执行路线改为开源 SDK。来源摘要和算法模块对应关系见[coverage.json](../../../examples/quantum-algorithms/coverage.json)，许可证与改动说明见[NOTICE](../../../examples/quantum-algorithms/NOTICE)。\n`;
  return body;
}

for (const row of manifest.guides) {
  const target = path.join(root, ".agents/skills", row.skill, "SKILL.md");
  const content = render(row);
  if (check) assert.equal(await readFile(target, "utf8"), content, `Outdated Skill: ${row.skill}`);
  else {
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}

const rows = manifest.guides.map(row => `| \`${row.guideId}\` | [${row.skill}](../../.agents/skills/${row.skill}/SKILL.md) | ${row.algorithm ? `\`${row.algorithm}\`` : row.kind === "open-migration" ? "开源迁移指引" : row.invocation === "manual" ? "手动分类导航" : "自动可选的总入口/后端指南"} | ${row.sourceAlgorithm ? `\`${row.sourceAlgorithm.path}\`` : "quantum-skills 独有指南"} |`);
const table = `# UnitaryLab 开源适配覆盖表\n\n66 份上游指南逐项对应原生 Skill，其中 49 项算法工作流带可执行示例；覆盖原算法仓库的全部 39 个模块。其余 17 项是分类、后端或开源迁移指南。13 个分类索引保留原名称和用户显式调用，不进入模型自动选择目录；53 个方法与入口继续自动可选。\n\n这张表说明工作流与模块覆盖，不表示兼容上游 Python API 的所有参数、优化器和后端。每项实际方法、范围和替换差异以 Skill 与 [coverage.json](../../examples/quantum-algorithms/coverage.json) 为准。\n\n| 上游指南 | 本地 Skill | 运行示例 | 上游算法模块 |\n| --- | --- | --- | --- |\n${rows.join("\n")}\n`;
const tablePath = path.join(root, "docs/integrations/UNITARYLAB_OPEN_COVERAGE.md");
if (check) assert.equal(await readFile(tablePath, "utf8"), table, "Outdated coverage table");
else await writeFile(tablePath, table);
for (const [relativePath, prefix] of [["README.md", ".agents/skills/"], [".agents/skills/README.md", ""]]) {
  const filename = path.join(root, relativePath);
  let markdown = await readFile(filename, "utf8");
  const begin = "<!-- BEGIN OPEN ALGORITHM SKILLS -->";
  const end = "<!-- END OPEN ALGORITHM SKILLS -->";
  const heading = relativePath === "README.md" ? "##### 开源算法与后端工作流" : "### 开源算法与后端工作流";
  const catalog = manifest.guides.map(row => {
    const purpose = row.algorithm ? row.scope.split("；")[0].replaceAll("|", "\\|") : `${row.guideId} 分类、后端或迁移指引`;
    const execution = row.invocation === "manual" ? "手动分类导航；自动任务直接选择方法 Skill" : row.algorithm ? `已有 Harness \`bash\` / \`pwsh\`；\`${row.algorithm}\` 开源示例` : "按任务组合已有 Skill 和通用 Tool";
    return `| [\`${row.skill}\`](${prefix}${row.skill}/SKILL.md) | ${purpose} | ${execution} |`;
  });
  const header = relativePath === "README.md" ? "| Skill | 研究方法与用途 | 执行入口 |" : "| Skill | 作用 | 依赖的执行模块 |";
  const block = `${begin}\n${heading}\n\n66 个适配 Skill 共用现有执行工具；49 个算法示例覆盖原库的 39 个模块和指南新增方法。13 个分类索引保留为手动导航，53 个方法与入口可由 Agent 自动选择。\n\n${header}\n| --- | --- | --- |\n${catalog.join("\n")}\n${end}`;
  if (markdown.includes(begin)) {
    const start = markdown.indexOf(begin);
    const stop = markdown.indexOf(end, start) + end.length;
    assert.ok(stop > start);
    if (check) assert.equal(markdown.slice(start, stop), block, `Outdated catalog: ${relativePath}`);
    else markdown = markdown.slice(0, start) + block + markdown.slice(stop);
  } else {
    assert.ok(!check, `Missing catalog: ${relativePath}`);
    const at = relativePath === "README.md"
      ? markdown.indexOf("</details>", markdown.indexOf("#### 内置 Skills\n"))
      : markdown.indexOf("可选的上游");
    assert.ok(at >= 0);
    markdown = markdown.slice(0, at) + block + "\n\n" + markdown.slice(at);
  }
  if (!check) await writeFile(filename, markdown);
}
console.log(`${check ? "Checked" : "Generated"} 66 native Skills and complete source coverage table`);
