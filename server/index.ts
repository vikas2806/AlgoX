import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './prisma';
import { generateCaseId } from './lib/generateCaseId';
import { encryptComplaint } from './lib/crypto';
import { mapInternalToPublic } from './lib/statusMapping';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

// Verify if a Case ID exists in the database
app.post('/api/cases/verify-id', async (req, res) => {
  try {
    const { caseId } = req.body;
    if (!caseId || typeof caseId !== 'string') {
      res.status(400).json({ success: false, error: 'Case ID is required' });
      return;
    }

    const trimmedId = caseId.trim().toUpperCase();
    const caseRecord = await prisma.case.findUnique({
      where: { caseId: trimmedId },
    });

    if (!caseRecord) {
      res.status(404).json({ success: false, exists: false, error: 'Case ID not found' });
      return;
    }

    res.json({
      success: true,
      exists: true,
      caseId: caseRecord.caseId,
      publicStatus: caseRecord.publicStatus,
      createdAt: caseRecord.createdAt,
    });
  } catch (error) {
    console.error('Error verifying Case ID:', error);
    res.status(500).json({ success: false, error: 'Failed to verify Case ID' });
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

// Task 4: HR Admin — Update internal status & map to 4 public states
app.post('/api/admin/cases/update-status', async (req, res) => {
  try {
    const { caseId, internalStatus, customPublicStatus } = req.body;

    if (!caseId || !internalStatus) {
      res.status(400).json({ success: false, error: 'Case ID and internal status are required.' });
      return;
    }

    const trimmedId = caseId.trim().toUpperCase();
    const publicStatus = customPublicStatus || mapInternalToPublic(internalStatus);

    const updatedCase = await prisma.case.update({
      where: { caseId: trimmedId },
      data: {
        internalStatus,
        publicStatus,
      },
    });

    console.log(`[AlgoX Server Admin] Status updated for ${updatedCase.caseId} -> Internal: ${updatedCase.internalStatus}, Public: ${updatedCase.publicStatus}`);

    res.json({
      success: true,
      caseId: updatedCase.caseId,
      internalStatus: updatedCase.internalStatus,
      publicStatus: updatedCase.publicStatus,
      updatedAt: updatedCase.updatedAt,
    });
  } catch (error) {
    console.error('Error updating case status:', error);
    res.status(500).json({ success: false, error: 'Failed to update case status' });
  }
});

app.listen(PORT, () => {
  console.log(`[AlgoX Server] Running on http://localhost:${PORT}`);
});
