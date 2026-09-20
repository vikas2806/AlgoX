import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './prisma';
import { generateCaseId } from './lib/generateCaseId';
import { encryptComplaint } from './lib/crypto';
import { mapInternalToPublic } from './lib/statusMapping';
import { sendPaddedJson } from './lib/padding';
import { startBatchWorker, queueStatusUpdate } from './lib/batchWorker';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Start the background batch & jitter release worker
startBatchWorker(3000);

// Health check route
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generate a new, unique Case ID
app.get('/api/cases/generate-id', async (_req, res) => {
  try {
    let uniqueId = generateCaseId();
    let attempts = 0;
    
    while (attempts < 5) {
      const existing = await prisma.case.findUnique({
        where: { caseId: uniqueId },
      });
      if (!existing) break;
      uniqueId = generateCaseId();
      attempts++;
    }

    res.json({ success: true, caseId: uniqueId });
  } catch (error) {
    console.error('Error generating Case ID:', error);
    res.status(500).json({ success: false, error: 'Failed to generate Case ID' });
  }
});

// Verify if a Case ID exists in the database (Padded response)
app.post('/api/cases/verify-id', async (req, res) => {
  try {
    const { caseId } = req.body;
    if (!caseId || typeof caseId !== 'string') {
      sendPaddedJson(res, { success: false, error: 'Case ID is required' });
      return;
    }

    const trimmedId = caseId.trim().toUpperCase();
    const caseRecord = await prisma.case.findUnique({
      where: { caseId: trimmedId },
    });

    if (!caseRecord) {
      sendPaddedJson(res, { success: false, exists: false, error: 'Case ID not found' });
      return;
    }

    sendPaddedJson(res, {
      success: true,
      exists: true,
      caseId: caseRecord.caseId,
      publicStatus: caseRecord.publicStatus,
      createdAt: caseRecord.createdAt,
    });
  } catch (error) {
    console.error('Error verifying Case ID:', error);
    sendPaddedJson(res, { success: false, error: 'Failed to verify Case ID' });
  }
});

// Task 5 & 6: Status portal with Metadata Camouflage (Exact 1024-Byte Constant Padding)
app.get('/api/cases/:caseId/status', async (req, res) => {
  try {
    const { caseId } = req.params;
    if (!caseId) {
      sendPaddedJson(res, { success: false, error: 'Case ID is required' });
      return;
    }

    const trimmedId = caseId.trim().toUpperCase();
    const caseRecord = await prisma.case.findUnique({
      where: { caseId: trimmedId },
      select: {
        caseId: true,
        publicStatus: true,
        updatedAt: true,
      },
    });

    if (!caseRecord) {
      sendPaddedJson(res, { success: false, error: 'Case not found' });
      return;
    }

    // Check if there is a pending queued update for transparency in demo
    const pendingUpdate = await prisma.statusUpdateQueue.findFirst({
      where: {
        caseId: trimmedId,
        released: false,
      },
      orderBy: { scheduledReleaseAt: 'desc' },
    });

    sendPaddedJson(res, {
      success: true,
      caseId: caseRecord.caseId,
      publicStatus: caseRecord.publicStatus,
      updatedAt: caseRecord.updatedAt,
      hasPendingBatchedUpdate: !!pendingUpdate,
    });
  } catch (error) {
    console.error('Error fetching case status:', error);
    sendPaddedJson(res, { success: false, error: 'Failed to fetch case status' });
  }
});

