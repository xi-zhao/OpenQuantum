import { randomBytes } from "node:crypto";
import { generateKeyPair, exportJWK, compactDecrypt } from "jose";
import { serviceById } from "./service-catalog.mjs";
import { writeCredentialField } from "./credential-field-write.mjs";

const ALGORITHM = "RSA-OAEP-256", ENCRYPTION = "A256GCM";
const invalid = () => ({ status: 403, message: "保存请求已失效，请先检查刷新后的状态，再重新填写。" });

export function createCredentialChannel(context) {
  const sessions = new Map();
  let keyPair, closed = false;
  return {
    async prepare({ id, field, operation }) {
      const service = serviceById(id);
      if (closed || !service?.supported || !context.settings.backend.providers.some(provider => provider.key === id) ||
          !service.fields.some(item => item.name === field) || !["set", "remove"].includes(operation)) throw new Error("凭据配置请求无效");
      // One non-extractable private key per process, never persisted or returned.
      keyPair ??= generateKeyPair(ALGORITHM, { modulusLength: 2048 });
      let publicKey;
      try { publicKey = await exportJWK((await keyPair).publicKey); }
      catch { throw new Error("安全保存暂时不可用，请使用独立凭据窗口。"); }
      if (closed) throw new Error("设置页已过期，请重新打开。");
      for (const [key, session] of sessions) if (session.expires < Date.now()) sessions.delete(key);
      if (sessions.size >= 32) throw new Error("凭据请求过多，请稍后重试");
      const nonce = randomBytes(32).toString("hex");
      sessions.set(nonce, { id, field, operation, expires: Date.now() + 10 * 60 * 1000 });
      return { nonce, publicKey, algorithm: ALGORITHM, encryption: ENCRYPTION };
    },
    async commit({ nonce, ciphertext }) {
      const session = sessions.get(nonce);
      if (closed || !session) return invalid();
      // Consume before decrypting or acquiring the write lock, including failure.
      sessions.delete(nonce);
      if (session.expires < Date.now() || typeof ciphertext !== "string" || ciphertext.length > 32768) return invalid();
      let input;
      try {
        const { plaintext, protectedHeader } = await compactDecrypt(ciphertext, (await keyPair).privateKey, {
          keyManagementAlgorithms: [ALGORITHM], contentEncryptionAlgorithms: [ENCRYPTION], maxDecompressedLength: 0,
        });
        if (protectedHeader.kid !== nonce || plaintext.byteLength > 16384 ||
            Object.keys(protectedHeader).some(key => !["alg", "enc", "kid"].includes(key))) return invalid();
        input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(plaintext));
      } catch { return invalid(); }
      try {
        if (closed) return invalid();
        const result = await writeCredentialField(context, session, input);
        if (result.status === 200) await context.settings.changed();
        return result;
      } catch { return { status: 500, message: "保存结果尚未确认，请刷新状态，并检查系统凭据库权限。" }; }
    },
    close() { closed = true; sessions.clear(); keyPair = undefined; },
  };
}
