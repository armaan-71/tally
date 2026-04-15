import { VectorStore } from '../services/VectorStore';

const POLICIES = [
  {
    content: "Clawback policy applies if a deal is cancelled within 30 days of closing.",
    source: "Sales Compensation Plan 2024"
  },
  {
    content: "Commission rate is fixed at 10% for all WON deals.",
    source: "Incentive Structure Guide"
  },
  {
    content: "Deals must have a status of 'WON' and a valid close date to be eligible for commission calculation.",
    source: "Operational Guidelines"
  },
  {
    content: "Commission payments are processed on the 15th of the following month after the deal is closed.",
    source: "Finance & Payroll FAQ"
  },
  {
    content: "The maximum commission cap per single deal is $50,000.",
    source: "Sales Compensation Plan 2024"
  },
  {
    content: "Multi-year contracts earn commission on the total contract value of the first year only.",
    source: "Contract Policy Handbook"
  },
  {
    content: "If a salesperson leaves the company, they are entitled to commissions on all deals closed before their last day.",
    source: "Employee Exit Protocol"
  }
];

async function seed() {
  console.log('🌱 Seeding Knowledge Base...');
  
  const vectorStore = await VectorStore.getInstance();
  
  for (const policy of POLICIES) {
    try {
      console.log(`- Adding policy: "${policy.content.substring(0, 50)}..."`);
      await vectorStore.addKnowledge(policy.content, { category: 'policy', source: policy.source });
    } catch (error) {
      console.error(`Failed to add policy: ${policy.content}`, error);
    }
  }
  
  console.log('✅ Seeding complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Fatal error during seeding:', err);
  process.exit(1);
});
