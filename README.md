# Bivio

> **Dual-mode talent platform combining full-time ATS hiring and a freelance milestone-escrow marketplace.**

One platform with two distinct paths: permanent employment pipeline tracking on one side, and contract/freelance milestone-based escrow work on the other.

---

## 🚀 Features

- **Full-Time ATS (Applicant Tracking System)**: Configurable pipeline stages, candidate shortlisting, interview scheduling, and offer management.
- **Freelance Marketplace**: Job postings, proposal bidding, milestone-based escrow funding, work submission, approval, and double-entry wallet ledger.
- **Role-Based Access Control**:
  - **Candidate / Freelancer**: Apply to jobs, submit proposals, track milestones, manage wallet & payouts.
  - **Recruiter / Client**: Post jobs, manage hiring pipelines (Kanban), fund contracts, review deliverables.
  - **Admin**: Dispute resolution, user moderation, platform financial metrics, and verification controls.
- **Architected for Resilience**: Fully typed domain models, PostgreSQL integrity constraints, and switchable mock/real API seam for rapid frontend and backend iteration.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | [Next.js 15](https://nextjs.org/) (App Router), TypeScript, Material UI (MUI v6), Redux Toolkit, RTK Query |
| **Backend** | [Node.js 20](https://nodejs.org/), TypeScript, Express, [Prisma ORM](https://www.prisma.io/), PostgreSQL |
| **Realtime & Tools** | Socket.IO (chat/notifications), Vitest, Postman collection |

---

## 📁 Project Structure

```text
Bivio/
├── bivio-frontend/               # Next.js 15 frontend application
│   ├── src/app/                  # Role-based route groups ((candidate), recruiter, admin, (public))
│   ├── src/components/           # Reusable UI components & providers
│   ├── src/mocks/                # Built-in mock data & router for standalone UI development
│   └── src/store/                # Redux store & RTK Query API slice definitions
│
├── bivio-backend/                # Node.js + Express + Prisma backend API
│   ├── prisma/                   # Database schema, migrations, and seed scripts
│   ├── src/modules/              # Domain modules (auth, jobs, freelance, admin, etc.)
│   └── src/middleware/           # Authentication, RBAC, validation, rate limiting
│
├── Doc and Diagram/              # Complete specifications and architectural diagrams
│   ├── Activity Diagram/         # Activity diagrams and Mermaid definitions
│   ├── Class Diagram/            # System class diagrams
│   ├── Data Flow Diagram/        # Context and level 1-2 DFDs
│   ├── ER Diagram/               # Database ER diagrams and SQL constraint definitions
│   ├── Sequence Diagram/         # Workflows (disputes, escrow, hiring)
│   └── BIVIO_COMPLETE_REFERENCE.md # Detailed architectural reference & specifications
│
├── bivio-api.postman_collection.json # API endpoints collection
└── smoke_test.sh                 # Backend smoke test script
```

---

## ⚡ Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v20 or higher recommended)
- [PostgreSQL](https://www.postgresql.org/) (v15+)
- Git

---

### 1. Backend Setup

```bash
cd bivio-backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT secrets

# Apply database migrations
npx prisma migrate dev

# Seed database with skills, platform settings, and demo users
npm run seed

# Start development server (runs on http://localhost:4000)
npm run dev
```

#### Demo Accounts (seeded)
- **Candidate:** `aarav@example.com` / `Password123!`
- **Recruiter:** `priya@acme.example` / `Password123!`
- **Admin:** `admin@bivio.example` / `Password123!`

---

### 2. Frontend Setup

The frontend can run either in **standalone mock mode** (no backend required) or connected to the live backend.

```bash
cd ../bivio-frontend

# Install dependencies
npm install

# Start development server (runs on http://localhost:3000)
npm run dev
```

- **Mock Mode (Default):** Runs immediately with fixtures and quick-login demo chips on the login page.
- **Connect to Backend:** In `bivio-frontend/.env.local`, set:
  ```env
  NEXT_PUBLIC_USE_MOCKS="false"
  NEXT_PUBLIC_API_URL="http://localhost:4000/api"
  ```

---

## 📊 Current Development Status

- **Frontend**: Full UI implemented across all roles (Candidate, Recruiter, Admin) with RTK Query hooks and mock seam.
- **Backend**:
  - ✅ **Complete**: Authentication (JWT, refresh tokens, password reset), jobs listing & candidate scoring queries, skills/profiles/wallet endpoints, admin metrics & settings, notifications.
  - 🔄 **In Progress**: Writing job mutations, full-time application workflow, milestone escrow transactions, and dispute handling.
- **Specifications & Testing**: Complete architecture docs, ER/sequence diagrams, and Postman API collection available in [`Doc and Diagram/`](./Doc%20and%20Diagram).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) (or proprietary as specified).
