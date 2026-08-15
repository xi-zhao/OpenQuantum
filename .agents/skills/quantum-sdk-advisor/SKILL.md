---
name: quantum-sdk-advisor
description: 为量子计算项目按问题类型、硬件目标、数值方法、可验证性、许可证和运行成本选择 Qiskit、Cirq、PennyLane、Q#、Amazon Braket、CUDA-Q、Stim/PyMatching、PySCF/Qiskit Nature 或 Mitiq 等软件栈。用于技术选型、PoC 架构、迁移比较和 OpenQuantum Skill/MCP 规划；不用于代替实验数据、执行付费云任务或把库能力误写成科学结论。
---

# Quantum SDK Advisor

## 核心任务

先把用户的量子问题映射到一个可执行、可验证的软件栈，再讨论框架偏好。不要按热度或单一供应商选型。
需要比较项目时先读 [references/ecosystem.md](references/ecosystem.md)。

## 选型流程

1. 明确问题类型：电路工程、变分算法、量子化学、纠错、噪声缓解、资源估算、云硬件或 GPU/HPC。
2. 明确执行目标：本地 statevector、shots/noise、真实 QPU、容错资源估算或只生成可审查代码。
3. 明确约束：量子位规模、经典算力、Python/C++/.NET、云账户、预算、许可证和复现要求。
4. 判断需要哪些独立模块：领域 Skill、MCP/Tool、Validator/eval。纯知识工作流不强制需要 MCP；没有
   科学主张的工程操作也不强制需要 Validator。
5. 优先复用 OpenQuantum 已有能力：
   - 通用电路与 Qiskit 文档：默认 Qiskit MCP；
   - 窄作用域二量子位基态：`quantum-ground-state`；
   - 其他 SDK：先作为候选，不假装平台已经安装或验证。
6. 云硬件、凭据和可能付费的任务一律单独列出，并要求用户显式选择；技术选型本身不触发提交。
7. 给出一个主推荐、一个备选和明确的淘汰理由，不堆砌所有框架。

## 不变量

- Skill 描述工作流，MCP/Tool 产生执行事实，Validator 产生可强制的科学判断；它们由 Agent preset
  组合，但 Harness 不会自动建立 Skill→MCP 或 Skill→Validator 绑定。
- “库支持某算法”不等于 OpenQuantum 已集成该能力，也不等于结果已验收。
- 不自动安装未知来源的 Skill/MCP；先核对许可证、版本、维护状态、网络与副作用。
- GPL 项目可以作为研究参考或独立进程候选，但在纳入发行版前必须单独做兼容性判断。
- 真实硬件选型必须同时说明凭据、区域、队列、费用、数据外发和结果不确定性。

## 输出格式

按以下结构回答：

1. 任务与约束；
2. 主推荐栈及理由；
3. 备选栈及何时更合适；
4. OpenQuantum 接入方式（Skill / MCP / Validator）；
5. 本地验证路径；
6. 云端或许可证风险；
7. 当前是“已集成”“可适配”还是“仅候选”。
