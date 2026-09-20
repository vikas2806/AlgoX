/**
 * Generates a random Case ID formatted as CASE-XXXXXX
 * (Uses Web Crypto API)
 */
export function generateClientCaseId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const length = 6;
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  
  return `CASE-${result}`;
}
