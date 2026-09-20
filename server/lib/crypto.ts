import crypto from 'crypto';

// Use 32-byte (256-bit) key for AES-256
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (!envKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not defined.');
  }

  if (envKey.length === 64) {
    return Buffer.from(envKey, 'hex');
  }

  // Derive 32-byte key using SHA-256 if key is plain text
  return crypto.createHash('sha256').update(envKey).digest();
}

export interface EncryptedPayload {
  encryptedContent: string; // hex
  iv: string;               // hex
  authTag: string;          // hex
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Plaintext is processed in memory and never logged or stored.
 */
export function encryptComplaint(plaintext: string): EncryptedPayload {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encryptedContent: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag,
  };
}

/**
 * Decrypts ciphertext using AES-256-GCM (used only when authorized).
 */
export function decryptComplaint(payload: EncryptedPayload): string {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));

  let decrypted = decipher.update(payload.encryptedContent, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
