# Bivio — Complete Project Reference

> This is a structured reference of every decision made across this entire
> conversation, not a raw transcript. Organized so you can find something in
> seconds rather than scrolling through months of history. Use this alongside
> the actual deliverables: `BIVIO_DEV_SPEC.md`, `BIVIO_FRONTEND_AUDIT.md`,
> `bivio_schema.prisma`, and the 5 module-by-module Word docs
> (Hiring/Freelance/Messaging/Profiles/Payments/Admin/GapClosing).

---

## 1. Project Identity

**Name:** Bivio (Italian: *bivium* — a fork in the road). Chosen after
`Niyukti`, `Karya`, `RoleCall`, `Setu` were all found to be taken by real
companies. The name's story: one candidate profile, one AI score, then the
road forks — permanent employment down one branch, freelance/escrow work
down the other.

**What it is:** A dual-mode recruitment platform combining:
1. **Full-time ATS hiring** — configurable pipeline stages, interviews, offers
2. **Freelance marketplace** — proposals → contracts → milestone escrow → wallet/payouts

**Actors:** CANDIDATE, RECRUITER (= client in freelance flow, same role),
ADMIN, SYSTEM.

**Location/currency context:** Jodhpur, India. INR.

**Resume positioning:**
> **Bivio** — Dual-mode hiring platform (full-time ATS + freelance marketplace)
> Next.js, TypeScript, Node.js, Prisma, PostgreSQL
> Built milestone-based escrow with row-level locking and a double-entry
> ledger; configurable AI candidate scoring with per-job weightings;
> 48-table normalized schema with partial indexes and CHECK constraints
> enforcing business rules at the database layer.

**Targeting both SDE and AI/ML/Data Science roles** — this shaped the
decision to build a real Python/FastAPI ML service (feature engineering →
heuristic baseline → gradient-boosted model) for matching, rather than
wrapping a hosted LLM API. See §9.

---

## 2. Technology Stack (final)

| Layer | Choice |
|---|---|
| Backend runtime | Node.js 20, TypeScript strict |
| Backend framework | Express 4 |
| ORM | Prisma 5 |
| Database | PostgreSQL 14+ |
| Validation | Zod |
| Auth | JWT access (15m) + httpOnly refresh cookie (7d) |
| Realtime | Socket.IO (same process) |
| Queue (design, not yet wired) | BullMQ + Redis |
| Frontend framework | Next.js 15 App Router |
| Frontend UI | MUI v6 |
| Frontend state | Redux Toolkit + RTK Query |
| Frontend forms | Plain `useState` per field (no react-hook-form/Formik) |
| Deploy targets (planned) | Vercel (FE), Railway/Render (API — long-running for sockets), Neon/Supabase (PG), Upstash (Redis) |
| AI/ML service (separate, not built in this backend) | Python + FastAPI, feature engineering + XGBoost, `sentence-transformers` for text similarity — NOT a wrapped LLM API |

**Architecture shape:** Modular monolith. Controller → Service → Repository
layers per module. Domain events (`shared/events.ts`) for cross-module side
effects instead of direct cross-module imports.

---

## 3. Full-Time Recruitment Flow — Complete Design

### 3.1 Job posting fee model (OQ-1 — corrected mid-conversation)

**Final decision: ONE-TIME per recruiter account**, not per job.
`RecruiterProfile.postingFeePaid` is checked once, at the moment a recruiter
first tries to publish a job. After that, every subsequent job (either type)
skips the fee step entirely. `JobStatus` has **no `PENDING_PAYMENT` state** —
a job goes `DRAFT → CONFIGURING → OPEN` directly.

*(Note: the actual frontend wizard as originally audited still had a
per-job payment step — this was flagged in the audit as the single highest-
impact drift and corrected in the schema/backend to match the one-time
model. If the frontend wizard hasn't been updated to match, that's the one
piece of frontend rework still outstanding from OQ-1.)*

### 3.2 Job creation wizard — 5 steps for full-time

1. **Basic Info** — title, description, department, employment type
   (Full-time/Part-time/Contract-to-hire), experience level (Entry–Executive),
   location, remote toggle, required skills (mandatory/optional flag per
   skill), currency, salary min/max, salary visibility toggle, min/max
   experience years, min education level, notice period preference,
   vacancies, benefits, internal job code, deadline, key responsibilities
2. **One-time posting fee** (only shown if unpaid) — skipped silently after first job
3. **Configure hiring stages** — Screening (locked, first, system-managed)
   and Offer (locked, last, system-managed) are anchors; everything between
   is recruiter-defined: name, stage type (OA/Interview/Custom), for
   OA/Interview — automation link, email subject, email body template
   (with `{{candidateName}}`/`{{jobTitle}}`/`{{companyName}}`/`{{link}}`
   placeholders), prerequisite instructions, requirement reference document
