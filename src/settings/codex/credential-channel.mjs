import { generateKeyPair, exportJWK, compactDecrypt } from "jose";
import { serviceSupported, serviceById } from "./service-catalog.mjs";
import { writeCredentialField } from "./credential-field-write.mjs";
import { createCredentialRequests } from "./credential-requests.mjs";

const ALGORITHM = "RSA-OAEP-256", ENCRYPTION = "A256GCM";
const invalid = () => ({ status: 403, message: "保存请求已失效，请先检查刷新后的状态，再重新填写。" });

export function createCredentialChannel(context) {
  const requests = createCredentialRequests();
  let keyPair, closed = false;
  return {
    async prepare({ id, field, operation }) {
      const service = serviceById(id);
      if (closed || !serviceSupported(service, context.settings.backend) ||
          !service.fields.some(item => item.name === field) || !["set", "remove"].includes(operation)) throw new Error("凭据配置请求无效");
      // One non-extractable private key per process, never persisted or returned.
      keyPair ??= generateKeyPair(ALGORITHM, { modulusLength: 2048 });
      let publicKey;
      try { publicKey = await exportJWK((await keyPair).publicKey); }
      catch { throw new Error("安全保存暂时不可用，请使用独立凭据窗口。"); }
      if (closed) throw new Error("设置页已过期，请重新打开。");
      const nonce = requests.issue({ id, field, operation });
      return { nonce, publicKey, algorithm: ALGORITHM, encryption: ENCRYPTION };
    },
    async commit({ nonce, ciphertext }) {
      // Consume before decrypting or acquiring the write lock, including failure.
      const session = requests.consume(nonce);
      if (!session || typeof ciphertext !== "string" || ciphertext.length > 32768) return invalid();
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
    close() { closed = true; requests.close(); keyPair = undefined; },
  };
}
