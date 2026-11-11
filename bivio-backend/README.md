# Bivio Backend

Node.js 20 + TypeScript + Express + Prisma + PostgreSQL. Generated from
`BIVIO_FRONTEND_AUDIT.md` and the OQ-1..OQ-13 decisions — see the comments at
the top of `prisma/schema.prisma` for exactly which decisions shaped which
tables.

## What's actually implemented vs. stubbed

This is a **skeleton**, not a finished backend — per the module-by-module plan,
each module gets built out for real one at a time. Right now:

| Fully implemented | Stubbed (returns 501, ready to fill in) |
|---|---|
| Auth — register/login/refresh/logout/verify-email/forgot+reset-password | Job mutations (create/edit/publish/stages/weightage/close/cancel/duplicate) |
| `GET /jobs`, `GET /jobs/:id`, `GET /recruiter/jobs` | Applications write-side, invitations, offers, interviews (**entirely missing**) |
| `GET /jobs/:id/candidates` (reads precomputed match scores) | Proposals write-side, contract detail, milestone fund/submit/approve/dispute |
| `GET /candidates/me`, `GET /recruiters/me`, `GET /skills` | Profile saves, resume upload, portfolio CRUD |
| `GET /wallet`, `GET /wallet/transactions` | Payouts, payment webhook |
| `GET/PATCH /notifications` | Chat (rooms, messages, Socket.IO send handler) |
| `GET/PUT /admin/settings`, `GET /admin/financials` | Disputes resolve/escalate, verifications, user moderation, user detail |

Every stubbed route already exists with the correct path, method, and
auth/role guard — it just returns `501 { error: 'NOT_IMPLEMENTED' }` with a
comment pointing at the relevant audit section. Building a module means
replacing the stub with real controller → service → repository logic,
following the pattern in `src/modules/auth/`.

## Setup

```bash
npm install
cp .env.example .env    # fill in DATABASE_URL, JWT secrets at minimum
npx prisma migrate dev --name init   # applies schema.prisma
```

Then paste `prisma/migrations/00000000000000_init/migration.sql`'s contents
into the newly-generated migration **before** the `migrate dev` command
finishes creating it — or, simpler, run `migrate dev --create-only` first,
paste the constraints in, then run `migrate dev` again. Prisma's schema
language cannot express partial unique indexes or CHECK constraints, so this
step is not optional; skipping it means the integrity rules silently don't
exist.

```bash
npm run seed      # platform settings, skills, 3 demo accounts
npm run dev       # http://localhost:4000
```

Demo logins (password `Password123!` for all three):
- `aarav@example.com` — candidate
- `priya@acme.example` — recruiter (posting fee pre-paid, payment verified)
- `admin@bivio.example` — admin

## Build order

Matches the frontend audit's module list, in the order each unlocks the next
meaningful demo:

1. **Auth** — done
2. **Jobs** — mutations (create/publish/stages/weightage). Note OQ-1: publish
   checks `RecruiterProfile.postingFeePaid` once, not a per-job payment flow.
3. **Freelance escrow flow** — proposals → accept → contract → milestones →
   fund → submit → approve. This is the centerpiece transaction
   (`src/modules/freelance/`, the `approve` route's comment points at the
   exact atomicity requirements).
4. **Chat** — needed for the freelance flow's dispute evidence trail.
5. **Full-time hiring** — applications, invitations, offers, interviews.
6. **AI matching worker** — built separately, per your instruction. This
   backend only needs to read whatever it writes to `match_scores`.
7. **Admin** — disputes, verifications, user moderation.
8. **Reviews, notifications polish.**

## Known gaps carried over from the audit (not yet resolved)

- **OQ-3** ("Force Complete Project" button on the candidate contract page)
  has no backend support here — treated as a debug-only frontend artifact per
  the default applied. If it was meant to be real, say so and I'll add it.
- **Frontend rewiring**: 43 of the 52 frontend pages still call
  `recruiterState.ts` (localStorage) or inline mock arrays instead of RTK
  Query hooks. Each module's "done" checklist includes rewiring its
  corresponding page(s) — this isn't purely a backend task.
- **AI scoring worker** is intentionally out of scope here, per your
  instruction to build it separately.