// Pillar 2: Blind Server — Submit Complaint with AES-256 Encryption
app.post('/api/complaints/submit', async (req, res) => {
  try {
    const { caseId, complaintText, category } = req.body;

    if (!caseId || !complaintText) {
      res.status(400).json({ success: false, error: 'Case ID and complaint text are required.' });
      return;
    }

    const trimmedId = caseId.trim().toUpperCase();
    const cleanCategory = typeof category === 'string' ? category.trim() : 'General Harassment';

    const payloadToEncrypt = JSON.stringify({
      category: cleanCategory,
      text: complaintText.trim(),
      submittedAt: new Date().toISOString(),
    });

    const { encryptedContent, iv, authTag } = encryptComplaint(payloadToEncrypt);

    const caseRecord = await prisma.case.upsert({
      where: { caseId: trimmedId },
      update: {
        encryptedContent,
        iv,
        authTag,
        internalStatus: 'RECEIVED',
        publicStatus: 'Received',
      },
      create: {
        caseId: trimmedId,
        encryptedContent,
        iv,
        authTag,
        internalStatus: 'RECEIVED',
        publicStatus: 'Received',
      },
    });

    console.log(`[AlgoX Server] Complaint secured for ${caseRecord.caseId} | Ciphertext: ${encryptedContent.length / 2} bytes | Status: ${caseRecord.publicStatus}`);

    res.json({
      success: true,
      caseId: caseRecord.caseId,
      publicStatus: caseRecord.publicStatus,
      submittedAt: caseRecord.createdAt,
      ciphertextSize: encryptedContent.length / 2,
    });
  } catch (error) {
    console.error('Error saving encrypted complaint:', error);
    res.status(500).json({ success: false, error: 'Failed to submit encrypted complaint' });
  }
});

// Task 4: HR Admin — List all cases (without revealing plaintext)
app.get('/api/admin/cases', async (_req, res) => {
  try {
    const cases = await prisma.case.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        caseId: true,
        internalStatus: true,
        publicStatus: true,
        createdAt: true,
        updatedAt: true,
        encryptedContent: true,
      },
    });

    const sanitizedCases = cases.map((c) => ({
      id: c.id,
      caseId: c.caseId,
      internalStatus: c.internalStatus,
      publicStatus: c.publicStatus,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      ciphertextSize: c.encryptedContent.length / 2,
    }));

    res.json({ success: true, cases: sanitizedCases });
  } catch (error) {
    console.error('Error fetching admin cases:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cases' });
  }
});

// Task 7: HR Admin — Update status via Batched / Jittered Queue
app.post('/api/admin/cases/update-status', async (req, res) => {
  try {
    const { caseId, internalStatus, customPublicStatus, immediate } = req.body;

    if (!caseId || !internalStatus) {
      res.status(400).json({ success: false, error: 'Case ID and internal status are required.' });
      return;
    }

    const trimmedId = caseId.trim().toUpperCase();
    const targetPublicStatus = customPublicStatus || mapInternalToPublic(internalStatus);

    // Update internal status immediately in HR records
    const updatedCase = await prisma.case.update({
      where: { caseId: trimmedId },
      data: {
        internalStatus,
      },
    });

    // Enqueue public release with random jitter to prevent timing attacks
    const queueResult = await queueStatusUpdate(trimmedId, targetPublicStatus, !!immediate);

    res.json({
      success: true,
      caseId: updatedCase.caseId,
      internalStatus: updatedCase.internalStatus,
      targetPublicStatus,
      currentPublicStatus: updatedCase.publicStatus,
      batchedRelease: queueResult,
      updatedAt: updatedCase.updatedAt,
    });
  } catch (error) {
    console.error('Error updating case status:', error);
    res.status(500).json({ success: false, error: 'Failed to update case status' });
  }
});

// Task 7: HR Admin — List pending and recent batch queue items
app.get('/api/admin/queue', async (_req, res) => {
  try {
    const queue = await prisma.statusUpdateQueue.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ success: true, queue });
  } catch (error) {
    console.error('Error fetching queue:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch queue' });
  }
});

// Task 7: HR Admin — Force flush / release all pending queued updates (Demo testing tool)
app.post('/api/admin/queue/flush', async (_req, res) => {
  try {
    const pending = await prisma.statusUpdateQueue.findMany({
      where: { released: false },
    });

    for (const item of pending) {
      await prisma.case.update({
        where: { caseId: item.caseId },
        data: { publicStatus: item.targetStatus },
      });
      await prisma.statusUpdateQueue.update({
        where: { id: item.id },
        data: { released: true },
      });
    }

    res.json({ success: true, flushedCount: pending.length });
  } catch (error) {
    console.error('Error flushing queue:', error);
    res.status(500).json({ success: false, error: 'Failed to flush queue' });
  }
});

app.listen(PORT, () => {
  console.log(`[AlgoX Server] Running on http://localhost:${PORT}`);
});
