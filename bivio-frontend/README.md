# Bivio Frontend

Dual-mode talent platform frontend — Next.js 15 · TypeScript · MUI v6 · Redux Toolkit + RTK Query.

Runs fully on mock data with **zero backend required**, but every page consumes data through
RTK Query hooks exactly as it will in production. The mock/real decision is made in ONE file.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Log in via the demo chips on /login (Candidate / Recruiter / Admin) to tour each role.

## Architecture — the seam

```
page → RTK Query hook → endpoint definition → switchableBaseQuery
                                                     │
                                NEXT_PUBLIC_USE_MOCKS ?
                                     │                     │
                              src/mocks/mockRouter    real fetchBaseQuery → backend
```

- `src/types/index.ts` — canonical domain types. Money = strings, dates = ISO. Mock fixtures
  are typed against these, so fixture drift fails `tsc`, not production.
- `src/store/api/switchableBaseQuery.ts` — THE SEAM. The only file that knows mocks exist.
- `src/mocks/` — fixtures + URL-pattern router. Delete this folder at swap time.
- `src/components/ui/QueryBoundary.tsx` — standard loading / error / empty handling, so real
  network latency and failures surface correctly after the swap with no page changes.

## Going live when the backend is ready

1. In `.env.local`: set `NEXT_PUBLIC_USE_MOCKS="false"` and point `NEXT_PUBLIC_API_URL` at the API.
2. Delete `src/mocks/`.
3. In `switchableBaseQuery.ts`, remove the mock import + branch (or replace the file with
   `export const switchableBaseQuery = realBaseQuery`).

No page, component, hook or endpoint definition changes. 44 endpoints are already defined
against the real API contract in `src/store/api/*Api.ts`.

## Demo entry points

| Role | Route | Shows |
|---|---|---|
| Public | `/jobs`, `/jobs/job-1` | Listing with filters, job detail, apply |
| Candidate | `/dashboard`, `/applications`, `/contracts/con-1` | Stage tracking, milestone fund / submit / approve |
| Recruiter | `/recruiter/jobs/job-1/pipeline` | dnd-kit kanban with optimistic stage moves |
| Recruiter | `/recruiter/jobs/job-1/candidates` | AI-ranked shortlist with score breakdown |
| Admin | `/admin/disputes` | Split-validation resolution dialog |

Mock latency is configurable via `NEXT_PUBLIC_MOCK_LATENCY` (ms) so loading skeletons are
actually exercised during development.
