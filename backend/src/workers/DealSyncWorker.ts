import { Worker, Job } from 'bullmq';
import { Decimal } from 'decimal.js';
import prisma from '../lib/prisma';
import { CommissionService } from '../services/CommissionService';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

// Mock function to simulate fetching from a CRM
const mockFetchDeals = (count: number) => {
  const statuses: ('WON' | 'LOST' | 'OPEN')[] = ['WON', 'LOST', 'OPEN'];
  return Array.from({ length: count }, (_, i) => ({
    externalId: `crm_deal_${Math.floor(Math.random() * 1000000)}`,
    amount: new Decimal((Math.random() * 10000 + 1000).toFixed(2)),
    currency: 'USD',
    status: statuses[Math.floor(Math.random() * statuses.length)],
    closedAt: new Date(),
  }));
};

export const setupDealSyncWorker = () => {
  const worker = new Worker(
    'deal-sync-queue',
    async (job: Job) => {
      console.log(`[Worker] Starting job: ${job.id}`);

      // Ensure a default user exists for the commissions
      let defaultUser = await prisma.user.findFirst();
      if (!defaultUser) {
        defaultUser = await prisma.user.create({
          data: {
            name: 'Demo Sales Rep',
            email: 'demo@tally.so',
          },
        });
      }

      // 1. Mock fetch deals (50-100)
      const dealCount = Math.floor(Math.random() * 51) + 50;
      const mockDeals = mockFetchDeals(dealCount);
      console.log(`[Worker] Synced ${mockDeals.length} deals from mock CRM.`);

      let processedCount = 0;
      let commissionCount = 0;

      for (const mockDeal of mockDeals) {
        try {
          // 2. Local idempotency check & persist deal
          const deal = await prisma.deal.upsert({
            where: { externalId: mockDeal.externalId },
            update: {
              status: mockDeal.status,
              amount: mockDeal.amount,
            },
            create: {
              externalId: mockDeal.externalId,
              amount: mockDeal.amount,
              currency: mockDeal.currency,
              status: mockDeal.status,
              closedAt: mockDeal.closedAt,
            },
          });

          // 3. Idempotency check for Commission
          const existingCommission = await prisma.commission.findUnique({
            where: { dealId: deal.id },
          });

          if (!existingCommission && mockDeal.status === 'WON') {
            // 4. Calculate Commission
            const payoutAmount = CommissionService.calculateCommission(
              mockDeal.amount,
              mockDeal.status
            );

            if (payoutAmount.gt(0)) {
              // 5. Persist to Commission table
              await prisma.commission.create({
                data: {
                  dealId: deal.id,
                  amount: payoutAmount,
                  userId: defaultUser.id,
                },
              });
              commissionCount++;
            }
          }
          processedCount++;
        } catch (error) {
          console.error(`[Worker] Error processing deal ${mockDeal.externalId}:`, error);
        }
      }

      console.log(`[Worker] Job ${job.id} completed. Processed: ${processedCount}. Commissions: ${commissionCount}`);
      return { processedCount, commissionCount };
    },
    {
      connection: {
        host: REDIS_HOST,
        port: REDIS_PORT,
      },
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err);
  });

  return worker;
};
