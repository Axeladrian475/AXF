import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey() {
  const secret = process.env.PASSWORD_VAULT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Falta PASSWORD_VAULT_SECRET o JWT_SECRET para cifrar contraseñas.');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/** Cifra una contraseña en texto plano para recuperación exclusiva del maestro. */
export function encryptPassword(plain) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/** Descifra el valor almacenado en password_enc. */
export function decryptPassword(encoded) {
  const buf = Buffer.from(encoded, 'base64');
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
  const data = buf.subarray(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
