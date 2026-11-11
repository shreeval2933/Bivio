# Bivio — Development Specification

> **Bivio** *(Italian: a fork in the road)* — a dual-mode talent platform. One candidate
> profile and one AI scoring engine, then the road forks: **permanent employment** down one
> branch, **project-based freelance work with escrow** down the other.

This document is the single source of truth for building the system. It contains the complete
data model, integrity constraints, state machines, module boundaries, implementation patterns
and build order. Read it before scaffolding anything.

---

## Table of Contents

1. [Product Definition](#1-product-definition)
2. [Technology Stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [Repository Layout](#4-repository-layout)
5. [Data Model — Prisma Schema](#5-data-model--prisma-schema)
6. [Integrity Constraints — Raw SQL Migration](#6-integrity-constraints--raw-sql-migration)
7. [State Machines](#7-state-machines)
8. [Critical Implementation Patterns](#8-critical-implementation-patterns)
9. [API Surface](#9-api-surface)
10. [Frontend Structure](#10-frontend-structure)
11. [Build Order](#11-build-order)
12. [Gotchas](#12-gotchas)

---

## 1. Product Definition

### 1.1 The two flows

The defining property of this system: **two hiring models share one schema.** Everything
interesting in the design follows from deciding where the shared path ends — and it ends at
the point of commitment.

| Concept | Full-Time Flow | Freelance Flow |
|---|---|---|
| Job posting | `jobs` with `jobType = FULL_TIME`, salary band | `jobs` with `jobType = FREELANCE`, budget + fixed/hourly |
| Candidate expresses interest | `applications` | `proposals` (carries a bid amount) |
| Recruiter reaches out first | `invitations` | `invitations` (shared table) |
| Progress tracking | `hiringStages` + `stageMovements` | `milestones` within a `contract` |
| Meetings | `interviews` | chat only |
| Agreement artefact | `offers` (offer letter) | `contracts` |
| Money | `payments` — platform fees only | `escrows` → `wallets` → `payouts` |
| Conflict handling | none | `disputes`, admin-arbitrated |
| Ends when | offer accepted or rejected | final milestone paid + reviews exchanged |

### 1.2 Actors

- **CANDIDATE** — builds profile + resume versions, applies to full-time roles, bids on
  freelance projects, delivers milestone work, gets paid.
- **RECRUITER** — posts jobs, configures pipeline stages and AI weights, reviews ranked
  candidates, sends invites and offers, funds escrow, approves work. *Also acts as the
  "client" in the freelance flow — same role, different context. Do not model separately.*
- **ADMIN** — resolves disputes, moderates users, views revenue, configures settings.
- **SYSTEM** — computes match scores (async worker), writes ledger entries, emits notifications.

### 1.3 Non-negotiable business rules

These must be enforced at the database layer, not only in application code:

1. A job is not visible until its posting fee clears (`PENDING_PAYMENT` → `OPEN`).
2. A candidate may hold only **one live** application per job (withdrawn/rejected are exempt).
3. A freelancer may hold only **one live** proposal per job.
4. AI weightings must sum to exactly 100.
5. Work must not begin on an unfunded milestone.
6. A milestone cannot be paid without client approval.
7. Escrow freezes the instant a dispute is raised; neither party can move the funds.
8. A dispute cannot be closed as `RESOLVED` without recording both split amounts.
9. Wallet balances can never go negative, even under concurrent withdrawal requests.
10. Each party may review a contract exactly once, and never themselves.

---

## 2. Technology Stack

### 2.1 Backend

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node.js 20+ | Long-running process, **not serverless** (WebSockets) |
| Language | TypeScript, `strict: true` | No `any`; use `unknown` + Zod narrowing at boundaries |
| Framework | Express 4 | Structure imposed manually — see §3.2 |
| ORM | Prisma 5+ | Type-safe queries generated from schema |
| Database | PostgreSQL 14+ | Partial indexes and CHECK constraints are load-bearing |
| Validation | Zod | Schemas at route boundary; types inferred from schema |
| Auth | JWT (access) + httpOnly cookie (refresh) | bcrypt cost 12 or argon2id |
| Realtime | Socket.IO | Same process as API, shared auth |
| Queue | BullMQ + Redis | AI scoring, email, payout processing |
| Cache | Redis | Sessions, rate limits, shortlist cache |
| Files | S3-compatible (R2/S3) | Presigned uploads direct from browser |
| Testing | Vitest + Supertest + Testcontainers | Integration tests hit a real Postgres |

### 2.2 Frontend

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR for public job pages, CSR for dashboards |
| Language | TypeScript | Shares types with backend |
| UI | Material UI v6 + `@mui/x-data-grid` | Requires `AppRouterCacheProvider` — see §12 |
| Client state | Redux Toolkit slices | auth, UI toggles, filters, chat drafts **only** |
| Server state | **RTK Query** | All API data. Do NOT hand-write thunks. |
| Drag & drop | `dnd-kit` | Pipeline board |
| Realtime | `socket.io-client` | Chat + live notifications |

### 2.3 Deployment

| Piece | Target | Constraint |
|---|---|---|
| Frontend | Vercel | — |
| API + Socket.IO | Railway / Render / Fly.io | **Must be long-running** — serverless breaks WebSockets |
| Worker | Same platform, separate process | BullMQ consumer |
| PostgreSQL | Neon / Supabase / RDS | Managed, point-in-time recovery required (payment records) |
| Redis | Upstash | — |
| Object storage | Cloudflare R2 / S3 | — |

CI order (the middle step is the one people forget):

```bash
npm ci
npx prisma generate          # regenerate typed client
npx prisma migrate deploy    # NEVER `migrate dev` in CI/production
npm run build
npm test
```

---

## 3. Architecture

### 3.1 Shape

**Modular monolith**, not microservices. Three deployable *processes* (API, worker, frontend),
one system, one database. Modules communicate through exported service interfaces and domain
events — never by importing each other's repositories or writing to each other's tables.

```
┌──────────────────────────────────────────────────────────────┐
│  BROWSER — Next.js · MUI · Redux Toolkit · RTK Query          │
└───────────────┬──────────────────────────┬───────────────────┘
                │ REST/JSON                │ WebSocket
                ▼                          ▼
┌──────────────────────────────────────────────────────────────┐
│  API — Express · TypeScript                                   │
│  routes → middleware → controller → service → repository      │
│           (auth, zod,   (HTTP only)  (rules,   (Prisma)       │
│            rateLimit)                 txns)                   │
│  Socket.IO server (same process, shared auth)                 │
└──────┬──────────────────┬───────────────────┬────────────────┘
       ▼                  ▼                   ▼
  PostgreSQL          Redis              S3 / R2
                        │
                        ▼
                  WORKER PROCESS
                  (AI scoring, email, payouts)
```

### 3.2 Layering rule

| Layer | Responsibility | Must never |
|---|---|---|
| **Controller** | Parse request, validate shape, call one service, map to status code | Contain business rules or touch Prisma |
| **Service** | Business rules, authorization decisions, transaction boundaries | Know about `req`, `res`, or HTTP status codes |
| **Repository** | All Prisma calls; returns domain objects | Contain business logic |

**Test for whether layering is real:** could a queue worker call the service without touching
the controller? If the service reads `req.user`, the answer is no and the layers are decorative.

### 3.3 Module map

Derived from the DFD process decomposition. Each maps to a folder under `src/modules/`.

| Module | Owns | Tables |
|---|---|---|
| `auth` | Registration, login, tokens, role middleware | `users` |
| `profiles` | Candidate/recruiter/admin profiles, resumes, portfolios, skills | `candidateProfiles`, `recruiterProfiles`, `adminProfiles`, `companies`, `resumes`, `freelancePortfolios`, `portfolioProjects`, `skills`, `candidateSkills` |
| `jobs` | Job CRUD, stages, AI weightage, required skills | `jobs`, `jobSkills`, `hiringStages`, `aiWeightages` |
| `matching` | Scoring engine (worker-driven), ranking | `matchScores` |
| `hiring` | Invitations, applications, stage movement, interviews, offers | `applications`, `stageMovements`, `invitations`, `interviews`, `offers` |
| `freelance` | Proposals, contracts, milestones, submissions | `proposals`, `contracts`, `milestones`, `milestoneSubmissions` |
| `payments` | Fees, escrow, wallet, ledger, payouts | `payments`, `escrows`, `platformFees`, `wallets`, `transactions`, `payouts` |
| `messaging` | Chat rooms, messages, notifications | `chatRooms`, `chatParticipants`, `messages`, `notifications` |
| `admin` | Disputes, moderation, settings, audit | `disputes`, `moderationActions`, `platformSettings`, `auditLogs` |
| `shared` | Prisma singleton, Redis, errors, events, attachments | `attachments` |

**Cross-module rule:** when `freelance` needs to charge a commission it calls
`payments.chargeCommission()`. It does not write to `wallets`.

### 3.4 Domain events

Use a typed emitter in `shared/events.ts`. Cross-module side effects go through it.

| Event | Emitted by | Consumed by |
|---|---|---|
| `JobPublished` | `jobs` | `matching` (enqueue scoring) |
| `ApplicationStageChanged` | `hiring` | `messaging` (notify) |
| `ProposalAccepted` | `freelance` | `payments` (request funding), `messaging` (open room) |
| `MilestoneApproved` | `freelance` | `payments` (release escrow) |
| `MilestoneReleased` | `payments` | `messaging` (notify), `profiles` (refresh rating) |
| `DisputeRaised` | `admin` | `payments` (freeze escrow) |
| `DisputeResolved` | `admin` | `payments` (apply split) |
| `UserModerated` | `admin` | `auth` (invalidate sessions) |

---

## 4. Repository Layout

### 4.1 Backend

```
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   │   └── <ts>_add_integrity_constraints/migration.sql   ← hand-written, see §6
│   └── seed.ts
├── src/
│   ├── config/            env.ts (zod-validated), constants.ts
│   ├── modules/
│   │   ├── auth/          auth.controller.ts · auth.service.ts · auth.routes.ts · auth.schema.ts
│   │   ├── profiles/
│   │   ├── jobs/
│   │   ├── matching/
│   │   ├── hiring/
│   │   ├── freelance/
│   │   ├── payments/      ← highest-risk module, test first
│   │   ├── messaging/
│   │   └── admin/
│   ├── middleware/        authenticate · authorize · validate · rateLimit · errorHandler
│   ├── shared/
│   │   ├── prisma.ts      singleton PrismaClient
│   │   ├── redis.ts
│   │   ├── errors.ts      AppError hierarchy
│   │   ├── events.ts      typed domain event emitter
│   │   ├── stateMachines.ts  transition tables — see §7
│   │   └── types.ts
│   ├── sockets/           namespaces + handlers
│   ├── jobs/              BullMQ queues and workers
│   ├── app.ts             Express wiring
│   └── server.ts          HTTP + Socket.IO bootstrap
└── tests/
```

### 4.2 Frontend

```
frontend/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx                landing (static)
│   │   │   ├── jobs/page.tsx           SSR + revalidate — SEO critical
│   │   │   └── jobs/[id]/page.tsx      SSR + generateMetadata
│   │   ├── (candidate)/
│   │   │   ├── layout.tsx              'use client' — guarded shell
│   │   │   ├── dashboard/
│   │   │   ├── applications/
│   │   │   ├── proposals/
│   │   │   └── contracts/[id]/
│   │   ├── (recruiter)/
│   │   │   ├── jobs/[id]/pipeline/     dnd-kit board
│   │   │   ├── jobs/[id]/candidates/   AI-ranked shortlist
│   │   │   └── proposals/
│   │   ├── (admin)/
│   │   │   ├── disputes/
│   │   │   ├── users/
│   │   │   └── financials/
│   │   └── layout.tsx                  AppRouterCacheProvider + ThemeProvider + ReduxProvider
│   ├── components/
│   │   ├── ui/            thin MUI wrappers
│   │   └── jobs/ · applications/ · chat/ · milestones/
│   ├── store/
│   │   ├── store.ts
│   │   ├── slices/        authSlice · uiSlice · filtersSlice
│   │   └── api/           jobsApi · applicationsApi · contractsApi · paymentsApi
│   ├── hooks/             useAppDispatch · useAppSelector · useSocket
│   ├── lib/               socket.ts · format.ts · guards.ts
│   ├── types/             shared API types
│   └── theme.ts
```
---

## 5. Data Model — Prisma Schema

41 tables. Copy this into `prisma/schema.prisma` verbatim, then run
`npx prisma migrate dev --name init`.

**Conventions:**
- `@map` / `@@map` keep `snake_case` in Postgres and `camelCase` in TypeScript. Set this up
  from the first migration — retrofitting means rewriting every query.
- All money is `Decimal(12,2)`. **Never `Float`.**
- All IDs are `uuid` — non-enumerable, since IDs appear in URLs shared between two parties.
- Soft delete (`deletedAt`) on anything with legal or financial weight.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ═══════════════════════════════════════════════════════════
// IDENTITY & PROFILES
// ═══════════════════════════════════════════════════════════

model User {
  id            String        @id @default(uuid()) @db.Uuid
  fullName      String        @map("full_name")
  email         String        @unique
  passwordHash  String        @map("password_hash")
  phone         String?       @unique
  role          Role
  profileImage  String?       @map("profile_image_url")
  isVerified    Boolean       @default(false) @map("is_verified")
  accountStatus AccountStatus @default(PENDING_VERIFICATION) @map("account_status")
  lastLoginAt   DateTime?     @map("last_login_at")
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")
  deletedAt     DateTime?     @map("deleted_at")

  candidateProfile CandidateProfile?
  recruiterProfile RecruiterProfile?
  adminProfile     AdminProfile?
  wallet           Wallet?
  notifications    Notification[]
  payments         Payment[]
  chatParticipants ChatParticipant[]
  messages         Message[]
  attachments      Attachment[]
  auditLogs        AuditLog[]
  stageMovements   StageMovement[]
  interviews       Interview[]        @relation("Interviewer")
  reviewsWritten   Review[]           @relation("Reviewer")
  reviewsReceived  Review[]           @relation("Reviewee")
  disputesRaised   Dispute[]          @relation("DisputeRaiser")
  moderationsRecvd ModerationAction[] @relation("ModerationTarget")

  @@index([email])
  @@index([role, accountStatus])
  @@map("users")
}

model CandidateProfile {
  id               String   @id @default(uuid()) @db.Uuid
  userId           String   @unique @map("user_id") @db.Uuid
  headline         String?
  summary          String?
  location         String?
  experienceYears  Decimal? @map("experience_years") @db.Decimal(4, 1)
  highestEducation String?  @map("highest_education")
  primaryResumeId  String?  @map("primary_resume_id") @db.Uuid
  openToFullTime   Boolean  @default(true) @map("open_to_full_time")
  openToFreelance  Boolean  @default(false) @map("open_to_freelance")
  fullTimeFeePaid  Boolean  @default(false) @map("full_time_fee_paid")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  user         User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  portfolio    FreelancePortfolio?
  skills       CandidateSkill[]
  resumes      Resume[]
  applications Application[]
  proposals    Proposal[]
  invitations  Invitation[]
  matchScores  MatchScore[]
  contracts    Contract[]

  @@index([location])
  @@map("candidate_profiles")
}

model FreelancePortfolio {
  id             String   @id @default(uuid()) @db.Uuid
  candidateId    String   @unique @map("candidate_id") @db.Uuid
  bio            String?
  hourlyRate     Decimal? @map("hourly_rate") @db.Decimal(10, 2)
  currency       String   @default("INR") @db.VarChar(3)
  portfolioUrl   String?  @map("portfolio_url")
  githubUrl      String?  @map("github_url")
  linkedinUrl    String?  @map("linkedin_url")
  isAvailable    Boolean  @default(true) @map("is_available")
  avgRating      Decimal? @map("avg_rating") @db.Decimal(3, 2)   // denormalized
  totalContracts Int      @default(0) @map("total_contracts")     // denormalized
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  candidate CandidateProfile   @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  projects  PortfolioProject[]

  @@index([isAvailable, avgRating])
  @@map("freelance_portfolios")
}

model Company {
  id         String   @id @default(uuid()) @db.Uuid
  name       String   @unique
  website    String?
  logoUrl    String?  @map("logo_url")
  industry   String?
  isVerified Boolean  @default(false) @map("is_verified")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  recruiters RecruiterProfile[]
  jobs       Job[]

  @@map("companies")
}

model RecruiterProfile {
  id                String   @id @default(uuid()) @db.Uuid
  userId            String   @unique @map("user_id") @db.Uuid
  companyId         String?  @map("company_id") @db.Uuid
  designation       String?
  isCompanyVerified Boolean  @default(false) @map("is_company_verified")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  company     Company?     @relation(fields: [companyId], references: [id])
  jobs        Job[]
  invitations Invitation[]
  contracts   Contract[]

  @@map("recruiter_profiles")
}

model AdminProfile {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @unique @map("user_id") @db.Uuid
  permissions Json?
  createdAt   DateTime @default(now()) @map("created_at")

  user              User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  disputes          Dispute[]
  moderationActions ModerationAction[]
  settings          PlatformSetting[]

  @@map("admin_profiles")
}

model Resume {
  id          String   @id @default(uuid()) @db.Uuid
  candidateId String   @map("candidate_id") @db.Uuid
  version     Int
  fileUrl     String   @map("file_url")
  fileName    String   @map("file_name")
  mimeType    String   @map("mime_type")
  sizeBytes   BigInt   @map("size_bytes")
  parsedText  String?  @map("parsed_text")   // feeds the AI matcher
  isPrimary   Boolean  @default(false) @map("is_primary")
  uploadedAt  DateTime @default(now()) @map("uploaded_at")

  candidate    CandidateProfile @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  applications Application[]

  @@unique([candidateId, version])
  @@index([candidateId, isPrimary])
  @@map("resumes")
}

model PortfolioProject {
  id            String    @id @default(uuid()) @db.Uuid
  portfolioId   String    @map("portfolio_id") @db.Uuid
  title         String
  description   String?
  role          String?
  repositoryUrl String?   @map("repository_url")
  liveUrl       String?   @map("live_url")
  coverImageUrl String?   @map("cover_image_url")
  startedOn     DateTime? @map("started_on") @db.Date
  completedOn   DateTime? @map("completed_on") @db.Date
  displayOrder  Int       @default(0) @map("display_order")
  isFeatured    Boolean   @default(false) @map("is_featured")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  portfolio FreelancePortfolio      @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  skills    PortfolioProjectSkill[]

  @@index([portfolioId, displayOrder])
  @@map("portfolio_projects")
}

model Skill {
  id         String  @id @default(uuid()) @db.Uuid
  name       String  @unique
  category   String?
  isApproved Boolean @default(true) @map("is_approved")

  candidateSkills CandidateSkill[]
  jobSkills       JobSkill[]
  projectSkills   PortfolioProjectSkill[]

  @@index([isApproved, name])
  @@map("skills")
}

model CandidateSkill {
  id                String   @id @default(uuid()) @db.Uuid
  candidateId       String   @map("candidate_id") @db.Uuid
  skillId           String   @map("skill_id") @db.Uuid
  proficiency       Int?     @db.SmallInt          // 1-5
  yearsOfExperience Decimal? @map("years_of_experience") @db.Decimal(4, 1)

  candidate CandidateProfile @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  skill     Skill            @relation(fields: [skillId], references: [id])

  @@unique([candidateId, skillId])
  @@index([skillId])
  @@map("candidate_skills")
}

model PortfolioProjectSkill {
  id        String @id @default(uuid()) @db.Uuid
  projectId String @map("project_id") @db.Uuid
  skillId   String @map("skill_id") @db.Uuid

  project PortfolioProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  skill   Skill            @relation(fields: [skillId], references: [id])

  @@unique([projectId, skillId])
  @@map("portfolio_project_skills")
}

// ═══════════════════════════════════════════════════════════
// JOBS & AI MATCHING
// ═══════════════════════════════════════════════════════════

model Job {
  id          String      @id @default(uuid()) @db.Uuid
  recruiterId String      @map("recruiter_id") @db.Uuid
  companyId   String?     @map("company_id") @db.Uuid
  title       String
  description String
  jobType     JobType     @map("job_type")
  location    String?
  isRemote    Boolean     @default(false) @map("is_remote")
  salaryMin   Decimal?    @map("salary_min") @db.Decimal(12, 2)   // FULL_TIME only
  salaryMax   Decimal?    @map("salary_max") @db.Decimal(12, 2)   // FULL_TIME only
  budget      Decimal?    @db.Decimal(12, 2)                      // FREELANCE only
  budgetType  BudgetType? @map("budget_type")                     // FREELANCE only
  currency    String      @default("INR") @db.VarChar(3)
  status      JobStatus   @default(DRAFT)
  vacancies   Int         @default(1)
  deadline    DateTime?   @db.Date
  publishedAt DateTime?   @map("published_at")
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  recruiter    RecruiterProfile @relation(fields: [recruiterId], references: [id])
  company      Company?         @relation(fields: [companyId], references: [id])
  skills       JobSkill[]
  weightage    AIWeightage?
  matchScores  MatchScore[]
  hiringStages HiringStage[]
  applications Application[]
  invitations  Invitation[]
  proposals    Proposal[]
  contracts    Contract[]

  @@index([status, jobType, createdAt(sort: Desc)])
  @@index([recruiterId, status])
  @@map("jobs")
}

model JobSkill {
  id          String  @id @default(uuid()) @db.Uuid
  jobId       String  @map("job_id") @db.Uuid
  skillId     String  @map("skill_id") @db.Uuid
  isMandatory Boolean @default(false) @map("is_mandatory")
  weight      Int?    @db.SmallInt

  job   Job   @relation(fields: [jobId], references: [id], onDelete: Cascade)
  skill Skill @relation(fields: [skillId], references: [id])

  @@unique([jobId, skillId])
  @@index([skillId, isMandatory])
  @@map("job_skills")
}

model AIWeightage {
  id               String   @id @default(uuid()) @db.Uuid
  jobId            String   @unique @map("job_id") @db.Uuid
  skillWeight      Int      @map("skill_weight") @db.SmallInt
  experienceWeight Int      @map("experience_weight") @db.SmallInt
  educationWeight  Int      @map("education_weight") @db.SmallInt
  projectWeight    Int      @map("project_weight") @db.SmallInt
  updatedAt        DateTime @updatedAt @map("updated_at")

  job Job @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@map("ai_weightages")
}

model MatchScore {
  id           String   @id @default(uuid()) @db.Uuid
  jobId        String   @map("job_id") @db.Uuid
  candidateId  String   @map("candidate_id") @db.Uuid
  score        Decimal  @db.Decimal(5, 2)   // 0-100
  breakdown    Json?                        // per-factor sub-scores, for explainability
  modelVersion String?  @map("model_version")
  isCurrent    Boolean  @default(true) @map("is_current")
  computedAt   DateTime @default(now()) @map("computed_at")

  job       Job              @relation(fields: [jobId], references: [id], onDelete: Cascade)
  candidate CandidateProfile @relation(fields: [candidateId], references: [id], onDelete: Cascade)

  @@unique([jobId, candidateId, modelVersion])
  @@index([jobId, score(sort: Desc)])
  @@map("match_scores")
}

// ═══════════════════════════════════════════════════════════
// FULL-TIME HIRING PIPELINE
// ═══════════════════════════════════════════════════════════

model HiringStage {
  id         String   @id @default(uuid()) @db.Uuid
  jobId      String   @map("job_id") @db.Uuid
  name       String
  sequence   Int      @db.SmallInt
  isTerminal Boolean  @default(false) @map("is_terminal")
  createdAt  DateTime @default(now()) @map("created_at")

  job            Job             @relation(fields: [jobId], references: [id], onDelete: Cascade)
  applications   Application[]
  movementsFrom  StageMovement[] @relation("FromStage")
  movementsTo    StageMovement[] @relation("ToStage")
  interviews     Interview[]

  @@unique([jobId, sequence])
  @@unique([jobId, name])
  @@map("hiring_stages")
}

model Application {
  id               String            @id @default(uuid()) @db.Uuid
  jobId            String            @map("job_id") @db.Uuid
  candidateId      String            @map("candidate_id") @db.Uuid
  currentStageId   String?           @map("current_stage_id") @db.Uuid
  resumeId         String?           @map("resume_id") @db.Uuid
  status           ApplicationStatus @default(APPLIED)
  source           ApplicationSource @default(DIRECT)
  snapshotAiScore  Decimal?          @map("snapshot_ai_score") @db.Decimal(5, 2)
  coverNote        String?           @map("cover_note")
  appliedAt        DateTime          @default(now()) @map("applied_at")
  updatedAt        DateTime          @updatedAt @map("updated_at")

  job          Job              @relation(fields: [jobId], references: [id], onDelete: Cascade)
  candidate    CandidateProfile @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  currentStage HiringStage?     @relation(fields: [currentStageId], references: [id])
  resume       Resume?          @relation(fields: [resumeId], references: [id])
  movements    StageMovement[]
  interviews   Interview[]
  offer        Offer?
  chatRoom     ChatRoom?

  @@index([jobId, status])
  @@index([candidateId, appliedAt(sort: Desc)])
  @@map("applications")
}

model StageMovement {
  id            String   @id @default(uuid()) @db.Uuid
  applicationId String   @map("application_id") @db.Uuid
  fromStageId   String?  @map("from_stage_id") @db.Uuid
  toStageId     String   @map("to_stage_id") @db.Uuid
  movedByUserId String   @map("moved_by_user_id") @db.Uuid
  note          String?
  movedAt       DateTime @default(now()) @map("moved_at")

  application Application  @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  fromStage   HiringStage? @relation("FromStage", fields: [fromStageId], references: [id])
  toStage     HiringStage  @relation("ToStage", fields: [toStageId], references: [id])
  movedBy     User         @relation(fields: [movedByUserId], references: [id])

  @@index([applicationId, movedAt])
  @@map("stage_movements")
}

model Invitation {
  id          String       @id @default(uuid()) @db.Uuid
  jobId       String       @map("job_id") @db.Uuid
  recruiterId String       @map("recruiter_id") @db.Uuid
  candidateId String       @map("candidate_id") @db.Uuid
  status      InviteStatus @default(SENT)
  message     String?
  expiresAt   DateTime?    @map("expires_at")
  respondedAt DateTime?    @map("responded_at")
  createdAt   DateTime     @default(now()) @map("created_at")

  job       Job              @relation(fields: [jobId], references: [id], onDelete: Cascade)
  recruiter RecruiterProfile @relation(fields: [recruiterId], references: [id])
  candidate CandidateProfile @relation(fields: [candidateId], references: [id], onDelete: Cascade)

  @@index([candidateId, status])
  @@index([jobId, status])
  @@map("invitations")
}

model Offer {
  id            String      @id @default(uuid()) @db.Uuid
  applicationId String      @unique @map("application_id") @db.Uuid
  compensation  Decimal     @db.Decimal(12, 2)
  currency      String      @default("INR") @db.VarChar(3)
  joiningDate   DateTime?   @map("joining_date") @db.Date
  offerLetterUrl String?    @map("offer_letter_url")
  status        OfferStatus @default(SENT)
  expiresAt     DateTime?   @map("expires_at")
  respondedAt   DateTime?   @map("responded_at")
  createdAt     DateTime    @default(now()) @map("created_at")

  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@map("offers")
}

model Interview {
  id              String                   @id @default(uuid()) @db.Uuid
  applicationId   String                   @map("application_id") @db.Uuid
  hiringStageId   String?                  @map("hiring_stage_id") @db.Uuid
  interviewerId   String                   @map("interviewer_id") @db.Uuid
  roundNo         Int                      @default(1) @map("round_no") @db.SmallInt
  scheduledAt     DateTime                 @map("scheduled_at")
  durationMinutes Int                      @default(60) @map("duration_minutes") @db.SmallInt
  mode            InterviewMode
  meetingLink     String?                  @map("meeting_link")
  location        String?
  status          InterviewStatus          @default(SCHEDULED)
  feedback        String?
  rating          Int?                     @db.SmallInt
  recommendation  InterviewRecommendation?
  submittedAt     DateTime?                @map("submitted_at")
  createdAt       DateTime                 @default(now()) @map("created_at")
  updatedAt       DateTime                 @updatedAt @map("updated_at")

  application Application  @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  hiringStage HiringStage? @relation(fields: [hiringStageId], references: [id])
  interviewer User         @relation("Interviewer", fields: [interviewerId], references: [id])

  @@unique([applicationId, roundNo])
  @@index([interviewerId, scheduledAt])
  @@map("interviews")
}

// ═══════════════════════════════════════════════════════════
// FREELANCE ENGAGEMENT
// ═══════════════════════════════════════════════════════════

model Proposal {
  id           String         @id @default(uuid()) @db.Uuid
  jobId        String         @map("job_id") @db.Uuid
  candidateId  String         @map("candidate_id") @db.Uuid
  bidAmount    Decimal        @map("bid_amount") @db.Decimal(12, 2)
  currency     String         @default("INR") @db.VarChar(3)
  durationDays Int?           @map("duration_days")
  coverLetter  String         @map("cover_letter")
  status       ProposalStatus @default(SUBMITTED)
  submittedAt  DateTime       @default(now()) @map("submitted_at")
  updatedAt    DateTime       @updatedAt @map("updated_at")

  job       Job              @relation(fields: [jobId], references: [id], onDelete: Cascade)
  candidate CandidateProfile @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  contract  Contract?

  @@index([jobId, status])
  @@index([candidateId, submittedAt(sort: Desc)])
  @@map("proposals")
}

model Contract {
  id                 String         @id @default(uuid()) @db.Uuid
  jobId              String         @map("job_id") @db.Uuid
  proposalId         String         @unique @map("proposal_id") @db.Uuid
  clientId           String         @map("client_id") @db.Uuid       // RecruiterProfile
  freelancerId       String         @map("freelancer_id") @db.Uuid   // CandidateProfile
  agreedAmount       Decimal        @map("agreed_amount") @db.Decimal(12, 2)
  currency           String         @default("INR") @db.VarChar(3)
  platformFeePercent Decimal        @map("platform_fee_percent") @db.Decimal(5, 2)  // FROZEN at signing
  status             ContractStatus @default(PENDING_FUNDING)
  startedAt          DateTime?      @map("started_at")
  endedAt            DateTime?      @map("ended_at")
  createdAt          DateTime       @default(now()) @map("created_at")

  job          Job              @relation(fields: [jobId], references: [id])
  proposal     Proposal         @relation(fields: [proposalId], references: [id])
  client       RecruiterProfile @relation(fields: [clientId], references: [id])
  freelancer   CandidateProfile @relation(fields: [freelancerId], references: [id])
  milestones   Milestone[]
  reviews      Review[]
  platformFees PlatformFee[]
  chatRoom     ChatRoom?

  @@index([freelancerId, status])
  @@index([clientId, status])
  @@map("contracts")
}

model Milestone {
  id          String          @id @default(uuid()) @db.Uuid
  contractId  String          @map("contract_id") @db.Uuid
  title       String
  description String?
  amount      Decimal         @db.Decimal(12, 2)
  sequence    Int             @db.SmallInt
  dueDate     DateTime?       @map("due_date") @db.Date
  status      MilestoneStatus @default(PENDING)
  approvedAt  DateTime?       @map("approved_at")
  createdAt   DateTime        @default(now()) @map("created_at")

  contract    Contract              @relation(fields: [contractId], references: [id], onDelete: Cascade)
  submissions MilestoneSubmission[]
  escrow      Escrow?
  disputes    Dispute[]

  @@unique([contractId, sequence])
  @@index([contractId, status])
  @@map("milestones")
}

model MilestoneSubmission {
  id          String           @id @default(uuid()) @db.Uuid
  milestoneId String           @map("milestone_id") @db.Uuid
  versionNo   Int              @map("version_no") @db.SmallInt
  note        String?
  status      SubmissionStatus @default(SUBMITTED)
  feedback    String?
  submittedAt DateTime         @default(now()) @map("submitted_at")
  reviewedAt  DateTime?        @map("reviewed_at")

  milestone Milestone @relation(fields: [milestoneId], references: [id], onDelete: Cascade)

  @@unique([milestoneId, versionNo])
  @@map("milestone_submissions")
}

model Attachment {
  id           String              @id @default(uuid()) @db.Uuid
  ownerType    AttachmentOwnerType @map("owner_type")
  ownerId      String              @map("owner_id") @db.Uuid   // polymorphic — no FK possible
  uploadedById String              @map("uploaded_by") @db.Uuid
  fileUrl      String              @map("file_url")
  fileName     String              @map("file_name")
  mimeType     String              @map("mime_type")
  sizeBytes    BigInt              @map("size_bytes")
  createdAt    DateTime            @default(now()) @map("created_at")

  uploadedBy User @relation(fields: [uploadedById], references: [id])

  @@index([ownerType, ownerId])
  @@map("attachments")
}

// ═══════════════════════════════════════════════════════════
// MONEY — ESCROW, PAYMENTS, LEDGER
// ═══════════════════════════════════════════════════════════

model Escrow {
  id          String       @id @default(uuid()) @db.Uuid
  milestoneId String       @unique @map("milestone_id") @db.Uuid
  paymentId   String?      @map("payment_id") @db.Uuid
  amount      Decimal      @db.Decimal(12, 2)
  currency    String       @default("INR") @db.VarChar(3)
  status      EscrowStatus @default(HELD)
  fundedAt    DateTime?    @map("funded_at")
  releasedAt  DateTime?    @map("released_at")

  milestone Milestone @relation(fields: [milestoneId], references: [id], onDelete: Cascade)
  payment   Payment?  @relation(fields: [paymentId], references: [id])

  @@map("escrows")
}

model Payment {
  id          String         @id @default(uuid()) @db.Uuid
  payerUserId String         @map("payer_user_id") @db.Uuid
  amount      Decimal        @db.Decimal(12, 2)
  currency    String         @default("INR") @db.VarChar(3)
  purpose     PaymentPurpose
  referenceId String?        @map("reference_id") @db.Uuid
  status      PaymentStatus  @default(INITIATED)
  gateway     String
  gatewayRef  String?        @unique @map("gateway_ref")   // IDEMPOTENCY KEY
  paidAt      DateTime?      @map("paid_at")
  createdAt   DateTime       @default(now()) @map("created_at")

  payer       User          @relation(fields: [payerUserId], references: [id])
  escrows     Escrow[]
  platformFee PlatformFee?

  @@index([payerUserId, createdAt(sort: Desc)])
  @@map("payments")
}

model PlatformFee {
  id         String   @id @default(uuid()) @db.Uuid
  paymentId  String?  @unique @map("payment_id") @db.Uuid
  contractId String?  @map("contract_id") @db.Uuid
  feeType    FeeType  @map("fee_type")
  amount     Decimal  @db.Decimal(12, 2)
  percentage Decimal? @db.Decimal(5, 2)
  chargedAt  DateTime @default(now()) @map("charged_at")

  payment  Payment?  @relation(fields: [paymentId], references: [id])
  contract Contract? @relation(fields: [contractId], references: [id])

  @@index([feeType, chargedAt])
  @@map("platform_fees")
}

model Wallet {
  id               String   @id @default(uuid()) @db.Uuid
  userId           String   @unique @map("user_id") @db.Uuid
  availableBalance Decimal  @default(0) @map("available_balance") @db.Decimal(14, 2)
  pendingBalance   Decimal  @default(0) @map("pending_balance") @db.Decimal(14, 2)
  currency         String   @default("INR") @db.VarChar(3)
  updatedAt        DateTime @updatedAt @map("updated_at")

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]
  payouts      Payout[]

  @@map("wallets")
}

model Transaction {
  id            String       @id @default(uuid()) @db.Uuid
  walletId      String       @map("wallet_id") @db.Uuid
  direction     TxnDirection
  amount        Decimal      @db.Decimal(12, 2)
  balanceAfter  Decimal      @map("balance_after") @db.Decimal(14, 2)
  referenceType String       @map("reference_type")
  referenceId   String?      @map("reference_id") @db.Uuid
  description   String?
  createdAt     DateTime     @default(now()) @map("created_at")

  wallet Wallet @relation(fields: [walletId], references: [id], onDelete: Cascade)

  @@index([walletId, createdAt(sort: Desc)])
  @@map("transactions")
}

model Payout {
  id            String       @id @default(uuid()) @db.Uuid
  walletId      String       @map("wallet_id") @db.Uuid
  amount        Decimal      @db.Decimal(12, 2)
  status        PayoutStatus @default(REQUESTED)
  payoutMethod  String       @map("payout_method")
  payoutDetails Json?        @map("payout_details")   // masked bank/UPI
  gatewayRef    String?      @map("gateway_ref")
  requestedAt   DateTime     @default(now()) @map("requested_at")
  processedAt   DateTime?    @map("processed_at")

  wallet Wallet @relation(fields: [walletId], references: [id], onDelete: Cascade)

  @@index([walletId, requestedAt(sort: Desc)])
  @@map("payouts")
}

// ═══════════════════════════════════════════════════════════
// COMMUNICATION
// ═══════════════════════════════════════════════════════════

model ChatRoom {
  id            String       @id @default(uuid()) @db.Uuid
  roomType      ChatRoomType @map("room_type")
  contractId    String?      @unique @map("contract_id") @db.Uuid
  applicationId String?      @unique @map("application_id") @db.Uuid
  isLocked      Boolean      @default(false) @map("is_locked")
  createdAt     DateTime     @default(now()) @map("created_at")

  contract     Contract?         @relation(fields: [contractId], references: [id], onDelete: Cascade)
  application  Application?      @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  participants ChatParticipant[]
  messages     Message[]

  @@map("chat_rooms")
}

model ChatParticipant {
  id         String    @id @default(uuid()) @db.Uuid
  roomId     String    @map("room_id") @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  lastReadAt DateTime? @map("last_read_at")
  joinedAt   DateTime  @default(now()) @map("joined_at")

  room ChatRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([roomId, userId])
  @@index([userId])
  @@map("chat_participants")
}

model Message {
  id        String    @id @default(uuid()) @db.Uuid
  roomId    String    @map("room_id") @db.Uuid
  senderId  String    @map("sender_id") @db.Uuid
  body      String
  isRead    Boolean   @default(false) @map("is_read")
  sentAt    DateTime  @default(now()) @map("sent_at")
  deletedAt DateTime? @map("deleted_at")   // soft — dispute evidence

  room   ChatRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  sender User     @relation(fields: [senderId], references: [id])

  @@index([roomId, sentAt(sort: Desc)])
  @@map("messages")
}

model Notification {
  id        String           @id @default(uuid()) @db.Uuid
  userId    String           @map("user_id") @db.Uuid
  type      NotificationType
  title     String
  body      String?
  actionUrl String?          @map("action_url")
  isRead    Boolean          @default(false) @map("is_read")
  createdAt DateTime         @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@map("notifications")
}

// ═══════════════════════════════════════════════════════════
// TRUST, DISPUTES & ADMIN
// ═══════════════════════════════════════════════════════════

model Review {
  id          String   @id @default(uuid()) @db.Uuid
  contractId  String   @map("contract_id") @db.Uuid
  reviewerId  String   @map("reviewer_id") @db.Uuid
  revieweeId  String   @map("reviewee_id") @db.Uuid
  rating      Int      @db.SmallInt   // 1-5
  comment     String?
  isPublished Boolean  @default(false) @map("is_published")   // double-blind release
  createdAt   DateTime @default(now()) @map("created_at")

  contract Contract @relation(fields: [contractId], references: [id], onDelete: Cascade)
  reviewer User     @relation("Reviewer", fields: [reviewerId], references: [id])
  reviewee User     @relation("Reviewee", fields: [revieweeId], references: [id])

  @@unique([contractId, reviewerId])
  @@index([revieweeId, isPublished])
  @@map("reviews")
}

model Dispute {
  id                 String        @id @default(uuid()) @db.Uuid
  milestoneId        String        @map("milestone_id") @db.Uuid
  raisedByUserId     String        @map("raised_by_user_id") @db.Uuid
  assignedAdminId    String?       @map("assigned_admin_id") @db.Uuid
  reason             String
  status             DisputeStatus @default(OPEN)
  resolutionNote     String?       @map("resolution_note")
  amountToFreelancer Decimal?      @map("amount_to_freelancer") @db.Decimal(12, 2)
  amountToClient     Decimal?      @map("amount_to_client") @db.Decimal(12, 2)
  createdAt          DateTime      @default(now()) @map("created_at")
  resolvedAt         DateTime?     @map("resolved_at")

  milestone     Milestone     @relation(fields: [milestoneId], references: [id], onDelete: Cascade)
  raisedBy      User          @relation("DisputeRaiser", fields: [raisedByUserId], references: [id])
  assignedAdmin AdminProfile? @relation(fields: [assignedAdminId], references: [id])

  @@index([status, createdAt])
  @@map("disputes")
}

model ModerationAction {
  id           String         @id @default(uuid()) @db.Uuid
  targetUserId String         @map("target_user_id") @db.Uuid
  adminId      String         @map("admin_id") @db.Uuid
  action       ModerationType
  reason       String
  expiresAt    DateTime?      @map("expires_at")
  createdAt    DateTime       @default(now()) @map("created_at")

  targetUser User         @relation("ModerationTarget", fields: [targetUserId], references: [id])
  admin      AdminProfile @relation(fields: [adminId], references: [id])

  @@index([targetUserId, createdAt(sort: Desc)])
  @@map("moderation_actions")
}

model PlatformSetting {
  id          String   @id @default(uuid()) @db.Uuid
  key         String   @unique
  value       String
  description String?
  updatedById String?  @map("updated_by") @db.Uuid
  updatedAt   DateTime @updatedAt @map("updated_at")

  updatedBy AdminProfile? @relation(fields: [updatedById], references: [id])

  @@map("platform_settings")
}

model AuditLog {
  id          String   @id @default(uuid()) @db.Uuid
  actorUserId String?  @map("actor_user_id") @db.Uuid
  entityType  String   @map("entity_type")
  entityId    String   @map("entity_id") @db.Uuid
  action      String
  diff        Json?
  ipAddress   String?  @map("ip_address")
  createdAt   DateTime @default(now()) @map("created_at")

  actor User? @relation(fields: [actorUserId], references: [id])

  @@index([entityType, entityId, createdAt(sort: Desc)])
  @@map("audit_logs")
}

// ═══════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════

enum Role                    { ADMIN RECRUITER CANDIDATE }
enum AccountStatus           { PENDING_VERIFICATION ACTIVE SUSPENDED BANNED DELETED }
enum JobType                 { FULL_TIME FREELANCE }
enum BudgetType              { FIXED HOURLY }
enum JobStatus               { DRAFT PENDING_PAYMENT OPEN CLOSED CANCELLED }
enum ApplicationStatus       { APPLIED IN_PROGRESS OFFERED HIRED REJECTED WITHDRAWN }
enum ApplicationSource       { DIRECT INVITED }
enum InviteStatus            { SENT ACCEPTED DECLINED EXPIRED }
enum OfferStatus             { SENT ACCEPTED REJECTED WITHDRAWN EXPIRED }
enum InterviewMode           { ONLINE PHONE ONSITE }
enum InterviewStatus         { SCHEDULED RESCHEDULED COMPLETED CANCELLED NO_SHOW }
enum InterviewRecommendation { PROCEED HOLD REJECT }
enum ProposalStatus          { SUBMITTED SHORTLISTED ACCEPTED REJECTED WITHDRAWN }
enum ContractStatus          { PENDING_FUNDING ACTIVE COMPLETED CANCELLED DISPUTED }
enum MilestoneStatus         { PENDING FUNDED SUBMITTED REVISION_REQUESTED APPROVED PAID DISPUTED }
enum SubmissionStatus        { SUBMITTED ACCEPTED REVISION_REQUESTED }
enum EscrowStatus            { HELD FROZEN RELEASED REFUNDED }
enum PaymentStatus           { INITIATED SUCCESS FAILED REFUNDED }
enum PaymentPurpose          { CANDIDATE_PROFILE_FEE JOB_POSTING_FEE ESCROW_FUNDING }
enum FeeType                 { CANDIDATE_REGISTRATION JOB_POSTING FREELANCE_COMMISSION }
enum PayoutStatus            { REQUESTED PROCESSING PAID FAILED }
enum TxnDirection            { CREDIT DEBIT }
enum ChatRoomType            { CONTRACT INTERVIEW }
enum DisputeStatus           { OPEN UNDER_REVIEW RESOLVED ESCALATED }
enum ModerationType          { WARN SUSPEND BAN UNBAN }
enum AttachmentOwnerType     { MESSAGE SUBMISSION DISPUTE PORTFOLIO }
enum NotificationType {
  INVITE
  APPLICATION_UPDATE
  PROPOSAL_UPDATE
  MILESTONE_UPDATE
  PAYMENT
  MESSAGE
  DISPUTE
}
```
---

## 6. Integrity Constraints — Raw SQL Migration

> **CRITICAL:** Prisma's schema language **cannot express** partial unique indexes or CHECK
> constraints. If you only run `prisma migrate dev`, none of these rules will exist in your
> database and nothing will warn you.

Generate an empty migration and paste this in:

```bash
npx prisma migrate dev --create-only --name add_integrity_constraints
# edit prisma/migrations/<ts>_add_integrity_constraints/migration.sql
npx prisma migrate dev
```

```sql
-- ═══ 1. Duplicate prevention (partial — allows reapplication after withdrawal) ═══
CREATE UNIQUE INDEX "uq_applications_active"
  ON "applications" ("job_id", "candidate_id")
  WHERE "status" NOT IN ('WITHDRAWN', 'REJECTED');

CREATE UNIQUE INDEX "uq_proposals_active"
  ON "proposals" ("job_id", "candidate_id")
  WHERE "status" NOT IN ('WITHDRAWN', 'REJECTED');

CREATE UNIQUE INDEX "uq_invitation_active"
  ON "invitations" ("job_id", "candidate_id")
  WHERE "status" = 'SENT';

-- ═══ 2. Match scores: one current row per pair, history retained ═══
CREATE UNIQUE INDEX "uq_match_score_current"
  ON "match_scores" ("job_id", "candidate_id")
  WHERE "is_current";

ALTER TABLE "match_scores"
  ADD CONSTRAINT "ck_match_score_range" CHECK ("score" BETWEEN 0 AND 100);

-- ═══ 3. Resume: exactly one primary per candidate ═══
CREATE UNIQUE INDEX "uq_resume_primary"
  ON "resumes" ("candidate_id") WHERE "is_primary";

-- ═══ 4. AI weightage must be a complete distribution ═══
ALTER TABLE "ai_weightages"
  ADD CONSTRAINT "ck_ai_weights_sum"
  CHECK ("skill_weight" + "experience_weight"
       + "education_weight" + "project_weight" = 100);

ALTER TABLE "ai_weightages"
  ADD CONSTRAINT "ck_ai_weights_range"
  CHECK ("skill_weight"      BETWEEN 0 AND 100
     AND "experience_weight" BETWEEN 0 AND 100
     AND "education_weight"  BETWEEN 0 AND 100
     AND "project_weight"    BETWEEN 0 AND 100);

-- ═══ 5. Job compensation shape depends on job type ═══
ALTER TABLE "jobs"
  ADD CONSTRAINT "ck_job_compensation_shape"
  CHECK (
    ("job_type" = 'FULL_TIME' AND "budget" IS NULL AND "budget_type" IS NULL)
 OR ("job_type" = 'FREELANCE' AND "salary_min" IS NULL AND "salary_max" IS NULL
                              AND "budget" IS NOT NULL AND "budget_type" IS NOT NULL)
  );

ALTER TABLE "jobs"
  ADD CONSTRAINT "ck_job_salary_band"
  CHECK ("salary_min" IS NULL OR "salary_max" IS NULL OR "salary_min" <= "salary_max");

ALTER TABLE "jobs" ADD CONSTRAINT "ck_job_vacancies" CHECK ("vacancies" >= 1);

-- ═══ 6. Chat room has EXACTLY one parent (SQL has no XOR operator) ═══
ALTER TABLE "chat_rooms"
  ADD CONSTRAINT "ck_chat_room_single_parent"
  CHECK (num_nonnulls("contract_id", "application_id") = 1);
-- MySQL 8 equivalent: CHECK (("contract_id" IS NULL) <> ("application_id" IS NULL))

ALTER TABLE "chat_rooms"
  ADD CONSTRAINT "ck_chat_room_type_matches_parent"
  CHECK (
    ("room_type" = 'CONTRACT'  AND "contract_id"    IS NOT NULL) OR
    ("room_type" = 'INTERVIEW' AND "application_id" IS NOT NULL)
  );

-- ═══ 7. Reviews ═══
ALTER TABLE "reviews" ADD CONSTRAINT "ck_review_rating" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "reviews" ADD CONSTRAINT "ck_review_not_self"
  CHECK ("reviewer_id" <> "reviewee_id");

-- ═══ 8. Money: positive amounts, non-negative balances ═══
ALTER TABLE "wallets"
  ADD CONSTRAINT "ck_wallet_non_negative"
  CHECK ("available_balance" >= 0 AND "pending_balance" >= 0);
-- NOTE: this does NOT prevent double-spend under concurrency. See §8.2.

ALTER TABLE "transactions" ADD CONSTRAINT "ck_txn_positive" CHECK ("amount" > 0);
ALTER TABLE "payouts"      ADD CONSTRAINT "ck_payout_positive" CHECK ("amount" > 0);
ALTER TABLE "escrows"      ADD CONSTRAINT "ck_escrow_positive" CHECK ("amount" > 0);
ALTER TABLE "milestones"   ADD CONSTRAINT "ck_milestone_positive" CHECK ("amount" > 0);
ALTER TABLE "offers"       ADD CONSTRAINT "ck_offer_positive" CHECK ("compensation" > 0);

ALTER TABLE "escrows"
  ADD CONSTRAINT "ck_escrow_released_at"
  CHECK ("status" <> 'RELEASED' OR "released_at" IS NOT NULL);

ALTER TABLE "contracts"
  ADD CONSTRAINT "ck_contract_fee_percent"
  CHECK ("platform_fee_percent" BETWEEN 0 AND 100);

-- ═══ 9. Dispute resolution must record the money split ═══
ALTER TABLE "disputes"
  ADD CONSTRAINT "ck_dispute_resolution_amounts"
  CHECK (
    "status" <> 'RESOLVED'
    OR ("amount_to_freelancer" IS NOT NULL AND "amount_to_client" IS NOT NULL
        AND "amount_to_freelancer" >= 0 AND "amount_to_client" >= 0)
  );

-- ═══ 10. Interview integrity ═══
ALTER TABLE "interviews"
  ADD CONSTRAINT "ck_interview_rating"
  CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5);

ALTER TABLE "interviews"
  ADD CONSTRAINT "ck_interview_link_required"
  CHECK ("mode" <> 'ONLINE' OR "meeting_link" IS NOT NULL);

ALTER TABLE "interviews"
  ADD CONSTRAINT "ck_interview_outcome_on_complete"
  CHECK ("status" <> 'COMPLETED' OR "recommendation" IS NOT NULL);

-- ═══ 11. Skills ═══
ALTER TABLE "candidate_skills"
  ADD CONSTRAINT "ck_proficiency" CHECK ("proficiency" IS NULL OR "proficiency" BETWEEN 1 AND 5);

-- ═══ 12. Partial index for unread notification badge (hot path) ═══
CREATE INDEX "ix_notifications_unread"
  ON "notifications" ("user_id") WHERE NOT "is_read";
```

### 6.1 Applying to a table that already has data

```sql
-- 1. Find violations BEFORE adding the constraint
SELECT job_id, candidate_id, COUNT(*)
FROM   applications
WHERE  status NOT IN ('WITHDRAWN','REJECTED')
GROUP  BY job_id, candidate_id HAVING COUNT(*) > 1;

-- 2. Build indexes without locking writes (cannot run inside a transaction)
CREATE UNIQUE INDEX CONCURRENTLY ...

-- 3. For CHECK on large tables: add unvalidated, validate separately under a weaker lock
ALTER TABLE jobs ADD CONSTRAINT ck_x CHECK (...) NOT VALID;
ALTER TABLE jobs VALIDATE CONSTRAINT ck_x;
```

---

## 7. State Machines

Put these in `src/shared/stateMachines.ts`. **Define transitions as data, not scattered
conditionals** — one table, one check, one place to change.

```typescript
import {
  JobStatus, ApplicationStatus, ProposalStatus, ContractStatus,
  MilestoneStatus, EscrowStatus, PaymentStatus, PayoutStatus,
  DisputeStatus, OfferStatus, InviteStatus, InterviewStatus, AccountStatus,
} from '@prisma/client';

type Transitions<T extends string> = Record<T, readonly T[]>;

export const JOB_TRANSITIONS: Transitions<JobStatus> = {
  DRAFT:           ['PENDING_PAYMENT', 'CANCELLED'],
  PENDING_PAYMENT: ['OPEN', 'DRAFT', 'CANCELLED'],
  OPEN:            ['CLOSED', 'CANCELLED'],
  CLOSED:          ['OPEN'],                      // reopen within 30 days
  CANCELLED:       [],
};

export const APPLICATION_TRANSITIONS: Transitions<ApplicationStatus> = {
  APPLIED:     ['IN_PROGRESS', 'REJECTED', 'WITHDRAWN'],
  IN_PROGRESS: ['IN_PROGRESS', 'OFFERED', 'REJECTED', 'WITHDRAWN'],
  OFFERED:     ['HIRED', 'REJECTED'],
  HIRED:       [],
  REJECTED:    [],
  WITHDRAWN:   [],
};

export const PROPOSAL_TRANSITIONS: Transitions<ProposalStatus> = {
  SUBMITTED:   ['SHORTLISTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  SHORTLISTED: ['ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  ACCEPTED:    [],
  REJECTED:    [],
  WITHDRAWN:   [],
};

export const CONTRACT_TRANSITIONS: Transitions<ContractStatus> = {
  PENDING_FUNDING: ['ACTIVE', 'CANCELLED'],
  ACTIVE:          ['COMPLETED', 'CANCELLED', 'DISPUTED'],
  DISPUTED:        ['ACTIVE', 'CANCELLED'],       // dispute is a detour, not an ending
  COMPLETED:       [],
  CANCELLED:       [],
};

// ── The most important machine in the system ──
export const MILESTONE_TRANSITIONS: Transitions<MilestoneStatus> = {
  PENDING:            ['FUNDED'],
  FUNDED:             ['SUBMITTED'],
  SUBMITTED:          ['APPROVED', 'REVISION_REQUESTED', 'DISPUTED'],
  REVISION_REQUESTED: ['SUBMITTED', 'DISPUTED'],
  APPROVED:           ['PAID'],
  DISPUTED:           ['APPROVED', 'PENDING', 'PAID'],
  PAID:               [],
};

export const ESCROW_TRANSITIONS: Transitions<EscrowStatus> = {
  HELD:     ['RELEASED', 'REFUNDED', 'FROZEN'],
  FROZEN:   ['RELEASED', 'REFUNDED'],
  RELEASED: [],
  REFUNDED: [],
};

export const PAYMENT_TRANSITIONS: Transitions<PaymentStatus> = {
  INITIATED: ['SUCCESS', 'FAILED'],
  SUCCESS:   ['REFUNDED'],
  FAILED:    [],
  REFUNDED:  [],
};

export const PAYOUT_TRANSITIONS: Transitions<PayoutStatus> = {
  REQUESTED:  ['PROCESSING'],
  PROCESSING: ['PAID', 'FAILED'],
  FAILED:     ['REQUESTED'],                      // retry with corrected details
  PAID:       [],
};

export const DISPUTE_TRANSITIONS: Transitions<DisputeStatus> = {
  OPEN:         ['UNDER_REVIEW'],
  UNDER_REVIEW: ['RESOLVED', 'ESCALATED'],
  ESCALATED:    ['RESOLVED'],
  RESOLVED:     [],
};

export const OFFER_TRANSITIONS: Transitions<OfferStatus> = {
  SENT:      ['ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED'],
  ACCEPTED:  [],
  REJECTED:  [],
  WITHDRAWN: [],
  EXPIRED:   [],
};

export const INVITE_TRANSITIONS: Transitions<InviteStatus> = {
  SENT:     ['ACCEPTED', 'DECLINED', 'EXPIRED'],
  ACCEPTED: [],
  DECLINED: [],
  EXPIRED:  [],
};

export const INTERVIEW_TRANSITIONS: Transitions<InterviewStatus> = {
  SCHEDULED:   ['RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  RESCHEDULED: ['SCHEDULED', 'CANCELLED'],
  NO_SHOW:     ['SCHEDULED'],
  COMPLETED:   [],
  CANCELLED:   [],
};

export const ACCOUNT_TRANSITIONS: Transitions<AccountStatus> = {
  PENDING_VERIFICATION: ['ACTIVE', 'DELETED'],
  ACTIVE:               ['SUSPENDED', 'BANNED', 'DELETED'],
  SUSPENDED:            ['ACTIVE', 'BANNED'],
  BANNED:               ['ACTIVE'],               // successful appeal
  DELETED:              [],
};

export function assertTransition<T extends string>(
  table: Transitions<T>, from: T, to: T, entity: string,
): void {
  if (!table[from].includes(to)) {
    throw new ConflictError(`Cannot move ${entity} from ${from} to ${to}`);
  }
}
```

### 7.1 Transitions that MUST be impossible

The service layer's job is to refuse these. This is the more useful half of the state machine.

| Invalid transition | Why it must be refused |
|---|---|
| `PENDING → SUBMITTED` (milestone) | Work delivered against unfunded escrow — freelancer has no payment guarantee |
| `PENDING → PAID` | Payment with no work and no funds held; money created from nothing |
| `FUNDED → PAID` | Payment without delivery or approval |
| `SUBMITTED → PAID` | Skips client approval — their only control point |
| `PAID → anything` | Terminal. Reversal must be a new refund record, never a state rollback, or the ledger stops reconciling |
| `APPROVED → SUBMITTED` | Un-approving after release began leaves escrow and milestone disagreeing |

### 7.2 Time-driven transitions (need a scheduled job)

Easy to forget because no user triggers them. Their absence shows up as invitations that stay
open forever and suspensions that never lift.

| Transition | Trigger |
|---|---|
| `Invitation SENT → EXPIRED` | `now() > expiresAt` |
| `Offer SENT → EXPIRED` | `now() > expiresAt` |
| `AccountStatus SUSPENDED → ACTIVE` | `now() > moderationAction.expiresAt` |
| `Contract PENDING_FUNDING → CANCELLED` | funding timeout |
| `Job OPEN → CLOSED` | `now() > deadline` |

---

## 8. Critical Implementation Patterns

### 8.1 The milestone release transaction

The single most important piece of code in the system. Four state machines advance atomically.

```typescript
// src/modules/payments/payments.service.ts
export async function releaseMilestone(milestoneId: string, approverUserId: string) {
  return prisma.$transaction(async (tx) => {

    // 1. Load context
    const milestone = await tx.milestone.findUniqueOrThrow({
      where: { id: milestoneId },
      include: { contract: { include: { freelancer: true } }, escrow: true },
    });

    // 2. Authorization: only the client on this contract may approve
    const clientUserId = await getClientUserId(tx, milestone.contract.clientId);
    if (clientUserId !== approverUserId) throw new ForbiddenError();

    const freelancerUserId = await getFreelancerUserId(tx, milestone.contract.freelancerId);

    // 3. LOCK the wallet row. Prisma has no FOR UPDATE API — must be raw SQL,
    //    and MUST use `tx`, not the global `prisma` client.
    const [wallet] = await tx.$queryRaw<Array<{ id: string; available_balance: Prisma.Decimal }>>`
      SELECT * FROM wallets WHERE user_id = ${freelancerUserId}::uuid FOR UPDATE
    `;
    if (!wallet) throw new NotFoundError('Wallet');

    // 4. GUARDED transition — idempotency at the database level.
    //    A double-clicked approve button matches zero rows the second time.
    const updated = await tx.milestone.updateMany({
      where: { id: milestoneId, status: 'SUBMITTED' },
      data:  { status: 'APPROVED', approvedAt: new Date() },
    });
    if (updated.count === 0) {
      throw new ConflictError('Milestone is not awaiting approval');
    }

    // 5. Release escrow
    await tx.escrow.update({
      where: { milestoneId },
      data:  { status: 'RELEASED', releasedAt: new Date() },
    });

    // 6. Decimal arithmetic — NEVER JS * or -
    const feePct = milestone.contract.platformFeePercent;
    const fee    = milestone.amount.mul(feePct).div(100);
    const net    = milestone.amount.sub(fee);

    await tx.platformFee.create({
      data: {
        contractId: milestone.contractId,
        feeType: 'FREELANCE_COMMISSION',
        amount: fee,
        percentage: feePct,
      },
    });

    // 7. Credit wallet + write ledger together
    const newBalance = wallet.available_balance.add(net);
    await tx.wallet.update({
      where: { id: wallet.id },
      data:  { availableBalance: newBalance },
    });
    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        direction: 'CREDIT',
        amount: net,
        balanceAfter: newBalance,
        referenceType: 'ESCROW',
        referenceId: milestone.escrow!.id,
        description: `Milestone released: ${milestone.title}`,
      },
    });

    await tx.milestone.update({ where: { id: milestoneId }, data: { status: 'PAID' } });

    // 8. Close the contract if this was the last milestone
    const remaining = await tx.milestone.count({
      where: { contractId: milestone.contractId, status: { not: 'PAID' } },
    });
    if (remaining === 0) {
      await tx.contract.update({
        where: { id: milestone.contractId },
        data:  { status: 'COMPLETED', endedAt: new Date() },
      });
    }

    return { milestoneId, net, fee };
  }, { isolationLevel: 'ReadCommitted', timeout: 10_000 });
}
```

**Four things this code demonstrates — know them for interviews:**
1. Everything uses `tx`, not `prisma`. Using the global client inside a transaction callback
   opens a **separate connection outside the transaction**, silently breaking atomicity.
2. `FOR UPDATE` must be raw SQL — a known Prisma limitation.
3. `updateMany` with a status guard makes the transition idempotent at the database level.
4. Money uses `Decimal` methods, never JS operators.

### 8.2 Wallet concurrency — the trap

```typescript
// ✗ WRONG — CHECK (balance >= 0) does NOT prevent this.
// Two concurrent payouts both read 500, both pass the check, both commit → −500.
// The constraint was never violated at any instant either transaction observed.
const wallet = await prisma.wallet.findUnique({ where: { userId } });
if (wallet.availableBalance.gte(amount)) { /* race window here */ }

// ✓ RIGHT — pessimistic lock serialises the two requests
await prisma.$transaction(async (tx) => {
  const [w] = await tx.$queryRaw`
    SELECT * FROM wallets WHERE user_id = ${userId}::uuid FOR UPDATE
  `;
  if (w.available_balance.lt(amount)) throw new ConflictError('Insufficient balance');
  // ... debit + ledger entry
});
```

**Reconciliation job** (the wallet is a cache of the ledger; it will drift eventually):

```sql
SELECT w.id, w.available_balance,
       COALESCE(SUM(CASE WHEN t.direction='CREDIT' THEN t.amount ELSE -t.amount END), 0) AS ledger_sum
FROM wallets w LEFT JOIN transactions t ON t.wallet_id = w.id
GROUP BY w.id, w.available_balance
HAVING w.available_balance <> COALESCE(SUM(...), 0);
```

### 8.3 Webhook idempotency

```typescript
// The unique constraint on gateway_ref makes a replayed webhook fail at the DB level,
// regardless of what the handler does.
export async function handleGatewayWebhook(payload: GatewayWebhook) {
  try {
    await prisma.payment.update({
      where: { gatewayRef: payload.reference },
      data:  { status: 'SUCCESS', paidAt: new Date() },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { ok: true, duplicate: true };   // already processed — return 200
    }
    throw e;
  }
}
```

### 8.4 Error handling

```typescript
// src/shared/errors.ts
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
    public readonly isOperational = true,
  ) { super(message); }
}
export class NotFoundError  extends AppError { constructor(r: string) { super(404, `${r} not found`, 'NOT_FOUND'); } }
export class ForbiddenError extends AppError { constructor(m = 'Not permitted') { super(403, m, 'FORBIDDEN'); } }
export class ConflictError  extends AppError { constructor(m: string) { super(409, m, 'CONFLICT'); } }
export class ValidationError extends AppError { constructor(m: string) { super(422, m, 'VALIDATION'); } }

// src/middleware/errorHandler.ts — register LAST
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({ error: err.code, message: err.message });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'DUPLICATE', message: 'Already exists' });
    if (err.code === 'P2025') return res.status(404).json({ error: 'NOT_FOUND', message: 'Not found' });
    if (err.code === 'P2003') return res.status(400).json({ error: 'FK_VIOLATION', message: 'Related record missing' });
  }
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong' });
};
```

Mapping `P2002` → 409 means your **database constraints become correct API responses
automatically**. The duplicate-application rule is enforced once, in the database, and surfaces
properly without a duplicated pre-check that would race anyway.

### 8.5 Authorization — resource level, not just role level

```typescript
// ✗ INSUFFICIENT — any recruiter can now read any job's applications (IDOR)
router.get('/jobs/:id/applications', authenticate, authorize('RECRUITER'), handler);

// ✓ Ownership checked in the service
async function getApplicationsForJob(jobId: string, userId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, recruiter: { select: { userId: true } } },
  });
  if (!job) throw new NotFoundError('Job');
  if (job.recruiter.userId !== userId) throw new ForbiddenError();
  return prisma.application.findMany({ where: { jobId }, include: { candidate: true } });
}
```

**Insecure Direct Object Reference (IDOR)** is the most common real vulnerability in marketplace
apps. Role checks answer "is this a recruiter"; they do not answer "is this *their* job".

### 8.6 Avoiding N+1

```typescript
// ✗ 51 queries
const apps = await prisma.application.findMany({ where: { jobId } });
for (const a of apps) await prisma.candidateProfile.findUnique({ where: { id: a.candidateId } });

