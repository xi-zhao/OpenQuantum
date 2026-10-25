export const SETTINGS_TABS = [["runtime", "首页"], ["skills", "Skills"], ["mcp", "MCP"]];
const titles = {
  "quantum-sdk-workbench": "量子计算工作台", "quantum-sdk-advisor": "量子计算选型",
  "quantum-algorithms": "量子算法导航", "quantum-guide-algorithms": "量子算法方法选择",
  "quantum-guide-simulators": "模拟方法选择",
};
const guideTitles = { cryptography: "量子密码学", eigensolvers: "本征值求解", gradients: "梯度计算", "hamiltonian-simulation": "Hamiltonian 模拟", "linear-systems": "线性方程组", primitives: "基础运算", "quantum-chemistry": "量子化学", "quantum-machine-learning": "量子机器学习", schrodingerization: "薛定谔化", search: "量子搜索", "state-preparation": "量子态制备", pennylane: "PennyLane", qiskit: "Qiskit", unitarylab: "UnitaryLab" };
const algorithmTitles = { "discrete-log": "离散对数", shor: "Shor 因数分解", simon: "Simon 算法", "numpy-minimum-eigensolver": "NumPy 最小本征值", "numpy-eigensolver": "NumPy 本征值分解", vqd: "VQD 激发态", "finite-difference": "有限差分梯度", "linear-combination": "线性组合梯度", "parameter-shift": "参数位移梯度", qfi: "量子 Fisher 信息", reverse: "反向梯度", spsa: "SPSA 梯度", cartan: "Cartan 分解", qdrift: "qDRIFT 模拟", "hamiltonian-qsp": "QSP Hamiltonian 模拟", taylor: "Taylor 展开模拟", trotter: "Trotter 分解", aqc: "绝热量子计算", hhl: "HHL 线性方程求解", lcu: "酉算符线性组合", "qsvt-qlsa": "QSVT 线性方程求解", qft: "量子 Fourier 变换", qsp: "量子信号处理", vqls: "变分线性方程求解", "amplitude-amplification": "振幅放大", "amplitude-estimation": "振幅估计", grover: "Grover 搜索", "hadamard-test": "Hadamard 测试", "hadamard-transform": "Hadamard 变换", qpe: "量子相位估计", "molecular-dmrg": "分子 DMRG", qldpc: "量子 LDPC 码", cvqnn: "连续变量量子神经网络", "fermi-hubbard-vqe": "Fermi–Hubbard VQE", ising: "Ising 模型", qaoa: "QAOA 优化", qcbm: "量子 Born 机", vqc: "变分量子分类", vqe: "变分量子本征求解", advection: "对流方程", "heat-1d": "一维热方程", "heat-2d": "二维热方程", "glued-trees": "粘合树量子行走", "hidden-shift": "隐藏位移", mottonen: "Möttönen 态制备", mps: "矩阵乘积态", multiplexer: "量子多路复用", pauli: "Pauli 运算", superposition: "叠加态制备" };
export function skillPresentation(skill) {
  let title = titles[skill.id] ?? skill.title;
  if (skill.id.startsWith("quantum-guide-")) {
    const topic = skill.id.replace(/^quantum-guide-(algorithms|simulators)-?/, "");
    if (guideTitles[topic]) title = `${guideTitles[topic]}方法选择`;
  } else title = titles[skill.id] ?? algorithmTitles[skill.id.replace(/^quantum-/, "")] ?? title;
  let description = skill.description;
  if (skill.id === "quantum-sdk-workbench") description = "按任务选择运行环境，通过宿主 Tool 编写和运行自定义量子计算。";
  else if (skill.id === "quantum-sdk-advisor") description = "按研究问题、硬件条件与运行成本，选择合适的量子计算方法和软件。";
  else if (skill.id === "quantum-algorithms" || skill.id.startsWith("quantum-guide-")) description = `帮助选择${title.replace(/方法选择|导航/g, "")}相关的 Skill；需要计算时再准备环境。`;
  else description = (description ?? "").split(" 可经宿主代码工具")[0].replace(/^方法解释与选型参考：[^。]+。此 Skill 不附带计算 Tool。/, "");
  return { ...skill, title, description };
}
export function shortDescription(text = "") {
  if (text.length <= 110) return text;
  const first = text.match(/^.{12,110}?[。；]/)?.[0];
  return first ?? `${text.slice(0, 105)}…`;
}
export function environmentState(environment) {
  if (!environment) return { key: "missing", label: "环境状态未读取" };
  if (environment.ready) return { key: "prepared", label: "环境已准备" };
  const operation = environment.job?.operation;
  const repair = environment.installation === "incomplete";
  const missing = environment.installation === "missing";
  const retry = missing || repair ? "install" : operation ?? "install";
  const failure = missing || repair || (operation === "install" && !environment.job?.synced)
    ? ["安装未完成", "install", repair ? "修复环境" : "重试安装"] : ["检查未通过", "check", "重新检查"];
  const [label, action, actionLabel] = ({
    not_installed: ["未安装", "install", "安装环境"], needs_repair: ["环境需修复", "install", "修复环境"],
    preparing: [operation === "check" ? "正在检查" : "正在安装"], cancelling: ["正在取消"],
    failed: failure, cancelled: ["操作已取消", retry, retry === "check" ? "检查环境" : "继续安装"],
    interrupted: ["操作已中断", retry, retry === "check" ? "检查环境" : "继续安装"],
    needs_configuration: ["配置文件已失效"], unreadable: ["环境无法读取"],
    unsupported_platform: ["当前平台不支持"], needs_check: ["待检查", "check", "检查环境"], outdated: ["待检查", "check", "检查环境"],
  })[environment.state] ?? ["待检查", "check", "检查环境"];
  return { key: ["preparing", "cancelling"].includes(environment.state) ? "preparing" : "environment", label, action, actionLabel };
}
export function settingsTools(snapshot) {
  return [...snapshot.tools, ...(snapshot.connections ?? []).flatMap(connection => connection.tools.map(tool => ({ ...tool,
    id: `external:${connection.id}:${tool.name}`, title: tool.title || tool.name, connectionId: connection.id,
    provider: connection.id, category: "other", readOnly: tool.annotations?.readOnlyHint === true,
  })))];
}
export function toolState(tool, snapshot) {
  const reasons = [];
  if (tool.connectionId) {
    const connection = snapshot.connections.find(value => value.id === tool.connectionId);
    const state = connectionState(connection);
    if (state.key !== "prepared") reasons.push(state.key === "disabled" ? { ...state, key: "mcp" } : state);
    if (!tool.enabled) reasons.push({ key: "disabled", label: "Tool 已关闭" });
    return { ...(reasons[0] ?? { key: "prepared", label: "已准备" }), reasons };
  }
  const owner = snapshot.skills?.find(skill => skill.tools?.includes(tool.id));
  if (owner && !owner.enabled) reasons.push({ key: "disabled", label: "关联 Skill 已禁止" });
  if (!tool.enabled) reasons.push({ key: "disabled", label: "Tool 已禁止" });
  const provider = snapshot.providers.find(item => item.id === tool.provider);
  if (!provider?.enabled) reasons.push({ key: "mcp", label: tool.provider?.startsWith("native:") ? "内置 Tool 已禁止" : "MCP 已禁止" });
  if (tool.environmentId) {
    const state = environmentState(snapshot.environments?.find(item => item.id === tool.environmentId));
    if (state.key !== "prepared") reasons.push(state);
    else if (tool.id === "simulate_squidasm_bell_pairs" && !snapshot.environments.find(item => item.id === tool.environmentId).optionalSimulation) reasons.push({ key: "environment", label: "待配置仿真环境" });
  }
  if ((tool.credential?.storeRequired && tool.credential.state === "unavailable") || (tool.credential?.requirement === "required" && tool.credential.state !== "configured")) reasons.push({ key: "credentials", label: tool.credential.state === "unavailable" ? "凭据未读取" : "待配置凭据" });
  return { ...(reasons[0] ?? { key: "prepared", label: tool.credential?.requirement === "conditional" ? "本地已准备" : "已准备" }), reasons };
}
export function providerState(provider, snapshot) {
  if (!provider.enabled) return { key: "disabled", label: `${provider.id.startsWith("native:") ? "内置 Tool" : "MCP"} 已禁止`, blocked: false };
  const tools = snapshot.tools.filter(tool => tool.provider === provider.id);
  const blockers = tools.map(tool => toolState(tool, snapshot).reasons.filter(reason => !["mcp", "disabled"].includes(reason.key)));
  if (blockers.length && blockers.every(reasons => reasons.length)) return { ...blockers[0][0], blocked: true };
  const kind = provider.id.startsWith("native:") ? "内置 Tool" : "MCP";
  return { key: provider.enabled ? "prepared" : "disabled", label: `${kind} ${provider.enabled ? "允许按需使用" : "已禁止"}`, blocked: false };
}
export function connectionState(connection) {
  if (connection.credential?.unavailable) return { key: "credentials", label: "凭据未读取" };
  if (connection.authentication === "token" && !connection.credential?.configured) return { key: "credentials", label: "待配置凭据" };
  if (connection.status?.state === "error") return { key: "connection", label: "连接检查未通过" };
  if (!connection.tools?.length) return { key: "connection", label: connection.status?.state === "connected" ? "未发现 Tool" : "待测试连接" };
  if (!connection.enabled) return { key: "disabled", label: "MCP 已关闭" };
  return { key: "prepared", label: "MCP 已启用" };
}
export function skillIssue(skill, snapshot) {
  if (skill.enabled === false) return null;
  const recent = snapshot.recentSkills?.find(item => item.id === skill.id);
  if (!recent) return null;
  const service = snapshot.services?.find(item => item.id === recent.serviceId);
  const field = recent.selection?.credentialField;
  if (service?.configuration === "unavailable") return `${service.title} 凭据未读取`;
  if (service && (service.configuration === "incomplete" || (field && !service.fields?.find(item => item.name === field)?.configured))) return `待填写 ${service.title} 凭据`;
  const tool = snapshot.tools.find(item => item.id === recent.selection?.toolName);
  const environmentId = recent.selection?.sdkId ?? tool?.environmentId ?? (skill.relations?.environmentIds.length === 1 ? skill.relations.environmentIds[0] : null);
  const environment = snapshot.environments?.find(item => item.id === environmentId);
  if (environment && ["failed", "cancelled", "interrupted", "needs_configuration", "unreadable", "unsupported_platform"].includes(environment.state)) return environmentState(environment).label;
  if (tool) {
    const state = toolState(tool, snapshot);
    if (state.key === "credentials" || (tool.id === "simulate_squidasm_bell_pairs" && state.label === "待配置仿真环境")) return state.label;
  }
  return null;
}
export function skillPreparation(skill, snapshot) {
  if (skill.supported === false) return "当前插件不支持";
  const issue = skillIssue(skill, snapshot);
  if (issue) return issue;
  const relations = skill.relations ?? { toolIds: [], environmentIds: [] };
  const tools = relations.toolIds.map(id => snapshot.tools.find(tool => tool.id === id)).filter(Boolean);
  if (tools.length) {
    const prepared = tools.filter(tool => toolState(tool, snapshot).key === "prepared").length;
    return prepared === tools.length ? "关联 Tool 已准备" : prepared ? `${prepared} / ${tools.length} 个 Tool 已准备` : "关联 Tool 待准备";
  }
  if (relations.environmentIds.length > 1) return "按任务选择运行环境";
  if (relations.environmentIds.length) {
    const state = environmentState(snapshot.environments?.find(item => item.id === relations.environmentIds[0]));
    const services = (snapshot.services ?? []).filter(service => relations.credentialServiceIds?.includes(service.id));
    if (state.key === "prepared" && services.length) {
      if (services.some(service => service.configuration === "unavailable")) return "本地已准备 · 云端凭据未读取";
      if (services.some(service => service.configuration === "unsupported")) return "本地已准备 · 云端凭据需单独配置";
      return services.every(service => service.configuration === "configured") ? "本地已准备 · 云端凭据已保存" : "本地已准备 · 云端待配置凭据";
    }
    return state.key === "prepared" ? state.label : `运行环境 · ${state.label}`;
  }
  return relations.usesHostTools ? "通过宿主 Tool 执行" : "无需安装";
}
