import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './prisma';
import { generateCaseId } from './lib/generateCaseId';

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
    
    // Ensure uniqueness against existing database records
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
      createdAt: caseRecord.createdAt,
    });
  } catch (error) {
    console.error('Error verifying Case ID:', error);
    res.status(500).json({ success: false, error: 'Failed to verify Case ID' });
  }
});

app.listen(PORT, () => {
  console.log(`[AlgoX Server] Running on http://localhost:${PORT}`);
});
