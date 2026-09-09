const crypto = require('crypto');
const { encryptionKey } = require('../config');

const ALGORITHM = 'aes-256-gcm';

if (!encryptionKey || Buffer.from(encryptionKey, 'hex').length !== 32) {
  throw new Error(
    "ENCRYPTION_KEY manquante ou invalide dans .env : elle doit faire 32 octets en hexadécimal " +
    "(génère-la avec: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
  );
}

const key = Buffer.from(encryptionKey, 'hex');

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

function decrypt(payloadB64) {
  const payload = Buffer.from(payloadB64, 'base64');
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
