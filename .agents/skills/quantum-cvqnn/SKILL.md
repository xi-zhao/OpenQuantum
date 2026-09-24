---
name: quantum-cvqnn
description: "使用开源 SDK 完成 cvqnn 的解释、计算和修改。两模有限 Fock 空间的位移、压缩、旋转、Kerr 和分束器层；SciPy 有限差分优化替换 Torch autograd，需增加 cutoff 检查截断。"
---

# cvqnn

本地开源适配。上游指南 ID：`algorithms/quantum-machine-learning/cvqnn`。

## 适用方法

两模有限 Fock 空间的位移、压缩、旋转、Kerr 和分束器层；SciPy 有限差分优化替换 Torch autograd，需增加 cutoff 检查截断。

## 使用步骤

1. 先识别用户是在询问原理、要求运行，还是要求生成/修改代码；仅解释时不自动开始计算。
2. 阅读[共同运行说明](../../../examples/quantum-algorithms/README.md)和[本地实现](../../../examples/quantum-algorithms/cv.py)。可通过已有 `quantum_practices` Tool 的 `get` 动作、`id=algorithms/quantum-machine-learning/cvqnn` 读取完整理论、原始参数和推导；其中的外部安装命令及 UnitaryLab 后端要求不适用于本地执行。
3. 根据任务准备实际输入，核对下面的参数签名。省略输入只会运行教学示例，不能把它冒充用户数据的结果。需要示例以外的 ansatz、oracle、边界条件或输出时，基于开源 SDK 生成可审查的任务代码。
4. 使用 Harness 已有的 `bash`（Windows 为 `pwsh`）Tool 执行。在 OpenQuantum 仓库根目录，先检查示例 Python 环境；缺少依赖时显式执行 `npm run capability:algorithms:setup -- --minimal`。执行和安装均受现有 Harness 权限、审批、超时及 Job 管理约束。Skill 不启动服务。
5. 读取实际结果和错误；保留输入、依赖版本、种子、近似参数与输出。优化未收敛、后选择概率低、码距未计算或样本不足都必须按实际字段报告。通过经典对照或收敛检查支持数值结论；最终科学验收仍为 `not_evaluated`。

参数：

```text
cvqnn(features=None, labels=None, layers=1, cutoff=4, maxiter=40, seed=7)
```

最小可运行示例（macOS/Linux；Windows Python 路径见共同说明）：

```bash
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --algorithm cvqnn
```

用户参数写入 JSON 文件，追加 `--input <path>`；需要保留报告时追加 `--output <path>`。输入规模由用户选择，不能把示例默认值当成算法上限。

## 来源与边界

上游 MIT 指南：[algorithms/quantum-machine-learning/cvqnn](https://github.com/unitarylab/quantum-skills/blob/c5436bb120812ad903ac776f58df89b803ced48c/algorithms/quantum-machine-learning/cvqnn/SKILL.md)。原文作为参考保存在固定检索库，本文件将执行路线改为开源 SDK。来源摘要和算法模块对应关系见[coverage.json](../../../examples/quantum-algorithms/coverage.json)，许可证与改动说明见[NOTICE](../../../examples/quantum-algorithms/NOTICE)。
