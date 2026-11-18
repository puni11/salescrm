import crypto from "crypto";

const getKey = () => {
  const key = process.env.GOOGLE_ADS_TOKEN_ENCRYPTION_KEY;

  if (!key || key.length !== 64) {
    throw new Error(
      "GOOGLE_ADS_TOKEN_ENCRYPTION_KEY must be a 64-character hex key"
    );
  }

  return Buffer.from(key, "hex");
};

export function encryptToken(value) {
  if (!value) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString("hex"),
    encrypted: encrypted.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

export function decryptToken(data) {
  if (!data) return null;

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(data.iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(data.authTag, "hex"));

  return Buffer.concat([
    decipher.update(Buffer.from(data.encrypted, "hex")),
    decipher.final(),
  ]).toString("utf8");
}