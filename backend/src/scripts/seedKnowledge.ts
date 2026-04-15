import { VectorStore } from '../services/VectorStore';

const POLICIES = [
  "Clawback policy applies if a deal is cancelled within 30 days of closing.",
  "Commission rate is fixed at 10% for all WON deals.",
  "Deals must have a status of 'WON' and a valid close date to be eligible for commission calculation.",
  "Commission payments are processed on the 15th of the following month after the deal is closed.",
  "The maximum commission cap per single deal is $50,000.",
  "Multi-year contracts earn commission on the total contract value of the first year only.",
  "If a salesperson leaves the company, they are entitled to commissions on all deals closed before their last day."
];

async function seed() {
  console.log('🌱 Seeding Knowledge Base...');
  
  const vectorStore = await VectorStore.getInstance();
  
  for (const policy of POLICIES) {
    try {
      console.log(`- Adding policy: "${policy.substring(0, 50)}..."`);
      await vectorStore.addKnowledge(policy, { category: 'policy', source: 'seed' });
    } catch (error) {
      console.error(`Failed to add policy: ${policy}`, error);
    }
  }
  
  console.log('✅ Seeding complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Fatal error during seeding:', err);
  process.exit(1);
});