4. **Configure AI weightage** — 5 factors, see §6
5. **Review & Publish** — validates screening+offer present, weightage
   sums to 100, all OA/Interview stages have complete automation fields

### 3.3 Stage automation — the two-layer model

Two distinct mechanisms, not one:

- **Stage-entry automation** (from stage config) — fires immediately when a
  candidate is dragged into an OA/Interview stage. This is a **generic
  notice** ("you've been shortlisted, prepare X"), not the actual interview
  invite. Rendered via `{{placeholder}}` template substitution, sent via
  `shared/mailer.ts` (logs to console in dev, swappable for a real provider).
- **Interview scheduling** (`/recruiter/interviews`, `hiring` module) — the
  actual per-candidate appointment: specific date/time, specific
  interviewer, specific meeting link. Separate because a `HiringStage` row
  is shared across every candidate in that stage and cannot represent
  per-candidate scheduling data.

### 3.4 Application lifecycle

`APPLIED → IN_PROGRESS → OFFERED → HIRED` (or `REJECTED`/`WITHDRAWN` at any
point before `HIRED`).

- Apply gate sequence: logged in as candidate → job is `OPEN` → no existing
  live application (partial unique index, excludes
  `WITHDRAWN`/`REJECTED`) → `fullTimeFeePaid` → profile completeness →
  invite recognition (if arriving via invitation) → apply modal
- **Snapshot rule:** `Application.resumeId` (pinned resume version) and
  `snapshotAiScore` are frozen at application time, never recomputed even if
  the candidate later edits their profile. The *current* profile is shown
  live, clearly labelled, but the frozen resume + score are what the
  recruiter's decision is based on.
- **Rejection reason** (`Application.rejectionReason`) — added mid-build
  when the audit caught that the frontend's reject-modal reason was being
  silently discarded. Now persisted, categorized dropdown + free note
  concatenated into one string field.
- Bulk actions supported: bulk stage-move, bulk reject (both scoped to jobs
  the acting recruiter actually owns).

### 3.5 Invitations

Recruiter-initiated outreach to a candidate who hasn't applied. Lives on its
own page/tab (`/applications` → Invitations tab for candidates), **not
notification-only** — a notification is transient, an invitation needs a
durable record.

- Full-time: accepting an invitation **creates the application directly**
  (`source = INVITED`), same snapshot rules as a direct apply
- Freelance: accepting an invitation does **not** auto-create anything — it
  routes the freelancer to the project page with an "invited" banner; they
  still submit a real proposal (see §4, no-negotiation rule)

### 3.6 Offers

`SENT → ACCEPTED/REJECTED/WITHDRAWN/EXPIRED`. Extend Offer is a *separate*
action from moving the pipeline card — only available once an application
reaches the terminal Offer-type stage. Compensation, currency, joining
date, offer letter, expiry (required, no open-ended offers).

- Accept → `Application.HIRED`. If `vacancies` filled → `Job.CLOSED` auto.
  `RecruiterProfile.hiresCount` incremented.
- Reject → `Application.REJECTED`, optional candidate-supplied reason for
  platform improvement purposes.
- **Contact-info gating** (flagged, not yet implemented): candidate
  email/phone should stay hidden from the recruiter until this point (or
  until past initial screening) — this is a **serialization-layer**
  concern for `GET /applications/:id`'s response shaping, explicitly noted
  as still-to-build in the Hiring module's service code comments.

### 3.7 Interviews

`SCHEDULED → RESCHEDULED → SCHEDULED` (loop) or `→ COMPLETED/CANCELLED/NO_SHOW`.
Round-numbered per application. CHECK constraint: `COMPLETED` status
requires a `recommendation` — the database refuses to record a finished
interview with no outcome. Structured sub-ratings (comm/tech/culture) plus
overall rating plus free-text feedback. Mode-specific requirements
(`meetingLink` required if `ONLINE`, `location` required if `ONSITE`) are
enforced both in Zod and as DB CHECK constraints.

Reschedule collects the new date/reason in one action — goes
`SCHEDULED → RESCHEDULED → SCHEDULED` (with the new date) inside one
service call, not two separate steps.
## 4. Freelance Recruitment Flow — Complete Design

### 4.1 No negotiation (explicit decision)

**Proposals are fixed-terms.** No counter-offer flow was built, by explicit
choice — this was designed in detail (a `ProposalRevision` table,
`NEGOTIATING` status, round-limits) then **deliberately cut** to keep scope
tight and force honest first-bid pricing. Clients can Accept, Shortlist, or
Reject. Freelancers can Withdraw and resubmit a new proposal (allowed by the
partial unique index excluding `WITHDRAWN`/`REJECTED`). Chat (unlocked at
shortlist) is the informal clarification channel, but nothing said there
changes the proposal's binding terms — only the accepted proposal does.

