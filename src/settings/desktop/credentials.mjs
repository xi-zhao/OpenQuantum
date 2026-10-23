import { credentialRef } from "@deepseek-ai/dsh-credentials";

// Keep a single host-owned value per field. In particular all IBM services use
// QISKIT_IBM_TOKEN; service grouping is presentation, never another secret store.
export class DesktopCredentials {
  constructor(provider) { this.provider = provider; }
  async serviceValues(service, { fields } = {}) {
    const values = {};
    for (const field of service.fields.filter(field => !fields || fields.includes(field.name))) {
      const resolved = await this.provider.resolve(credentialRef(field.name));
      if (resolved?.value) values[field.name] = resolved.value;
    }
    return values;
  }
  async describeField(name) {
    const result = await this.provider.describe(credentialRef(name));
    return { configured: result.configured, writable: result.writable, source: result.source };
  }
  async writeField(name, value) {
    const ref = credentialRef(name);
    const state = await this.provider.describe(ref);
    if (!state.writable) throw new Error("此凭据由宿主环境提供，请在对应认证来源修改");
    if (value === null) await this.provider.unset(ref);
    else await this.provider.set(ref, value);
  }
}