// ✓ 1 query
const apps = await prisma.application.findMany({
  where: { jobId },
  include: {
    candidate: { include: { user: { select: { fullName: true, email: true } } } },
    currentStage: true,
  },
  orderBy: { appliedAt: 'desc' },
  take: 50,
});
```

Enable `new PrismaClient({ log: ['query'] })` in development and watch the count per request.

### 8.7 Prisma singleton

```typescript
// src/shared/prisma.ts
import { PrismaClient } from '@prisma/client';
const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});
if (process.env.NODE_ENV !== 'production') g.prisma = prisma;
```

Without this, hot reload creates a new connection pool on every reload until Postgres refuses
connections.

### 8.8 The AI-ranked shortlist query

```typescript
// LEFT JOIN is deliberate: the shortlist must include strong matches who have NOT applied,
// since those are exactly the people the recruiter wants to invite.
const shortlist = await prisma.matchScore.findMany({
  where: { jobId, isCurrent: true, candidate: { user: { accountStatus: 'ACTIVE' } } },
  include: {
    candidate: {
      include: {
        user: { select: { fullName: true, profileImage: true } },
        applications: { where: { jobId }, include: { currentStage: true } },
      },
    },
  },
  orderBy: { score: 'desc' },
  take: 50,
});
```

### 8.9 Socket.IO — authorize every event, persist before broadcast

```typescript
io.use(async (socket, next) => {
  try {
    const payload = jwt.verify(socket.handshake.auth.token, env.JWT_SECRET) as JwtPayload;
    socket.data.userId = payload.sub;
    next();
  } catch { next(new Error('UNAUTHORIZED')); }
});

