import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function randomId(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(10).toString('hex')}`;
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  if (typeof password !== 'string' || password.length < 10) {
    throw new Error('Mật khẩu phải có ít nhất 10 ký tự.');
  }
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, encoded) {
  try {
    const [algo, salt, hash] = String(encoded).split('$');
    if (algo !== 'scrypt' || !salt || !hash) return false;
    const actual = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function readMasterKey(rootDir) {
  const env = process.env.NUTE_MASTER_ENCRYPTION_KEY?.trim();
  if (env) {
    const key = Buffer.from(env, 'base64');
    if (key.length !== 32) throw new Error('NUTE_MASTER_ENCRYPTION_KEY phải giải mã thành đúng 32 bytes.');
    return key;
  }
  const file = path.join(rootDir, 'data', 'system.key');
  if (fs.existsSync(file)) return Buffer.from(fs.readFileSync(file, 'utf8').trim(), 'base64');
  const key = crypto.randomBytes(32);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, key.toString('base64'), { mode: 0o600 });
  return key;
}

export function createSecretCipher(rootDir) {
  const key = readMasterKey(rootDir);
  return {
    encrypt(value) {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
      return {
        ciphertext: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        tag: cipher.getAuthTag().toString('base64')
      };
    },
    decrypt(secret) {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(secret.iv, 'base64'));
      decipher.setAuthTag(Buffer.from(secret.tag, 'base64'));
      return Buffer.concat([
        decipher.update(Buffer.from(secret.ciphertext, 'base64')),
        decipher.final()
      ]).toString('utf8');
    }
  };
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function newSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function constantTimeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
