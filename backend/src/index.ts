import express from 'express';
import { Queue } from 'bullmq';
import prisma from './lib/prisma';
import { setupDealSyncWorker } from './workers/DealSyncWorker';
import { processChatMessage } from './services/aiAgent';

const app = express();
const port = process.env.PORT || 3000;

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

// Initialize BullMQ Queue
const dealSyncQueue = new Queue('deal-sync-queue', {
  connection: {
    host: REDIS_HOST,
    port: REDIS_PORT,
  },
});

// Initialize Worker
setupDealSyncWorker();

app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    // Basic connectivity check
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: String(error) });
  }
});

/**
 * Get total commission stats
 */
app.get('/api/stats', async (req, res) => {
  try {
    const result = await prisma.commission.aggregate({
      _sum: {
        amount: true,
      },
    });

    res.json({
      totalEarned: result._sum.amount || 0,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * Get recent commissions
 */
app.get('/api/commissions', async (req, res) => {
  try {
    const commissions = await prisma.commission.findMany({
      include: {
        deal: true,
      },
      orderBy: {
        deal: {
          closedAt: 'desc',
        },
      },
      take: 10,
    });

    res.json(commissions);
  } catch (error) {
    console.error('Error fetching commissions:', error);
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
});

/**
 * Trigger sub-agent to sync deals from mock CRM
 */
app.post('/api/sync', async (req, res) => {
  try {
    const job = await dealSyncQueue.add('sync-deals', {
      timestamp: new Date().toISOString(),
    });

    res.json({
      message: 'Deal synchronization job triggered',
      jobId: job.id,
    });
  } catch (error) {
    console.error('Error triggering sync job:', error);
    res.status(500).json({ status: 'error', message: 'Failed to trigger sync job' });
  }
});

/**
 * AI Agent Chat Endpoint
 */
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const { response, thoughts, sources } = await processChatMessage(message);
    res.json({ response, thoughts, sources });
  } catch (error) {
    console.error('AI Agent Error:', error);
    res.status(500).json({ error: 'Failed to process AI request' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
