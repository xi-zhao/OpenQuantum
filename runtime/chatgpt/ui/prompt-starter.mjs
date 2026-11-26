// Honest, scope-checked starter prompts to help first-time users ask the Agent effectively.
// Every prompt aligns with the Skill's declared boundaries and never assigns unsupported actions.

function specificPromptFor(skill, desktop) {
  switch (skill.id) {
    case "quantum-ground-state":
      return "请用 quantum-ground-state 计算二量子位实 Pauli 哈密顿量 H = -1.05 II + 0.39 IZ - 0.39 ZI - 0.01 ZZ + 0.18 XX 在 hamming-weight=1 扇区内的无噪 VQE 基态，与精确对角化对照，并说明各项独立检查与来源链状态。";
    case "quantum-circuit-verification":
      return "请用 MQT QCEC 检查以下两份无测量的 2 量子位 OpenQASM 2 电路是否等价（区分严格等价、全局相位等价与不等价）：\n电路 A：OPENQASM 2.0; include \"qelib1.inc\"; qreg q[2]; h q[0]; cx q[0],q[1];\n电路 B：OPENQASM 2.0; include \"qelib1.inc\"; qreg q[2]; u2(0,pi) q[0]; cx q[0],q[1];";
    case "qec-memory-experiment":
      return "请用 Stim 和 PyMatching 运行码距 d=3、3 轮、物理错误率 p=0（physicalErrorRate）、shots=1000、seed=1234 的 rotated surface code Z-memory 实验，报告逻辑错误率与 95% Wilson 置信区间（不从单点推导阈值）。";
    case "emlint-dem-audit":
      return "请用 emlint 静态审计我提供的 Stim detector error model（DEM），检查是否存在无 syndrome 的逻辑翻转、重复机制或连接结构异常，并说明静态检查不证明码距或解码正确性。";
    case "tropidist-distance":
      return "请用 tropidist 对给定的 GF(2) 校验与逻辑矩阵（或小规模 Stim 电路）计算单位权故障距离上下界，并核查输出的见证。";
    case "erasure-recovery":
      return "请针对给定的单逻辑比特稳定子生成元、已知擦除位置和物理耦合图，用 erasure-recovery 编译带条件校正的恢复线路并核对擦除后 CNOT 费用。";
    case "quantum-information-audit":
      return "请对两量子位 Werner 态密度矩阵做本地量子信息审计，检查半正定性、迹归一化、纯度、部分转置谱与 negativity，并给出独立重算核对。";
    case "hamiltonian-simulation":
      return "请用 Qiskit 对三量子位海森堡自旋链哈密顿量构造二阶 Trotter-Suzuki 演化线路，比较不同步数下的态矢量误差与门资源开销。";
    case "lean-physics":
      return "请用 Lean 4 和 Physlib / mathlib 形式化证明 Pauli 矩阵恒等式 σ₁ * σ₁ = 1 与 [σ₁, σ₂] = 2i·σ₃，编译检查无 sorry 警告，并用 #print axioms 列出全部依赖公理。";
    case "quantum-sdk-workbench":
      return "我想基于 QuTiP 在本地写一段可复现脚本，模拟单量子位耗散 Rabi 振荡并保存末态布居数据，请先检查对应运行环境再编写和运行程序。";
    case "quantum-sdk-advisor":
      return "我要研究 16 量子位二维 Ising 模型的含时动力学并关注内存与精度边界，请比较 Qiskit、PennyLane、quimb 与 TeNPy 的选型建议。";
    case "quantum-algorithms":
      return "我是刚开始接触量子计算的本科生，想从 QFT、Grover 和 VQE 里选一个带可运行示例的算法动手理解原理，请帮我导航到合适的 Skill。";
    case "qiskit-circuit-workbench":
      return "请分析一段 4 量子位 GHZ 态制备的 OpenQASM 3 线路，比较 Qiskit 优化等级 0 与 3 的门数和深度变化。";
    case "mitiq-error-mitigation":
      return "请在固定采样预算下，对一个带退极化噪声的小规模电路比较 Mitiq ZNE 与未缓解结果的期望值误差与方差。";
    case "pyzx-optimization":
      return "请用 PyZX 对一个 3 量子位 Clifford+T 电路执行 ZX 重写与电路提取，统计 T 门和双比特门减少量，并独立核对完整酉矩阵等价性。";
    case "tenpy-ground-state":
      return "请用 TeNPy DMRG 计算 8 格点开放边界横向场 Ising 链的基态能量，并与精确对角化结果对照。";
    case "pulser-dynamics":
      return "请用 Pulser 在本地模拟 4 原子正方形中性原子阵列在全局 Rydberg 脉冲下的演化，输出逐原子激发占据与位串概率。";
    case "bloqade-analog":
      return "请用 QuEra Bloqade Analog 模拟二维 Rydberg 原子链的全局绝热扫频脉冲，返回末态位串分布并注明能量与时间单位。";
    case "qpanda-qubo":
      return "请把一个带线性等式约束的 4 变量组合优化问题编译成 QUBO，用 QPanda 本地模拟器运行 QAOA，并与经典枚举最优解对照。";
    case "mwpf-decoding":
      return "请用 MWPF 对一个带多 detector 超边的小规模加权超图和给定 syndrome 执行译码，输出 primal/dual 权重界并解释结果。";
    case "slowquant-response":
      return "请用 SlowQuant 计算小分子在最小基组下的酉波函数线性响应激发能，并说明活性空间与响应近似的边界。";
    case "fieldqkit-hardware":
      return "请用 inspect_fieldqkit_setup 只读检查 FieldQKit 的本地配置，列出各云平台的凭据是否已配置，以及缺失项应在哪里填写。";
    case "qdmi-device":
      return "请通过已配置的固定 QDMI 驱动只读查询设备元数据、原生门集与耦合图，并区分示例驱动与真实硬件。";
    case "metriq-data":
      return "请从本地固定 Metriq 基准快照中检索与量子体积或电路执行相关的历史记录，并说明来源与实验条件。";
    case "qcarchive-query":
      return "请用 QCPortal 只读查询 QCArchive 既有单点计算记录，返回分子、原子单位能量、状态与来源（不提交远程计算）。";
    case "quantum-practices":
      return "请查阅量子算法实践指南，帮我比较不同方法在当前问题上的适用前提与实验设计边界。";
    case "quantum-learning":
      return "我想做一个关于“量子叠加与测量”的互动课堂课件和随堂测验，请帮我规划课程结构。";
    case "platform-diagnostics":
      return desktop
        ? "请按当前问题范围审计 OpenQuantum 的 UI、Harness、Skill 和 Model 连通状态，未执行项如实标为 not_checked。"
        : "请检查当前 Codex 插件的目录、设置、运行环境和 stdio 握手状态，区分配置、实际调用与尚未验证的项目。";
    default:
      return null;
  }
}

