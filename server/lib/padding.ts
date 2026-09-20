import crypto from 'crypto';
import { Response } from 'express';

export const TARGET_PADDED_SIZE_BYTES = 1024; // Constant 1KB wire size for metadata camouflage

/**
 * Pads a JSON object so that its serialized UTF-8 representation
 * is exactly `targetSizeBytes` in length.
 * Adds a `_camouflagedPadding` field filled with deterministic/random characters.
 */
export function createPaddedPayload(
  payload: Record<string, unknown>,
  targetSizeBytes: number = TARGET_PADDED_SIZE_BYTES
): string {
  // First, serialize payload with empty padding field to calculate base length
  const baseObject = {
    ...payload,
    _camouflage: {
      targetSize: targetSizeBytes,
      wireConstant: true,
      timestamp: new Date().toISOString(),
    },
    _padding: '',
  };

  const initialJson = JSON.stringify(baseObject);
  const initialLength = Buffer.byteLength(initialJson, 'utf8');

  if (initialLength >= targetSizeBytes) {
    // If payload exceeds default target, expand to next 512-byte boundary
    const expandedTarget = Math.ceil((initialLength + 64) / 512) * 512;
    return createPaddedPayload(payload, expandedTarget);
  }

  // Calculate required padding bytes
  const bytesNeeded = targetSizeBytes - initialLength;
  // Generate random base64 or alphanumeric noise string to fill exact byte count
  const noise = crypto.randomBytes(Math.ceil(bytesNeeded / 2)).toString('hex').slice(0, bytesNeeded);

  baseObject._padding = noise;
  let finalJson = JSON.stringify(baseObject);
  let finalLength = Buffer.byteLength(finalJson, 'utf8');

  // Fine-tune by whitespace padding if off by 1-2 bytes due to formatting
  if (finalLength < targetSizeBytes) {
    finalJson = finalJson + ' '.repeat(targetSizeBytes - finalLength);
  } else if (finalLength > targetSizeBytes) {
    const diff = finalLength - targetSizeBytes;
    baseObject._padding = noise.slice(0, Math.max(0, noise.length - diff));
    finalJson = JSON.stringify(baseObject);
    finalLength = Buffer.byteLength(finalJson, 'utf8');
    if (finalLength < targetSizeBytes) {
      finalJson = finalJson + ' '.repeat(targetSizeBytes - finalLength);
    }
  }

  return finalJson;
}

/**
 * Express middleware helper to send an exact-byte padded JSON response.
 */
export function sendPaddedJson(
  res: Response,
  data: Record<string, unknown>,
  targetSize: number = TARGET_PADDED_SIZE_BYTES
): void {
  const paddedBody = createPaddedPayload(data, targetSize);
  const actualWireBytes = Buffer.byteLength(paddedBody, 'utf8');

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', actualWireBytes.toString());
  res.setHeader('X-Metadata-Camouflage', 'active');
  res.setHeader('X-Padded-Wire-Bytes', actualWireBytes.toString());

  res.status(200).send(paddedBody);
}
