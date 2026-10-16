import { withLock } from "./storage.mjs";
import { serviceSupported, serviceById, serviceValues, saveServiceValues, validateServiceValues } from "./service-catalog.mjs";

// Shared by the encrypted app channel and the legacy loopback form. Neither
// transport owns field validation, read-modify-write or provider authorization.
export async function writeCredentialField({ settings, credentials }, session, input) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).some(key => key !== "value") || (session.operation === "remove" && Object.keys(input).length)) {
    return { status: 400, message: "凭据字段无效" };
  }
  return withLock(settings.file, async () => {
    if (session.expires < Date.now()) return { status: 403, message: "保存请求已过期，请重试" };
    const service = serviceById(session.id);
    if (!serviceSupported(service, settings.backend)) return { status: 409, message: "服务已变化，请刷新设置页" };
    if (session.operation === "set") {
      try { validateServiceValues(service, { [session.field]: input.value }); }
      catch {
        const address = ["QCPORTAL_ADDRESS", "OQC_API_ENDPOINT"].includes(session.field);
        return { status: 400, message: address
          ? session.field === "OQC_API_ENDPOINT" ? "请填写 oqc.app 官方 HTTPS 地址，不能包含账号、查询参数或自定义端口。"
            : "请填写 HTTPS 服务器地址，不能包含账号、查询参数或片段。"
          : "请输入有效的新值，不能留空、换行或超过 4096 个字符。" };
      }
    }
    if (credentials.writeField) {
      await credentials.writeField(session.field, session.operation === "set" ? input.value : null);
      return { status: 200, configured: session.operation === "set", message: session.operation === "set" ? "已保存；下一次调用生效，账户认证尚未验证。" : "此项凭据已移除。" };
    }
    const values = await serviceValues(credentials, service, { ignoreShared: true });
    if (session.operation === "set") values[session.field] = input.value;
    else delete values[session.field];
    validateServiceValues(service, values);
    await saveServiceValues(credentials, service, values, { updateShared: session.field === "QISKIT_IBM_TOKEN" });
    return { status: 200, configured: session.operation === "set", message: session.operation === "set" ? "已保存到本机凭据库，账户认证尚未验证。" : "此项凭据已移除。" };
  });
}