### 4.2 Job creation wizard — 4 steps for freelance (one shorter than full-time — no stage config)

1. **Basic Info** — title, description, **deliverables** (structured list,
   not prose), required skills, budget type (Fixed/Hourly), budget amount,
   freelance experience level (Entry/Intermediate/Expert), project length
   estimate, proposal deadline (distinct from project completion date),
   attachments
2. **One-time posting fee** — same shared flag as full-time, skipped if
   already paid from a prior posting of either type
3. **Configure AI weightage** — 5 freelance-specific factors, see §6
4. **Review & Publish**

### 4.3 Proposal → Contract boundary (the centerpiece transaction)

`Proposal.SUBMITTED → SHORTLISTED → ACCEPTED` (or `REJECTED`/`WITHDRAWN`).

**Accepting a proposal is a confirmation, never an edit.** The accept
endpoint takes no body — it materializes the contract from the proposal's
**exact frozen terms**: `bidAmount → agreedAmount`, `proposedMilestones`
(JSON) → real `Milestone` rows, `platformFeePercent` frozen at the
*current* platform rate (changing the rate later never affects existing
contracts), a `ChatRoom` opened with both parties as participants — all in
one transaction.

### 4.4 Milestone lifecycle — the most important state machine in the system

```
PENDING → FUNDED → SUBMITTED ⇄ REVISION_REQUESTED
                        ↓
                  DISPUTED → APPROVED / PENDING / PAID
                        ↓ (non-dispute path)
                   APPROVED → PAID
```

Transitions that must be **impossible** (and are, both in the TS state
machine and DB constraints): `PENDING → SUBMITTED` (work against unfunded
escrow), `PENDING → PAID`, `FUNDED → PAID`, `SUBMITTED → PAID` (skips client
approval), `PAID → anything` (terminal — reversal is a new refund record,
never a rollback).

**The guarded, atomic release transaction** (`approveAndRelease` in
`freelance.repository.ts`) — the single most important piece of code in the
whole backend:
1. Guarded `updateMany WHERE status='SUBMITTED'` — idempotent; a
   double-clicked approve matches zero rows the second time
2. Escrow `HELD → RELEASED`
3. Platform fee calculated and recorded (`PlatformFee`, `feeType =
   FREELANCE_COMMISSION`)
4. **Row-locked** wallet credit — `SELECT ... FOR UPDATE`, not just a
   `CHECK(balance >= 0)` constraint, because the constraint alone does not
   prevent two concurrent operations from both reading a stale balance
5. Ledger `Transaction` row written (`CREDIT`, `balanceAfter`)
6. `Milestone → PAID`
7. If this was the last unpaid milestone: `Contract → COMPLETED`,
   `FreelancePortfolio.totalContracts` incremented

### 4.5 Disputes

Either party can raise one from a `SUBMITTED` or `REVISION_REQUESTED`
milestone. `Escrow → FROZEN`, `Contract → DISPUTED`. **Dispute is a detour,
not an ending** — `Contract` always returns to `ACTIVE` on resolution,
never auto-cancelled.

