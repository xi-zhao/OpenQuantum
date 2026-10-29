// A service owns its form; a shared credential appears once. Values never enter
// this view model: only the catalog and saved-field flags from the snapshot do.
const presentation = {
  superstaq_cloud: { title: "Superstaq" },
  classiq_cloud: { title: "Classiq" },
  qctrl_cloud: { title: "Q-CTRL" },
  aqt_local: { title: "AQT" },
  quantuminspire_cloud: { title: "Quantum Inspire" },
  fieldqkit: { title: "FieldQKit 多平台接入", note: "仅填写要使用的平台 Token；七个平台独立可选，本地模拟无需凭据。" },
  qcarchive_data: { title: "QCArchive", note: "服务器地址必填。公开服务可匿名访问；需要账户时，用户名和密码须配齐。" },
  oqc_cloud: { title: "OQC Cloud", note: "API Token 用于云端访问。未保存地址时使用 https://cloud.oqc.app；已有地址留空会保留，移除后恢复默认。" },
  pasqal_cloud: { title: "Pasqal Cloud", description: "供 Pasqal Skill 的云端操作使用；本地模拟无需凭据。", note: "填写 Access Token，或配齐用户名与密码。两种方式都已保存时优先使用 Token。" },
  ibm_quantum: { title: "IBM Quantum", category: "hardware", description: "IBM Runtime、AI Transpiler 与硬件连接使用的 IBM Quantum API Token。" },
  ionq: { title: "IonQ", description: "IonQ 云端硬件连接使用的 API Key。" },
};

export function accountState(item, services) {
  if (item.authentication) {
    if (item.authentication === "none") return { key: "none", label: "无需账户" };
    if (item.credential?.unavailable) return { key: "unavailable", label: "凭据未读取" };
    return item.credential?.configured ? { key: "configured", label: "Token 已保存" } : { key: "missing", label: "待配置 Token" };
  }
  const ids = item.relations?.credentialServiceIds ?? [item.service ?? item.id];
  const entries = services.filter(service => ids.includes(service.id));
  if (!entries.length) return { key: "none", label: "无需账户" };
  if (entries.every(service => !service.supported)) return { key: "unsupported", label: "查看云端账户要求" };
  if (entries.some(service => service.configuration === "unavailable")) return { key: "unavailable", label: "凭据未读取" };
  if (entries.some(service => service.configuration === "incomplete")) {
    const fields = entries.flatMap(service => service.fields).filter(field => field.required && !field.configured);
    const kind = fields.length && fields.every(field => /TOKEN|KEY/.test(field.name)) ? fields.some(field => /KEY/.test(field.name)) ? "Key" : "Token" : "账户";
    return { key: "missing", label: `云端待配置 ${kind}` };
  }
  if (entries.some(service => service.fields.some(field => field.configured))) return { key: "configured", label: "凭据已保存" };
  return { key: "optional", label: "云端按需配置" };
}

export function credentialEntries(services) {
  const fields = new Map();
  for (const service of services) for (const field of service.fields) {
    const entry = fields.get(field.name);
    if (entry) {
      entry.services.push(service);
      if (service.supported) Object.assign(entry, field);
    } else fields.set(field.name, { ...field, services: [service] });
  }
  const groups = new Map();
  for (const field of fields.values()) {
    const owner = field.services.find(service => service.supported) ?? field.services[0];
    const id = field.name === "QISKIT_IBM_TOKEN" ? "ibm_quantum" : field.name === "IONQ_API_KEY" ? "ionq" : owner.id;
    if (!groups.has(id)) groups.set(id, { id, title: owner.title, description: owner.description,
      category: owner.category, ...presentation[id], fields: [], services: [], serverNames: [] });
    const group = groups.get(id);
    group.fields.push(field);
    for (const service of field.services) if (!group.serverNames.includes(service.id)) {
      group.services.push(service); group.serverNames.push(service.id);
    }
  }
  return [...groups.values()].map(group => {
    const supported = group.services.some(service => service.supported);
    const saved = group.fields.filter(field => field.configured).length;
    const unavailable = group.fields.some(field => field.unavailable ?? field.services.some(service => service.supported && service.configuration === "unavailable"));
    const missing = group.fields.some(field => field.services.some(service => service.supported && (service.missing ? service.missing.includes(field.name) : service.configuration === "incomplete")));
    const configuration = !supported ? "unsupported" : unavailable ? "unavailable" : missing ? saved ? "partial" : "incomplete" : saved ? "configured" : "optional";
    return { ...group, supported, saved, configuration,
      ...(!supported ? { description: "此页面仅供查看云端认证要求；当前插件尚未提供这项云端入口。",
        fields: group.fields.map(field => ({ ...field, description: `${group.title} 云端认证字段，使用方式见官方说明。` })) } : {}),
      stateLabel: ({ unsupported: "云端未接入", unavailable: "未读取", partial: "待补全", incomplete: "未配置", configured: "已保存", optional: "按需配置" })[configuration] };
  }).sort((a, b) => Number(b.id === "fieldqkit") - Number(a.id === "fieldqkit"));
}
