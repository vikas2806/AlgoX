import { prisma } from '../prisma';

// Default configuration for MVP demo: 20s base delay + random jitter (±5s)
export const DEFAULT_BASE_DELAY_SEC = 15;
export const DEFAULT_JITTER_MAX_SEC = 10;

/**
 * Calculates a jittered release timestamp.
 * scheduledTime = now + baseDelay + random(0, maxJitter)
 */
export function calculateJitteredReleaseTime(
  baseDelaySec: number = DEFAULT_BASE_DELAY_SEC,
  maxJitterSec: number = DEFAULT_JITTER_MAX_SEC
): { scheduledAt: Date; delaySec: number; jitterSec: number } {
  const jitterSec = Math.floor(Math.random() * (maxJitterSec + 1));
  const totalDelaySec = baseDelaySec + jitterSec;
  const scheduledAt = new Date(Date.now() + totalDelaySec * 1000);

  return { scheduledAt, delaySec: totalDelaySec, jitterSec };
}

export interface EncryptedNotePayload {
  encryptedContent: string;
  iv: string;
  authTag: string;
}

/**
 * Queues a status update for delayed/batched release with random jitter.
 */
export async function queueStatusUpdate(
  caseId: string,
  targetStatus: string,
  immediate: boolean = false,
  notePayload?: EncryptedNotePayload | null
) {
  if (immediate) {
    // Immediate bypass (if requested for test or initial submission)
    const updateData: Record<string, unknown> = { publicStatus: targetStatus };
    if (notePayload) {
      updateData.statusNoteEncrypted = notePayload.encryptedContent;
      updateData.statusNoteIv = notePayload.iv;
      updateData.statusNoteAuthTag = notePayload.authTag;
      updateData.statusNoteUpdatedAt = new Date();
    }

    await prisma.case.update({
      where: { caseId },
      data: updateData,
    });
    return { releasedNow: true, scheduledAt: new Date() };
  }

  const { scheduledAt, delaySec, jitterSec } = calculateJitteredReleaseTime();

  const queueEntry = await prisma.statusUpdateQueue.create({
    data: {
      caseId,
      targetStatus,
      targetNoteEncrypted: notePayload?.encryptedContent || null,
      targetNoteIv: notePayload?.iv || null,
      targetNoteAuthTag: notePayload?.authTag || null,
      scheduledReleaseAt: scheduledAt,
      released: false,
    },
  });

  console.log(
    `[AlgoX Batch Queue] Status update queued for ${caseId} -> "${targetStatus}" | Delay: ${delaySec}s (Base: ${DEFAULT_BASE_DELAY_SEC}s + Jitter: ${jitterSec}s) | Scheduled: ${scheduledAt.toLocaleTimeString()}`
  );

  return {
    queueId: queueEntry.id,
    scheduledReleaseAt: scheduledAt,
    delaySeconds: delaySec,
    jitterSeconds: jitterSec,
    releasedNow: false,
    hasAttachedNote: !!notePayload,
  };
}

/**
 * Background worker job: Polls queue and releases scheduled updates.
 */
export function startBatchWorker(intervalMs: number = 3000) {
  console.log(`[AlgoX Batch Worker] Started background jitter dispatcher (Polling every ${intervalMs / 1000}s)`);

  const worker = setInterval(async () => {
    try {
      const now = new Date();

      // Find pending updates whose scheduled release time has arrived
      const dueUpdates = await prisma.statusUpdateQueue.findMany({
        where: {
          released: false,
          scheduledReleaseAt: { lte: now },
        },
      });

      for (const update of dueUpdates) {
        // Prepare case update payload
        const updateData: Record<string, unknown> = { publicStatus: update.targetStatus };
        if (update.targetNoteEncrypted) {
          updateData.statusNoteEncrypted = update.targetNoteEncrypted;
          updateData.statusNoteIv = update.targetNoteIv;
          updateData.statusNoteAuthTag = update.targetNoteAuthTag;
          updateData.statusNoteUpdatedAt = new Date();
        }

        // Apply public status (and note if attached) to case
        await prisma.case.update({
          where: { caseId: update.caseId },
          data: updateData,
        });

        // Mark queue record as released
        await prisma.statusUpdateQueue.update({
          where: { id: update.id },
          data: { released: true },
        });

        console.log(
          `[AlgoX Batch Worker] Released scheduled update for ${update.caseId} -> "${update.targetStatus}" (Batch window elapsed)`
        );
      }
    } catch (error) {
      console.error('[AlgoX Batch Worker Error]:', error);
    }
  }, intervalMs);

  return worker;
}
