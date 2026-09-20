import crypto from 'crypto';

/**
 * Generates a cryptographically random Case ID formatted as CASE-XXXXXX
 * using uppercase alphanumeric characters (excluding ambiguous chars like 0, O, 1, I).
 */
export function generateCaseId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const length = 6;
  let result = '';
  
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  
  return `CASE-${result}`;
}