**Admin resolution** (`admin.repository.ts`'s `resolve`):
- Split (`amountToFreelancer` + `amountToClient`) must sum **exactly** to
  the frozen escrow amount — enforced by a CHECK constraint
  (`ck_dispute_resolution_amounts`) and pre-validated in the service for a
  clean error first
- Freelancer's share credited to their wallet under the same row-locked
  pattern as milestone approval
- Client's share is recorded on the dispute record but **not actually
  refunded** — no payment-gateway refund flow exists yet; stated directly
  in code comments, not hidden
- Any freelancer share > 0 → `Milestone.PAID`, `Escrow.RELEASED` (state
  machine explicitly allows `DISPUTED → PAID` for exactly this "admin
  splits funds" case). Full client refund (freelancer share = 0) →
  `Milestone.PENDING`, `Escrow.REFUNDED`.

### 4.6 Reviews — double-blind

A review publishes the instant **both** parties have submitted one for the
same contract (checked synchronously in `submitReview`). If only one party
ever reviews, a scheduled job (`publishStaleReviews`, wired to an hourly
`setInterval` in `server.ts` for dev — **explicitly flagged as not a
production scheduler**) publishes it anyway after `REVIEW_PUBLISH_DAYS`
(default 14) have passed. This prevents both the "whoever reviews first
shows their hand and gets retaliated against" problem and the "hold the
other party hostage by never reviewing" problem.

### 4.7 Freelancer verification — explicitly NOT required (OQ-2)

Verification (payment method + KYC) is a **client/recruiter-side concept
only**. Freelancers bidding on projects go through **no** verification gate
— this was audited as a drift (the frontend had a verification check on the
candidate bid flow) and corrected: removed from the candidate-side bid flow
entirely. `CandidateProfile` has no verification fields at all.

---

## 5. What's Common vs. What Forks (the recurring design table)

| Concern | Full-time | Freelance | Shared? |
|---|---|---|---|
| Job creation | Salary + stages + weightage | Budget + deliverables | Common fields, then fork |
| Candidate/freelancer discovery | AI shortlist by match score | AI shortlist by match score | Same mechanism, different factor set |
| Response tracking | Pipeline board (kanban) | Proposals list | Different UI, same "list of responses" pattern |
| Commitment artifact | Offer → accept → Hired | Proposal → accept → Contract | Different entities, same "freeze terms at commitment" rule |
| Ongoing engagement | Interviews, stage movement | Milestones, chat, escrow | Entirely different — the real fork |
| Money | Posting fee only | Posting fee + 10% commission per release | Fork |
| Completion | Hired (terminal) | All milestones paid → Completed → Review | Fork |
| Dispute handling | None | Full dispute flow | Freelance only |
| Negotiation | N/A | Explicitly not built | — |
| Verification requirement | N/A (recruiter-side only, both flows) | N/A (recruiter-side only, both flows) | Same flag, both flows |

---

## 6. AI Matching — Weightage Factors (final)

**Both factor sets live in one `AIWeightage` table**, one row per job,
unused columns zeroed depending on `job.jobType`. Sum-to-100 CHECK
constraint covers all 9 columns regardless of type.

### Full-time — 5 factors
| Factor | Default weight | Measures |
|---|---|---|
| Skill Match | 40 | Skill overlap, mandatory weighted higher |
| Experience Match | 30 | Distance between candidate years and job's min/max band |
| Education Match | 15 | Meets minimum threshold |
| Domain Relevance | 10 | Overlap between candidate's past roles/industries and job's department |
| Practical Fit | 5 | Notice period + location/remote compatibility |

*(Original 4-factor design — Skill/Experience/Education/Project — was
revised: Project was dropped for full-time since most roles have no
meaningful public-portfolio signal; Domain Relevance and Practical Fit
added instead. The reasoning: separate **capability** signals from **fit-
for-this-specific-opening** signals.)*

### Freelance — 5 factors
| Factor | Default weight | Measures |
|---|---|---|
| Skill Match | 35 | Same skill-overlap mechanism |
| Portfolio Match | 30 | Overlap between past portfolio projects and this project's deliverables — the primary signal, unlike full-time |
| Rate Fit | 15 | Distance between freelancer's rate/typical bid and the project budget |
| Track Record | 15 | Composite: avg rating, completed contracts, **dispute count** (not raw rating alone) |
| Availability Fit | 5 | Weekly capacity + current availability vs. project length |

*(A sixth factor — "Proposal Quality," scoring whether the cover letter
engages with actual deliverables — was discussed and deliberately excluded.
Reasoning: the AI's job is to rank candidates for human review, not make
the final call; the client reads the actual cover letter before accepting.)*

### Precompute, never compute-on-request

`match_scores` table, precomputed by a background worker (not built in this
backend — explicitly separate, per your instruction) on three triggers:
`JobPublished`, candidate profile meaningfully updated, candidate first
opts into full-time/freelance. `GET /jobs` and `GET /jobs/:id/candidates`
only ever **read** `match_scores` — never compute at request time. An
on-demand `POST /match-scores/compute` fallback exists for missing scores
(stubbed — the worker itself is out of scope here).

**Two scores, two purposes:** `MatchScore.score` (`isCurrent=true`) is
live and shown on discovery surfaces (`/jobs`, shortlists).
`Application.snapshotAiScore` / `Proposal.matchScore` are frozen at
commitment time and shown on decision surfaces (pipeline board, application
detail). A candidate's live score can rise or fall after applying; the
recruiter's view never moves.

---

## 7. Money & Fees Model (final)

| Fee | Who pays | When | Amount | One-time or recurring |
|---|---|---|---|---|
| Candidate full-time profile fee | Candidate | Before first full-time application | ₹499 (seeded default) | One-time, ever |
| Recruiter posting fee | Recruiter | Before first job publish (either type) | ₹2,500 (seeded default) | **One-time per account** (OQ-1) |
| Freelance platform commission | Deducted from freelancer's release | Every milestone approval | 10% (seeded default) | Per-transaction, rate frozen per-contract at signing |

**No fee for freelancers to bid** — submitting a proposal is free (OQ-2
confirmed no verification/fee gate on the candidate bid flow).

**Fee transparency rule:** freelancers see the net-after-fee amount at bid
time ("You'll receive ₹X after the Y% platform fee"), not just at release
time — no surprises.

**Rate changes are never retroactive** — `Contract.platformFeePercent` is
frozen at proposal-acceptance time from whatever `PLATFORM_FEE_PERCENT` is
at that moment. Changing the platform-wide setting later only affects new
contracts.

---

## 8. Verification Model — Recruiter/Client Side Only

Two-tier, gates real actions, not just cosmetic badges:

| Tier | Unlocks |
|---|---|
| Payment-method verified | Publish jobs (either type), accept proposals, extend offers, fund escrow — up to a threshold |
| Identity/KYC verified | Same, plus contracts above `KYC_THRESHOLD` (₹5,00,000 seeded default) |

- **Payment method verification** — mock small-authorization flow via
  `shared/paymentGateway.ts`. Deliberately never touches raw card data
  server-side (`paymentMethodToken` accepted, not persisted) — matches how
  a real hosted-field/Stripe-Elements-equivalent integration would work.
- **KYC submission** — `KycSubmission` rows, documents stored via the
  polymorphic `Attachment` table (`ownerType = KYC_SUBMISSION`). A second
  rejection for the same recruiter automatically routes to `MANUAL_REVIEW`
  instead of the standard queue.
- **Admin queue** (`/admin/verifications`) — list, approve, reject
  (categorized reason), request-clarification. Age-based SLA indicator
  (target: 24-hour review).

**Never a freelancer/candidate-side concept** — see §4.7.
## 9. Schema Summary

**48 models, 46 enums.** Full file: `bivio_schema.prisma`. Structurally
verified throughout the build (no dangling relations, no duplicate fields,
every enum literal in SQL constraints matches a real schema value, every
state machine's transitions cover 100% of its enum's values).

### Model groups
- **Identity/Profiles:** User, CandidateProfile, RecruiterProfile,
  AdminProfile, Company, Skill, CandidateSkill, Resume, WorkExperience,
  CandidateEducation, Certification, LanguageEntry, FreelancePortfolio,
  PortfolioProject, PortfolioProjectSkill, FreelanceService,
  FreelanceServiceSkill, KycSubmission
- **Jobs & matching:** Job, JobSkill, AIWeightage, MatchScore, HiringStage
- **Full-time pipeline:** Application, StageMovement, Invitation, Offer, Interview
- **Freelance:** Proposal, Contract, Milestone, MilestoneSubmission, Attachment
- **Money:** Escrow, Payment, PlatformFee, Wallet, Transaction, Payout
- **Communication:** ChatRoom, ChatParticipant, Message, Notification
- **Trust & admin:** Review, Dispute, ModerationAction, PlatformSetting, AuditLog

### Key integrity rules (raw SQL, not expressible in Prisma schema language)
- Partial unique indexes: one **live** application/proposal/invitation per
  (job, candidate) pair — `WITHDRAWN`/`REJECTED` excluded, so reapplication
  is allowed
- One current `MatchScore` per (job, candidate); history retained via `isCurrent`
- Exactly one primary `Resume` per candidate
- AI weightage: 9 columns must sum to exactly 100
- Job compensation shape: full-time uses salary fields XOR freelance uses
  budget fields (or both null while still `DRAFT`/`CONFIGURING`)
- Chat room has exactly one parent (`contract_id` XOR `application_id`)
- Money fields: positive amounts, non-negative wallet balances (constraint
  alone does NOT prevent concurrent double-spend — row locks are the real guard)
- Dispute resolution requires both split amounts recorded before `RESOLVED`
- Interview: `COMPLETED` requires a `recommendation`; mode-specific
  link/location requirements
- Hiring stage: `OA`/`INTERVIEW` types require complete automation fields
- One `PENDING` KYC submission per recruiter at a time

### Enum values added mid-build (both additive, no migration risk)
- `PaymentPurpose += PAYMENT_METHOD_VERIFICATION`
- `AttachmentOwnerType += KYC_SUBMISSION`

### Fields added mid-build after audit findings
- `Application.rejectionReason` (was being collected by the frontend but
  silently discarded — found via a systematic z.enum-vs-schema cross-check)
- `WorkExperience.startDate/endDate` and `Certification.issueDate/expiryDate`
  — found missing `@map(...)` to snake_case, breaking a later constraint
  migration; fixed across all 4 fields at once after a full-schema audit for
  the same class of bug

---

## 10. Frontend Audit — Key Findings (full detail in `BIVIO_FRONTEND_AUDIT.md`)

Traced all 95 frontend files (52 pages) via structural extraction rather
than reading each end-to-end.

### Finding 1 — data-source drift
Only **9 of 52 pages** used the intended RTK-Query-hooks seam
(`switchableBaseQuery`). **18 pages** (all of recruiter, several candidate)
had drifted to a second mock system — `recruiterState.ts`, reading/writing
`localStorage` directly. **25 pages** used fully inline hardcoded arrays,
no persistence at all. Meant the "swap by deleting `src/mocks/`" plan only
worked as-is for 9 pages; every other page needs individual rewiring to RTK
Query hooks as its corresponding backend module gets built.

### Finding 2 — stale canonical types
`types/index.ts` was never updated as pages grew; every page defined its
own local interface instead. Found: money typed as `number` in ~15 places
(violates the money-as-string rule), inconsistent enum casing (Title Case
vs. canonical SCREAMING_SNAKE_CASE), and the richer fields from later design
passes (stage automation, 5-factor weightage) existing only in the two job-
wizard pages, with an explicit `as any` cast in one place papering over the
drift. §2 of the audit is the reconciled union — 45 interfaces, 39 enums.

### Finding 3 — API surface gap
`mockRouter.ts` had 32 routes, covering roughly half of what the pages
actually needed. Interviews, reviews, the entire invitation/offer write-
side, and recruiter verification submission had **zero** backend surface,
not even a mock.

---

## 11. The 13 Open Questions (OQ-1 through OQ-13) — Resolutions

| # | Question | Resolution |
|---|---|---|
| OQ-1 | Per-job fee or one-time? | **One-time per recruiter account.** Highest-impact — removed `PENDING_PAYMENT` from `JobStatus` entirely. |
| OQ-2 | Freelancer verification before bidding? | **No.** Removed from candidate bid flow; verification is recruiter/client-side only. |
| OQ-3 | "Force Complete Project" button — what is it? | **Treated as a debug-only frontend artifact, not modeled.** Flagged explicitly as an assumption in case it was meant to be real. |
| OQ-4 | Single `fullName` or split first/last? | **Single `fullName`.** Matches the rest of the app. |
| OQ-5 | `/profile` vs `/settings` field duplication | `/settings`'s Public Profile tab should link to `/profile`, not duplicate fields (frontend fix, not yet applied). |
| OQ-6 | Chat sender shape inconsistency | Bug, not a preference — fixed in canonical types (`sender: Pick<User,...> \| null`, compare by id). |
| OQ-7 | Freelance filters on full-time-only shortlist page | Recommended removal; frontend fix, not yet applied. |
| OQ-8 | Self-approve-KYC buttons on recruiter page | Recommended dev-only gating; frontend fix, not yet applied. |
| OQ-9 | Raw card fields in the mock | Not a question — flagged as a hard requirement: real implementation must use hosted fields/tokenization, never touch raw card data server-side. Backend's `verifyPaymentMethod` already built this way (accepts a token, never persists card data). |
| OQ-10 | Keep "Services Offered" on freelance profile? | **Kept in scope.** `FreelanceService` + `FreelanceServiceSkill` fully built. |
| OQ-11 | Bulk pipeline actions | **Kept, built.** Bulk stage-move and bulk reject in the Hiring module. |
| OQ-12 | Admin impersonation | **Initially deferred**, then **built properly** in the gap-closing pass: mandatory audit-logged reason, 30-min TTL, `blockDuringImpersonation` guard on every money-moving/moderation route. |
| OQ-13 | Stale 3/4-factor breakdown popovers on frontend | Not a preference — needs a frontend fix once the 5-factor weightage is wired in; not yet applied. |

---

## 12. Design Principles Established (worth restating if asked "why")

1. **Snapshot at commitment, live everywhere else.** Applications/proposals
   freeze the resume, cover letter, AI score, bid terms at the moment of
   submission. The profile shown alongside is always labelled "current" —
   never silently conflated with what was actually submitted.
2. **Money as string, always.** Every API response serializes Decimal
   fields via `.toFixed(2)`. Never a JS number, anywhere.
3. **State machines as data, not scattered conditionals.** One transition
   table per stateful entity, one `assertTransition` guard, checked in the
   service layer *and* backed by a guarded DB update for the money-critical
   ones.
4. **Row locks, not just CHECK constraints, for concurrency.** A
   `CHECK(balance >= 0)` does not stop two concurrent debits from both
   reading a stale balance. `SELECT ... FOR UPDATE` inside the same
   transaction is what actually prevents it — used in milestone release,
   payout debit, and dispute resolution.
5. **404, not 403, for non-party access.** Whether it's a contract or a
   chat room, a user who isn't a party gets "not found," never "forbidden"
   — a 403 would confirm the resource exists.
6. **One route, branch on `jobType`.** The AI shortlist, the job detail
   page, the weightage table — all one implementation, presentation and
   factor-set branching on which type of job it is, not two parallel builds.
7. **Cross-module effects via events, never direct imports.** `shared/
   events.ts`'s typed emitter is how `freelance` tells `messaging` a
   contract was created, how the messaging module tells `server.ts`
   (the only file that knows Socket.IO exists) to broadcast a message.
8. **Every gap stated in code, never silently absorbed.** Deferred features
   (contact-info gating, real payment-gateway refunds, the AI worker)
   are marked with comments pointing at exactly what's missing and why,
   not left for someone to discover by surprise later.

---

## 13. What Was Deliberately Cut From Scope

- **Proposal negotiation/counter-offers** — designed in full, then cut for
  simplicity and honest first-bid pricing (§4.1)
- **Per-job posting fees** — reverted in favor of one-time (§7)
- **AI scoring worker** — explicitly built separately, per your instruction
  from early in the conversation
- **Real payment gateway integration** — mocked throughout
  (`shared/paymentGateway.ts` is the one file that changes when real
  integration lands); webhook signature verification is real (HMAC-SHA256
  against raw bytes), the *provider* behind it is not
- **Real gateway refunds for dispute client-share** — recorded on the
  dispute row, not actually disbursed
## 14. Backend Module Status — Final

All 8 modules + 1 gap-closing pass. **89 files total.**

| Module | Status | Key endpoints |
|---|---|---|
| **Auth** | ✅ Complete | register, login, refresh, logout, verify-email, forgot/reset-password, `GET /me` |
| **Jobs** | ✅ Complete | Full 5-step wizard (create → basics/requirements/compensation/benefits edits → stages → weightage → publish → close/reopen/cancel/duplicate) |
| **Hiring** | ✅ Complete | Applications (apply/withdraw/stage-move/bulk actions/reject), Invitations (send/respond), Offers (extend/respond/withdraw), Interviews (schedule/reschedule/feedback/cancel) |
| **Freelance** | ✅ Complete | Proposals (submit/shortlist/reject/withdraw/accept), Contracts (list/detail), Milestones (fund/submit/approve/request-revision/dispute — the guarded atomic release transaction), Reviews (double-blind submit) |
| **Messaging** | ✅ Complete | Notifications (list/read/read-all/bulk-delete), Chat (rooms/messages/send via both REST and Socket.IO through one shared service method) |
| **Profiles** | ✅ Complete | Candidate profile, resumes, skills, work experience, education, certifications, languages, freelance portfolio + projects + services, recruiter profile + company, **payment-method verification + KYC submission** (added in gap-closing pass) |
| **Payments** | ✅ Complete | Wallet, transactions, payouts (request/retry with row-locked debit + reversal-on-failure), gateway webhook (real HMAC verification) |
| **Admin** | ✅ Complete | Disputes (list/detail/assign/resolve/escalate), Users (list/detail/moderate), Verifications (list/approve/reject/request-info), Financials, Settings, **password reset + guarded impersonation** (added in gap-closing pass) |

### Deferred/out-of-scope, stated explicitly in code
- **AI matching/scoring worker** — separate, by design (§13)
- **Real payment gateway credentials** — abstraction layer built
  (`shared/paymentGateway.ts`), mock provider used throughout
- **Production-grade scheduler** for the review auto-publish job — currently
  an hourly `setInterval` in `server.ts`, explicitly flagged as dev-only

### Shared infrastructure
- `shared/prisma.ts` — singleton client (prevents dev hot-reload connection exhaustion)
- `shared/redis.ts` — singleton client
- `shared/errors.ts` — `AppError` hierarchy incl. `PaymentRequiredError` (402, for the one-time fee gate)
- `shared/events.ts` — typed domain event emitter
- `shared/stateMachines.ts` — all 14 transition tables
- `shared/mailer.ts` — logs to console until a real provider is configured
- `shared/paymentGateway.ts` — mock order creation + real HMAC webhook verification
- `shared/purposeTokens.ts` / `shared/accessTokens.ts` — extracted from
  `auth.service.ts` so admin-triggered reset and impersonation reuse the
  exact same JWT mechanisms rather than duplicating them
- `middleware/authenticate.ts` — JWT verification, recognizes impersonation claims
- `middleware/authorize.ts` — role-level check (resource ownership still
  checked per-service, this is not sufficient alone — IDOR awareness)
- `middleware/blockDuringImpersonation.ts` — applied to payout request/retry,
  milestone fund/approve, dispute resolve, user moderate
- `middleware/validate.ts` — Zod-based, replaces `req[target]` with parsed data
- `middleware/errorHandler.ts` — maps Prisma error codes to clean HTTP responses
- `middleware/rateLimit.ts` — Redis-backed
- `jobs/publishStaleReviews.ts` — the review auto-publish logic

---

## 15. Frontend Page Inventory (as designed — see audit for as-built gaps)

### Common (both flows)
Dashboard, Profile/Settings hub, Messages, Notifications, Help, Logout —
candidate and recruiter versions of each.

### Candidate — Full-time
`/jobs` (browse + AI score), `/jobs/[id]` (detail + apply + fee gate),
`/applications` (tabs: Invitations/In Progress/Offered/Hired/Rejected/
Withdrawn), `/offers`

### Candidate — Freelance
`/freelance-profile` (portfolio + services), `/freelance-jobs` (browse),
`/freelance-jobs/[id]` (detail + proposal submission), `/proposals`
(tabs: Invitations/Active/Won/Closed), `/wallet`, `/contracts` +
`/contracts/[id]` (milestone timeline + chat + reviews)

### Recruiter — Common
Dashboard, `/recruiter/jobs` (shared list, forks by card content),
`/recruiter/jobs/new` (wizard, forks at step 1), `/recruiter/jobs/[id]`
(forks — no stages section for freelance), `/recruiter/profile`,
`/recruiter/verification`

### Recruiter — Full-time
`/recruiter/jobs/[id]/candidates` (AI shortlist), `/recruiter/jobs/[id]/
pipeline` (kanban, drag-drop, bulk actions), `/recruiter/applications/[id]`,
`/recruiter/interviews`, `/recruiter/offers`

### Recruiter — Freelance
`/recruiter/proposals`, `/recruiter/contracts` + `/recruiter/contracts/[id]`
(same component as candidate side, role-conditional actions),
`/recruiter/freelancers` (optional discovery page)

### Admin
`/admin/dashboard`, `/admin/disputes` + `/admin/disputes/[id]` (full
evidence view), `/admin/users` + `/admin/users/[id]`,
`/admin/verifications`, `/admin/financials`, `/admin/settings`

---

## 16. Complete File/Deliverable Manifest

Everything produced across this conversation, in order:

1. `rms_class_diagram.mermaid`, `rms_er_diagram.mermaid` / `_v2.mermaid` — early design phase
2. `rms_constraints.sql` — early SQL constraints draft
3. `RMS_ER_Diagram_Interview_Guide.pdf`, `RMS_Tech_Stack_Guide.pdf` — interview prep
4. `RMS_Data_Flow_Diagrams.pdf` + DFD sources
5. `RMS_State_Diagrams.pdf` + state diagram sources (10 UML state machines)
6. `BIVIO_DEV_SPEC.md` — ~2,200 line original dev spec (schema, constraints,
   state machines, patterns, API surface, build order) — **superseded in
   detail by the actual schema/backend built later, but the architectural
   reasoning in it still stands**
7. `bivio-frontend.zip` (first pass) → `bivio-frontend-updated.zip` (after
   Jobs module rewiring)
8. `BIVIO_FRONTEND_AUDIT.md` — the 1,444-line, 95-file structural audit
9. `bivio_schema.prisma` — the standalone final schema
10. `bivio-backend-skeleton.zip` — evolved across the conversation:
    v1 (skeleton, Auth+Jobs real) → +Hiring → +Freelance → +Messaging →
    +Profiles → +Payments → +Admin → +gap-closing pass (**final: 89 files**)
11. Per-module Word docs (full code + verification notes for each):
    `Bivio_Hiring_Module_File_Changes.docx`,
    `Bivio_Freelance_Module_File_Changes.docx`,
    `Bivio_Messaging_Module_File_Changes.docx`,
    `Bivio_Profiles_Module_File_Changes.docx`,
    `Bivio_Payments_Module_File_Changes.docx`,
    `Bivio_Admin_Module_File_Changes.docx`,
    `Bivio_GapClosing_Pass_File_Changes.docx`
12. `SETUP_GUIDE.md` — one-time setup (Docker/Postgres/Redis/env/migrate/
    seed) + the repeatable "connect a new module" workflow
13. This file — `BIVIO_COMPLETE_REFERENCE.md`

**The most current, authoritative versions are:** `bivio_schema.prisma`
(schema) + the final `bivio-backend-skeleton.zip` (code) + this reference
document (decisions). `BIVIO_DEV_SPEC.md` and `BIVIO_FRONTEND_AUDIT.md` are
historical — useful for the reasoning, superseded in specifics by what was
actually built.

---

## 17. Immediate Next Steps

1. **You send:** the final backend zip + final frontend zip, in a new chat
2. **I validate:** every flow end-to-end, cross-checked against everything
   in this reference — TypeScript errors, structural consistency, state
   machine coverage, the frontend rewiring status per page (which pages
   still call `recruiterState`/inline mocks vs. real RTK Query hooks)
3. **Known frontend work still outstanding** (from the audit, not yet
   applied): OQ-1's wizard payment-step correction, OQ-5/7/8/13's UI fixes,
   and rewiring the remaining pages beyond `/recruiter/jobs` onto RTK Query
   hooks module-by-module as each backend module gets connected
4. **The AI matching worker** — separate build, Python/FastAPI, feature
   engineering → heuristic baseline → gradient-boosted model, whenever
   you're ready to start that thread

---

*End of reference. For literal code, see the schema file and backend zip.
For literal design conversation on any topic not covered densely enough
above, the original chat history remains the source of truth — this
document is the index into it, not a replacement for it.*
