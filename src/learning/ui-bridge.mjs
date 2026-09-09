export const CHANNEL = "openquantum.openmaic.v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** A child page gets no arbitrary Harness RPC or credential surface. */
export function acceptsMessage(event, source, origin) {
  return Boolean(source && event.source === source && event.origin === origin &&
    event.data?.channel === CHANNEL && UUID.test(event.data.requestId) &&
    ["library", "generate"].includes(event.data.type));
}

export function classroomRequirements(payload) {
  if (!payload || typeof payload.requirement !== "string" || !payload.requirement.trim() || payload.requirement.length > 2000) {
    throw new TypeError("请将建课要求控制在 2,000 字以内。");
  }
  if (typeof payload.material !== "string" || payload.material.length > 24_000) throw new TypeError("参考材料最多 24,000 字。");
  if (payload.webSearch || payload.interactiveMode) throw new TypeError("联网检索和交互课生成尚未接入，请先关闭这两个选项。已有课堂的交互内容仍可使用原版界面打开。");
  const text = payload.requirement.trim();
  return {
    topic: text.split("\n")[0].slice(0, 200), goal: text, material: payload.material,
    level: /高级|博士|前沿研究/.test(text) ? "高级" : /中级|硕士|研究生/.test(text) ? "中级" : "初级",
    slideCount: 4,
  };
}
