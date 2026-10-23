import { AsyncEntry } from "@napi-rs/keyring";

// The UI can only describe/write/delete. Secret resolution stays in reviewed execution adapters.
export class Credentials {
  constructor({ service = "org.openquantum.codex-plugin", entry = (ref) => new AsyncEntry(service, ref) } = {}) { this.entry = entry; }
  async resolve(ref) {
    try { return await this.entry(ref).getPassword() ?? null; }
    catch (error) {
      if (/no (?:entry|matching)|not found|NoEntry/i.test(error.message)) return null;
      throw new Error("系统凭据库不可用或访问被拒绝");
    }
  }
  async describe(ref) { return { configured: Boolean(await this.resolve(ref)) }; }
  async set(ref, value) {
    if (typeof value !== "string" || !value.length || value.length > 8192 || /[\r\n\0]/.test(value)) throw new Error("Token 格式无效");
    try { await this.entry(ref).setPassword(value); }
    catch { throw new Error("无法保存到系统凭据库"); }
  }
  async remove(ref) {
    if (!await this.resolve(ref)) return;
    try { await this.entry(ref).deletePassword(); }
    catch { throw new Error("无法移除系统凭据"); }
  }
}
