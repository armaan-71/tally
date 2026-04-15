import express from 'express';
import { Queue } from 'bullmq';
import prisma from './lib/prisma';
import { setupDealSyncWorker } from './workers/DealSyncWorker';

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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