const CATEGORY_TEMPLATES = {
  circuits: (title) => `请使用「${title}」构建或分析一个可复现的小规模量子线路示例，报告门资源统计，并说明位序、门集或等价性边界。`,
  algorithms: (title) => `请使用「${title}」运行一个可复核的小规模示例，解释关键参数与核心步骤，并给出数值精度或参考对照。`,
  simulation: (title) => `请使用「${title}」运行一个最小可复现物理模型示例，明确哈密顿量约定、单位和截断参数，并检查结果合理性。`,
  qec: (title) => `请使用「${title}」构建一个可复核的小规模纠错或噪声实验，说明故障模型、采样预算与统计误差边界。`,
  learning: (title) => `请使用「${title}」运行一个带梯度或期望值计算的可微量子线路小规模示例，并核对数值梯度与参数约定。`,
  hardware: (title) => `请先在只读或本地离线模式下使用「${title}」检查可用配置、脉冲或设备元数据（不要提交真实硬件任务）。`,
  information: (title) => `请使用「${title}」对一个标准两量子位纠缠态或小规模量子信息实例执行计算，并给出独立解析或数值核对。`,
  reference: (title) => `请结合「${title}」围绕我的研究问题整理方法对比、适用前提和下一步可验证的计算路径。`,
};

export function starterPromptFor(skill, categoryId = "other", { desktop = false } = {}) {
  if (!skill) return "";
  const specific = specificPromptFor(skill, desktop);
  if (specific) return specific;
  if (skill.id?.startsWith("quantum-guide-")) {
    return `请借助「${skill.title || skill.id}」帮我按研究问题与约束筛选最合适的子 Skill，并说明下一步可执行的计算方法。`;
  }
  const template = CATEGORY_TEMPLATES[categoryId];
  return template ? template(skill.title || skill.id) : "";
}
