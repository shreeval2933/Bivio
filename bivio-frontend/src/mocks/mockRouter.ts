// ============================================================================
// MOCK ROUTER — delete this folder when the backend is live.
//
// Maps `METHOD /path` to a fixture. The patterns here are the SAME paths the
// endpoint definitions use, so if a route is renamed in one place and not the
// other you get a loud 404 in development rather than a silent bug after the
// swap.
// ============================================================================

import * as F from './fixtures';

interface MockRequest {
  url: string;
  method: string;
  params?: Record<string, unknown>;
  body?: unknown;
}

type Handler = (ctx: {
  params: Record<string, string>;
  query: Record<string, unknown>;
  body: any;
}) => unknown;

/** `/jobs/:id/candidates` -> regex + param names */
function compile(pattern: string): { re: RegExp; keys: string[] } {
  const keys: string[] = [];
  const source = pattern
    .replace(/\/:([A-Za-z0-9_]+)/g, (_m, k) => {
      keys.push(k);
      return '/([^/]+)';
    })
    .replace(/\//g, '\\/');
  return { re: new RegExp(`^${source}$`), keys };
}

const routes: Array<{ method: string; pattern: string; handler: Handler }> = [
  // ── Auth (demo accounts — role resolved by email) ─────────────────────────
  {
    method: 'POST', pattern: '/auth/login',
    handler: ({ body }) => {
      const email = String(body?.email ?? '').toLowerCase();
      const user =
        email === 'priya@acme.example' ? F.CURRENT_RECRUITER_USER :
        email === 'admin@bivio.example' ? F.CURRENT_ADMIN_USER :
        F.CURRENT_CANDIDATE_USER;
      return { user, accessToken: `mock-token-${user.role.toLowerCase()}` };
    },
  },
  {
    method: 'POST', pattern: '/auth/register',
    handler: ({ body }) => {
      const role = body?.role === 'RECRUITER' ? 'RECRUITER' : 'CANDIDATE';
      const base = role === 'RECRUITER' ? F.CURRENT_RECRUITER_USER : F.CURRENT_CANDIDATE_USER;
      const user = {
        ...base,
        fullName: String(body?.fullName ?? base.fullName),
        email: String(body?.email ?? base.email),
      };
      return { user, accessToken: `mock-token-${role.toLowerCase()}` };
    },
  },
  { method: 'POST', pattern: '/auth/logout', handler: () => ({ ok: true }) },
  { method: 'POST', pattern: '/auth/verify-email', handler: () => ({ ok: true }) },
  { method: 'POST', pattern: '/auth/forgot-password', handler: () => ({ ok: true }) },
  { method: 'POST', pattern: '/auth/reset-password', handler: () => ({ ok: true }) },

  // ── Jobs ──────────────────────────────────────────────────────────────────
  {
    method: 'GET', pattern: '/jobs',
    handler: ({ query }) => {
      let rows = F.JOBS.filter((j) => j.status === 'OPEN');
      if (query.jobType) rows = rows.filter((j) => j.jobType === query.jobType);
      if (query.isRemote === true || query.isRemote === 'true') rows = rows.filter((j) => j.isRemote);
      if (query.location) {
        const loc = String(query.location).toLowerCase();
        rows = rows.filter((j) => (j.location ?? '').toLowerCase().includes(loc));
      }
      if (query.q) {
        const q = String(query.q).toLowerCase();
        rows = rows.filter(
          (j) =>
            j.title.toLowerCase().includes(q) ||
            j.skills.some((s) => s.skill.name.toLowerCase().includes(q)),
        );
      }
      return F.paginate(rows, Number(query.page ?? 1), Number(query.limit ?? 20));
    },
  },
  { method: 'GET', pattern: '/jobs/:id', handler: ({ params }) => F.JOBS.find((j) => j.id === params.id) },
  { method: 'POST', pattern: '/jobs', handler: () => F.JOBS[4] },
  { method: 'POST', pattern: '/jobs/:id/publish', handler: () => ({ ok: true, paymentIntentUrl: '#mock-payment' }) },
  {
    method: 'GET', pattern: '/jobs/:id/candidates',
    handler: ({ params }) => F.MATCH_SCORES.filter((m) => m.jobId === params.id),
  },
  {
    method: 'GET', pattern: '/recruiter/jobs',
    handler: () => F.paginate(F.JOBS, 1, 50),
  },

  // ── Applications ──────────────────────────────────────────────────────────
  {
    method: 'GET', pattern: '/applications',
    handler: ({ query }) => {
      let rows = F.APPLICATIONS;
      if (query.jobId) rows = rows.filter((a) => a.jobId === query.jobId);
      if (query.mine) rows = rows.filter((a) => a.candidateId === 'cand-1');
      return F.paginate(rows, Number(query.page ?? 1), Number(query.limit ?? 20));
    },
  },
  { method: 'GET', pattern: '/applications/:id', handler: ({ params }) => F.APPLICATIONS.find((a) => a.id === params.id) },
  {
    method: 'PATCH', pattern: '/applications/:id/stage',
    handler: ({ params, body }) => {
      const app = F.APPLICATIONS.find((a) => a.id === params.id);
      return app ? { ...app, currentStageId: body?.toStageId ?? app.currentStageId } : undefined;
    },
  },
  { method: 'PATCH', pattern: '/applications/:id/withdraw', handler: ({ params }) => ({ ...F.APPLICATIONS.find((a) => a.id === params.id), status: 'WITHDRAWN' }) },
  { method: 'POST', pattern: '/jobs/:id/apply', handler: () => F.APPLICATIONS[0] },
  { method: 'GET', pattern: '/invitations', handler: () => F.INVITATIONS },
  { method: 'GET', pattern: '/offers', handler: () => F.OFFERS },

  // ── Proposals & contracts ─────────────────────────────────────────────────
  {
    method: 'GET', pattern: '/proposals',
    handler: ({ query }) => {
      let rows = F.PROPOSALS;
      if (query.jobId) rows = rows.filter((p) => p.jobId === query.jobId);
      if (query.mine) rows = rows.filter((p) => p.candidateId === 'cand-1');
      return F.paginate(rows, Number(query.page ?? 1), Number(query.limit ?? 20));
    },
  },
  { method: 'POST', pattern: '/jobs/:id/proposals', handler: () => F.PROPOSALS[2] },
  { method: 'PATCH', pattern: '/proposals/:id/shortlist', handler: ({ params }) => ({ ...F.PROPOSALS.find((p) => p.id === params.id), status: 'SHORTLISTED' }) },
  { method: 'POST', pattern: '/proposals/:id/accept', handler: () => F.CONTRACTS[0] },
  { method: 'GET', pattern: '/contracts', handler: () => F.paginate(F.CONTRACTS) },
  { method: 'GET', pattern: '/contracts/:id', handler: ({ params }) => F.CONTRACTS.find((c) => c.id === params.id) },

  // ── Milestones ────────────────────────────────────────────────────────────
  { method: 'POST', pattern: '/milestones/:id/fund', handler: () => ({ paymentIntentUrl: '#mock-escrow-funding' }) },
  { method: 'POST', pattern: '/milestones/:id/submit', handler: ({ params }) => ({ ok: true, milestoneId: params.id }) },
  { method: 'POST', pattern: '/milestones/:id/approve', handler: ({ params }) => ({ ok: true, milestoneId: params.id }) },
  { method: 'POST', pattern: '/milestones/:id/request-revision', handler: ({ params }) => ({ ok: true, milestoneId: params.id }) },

  // ── Money ─────────────────────────────────────────────────────────────────
  { method: 'GET', pattern: '/wallet', handler: () => F.WALLET },
  { method: 'GET', pattern: '/wallet/transactions', handler: () => F.paginate(F.TRANSACTIONS, 1, 50) },
  { method: 'POST', pattern: '/payouts', handler: () => ({ ok: true, payoutId: 'pay-new' }) },

  // ── Messaging ─────────────────────────────────────────────────────────────
  { method: 'GET', pattern: '/chat/rooms', handler: () => F.CHAT_ROOMS },
  { method: 'GET', pattern: '/chat/rooms/:id/messages', handler: ({ params }) => F.CHAT_MESSAGES.filter((m) => m.roomId === params.id) },
  { method: 'POST', pattern: '/chat/rooms/:id/messages', handler: ({ params, body }) => ({ id: `msg-${Date.now()}`, roomId: params.id, body: body?.body ?? '', sentAt: new Date().toISOString(), isRead: false, sender: { id: 'usr-cand-1', fullName: 'Aarav Sharma', profileImage: null } }) },
  { method: 'GET', pattern: '/notifications', handler: () => F.NOTIFICATIONS },
  { method: 'PATCH', pattern: '/notifications/:id/read', handler: ({ params }) => ({ ok: true, id: params.id }) },
  { method: 'PATCH', pattern: '/notifications/read-all', handler: () => ({ ok: true }) },

  // ── Profile ───────────────────────────────────────────────────────────────
  { method: 'GET', pattern: '/me', handler: () => F.CURRENT_CANDIDATE_USER },
  { method: 'GET', pattern: '/candidates/me', handler: () => F.CANDIDATE_PROFILE },
  { method: 'GET', pattern: '/skills', handler: () => F.SKILLS },

  // ── Admin ─────────────────────────────────────────────────────────────────
  {
    method: 'GET', pattern: '/admin/disputes',
    handler: ({ query }) => (query.status ? F.DISPUTES.filter((d) => d.status === query.status) : F.DISPUTES),
  },
  { method: 'POST', pattern: '/admin/disputes/:id/resolve', handler: ({ params }) => ({ ...F.DISPUTES.find((d) => d.id === params.id), status: 'RESOLVED' }) },
  { method: 'PATCH', pattern: '/admin/disputes/:id/assign', handler: ({ params }) => ({ ...F.DISPUTES.find((d) => d.id === params.id), status: 'UNDER_REVIEW' }) },
  { method: 'GET', pattern: '/admin/users', handler: ({ query }) => F.paginate(F.PLATFORM_USERS, Number(query.page ?? 1), Number(query.limit ?? 25)) },
  { method: 'POST', pattern: '/admin/users/:id/moderate', handler: ({ params }) => ({ ok: true, id: params.id }) },
  { method: 'GET', pattern: '/admin/financials', handler: () => F.REVENUE },
  { method: 'GET', pattern: '/admin/settings', handler: () => F.SETTINGS },
  { method: 'PUT', pattern: '/admin/settings/:key', handler: ({ params, body }) => ({ key: params.key, value: String(body?.value ?? ''), description: null, updatedAt: new Date().toISOString() }) },
];

const compiled = routes.map((r) => ({ ...r, ...compile(r.pattern) }));

export function mockRouter({ url, method, params, body }: MockRequest): unknown {
  const path = url.split('?')[0];
  for (const route of compiled) {
    if (route.method !== method) continue;
    const m = route.re.exec(path);
    if (!m) continue;
    const pathParams: Record<string, string> = {};
    route.keys.forEach((k, i) => (pathParams[k] = decodeURIComponent(m[i + 1])));
    return route.handler({
      params: pathParams,
      query: (params ?? {}) as Record<string, unknown>,
      body,
    });
  }
  return undefined;
}
