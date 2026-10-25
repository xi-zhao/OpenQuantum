import { mcpCatalogEntry, mcpCredentialCatalogEntry } from "../server/project-settings-catalog.mjs";

// Desktop owns service/credential presentation. This adapter adds only Codex
// availability, execution requirements and the reviewed environment allowlist.
const field = (name, title, required = true, secret = true) => {
  const entry = mcpCredentialCatalogEntry(name);
  return { name, title: title ?? entry.displayName, displayName: entry.displayName, required, secret,
    description: entry.description.replaceAll("Harness 凭据库", "本机凭据库").replaceAll("Harness 安全凭据", "安全凭据"),
    documentationUrl: entry.documentationUrl };
};
const token = (name, title = "API Token", required = true) => field(name, title, required);
const desktop = (id, options) => {
  const entry = mcpCatalogEntry(id);
  const urls = [...new Set(options.fields.map(field => field.documentationUrl).filter(Boolean))];
  return { id, title: entry.displayName, description: entry.description,
    documentationUrl: urls.length === 1 ? urls[0] : entry.sourceUrl,
    ...options };
};

export const SERVICES = [
  desktop("superstaq_cloud", { capability: "superstaq-compilation", category: "circuits", supported: true,
    fields: [token("SUPERSTAQ_API_KEY", "API Key")], credentialFreeTools: ["prepare_superstaq_circuit"] }),
  desktop("classiq_cloud", { capability: "classiq-synthesis", category: "circuits", supported: true,
    fields: [token("CLASSIQ_XCH_TOKEN", "Exchange Token")], credentialFreeTools: ["prepare_classiq_model"] }),
  desktop("qctrl_cloud", { capability: "qctrl-workbench", category: "hardware", supported: true,
    fields: [token("QCTRL_API_KEY", "API Key")], credentialFreeTools: ["prepare_boulder_opal_control"] }),
  desktop("qcarchive_data", { capability: "qcarchive-query", category: "reference", supported: true,
    fields: [field("QCPORTAL_ADDRESS", "服务器 HTTPS 地址", true, false), field("QCPORTAL_USERNAME", "用户名", false, false), token("QCPORTAL_PASSWORD", "密码", false)], pairs: [["QCPORTAL_USERNAME", "QCPORTAL_PASSWORD"]] }),
  desktop("aqt_local", { capability: "aqt-workbench", category: "hardware", supported: true,
    fields: [token("AQT_API_TOKEN", "Arnica Token")], credentialFreeTools: ["simulate_aqt_circuit"] }),
  desktop("oqc_cloud", { capability: "oqc-cloud", category: "hardware", supported: true,
    fields: [token("OQC_API_TOKEN"), field("OQC_API_ENDPOINT", "服务 HTTPS 地址（默认 https://cloud.oqc.app）", false, false)], credentialFreeTools: ["prepare_oqc_task"] }),
  desktop("quantuminspire_cloud", { capability: "quantuminspire-cloud", category: "hardware", supported: true,
    fields: [token("QUANTUMINSPIRE_API_TOKEN", "OAuth Access Token")] }),
  desktop("qiskit_ibm_runtime", { category: "hardware", supported: true,
    fields: [token("QISKIT_IBM_TOKEN", "IBM Quantum API Token")] }),
  desktop("qiskit_ibm_transpiler", { category: "circuits", supported: true,
    fields: [token("QISKIT_IBM_TOKEN", "IBM Quantum API Token")] }),
  desktop("quantum_hardware", { category: "hardware", supported: true,
    fields: [token("QISKIT_IBM_TOKEN", "IBM Quantum API Token", false), token("IONQ_API_KEY", "IonQ API Key", false)] }),
  desktop("qpanda_runtime", { category: "hardware", supported: true,
    description: "查询本源量子设备，提交采样与期望值任务；本地电路绑定无需凭据。",
    fields: [{ ...token("QPANDA3_API_KEY", "本源量子 API Key"), description: "连接本源量子云时填写；与 FieldQKit 的本源凭据分别保存。" }] }),
  desktop("fieldqkit", { capability: "fieldqkit-hardware", category: "hardware", supported: true,
    fields: [token("QUAFU_API_TOKEN", "夸父", false), token("TIANYAN_API_TOKEN", "天衍", false), token("GUODUN_API_TOKEN", "国盾", false), token("TENCENT_API_TOKEN", "腾讯", false), token("ORIGIN_API_TOKEN", "本源", false), token("FIELDQUANTUM_API_TOKEN", "FieldQuantum", false), token("LOGICALQUBIT_API_TOKEN", "逻辑比特", false)] }),
  { id: "pasqal_cloud", capability: "pasqal-experiments", title: "Pasqal Cloud", category: "hardware", supported: true, consumer: "pasqal-workflow",
    description: "供 Pasqal Skill 的云端操作使用；通过宿主 Tool 运行，无需额外 MCP。", documentationUrl: "https://docs.pasqal.com/cloud/",
    alternatives: [["PASQAL_AUTH_TOKEN"], ["PASQAL_USERNAME", "PASQAL_PASSWORD"]],
    fields: [
      { ...token("PASQAL_AUTH_TOKEN", "Access Token", false), description: "保存 Pasqal 访问令牌，供关联 Skill 的云端操作使用。" },
      { ...field("PASQAL_USERNAME", "用户名（密码登录）", false, false), description: "使用密码登录时填写，与下方密码配套。" },
      { ...token("PASQAL_PASSWORD", "密码", false), description: "与上方用户名配套；已填写 Token 时无需填写。" },
    ] },
];
export const serviceById = id => SERVICES.find(service => service.id === id);
export function serviceSupported(service, backend) {
  if (!service?.supported) return false;
  if (service.id === "pasqal_cloud" && service.consumer === "pasqal-workflow") return backend.sourceCapabilities?.some(item => item.id === service.capability && item.status === "available") === true;
  return backend.providers.some(provider => provider.key === service.id);
}
export const serviceCredentialRef = id => `service-${id}`;
export const SERVICE_TOOL_TITLES = {
  solve_qpanda_qubo: "求解 QUBO", model_and_solve_qpanda_qubo: "建立并求解二值模型",
  verify_circuit_equivalence: "验证电路等价性", run_qec_memory_experiment: "模拟纠错存储实验",
  simulate_tyxonq_circuit: "模拟 TyxonQ 电路", audit_density_matrix: "检查密度矩阵",
  list_qmclaw_experiments: "查看 QMClaw 实验", simulate_qmclaw_experiment: "运行 QMClaw 实验",
  sample_clifft_circuit: "采样 Clifford 电路", sample_clifft_qec: "采样纠错电路",
  analyze_circuit_tool: "分析电路", serialize_circuit_tool: "转换电路为 JSON", deserialize_circuit_tool: "读取电路数据",
  optimize_circuit_tool: "优化电路", route_circuit_tool: "映射电路", compare_topologies_tool: "比较拓扑",
  emit_openqasm_tool: "导出 OpenQASM", emit_qcis_tool: "导出 QCIS", plan_execution_tool: "规划电路执行",
  simulate_circuit_tool: "模拟电路", train_parameters_tool: "训练电路参数", describe_gate_set_tool: "查看支持的量子门",
  inspect_parameters_tool: "检查电路参数", bind_parameters_tool: "设置电路参数", describe_layers_tool: "查看电路层",
  describe_topology_tool: "查看拓扑", draw_circuit_tool: "绘制电路",
  prepare_netqasm_bell_program: "编译 Bell 对程序", simulate_squidasm_bell_pairs: "模拟 Bell 对分发",
  simulate_simqn_link: "模拟量子链路",
  prepare_superstaq_circuit: "准备电路（本地）",
  list_superstaq_targets: "查询可用设备（联网）",
  compile_superstaq_circuit: "编译电路（联网）",
  prepare_classiq_model: "准备综合模型（本地）",
  synthesize_classiq_circuit: "运行电路综合（联网）",
  prepare_boulder_opal_control: "准备控制模型（本地）",
  get_qctrl_job_status: "查询已有作业（联网）",
  query_qcarchive_singlepoints: "查询计算记录（联网）",
  simulate_aqt_circuit: "模拟电路（本地）",
  list_aqt_devices: "查询设备（联网）",
  prepare_oqc_task: "准备任务（本地）",
  query_oqc_service: "查询设备与作业（联网）",
  submit_oqc_task: "提交量子任务（可能计费）",
  query_quantum_inspire: "查询后端与已有作业（联网）",
  inspect_fieldqkit_setup: "查看平台配置（本地）",
  discover_fieldqkit_backends: "发现可用后端（按所选平台联网）",
};
// Short settings copy; the complete execution contract remains in Tool details.
export const SERVICE_TOOL_SUMMARIES = {
  run_qiskit_circuit: "分析、编译和优化 Qiskit 电路，转换 QASM/QPY 格式。",
  read_qiskit_documentation: "检索 Qiskit 官方文档，读取所需页面，无需账户。",
  run_ibm_quantum: "查询 IBM 设备和作业，或按任务提交计算；本地模拟设备的连接图无需凭据。",
  run_ibm_transpiler: "使用 IBM Quantum Transpiler 编译与优化电路，需要 IBM 账户。",
  run_qiskit_gym: "训练并使用电路综合模型，连续操作保留在同一会话中。",
  run_quantum_hardware: "分析电路与化学问题，按需连接 IBM 或 IonQ；本地分析无需账户。",
  run_qpanda_runtime: "建立本地电路与观测量绑定，按需提交本源量子任务，并保留会话状态。",
  solve_qpanda_qubo: "用本地枚举或 QAOA 求解已建立的 QUBO 问题。",
  model_and_solve_qpanda_qubo: "把二值目标和线性等式约束转换为 QUBO，再在本地求解。",
  simulate_fatqat_circuit: "模拟电路及原生门约束，查看概率、采样和量子态。",
  simulate_fatqat_dynamics: "模拟超导或 Rydberg 模型的恒定驱动，查看布居随时间的变化。",
  list_qmclaw_experiments: "查看 13 类本地测控模拟及其参数、默认值和输出。",
  simulate_qmclaw_experiment: "生成所选测控实验的模拟数据，无需连接硬件。",
  sample_clifft_circuit: "采样 Clifford+T 电路的最终测量，可选密度矩阵对照。",
  sample_clifft_qec: "采样 Stim 格式纠错电路，返回测量和原始奇偶记录。",
  analyze_circuit_tool: "检查电路结构并汇总量子门与线路信息。",
  serialize_circuit_tool: "返回规范化的电路 JSON 数据。",
  deserialize_circuit_tool: "从已保存的数据恢复电路。",
  optimize_circuit_tool: "执行电路优化并汇总变化。",
  route_circuit_tool: "把电路映射到指定的连接拓扑。",
  compare_topologies_tool: "比较不同拓扑对电路映射的影响。",
  emit_openqasm_tool: "将电路导出为 OpenQASM。",
  emit_qcis_tool: "将电路导出为 QCIS。",
  plan_execution_tool: "根据电路与执行选项生成运行计划。",
  simulate_circuit_tool: "在本地模拟电路并读取结果。",
  train_parameters_tool: "按目标训练电路中的可调参数。",
  describe_gate_set_tool: "查看可用量子门及其定义。",
  inspect_parameters_tool: "查看电路中的参数。",
  bind_parameters_tool: "为电路参数指定数值。",
  describe_layers_tool: "查看电路各层的结构。",
  describe_topology_tool: "查看量子比特之间的连接关系。",
  draw_circuit_tool: "生成文本电路图以检查线路与量子门。",
  prepare_netqasm_bell_program: "本地编译双节点 Bell 对程序，无需 NetSquid 许可。",
  simulate_squidasm_bell_pairs: "在另行配置的 SquidASM / NetSquid 环境中模拟 Bell 对分发。",
  prepare_superstaq_circuit: "本地准备与序列化电路，无需账户。",
  list_superstaq_targets: "使用账户凭据查询可用编译目标。",
  compile_superstaq_circuit: "将电路发送到 Superstaq 编译；不执行 QPU 任务。",
  prepare_classiq_model: "本地检查和准备电路综合模型，无需账户。",
  synthesize_classiq_circuit: "使用账户凭据将模型发送到 Classiq 进行电路综合。",
  prepare_boulder_opal_control: "本地准备 Boulder Opal 控制图，无需账户。",
  get_qctrl_job_status: "使用账户凭据查询已有 Boulder Opal 或 Fire Opal 作业。",
  simulate_aqt_circuit: "本地编译和模拟 AQT 电路，无需账户。",
  list_aqt_devices: "使用 Arnica Token 查询账户可见的 AQT 设备。",
  prepare_oqc_task: "本地准备 OQC 任务，无需账户。",
  query_oqc_service: "使用账户凭据查询 OQC 设备和已有作业。",
  submit_oqc_task: "提交一次 OQC 云任务，可能产生账户费用。",
  inspect_fieldqkit_setup: "检查已配置的平台，隐藏凭据值，不连接设备。",
  discover_fieldqkit_backends: "查询所选平台的后端；本地模拟无需凭据。",
  simulate_mqt_ddsim: "本地采样电路的末端测量，可选返回完整态矢量。",
  evaluate_qcover_qaoa: "计算 Ising 图在指定 QAOA 参数下的能量与分解规模，不执行参数优化。",
  map_pychemiq_fermions: "用 Jordan–Wigner 变换将费米算符映射为 Pauli 项。",
  schedule_qblox_pulses: "离线安排方波脉冲的时序并采样波形，不运行硬件。",
  compile_qililab_pulses: "将 I/Q 脉冲与等待编译为 Q1ASM 和波形表，不连接仪器。",
  simulate_guppy_feedback: "编译含测量反馈的程序，并在本地理想模拟器中运行。",
  compile_oqc_qat_pulses: "离线生成方波或 Gaussian 脉冲的采样时间线与波形，不模拟量子态。",
  evaluate_merlin_layer: "计算光子层的 Fock 概率与指定输出的相位梯度，不执行训练。",
};
export function missingFields(service, values) {
  if (service.alternatives) {
    if (service.alternatives.some(group => group.every(name => values[name]))) return [];
    const chosen = service.alternatives.find(group => group.some(name => values[name])) ?? service.alternatives[0];
    return chosen.filter(name => !values[name]);
  }
  const missing = service.fields.filter(field => field.required && !values[field.name]).map(field => field.name);
  for (const pair of service.pairs ?? []) if (pair.some(name => values[name]) && !pair.every(name => values[name])) missing.push(...pair.filter(name => !values[name]));
  return missing;
}
export function validateServiceValues(service, values) {
  if (!values || typeof values !== "object" || Array.isArray(values) || Object.keys(values).some(name => !service.fields.some(field => field.name === name))) throw new Error("服务配置字段无效");
  for (const [name, value] of Object.entries(values)) {
    if (typeof value !== "string" || !value.trim() || value.length > 4096 || /[\r\n\0]/.test(value)) throw new Error("服务配置格式无效");
    if (["QCPORTAL_ADDRESS", "OQC_API_ENDPOINT"].includes(name)) {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("服务地址必须是无凭据的 HTTPS 地址");
      if (name === "OQC_API_ENDPOINT" && (url.port || (url.hostname !== "oqc.app" && !url.hostname.endsWith(".oqc.app")))) throw new Error("OQC 地址必须属于 oqc.app 并使用 HTTPS 默认端口");
    }
  }
  if (JSON.stringify(values).length > 8192) throw new Error("服务配置过大");
  return values;
}
export async function serviceValues(credentials, service, { ignoreShared = false, fields } = {}) {
  if (credentials.serviceValues) return validateServiceValues(service, await credentials.serviceValues(service, { fields, ignoreShared }));
  const raw = await credentials.resolve(serviceCredentialRef(service.id));
  let values;
  try {
    values = raw ? JSON.parse(raw) : {};
    if (!values || typeof values !== "object" || Array.isArray(values)) throw new Error("Invalid credential record");
    if (fields) values = Object.fromEntries(Object.entries(values).filter(([name]) => fields.includes(name)));
    validateServiceValues(service, values);
  }
  catch { throw new Error("服务凭据格式无效，请重新配置"); }
  if ((!fields || fields.includes("QISKIT_IBM_TOKEN")) && service.fields.some(field => field.name === "QISKIT_IBM_TOKEN")) {
    if (ignoreShared) return values;
    const shared = await credentials.resolve("shared-QISKIT_IBM_TOKEN");
    if (shared) {
      let record;
      try { record = JSON.parse(shared); } catch { throw new Error("IBM 共享凭据格式无效，请重新配置"); }
      delete values.QISKIT_IBM_TOKEN;
      if (record.value !== null) Object.assign(values, validateServiceValues(service, { QISKIT_IBM_TOKEN: record.value }));
    } else {
      const previous = new Set(values.QISKIT_IBM_TOKEN ? [values.QISKIT_IBM_TOKEN] : []);
      for (const id of ["qiskit_ibm_runtime", "qiskit_ibm_transpiler", "quantum_hardware"].filter(id => id !== service.id)) {
        const legacy = await credentials.resolve(serviceCredentialRef(id));
        if (legacy) try { const value = JSON.parse(legacy).QISKIT_IBM_TOKEN; if (value) previous.add(value); } catch { throw new Error("IBM 旧凭据格式无效，请重新配置"); }
      }
      if (previous.size > 1) throw new Error("IBM 旧入口保存了不同凭据，请在 IBM Quantum 配置中统一保存");
      if (previous.size === 1) values.QISKIT_IBM_TOKEN = [...previous][0];
    }
  }
  return validateServiceValues(service, values);
}
export async function saveServiceValues(credentials, service, values, { updateShared = true } = {}) {
  validateServiceValues(service, values);
  const stored = { ...values };
  if (updateShared && service.fields.some(field => field.name === "QISKIT_IBM_TOKEN")) {
    // A tombstone prevents removed shared credentials resurfacing from old rows.
    await credentials.set("shared-QISKIT_IBM_TOKEN", JSON.stringify({ value: stored.QISKIT_IBM_TOKEN ?? null }));
    delete stored.QISKIT_IBM_TOKEN;
  }
  const ref = serviceCredentialRef(service.id);
  if (Object.keys(stored).length) await credentials.set(ref, JSON.stringify(stored)); else await credentials.remove(ref);
}
