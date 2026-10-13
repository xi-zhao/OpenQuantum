import { mcpCatalogEntry, mcpCredentialCatalogEntry } from "../server/project-settings-catalog.mjs";

// Desktop owns service/credential presentation. This adapter adds only Codex
// availability, execution requirements and the reviewed environment allowlist.
const field = (name, title, required = true, secret = true) => {
  const entry = mcpCredentialCatalogEntry(name);
  return { name, title: title ?? entry.displayName, required, secret,
    description: entry.description.replaceAll("Harness 凭据库", "系统凭据库").replaceAll("Harness 安全凭据", "安全凭据"),
    documentationUrl: entry.documentationUrl };
};
const token = (name, title = "API Token", required = true) => field(name, title, required);
const pending = "当前 Codex 插件尚未接入此执行入口。可查看所需凭据和官方说明。";
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
  desktop("qiskit_ibm_runtime", { category: "hardware", availabilityNote: pending,
    fields: [token("QISKIT_IBM_TOKEN", "IBM Quantum API Token")] }),
  desktop("qiskit_ibm_transpiler", { category: "circuits", availabilityNote: pending,
    fields: [token("QISKIT_IBM_TOKEN", "IBM Quantum API Token")] }),
  desktop("quantum_hardware", { category: "hardware", availabilityNote: pending,
    fields: [token("QISKIT_IBM_TOKEN", "IBM Quantum API Token", false), token("IONQ_API_KEY", "IonQ API Key", false)] }),
  desktop("qpanda_runtime", { category: "hardware", availabilityNote: pending,
    fields: [token("QPANDA3_API_KEY", "本源量子 API Key")] }),
  desktop("fieldqkit", { capability: "fieldqkit-hardware", category: "hardware", supported: true,
    fields: [token("QUAFU_API_TOKEN", "夸父", false), token("TIANYAN_API_TOKEN", "天衍", false), token("GUODUN_API_TOKEN", "国盾", false), token("TENCENT_API_TOKEN", "腾讯", false), token("ORIGIN_API_TOKEN", "本源", false), token("FIELDQUANTUM_API_TOKEN", "FieldQuantum", false), token("LOGICALQUBIT_API_TOKEN", "逻辑比特", false)] }),
  { id: "pasqal_cloud", title: "Pasqal Cloud", category: "hardware", description: "通过 Pasqal Skill 和宿主代码工具执行。需在 SDK 环境中配置访问令牌，或用户名与密码；当前不读取本页保存的凭据。", documentationUrl: "https://docs.pasqal.com/cloud/",
    fields: [token("PASQAL_AUTH_TOKEN", "Access Token", false), field("PASQAL_USERNAME", "用户名（密码登录）", false, false), token("PASQAL_PASSWORD", "密码", false)] },
];
export const serviceById = id => SERVICES.find(service => service.id === id);
export const serviceCredentialRef = id => `service-${id}`;
export const SERVICE_TOOL_TITLES = {
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
export function missingFields(service, values) {
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
export async function serviceValues(credentials, service) {
  const raw = await credentials.resolve(serviceCredentialRef(service.id));
  if (!raw) return {};
  try { return validateServiceValues(service, JSON.parse(raw)); }
  catch { throw new Error("服务凭据格式无效，请重新配置"); }
}
