import crypto from "node:crypto";

// API キーを AES-256-GCM で暗号化/復号する（at rest 暗号化）。
// ENCRYPTION_KEY（任意の文字列）から SHA-256 で 32 バイト鍵を導出する。

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("ENCRYPTION_KEY が設定されていません");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

// 出力形式: base64(iv[12] | authTag[16] | ciphertext)
export function encrypt(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt(payload: string): string {
  const key = getKey();
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

// 表示用マスク（下4桁）
export function last4(value: string): string {
  return value.slice(-4);
}
