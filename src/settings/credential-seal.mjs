import { CompactEncrypt, importJWK } from "jose";

// Only this ciphertext goes through the host's app-only tool channel. The
// plaintext stays in the form and the credential-store process.
export async function sealCredentialField(permission, input) {
  if (!globalThis.crypto?.subtle || permission.algorithm !== "RSA-OAEP-256" || permission.encryption !== "A256GCM" ||
      !/^[a-f0-9]{64}$/.test(permission.nonce) || permission.publicKey?.kty !== "RSA" || permission.publicKey.d) {
    throw new Error("安全保存暂时不可用，请使用独立凭据窗口。");
  }
  try {
    const publicKey = await importJWK(permission.publicKey, "RSA-OAEP-256");
    return await new CompactEncrypt(new TextEncoder().encode(JSON.stringify(input)))
      .setProtectedHeader({ alg: "RSA-OAEP-256", enc: "A256GCM", kid: permission.nonce }).encrypt(publicKey);
  } catch { throw new Error("安全保存暂时不可用，请使用独立凭据窗口。"); }
}