io.on('connection', (socket) => {
  socket.on('message:send', async ({ roomId, body }) => {
    // Re-check membership on EVERY event — a client can emit any event with any payload.
    const member = await prisma.chatParticipant.findFirst({
      where: { roomId, userId: socket.data.userId },
    });
    if (!member) return socket.emit('error', { code: 'FORBIDDEN' });

    // Persist FIRST, then broadcast. The socket is transport, not storage —
    // dispute resolution depends on message history existing.
    const message = await prisma.message.create({
      data: { roomId, senderId: socket.data.userId, body },
    });
    io.to(`room:${roomId}`).emit('message:new', message);
  });
});
```
---

## 9. API Surface

REST, versioned under `/api`. All responses JSON. Money serialised as fixed-precision
**strings**, never numbers.

### 9.1 Auth
```
POST   /api/auth/register              { fullName, email, password, role }
POST   /api/auth/login                 { email, password }        → accessToken + refresh cookie
POST   /api/auth/refresh                                          → new accessToken
POST   /api/auth/logout
POST   /api/auth/verify-email          { token }
POST   /api/auth/forgot-password       { email }
POST   /api/auth/reset-password        { token, password }
```

### 9.2 Profiles
```
GET    /api/me
PATCH  /api/me
GET    /api/candidates/:id
PATCH  /api/candidates/me
POST   /api/candidates/me/resumes           multipart → presigned S3 upload
PATCH  /api/candidates/me/resumes/:id/primary
PUT    /api/candidates/me/skills            { skills: [{ skillId, proficiency, years }] }
GET    /api/candidates/me/portfolio
PUT    /api/candidates/me/portfolio
POST   /api/candidates/me/portfolio/projects
GET    /api/recruiters/me
PATCH  /api/recruiters/me
GET    /api/skills?q=                        autocomplete
```

### 9.3 Jobs
```
GET    /api/jobs                        public, filters: type, location, skills, salary, remote
GET    /api/jobs/:id                    public
POST   /api/jobs                        RECRUITER → creates DRAFT
PATCH  /api/jobs/:id                    RECRUITER, owner only
POST   /api/jobs/:id/publish            RECRUITER → PENDING_PAYMENT + payment intent
DELETE /api/jobs/:id                    → CANCELLED (soft)
PUT    /api/jobs/:id/stages             RECRUITER  [{ name, sequence, isTerminal }]
PUT    /api/jobs/:id/weightage          RECRUITER  { skill, experience, education, project }
GET    /api/jobs/:id/candidates         RECRUITER → AI-ranked shortlist
```

### 9.4 Full-time hiring
```
POST   /api/jobs/:id/apply              CANDIDATE  { resumeId, coverNote }
GET    /api/applications                CANDIDATE → own | RECRUITER → by job
GET    /api/applications/:id
PATCH  /api/applications/:id/withdraw   CANDIDATE
PATCH  /api/applications/:id/stage      RECRUITER  { toStageId, note }
GET    /api/applications/:id/movements  full history
POST   /api/jobs/:id/invitations        RECRUITER  { candidateId, message, expiresAt }
PATCH  /api/invitations/:id/respond     CANDIDATE  { accept: boolean }
POST   /api/applications/:id/interviews RECRUITER  { scheduledAt, mode, meetingLink, stageId }
PATCH  /api/interviews/:id/feedback     { feedback, rating, recommendation }
POST   /api/applications/:id/offer      RECRUITER  { compensation, joiningDate, expiresAt }
PATCH  /api/offers/:id/respond          CANDIDATE  { accept: boolean }
```

### 9.5 Freelance
```
POST   /api/jobs/:id/proposals          CANDIDATE  { bidAmount, durationDays, coverLetter }
GET    /api/proposals                   own | by job
PATCH  /api/proposals/:id/withdraw      CANDIDATE
PATCH  /api/proposals/:id/shortlist     CLIENT
POST   /api/proposals/:id/accept        CLIENT  { agreedAmount, milestones[] }  → creates Contract
GET    /api/contracts                   own (either side)
GET    /api/contracts/:id
POST   /api/milestones/:id/fund         CLIENT → payment intent for escrow
POST   /api/milestones/:id/submit       FREELANCER  { note, attachmentIds[] }
POST   /api/milestones/:id/approve      CLIENT → §8.1 release transaction
POST   /api/milestones/:id/request-revision  CLIENT  { feedback }
POST   /api/contracts/:id/reviews       either party  { rating, comment }
```

### 9.6 Money
```
GET    /api/wallet                      own balance + recent transactions
GET    /api/wallet/transactions         paginated ledger
POST   /api/payouts                     FREELANCER  { amount, method, details }
GET    /api/payouts
POST   /api/webhooks/payment            gateway → idempotent, verify signature, no auth middleware
```

### 9.7 Messaging
```
GET    /api/chat/rooms                  own rooms
GET    /api/chat/rooms/:id/messages     paginated, cursor-based
POST   /api/chat/rooms/:id/messages     REST fallback; primary path is Socket.IO
PATCH  /api/chat/rooms/:id/read
GET    /api/notifications               paginated
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all
```

### 9.8 Admin
```
GET    /api/admin/disputes              filter by status
PATCH  /api/admin/disputes/:id/assign
POST   /api/admin/disputes/:id/resolve  { note, amountToFreelancer, amountToClient }
GET    /api/admin/users                 search, filter by status
POST   /api/admin/users/:id/moderate    { action, reason, expiresAt }
GET    /api/admin/financials            revenue by fee type, date range
GET    /api/admin/settings
PUT    /api/admin/settings/:key
```

### 9.9 Socket.IO events

| Direction | Event | Payload |
|---|---|---|
| C→S | `room:join` | `roomId` |
| C→S | `message:send` | `{ roomId, body, attachmentIds? }` |
| C→S | `typing:start` / `typing:stop` | `roomId` |
| S→C | `message:new` | `Message` |
| S→C | `notification:new` | `Notification` |
| S→C | `milestone:updated` | `{ milestoneId, status }` |
| S→C | `error` | `{ code, message }` |

---

## 10. Frontend Structure

### 10.1 State boundary — get this right

| Client state → Redux slices | Server state → RTK Query |
|---|---|
| Owned entirely by the browser | Owned by the database; browser holds a copy |
| Never stale — it *is* the truth | Always potentially stale |
| Auth user, sidebar open, active filters, unsent chat draft, theme | Jobs, applications, match scores, messages, wallet balance |

> **Do NOT hand-write `fetchJobs` thunks with `loading`/`error`/`data` in slices.** Repeated
> across twelve resources that's ~400 lines reimplementing caching badly. RTK Query ships
> *inside* Redux Toolkit — no extra dependency.

### 10.2 RTK Query endpoint pattern

```typescript
// src/store/api/jobsApi.ts
export const jobsApi = createApi({
  reducerPath: 'jobsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${process.env.NEXT_PUBLIC_API_URL}/api`,
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.accessToken;
      if (token) headers.set('authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Job', 'Application', 'Proposal', 'Contract', 'Wallet'],
  endpoints: (b) => ({
    getJobs: b.query<Paginated<Job>, JobFilters>({
      query: (filters) => ({ url: '/jobs', params: filters }),
      providesTags: (r) => r
        ? [...r.data.map(({ id }) => ({ type: 'Job' as const, id })), { type: 'Job', id: 'LIST' }]
        : [{ type: 'Job', id: 'LIST' }],
    }),
    createJob: b.mutation<Job, CreateJobInput>({
      query: (body) => ({ url: '/jobs', method: 'POST', body }),
      invalidatesTags: [{ type: 'Job', id: 'LIST' }],
    }),
    moveStage: b.mutation<Application, MoveStageInput>({
      query: ({ id, ...body }) => ({ url: `/applications/${id}/stage`, method: 'PATCH', body }),
      // Optimistic update — the pipeline board must feel instant
      async onQueryStarted({ id, toStageId, jobId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          jobsApi.util.updateQueryData('getApplications', { jobId }, (draft) => {
            const app = draft.find((a) => a.id === id);
            if (app) app.currentStageId = toStageId;
          }),
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Application', id }],
    }),
  }),
});
export const { useGetJobsQuery, useCreateJobMutation, useMoveStageMutation } = jobsApi;
```

### 10.3 Root layout — MUI + App Router wiring

```tsx
// src/app/layout.tsx
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>       {/* MANDATORY — see §12 */}
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <ReduxProvider>{children}</ReduxProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
```

### 10.4 Rendering strategy per route

| Route | Strategy | Why |
|---|---|---|
| `/` | Static | Rarely changes |
| `/jobs`, `/jobs/[id]` | **SSR + revalidate** | SEO is the point — a job board Google can't index has a product problem |
| `/companies/[id]` | SSR | SEO |
| `(candidate)/*`, `(recruiter)/*`, `(admin)/*` | Client (`'use client'` at layout) | Private, interactive, no SEO value |

```tsx
// src/app/(public)/jobs/[id]/page.tsx — Server Component
export default async function JobPage({ params }: { params: { id: string } }) {
  const job = await fetch(`${API}/jobs/${params.id}`, { next: { revalidate: 300 } }).then(r => r.json());
  return (<><JobHeader job={job} /><ApplyButton jobId={job.id} /></>);
}
export async function generateMetadata({ params }) {
  const job = await getJob(params.id);
  return { title: `${job.title} at ${job.company.name}`, description: job.description.slice(0, 160) };
}
```

### 10.5 Theme — avoid default-MUI look

```typescript
// src/theme.ts
export default createTheme({
  palette: { primary: { main: '#1d4f8c' }, secondary: { main: '#0f766e' },
             background: { default: '#f7f9fb' } },
  typography: {
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
    button: { textTransform: 'none' },       // removes dated ALL-CAPS
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true },
                 styleOverrides: { root: { fontWeight: 600 } } },
    MuiCard:   { styleOverrides: { root: { border: '1px solid #e2e8f0', boxShadow: 'none' } } },
  },
});
```

Two changes carry most of the effect: `textTransform: 'none'` on buttons, and replacing default
shadows with subtle borders.

---

## 11. Build Order

The most common failure is building all 41 tables badly instead of one flow well. A working
escrow flow demos better than two half-finished halves.

| Phase | Build | Why this order |
|---|---|---|
| **1** | Prisma schema, migrations, **the hand-written constraint migration**, seed data | Everything depends on it; constraints from day one avoid retrofitting against dirty data |
| **2** | Auth: register, login, refresh, role middleware, guarded layouts | Every feature needs a logged-in user |
| **3** | Jobs CRUD + public listing with SSR | First demoable slice; proves the Next rendering split works |
| **4** | **Proposals → contract → milestones → escrow → release** | ⭐ The centrepiece. Transactions, locking, ledger — hardest and most impressive |
| **5** | Chat with Socket.IO, scoped to contracts | Needed for delivery; enables dispute evidence |
| **6** | Full-time flow: applications, stages, pipeline board, offers | Reuses jobs + auth; the dnd board is the best UI demo |
| **7** | AI matching in a worker writing `matchScores` | Async by design; can start as a heuristic scorer |
| **8** | Admin: disputes, moderation, financials | Depends on everything above |
| **9** | Reviews, notifications, polish, tests | Value-adding but not load-bearing |

> **If time runs short, cut phases 7–9 before cutting anything from phase 4.**

### 11.1 Tests worth writing first

```typescript
// The two that prove you understood the hard parts
it('two concurrent payouts cannot overdraw a wallet', async () => {
  await seedWallet({ balance: 500 });
  const results = await Promise.allSettled([
    requestPayout({ amount: 400 }), requestPayout({ amount: 400 }),
  ]);
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  expect(await getBalance()).toEqual(new Decimal(100));
});

it('a candidate cannot hold two live applications for one job', async () => {
  await apply({ jobId, candidateId });
  await expect(apply({ jobId, candidateId })).rejects.toThrow(/DUPLICATE/);
  await withdraw({ jobId, candidateId });
  await expect(apply({ jobId, candidateId })).resolves.toBeDefined();  // reapply allowed
});
```

Run integration tests against a **real Postgres** (Testcontainers). An in-memory mock cannot
test a partial unique index.

---

## 12. Gotchas

Ranked by how much time each will cost if hit unprepared.

### 12.1 Prisma cannot express your constraints
**Symptom:** none — the rules silently do not exist.
**Fix:** §6. Use `--create-only` and hand-write SQL. Never run `prisma db push` against a
database holding these constraints; it can drop what the schema file doesn't know about.

### 12.2 `prisma` vs `tx` inside a transaction
**Symptom:** transaction appears to work but doesn't roll back correctly.
**Cause:** using the global client inside `$transaction` opens a separate connection *outside*
the transaction.
**Fix:** every call inside the callback uses `tx`.

### 12.3 Prisma has no `FOR UPDATE`
**Fix:** `tx.$queryRaw` with the tagged-template form. Never `$queryRawUnsafe` with
concatenation (SQL injection).

### 12.4 `Decimal` serialises to JSON as an object
**Symptom:** frontend receives `{"s":1,"e":3,"d":[...]}`.
**Fix:** convert at the controller boundary with `.toFixed(2)` → string. Frontend treats money
as a string until display. Never do money arithmetic in the browser.

### 12.5 MUI + App Router flash of unstyled content
**Symptom:** FOUC on every SSR page + hydration mismatch warnings.
**Fix:** `AppRouterCacheProvider` in root layout (§10.3). Two lines; costs people an afternoon.

### 12.6 PrismaClient connection exhaustion in dev
**Symptom:** "too many connections" after ~20 hot reloads.
**Fix:** the `globalThis` singleton in §8.7.

### 12.7 Socket.IO cannot run on Vercel
**Symptom:** connections drop immediately in production.
**Fix:** deploy the API to a long-running host. If you scale past one instance, add
`@socket.io/redis-adapter` or two users in the same chat may land on different servers and never
see each other's messages.

### 12.8 Redux Provider needs `'use client'`
**Symptom:** "createContext is not a function" during build.
**Fix:** wrap the store Provider in a `'use client'` component; Server Components cannot
provide context.

### 12.9 Server Components can't use hooks
**Fix:** don't fight it. Put `'use client'` at the top of dashboard layouts and treat that whole
subtree as a normal React SPA. Keep Server Components at page level for data fetching + SEO
metadata only.

### 12.10 Blanket UNIQUE would block legitimate reapplication
**Fix:** partial unique indexes (§6). The rule is "no two *active* applications", so the
constraint must say exactly that.

### 12.11 Polymorphic `attachments` has no FK
**Accepted trade-off:** one upload pipeline, quota, virus-scan hook and deletion policy, at the
cost of referential integrity. If orphaned files become a problem, split into
`message_attachments` / `submission_attachments`, or add a trigger.

### 12.12 Timezones
Store everything as `timestamptz` (Prisma `DateTime` does this on Postgres). Convert to local
only at render. Interview scheduling across timezones is where this bites.

---

## Appendix A — Environment Variables

```bash
# Backend
DATABASE_URL="postgresql://user:pass@host:5432/bivio?schema=public"
REDIS_URL="redis://..."
JWT_SECRET="..."                 # 32+ bytes
JWT_REFRESH_SECRET="..."
ACCESS_TOKEN_TTL="15m"
REFRESH_TOKEN_TTL="7d"
S3_ENDPOINT="..."
S3_BUCKET="bivio-uploads"
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."
PAYMENT_GATEWAY_KEY="..."
PAYMENT_GATEWAY_SECRET="..."
PAYMENT_WEBHOOK_SECRET="..."
PLATFORM_FEE_PERCENT="10"
CORS_ORIGIN="http://localhost:3000"
PORT="4000"

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:4000"
```

Parse and validate with Zod at boot so a missing `JWT_SECRET` crashes on startup, not at 3am:

```typescript
// src/config/env.ts
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  PLATFORM_FEE_PERCENT: z.coerce.number().min(0).max(100),
  // ...
});
export const env = envSchema.parse(process.env);
```

## Appendix B — Seed Data Checklist

For a demoable system, seed:
- ~40 skills across categories (languages, frameworks, tools, soft skills)
- 3 companies, 3 recruiters, 1 admin
- 25 candidates with varied skills, experience, resumes; 10 with freelance portfolios
- 6 full-time jobs with 4-stage pipelines and varied AI weightings
- 6 freelance jobs with budgets
- Applications spread across stages; proposals on freelance jobs
- 2 contracts: one mid-flight (milestone 2 of 3 funded), one completed with reviews
- 1 open dispute with chat history and two submission versions — so the admin UI has something real to arbitrate

## Appendix C — Naming Note

The project was previously called "RMS" (Recruitment Management System). Renamed to **Bivio**
for portfolio purposes. Resume line:

> **Bivio** — Dual-mode hiring platform (full-time ATS + freelance marketplace)
> Next.js, TypeScript, Node.js, Prisma, PostgreSQL
> Built milestone-based escrow with row-level locking and a double-entry ledger; configurable AI
> candidate scoring with per-job weightings; 41-table normalized schema with partial indexes and
> CHECK constraints enforcing business rules at the database layer.
