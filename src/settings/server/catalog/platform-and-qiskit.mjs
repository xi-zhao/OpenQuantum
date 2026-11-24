import path from "node:path";

import { qpandaRuntimeMcpIntegration } from "../qpanda-runtime-mcp.mjs";
import { quantumHardwareMcpIntegration } from "../quantum-hardware-mcp.mjs";

const QISKIT_MCP_SOURCE = "https://github.com/Qiskit/mcp-servers";

function integrationSetup(integration) {
  return Object.freeze({
    integration,
    entry: integration.entry,
    requiredFiles: integration.requiredFiles.map(fileName =>
      path.join(integration.relativeRoot, fileName),
    ),
    marker: integration.marker,
    source: integration.sourceUrl,
    revision: integration.revision,
    command: integration.setupCommand,
  });
}

export const PLATFORM_AND_QISKIT_MCP_CATALOG = Object.freeze({
  fieldqkit: Object.freeze({
    displayName: "FieldQKit 量子硬件",
    description:
      "统一发现夸父、天衍、国盾、腾讯、本源、FieldQuantum 与逻辑比特后端；当前只开放只读配置检查和硬件发现。",
    provider: "FieldQuantum / OpenQuantum",
    sourceUrl: "https://github.com/FieldQuantum/fieldqkit",
    packageName: "fieldqkit",
    packageVersion: "0.1.2@3ef2493",
    setup: null,
  }),
  toqito_audit: Object.freeze({
    displayName: "量子信息审计",
    description:
      "使用固定 toqito 本地计算密度矩阵、部分转置与 negativity 事实，并由 OpenQuantum 独立 Validator 重算关键不变量；不连接云端或真实硬件。",
    provider: "toqito / OpenQuantum",
    sourceUrl: "https://github.com/vprusso/toqito",
    packageName: "toqito",
    packageVersion: "1.3.1",
    setup: null,
  }),
  qcec_local: Object.freeze({
    displayName: "量子电路等价性验证",
    description:
      "使用固定 MQT QCEC 在本地判断两份unitary OpenQASM 2 电路的严格等价、相位等价、不等价或不确定状态；不连接云端或真实硬件。",
    provider: "MQT / OpenQuantum",
    sourceUrl: "https://github.com/munich-quantum-toolkit/qcec",
    packageName: "mqt.qcec",
    packageVersion: "3.10.0",
    setup: null,
  }),
  qec_local: Object.freeze({
    displayName: "QEC Memory 实验",
    description:
      "使用固定 Stim 与 PyMatching 在本地运行带 seed 的旋转表面码 X/Z memory 实验，报告有限 shots 的逻辑错误率与不确定度；不连接云端或真实硬件，也不据单点结果宣称阈值。",
    provider: "Stim / PyMatching / OpenQuantum",
    sourceUrl: "https://github.com/quantumlib/Stim",
    packageName: "stim + pymatching",
    packageVersion: "1.16.0 + 2.4.0",
    setup: null,
  }),
  pairinteraction_local: Object.freeze({
    displayName: "PairInteraction 原子对相互作用",
    description: "Rb 原子对势能与二阶有效哈密顿量。先独立准备软件和固定原子数据库，再运行本地计算。",
    provider: "PairInteraction / OpenQuantum",
    sourceUrl: "https://github.com/pairinteraction/pairinteraction",
    packageName: "pairinteraction",
    packageVersion: "2.7.0",
    setup: null,
  }),
  fatqat_local: Object.freeze({
    displayName: "FatQat 量子实验",
    description:
      "本地电路、超导与原子阵列约束、transmon 泄漏和里德堡动力学实验；返回数据、图表和明确单位，首次使用准备固定 Python 环境。",
    provider: "Space Qat / OpenQuantum",
    sourceUrl: "https://github.com/spaceqat/fatqat",
    packageName: "fatqat",
    packageVersion: "0.1.0a1@39b75e30",
    setup: null,
  }),
  tyxonq_local: Object.freeze({
    displayName: "TyxonQ 电路与噪声仿真",
    description: "在本地模拟量子电路与噪声，计算精确概率或执行采样。",
    provider: "TyxonQ / OpenQuantum",
    sourceUrl: "https://github.com/QureGenAI-Biotech/TyxonQ",
    packageName: "tyxonq",
    packageVersion: "1.3.0",
    setup: null,
  }),
  qpanda_qubo: Object.freeze({
    displayName: "QPanda QUBO 建模与求解",
    description:
      "把命名二值目标和线性等式约束编译为 QUBO，以全量枚举复核编译和 penalty，再调用本源 pyqpanda_alg 本地求解；不连接本源量子云或真实硬件。",
    provider: "OriginQ / OpenQuantum",
    sourceUrl: "https://github.com/OriginQ/pyqpanda-algorithm",
    packageName: "pyqpanda_alg",
    packageVersion: "2.0.0",
    setup: null,
  }),
  qiskit: Object.freeze({
    displayName: "Qiskit Circuits",
    description: "Qiskit 官方电路创建、分析、转译以及 QASM/QPY 序列化工具。",
    provider: "Qiskit",
    sourceUrl: QISKIT_MCP_SOURCE,
    packageName: "qiskit-mcp-server",
    packageVersion: "0.3.1",
    setup: null,
  }),
  qiskit_docs: Object.freeze({
    displayName: "Qiskit Docs",
    description: "Qiskit 官方文档搜索、页面读取与 IBM Quantum 错误码查询。",
    provider: "Qiskit",
    sourceUrl: QISKIT_MCP_SOURCE,
    packageName: "qiskit-docs-mcp-server",
    packageVersion: "0.3.0",
    setup: null,
  }),
  qiskit_ibm_runtime: Object.freeze({
    displayName: "IBM Quantum Runtime",
    description: "通过 Qiskit IBM Runtime 查询后端并向 IBM Quantum 提交量子任务。",
    provider: "Qiskit / IBM Quantum",
    sourceUrl: QISKIT_MCP_SOURCE,
    packageName: "qiskit-ibm-runtime-mcp-server",
    packageVersion: "0.6.1",
    setup: null,
  }),
  qiskit_ibm_transpiler: Object.freeze({
    displayName: "IBM Quantum Transpiler",
    description: "使用 IBM Quantum AI Transpiler 完成电路路由与综合优化。",
    provider: "Qiskit / IBM Quantum",
    sourceUrl: QISKIT_MCP_SOURCE,
    packageName: "qiskit-ibm-transpiler-mcp-server",
    packageVersion: "0.4.1",
    setup: null,
  }),
  qiskit_gym: Object.freeze({
    displayName: "Qiskit Gym",
    description: "社区维护的强化学习量子电路综合工具；默认关闭。",
    provider: "Qiskit Community",
    sourceUrl: QISKIT_MCP_SOURCE,
    packageName: "qiskit-gym-mcp-server",
    packageVersion: "0.4.1",
    setup: null,
  }),
  quantum_hardware: Object.freeze({
    displayName: "Quantum Hardware MCP",
    description:
      "社区硬件控制面：查询 IBM 与 IonQ 设备，并可提交真实 QPU 任务；启用前必须审阅成本和副作用。",
    provider: "Lokesh-2025 / Community",
    sourceUrl: quantumHardwareMcpIntegration.sourceUrl,
    packageName: "quantum-hardware-mcp",
    packageVersion: quantumHardwareMcpIntegration.revision.slice(0, 12),
    setup: integrationSetup(quantumHardwareMcpIntegration),
  }),
  qpanda_runtime: Object.freeze({
    displayName: "QPanda3 Runtime",
    description:
      "本源量子官方运行时：查询悟空 QPU 设备，并可提交采样、期望值与批量任务到本源量子云；sample/estimate 等为真机写操作，启用前必须审阅成本与副作用。",
    provider: "OriginQ / 本源量子",
    sourceUrl: qpandaRuntimeMcpIntegration.sourceUrl,
    packageName: "qpanda3-runtime-mcp-server",
    packageVersion: qpandaRuntimeMcpIntegration.revision.slice(0, 12),
    setup: integrationSetup(qpandaRuntimeMcpIntegration),
  }),
});
