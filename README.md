# Tally

**Tally** is an AI-native sales commission engine that automates external deal ingestion, financial calculation, and AI-powered insight retrieval using production-ready engineering standards.

---

## 🚀 Key Features

- **Automated Deal Sync**: Asynchronous ingestion of CRM data using **BullMQ** and **Redis**.
- **Financial Precision Layer**: Robust commission calculation (10% rate) using `Decimal.js` to ensure zero floating-point errors.
- **Tally AI Agent**: A sophisticated LLM interface (via **Groq Llama-3.3**) that handles:
  - **Structured Queries**: Real-time financial lookups without manual LLM-side math.
  - **RAG Capability**: Intelligent sales policy search using **pgvector** similarity search.
- **Premium Dashboard**: A 2-tab React interface featuring a glassmorphism Payouts Dashboard and a Tally Agent Chat.

---

## 🛠️ Technical Stack

- **Backend**: Node.js, Express, TypeScript (Strict Mode)
- **Infrastructure**: Docker Compose (PostgreSQL + pgvector, Redis)
- **ORM**: Prisma
- **Job Orchestration**: BullMQ
- **AI/LLM**: Groq SDK (Llama 3.3 70B), Zod (Schema Validation)
- **Frontend**: React, Tailwind CSS, Vite
- **Precision**: `Decimal.js` for all currency math.

---

## 🏛️ System Architecture

### 1. The "Ghost Computer" (Ingestion Engine)
The backend features a dedicated `/api/sync` endpoint that triggers a distributed background job.
- **Idempotency**: The system checks for existing commissions to prevent double-payouts.
- **Isolation**: Business logic is strictly kept in `CommissionService.ts`, decoupling the calculation engine from the API and LLM layers.

### 2. Tally AI Agent (Hybrid RAG & Tool-Calling)
The agent acts as a zero-trust router between the user and the system's data:
- **Tool-Calling**: Validated via **Zod**, the agent fetches pre-calculated sums directly from the database (e.g., `get_total_commissions`).
- **Vector Search**: For unstructured policy data, the agent performs a similarity search against the `KnowledgeBase` table using PostgreSQL's `<->` vector operator.

---

## 📦 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js (v18+)
- Groq API Key (Set in `backend/.env`)

### Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd tally
   ```

2. **Spin up Infrastructure**
   ```bash
   docker-compose up -d
   ```

3. **Backend Setup**
   ```bash
   cd backend
   npm install
   npx prisma generate
   npx prisma migrate dev
   npm run dev
   ```

4. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

5. **Initialize Mock Data**
   Trigger a sync to populate the dashboard:
   ```bash
   curl -X POST http://localhost:3000/api/sync
   ```

---

## 🛡️ Engineering Guardrails
- **Naming Conventions**: All database fields use `snake_case` (via Prisma `@map`), while TypeScript remains `camelCase`.
- **Financial Integrity**: Never using `number` for currency; strictly adhering to `Decimal` types.
- **Tool-Calling over Math**: The LLM is explicitly forbidden from performing addition; it must call backend tools for aggregates.

---

## 📂 Project Structure

```text
├── .agents/          # AI Agent standards & context
├── backend/          # Express API, Prisma Schema, Workers
│   ├── src/
│   │   ├── services/ # AI Agent and Commission Logic
│   │   ├── workers/  # BullMQ background workers
│   │   └── lib/      # Prisma client initialization
├── frontend/         # React application
│   └── src/          # Components and State
├── docker-compose.yml # PostgreSQL (pgvector) + Redis
└── REPO_CONTEXT.md   # Master project metadata
```
