// ============================================================================
// MOCK FIXTURES — delete this entire folder when the backend is live.
//
// Every fixture is explicitly typed against the canonical domain types.
// If a fixture's shape drifts from the API contract, `tsc` fails here rather
// than at runtime after the swap. That type annotation is the safety net —
// do not remove it or replace it with `as`.
// ============================================================================

import type {
  Job, Company, Skill, JobSkill, HiringStage, AIWeightage,
  CandidateProfile, RecruiterProfile, User, MatchScore,
  Application, StageMovement, Proposal, Contract, Milestone,
  Wallet, WalletTransaction, AppNotification, ChatRoom, ChatMessage,
  Dispute, RevenueSummary, PlatformSetting, Invitation, Offer,
  Paginated,
} from '@/types';

const iso = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString();

// ── Skills ───────────────────────────────────────────────────────────────────

export const SKILLS: Skill[] = [
  { id: 'sk-1', name: 'React', category: 'Frontend' },
  { id: 'sk-2', name: 'TypeScript', category: 'Language' },
  { id: 'sk-3', name: 'Node.js', category: 'Backend' },
  { id: 'sk-4', name: 'PostgreSQL', category: 'Database' },
  { id: 'sk-5', name: 'Prisma', category: 'Backend' },
  { id: 'sk-6', name: 'Next.js', category: 'Frontend' },
  { id: 'sk-7', name: 'Redis', category: 'Database' },
  { id: 'sk-8', name: 'Docker', category: 'DevOps' },
  { id: 'sk-9', name: 'Python', category: 'Language' },
  { id: 'sk-10', name: 'Figma', category: 'Design' },
];

const jobSkill = (id: string, skillId: string, mandatory = false): JobSkill => ({
  id,
  skillId,
  isMandatory: mandatory,
  weight: mandatory ? 30 : 15,
  skill: SKILLS.find((s) => s.id === skillId)!,
});

// ── Companies ────────────────────────────────────────────────────────────────

export const COMPANIES: Company[] = [
  { id: 'co-1', name: 'Acme Corp', website: 'https://acme.example', logoUrl: null, industry: 'Software', isVerified: true },
  { id: 'co-2', name: 'Nexus Talent AI', website: 'https://nexus.example', logoUrl: null, industry: 'AI/ML', isVerified: true },
  { id: 'co-3', name: 'Bivio FinTech Labs', website: null, logoUrl: null, industry: 'FinTech', isVerified: false },
];

// ── Users & profiles ─────────────────────────────────────────────────────────

export const CURRENT_CANDIDATE_USER: User = {
  id: 'usr-cand-1',
  fullName: 'Aarav Sharma',
  email: 'aarav@example.com',
  role: 'CANDIDATE',
  profileImage: null,
  isVerified: true,
  accountStatus: 'ACTIVE',
  createdAt: iso(240),
};

export const CURRENT_RECRUITER_USER: User = {
  id: 'usr-rec-1',
  fullName: 'Priya Menon',
  email: 'priya@acme.example',
  role: 'RECRUITER',
  profileImage: null,
  isVerified: true,
  accountStatus: 'ACTIVE',
  createdAt: iso(300),
};

export const CURRENT_ADMIN_USER: User = {
  id: 'usr-adm-1',
  fullName: 'Ops Admin',
  email: 'admin@bivio.example',
  role: 'ADMIN',
  profileImage: null,
  isVerified: true,
  accountStatus: 'ACTIVE',
  createdAt: iso(400),
};

export const CANDIDATE_PROFILE: CandidateProfile = {
  id: 'cand-1',
  userId: 'usr-cand-1',
  headline: 'Full Stack Engineer · React + Node.js',
  summary:
    'Six years building product-facing web applications. Comfortable owning a feature from schema design through to shipped UI.',
  location: 'Jodhpur, India',
  experienceYears: '6.0',
  highestEducation: 'B.Tech Computer Science',
  openToFullTime: true,
  openToFreelance: true,
  fullTimeFeePaid: true,
  user: CURRENT_CANDIDATE_USER,
  skills: [
    { id: 'cs-1', skillId: 'sk-1', proficiency: 5, yearsOfExperience: '5.0', skill: SKILLS[0] },
    { id: 'cs-2', skillId: 'sk-2', proficiency: 5, yearsOfExperience: '4.5', skill: SKILLS[1] },
    { id: 'cs-3', skillId: 'sk-3', proficiency: 4, yearsOfExperience: '5.0', skill: SKILLS[2] },
    { id: 'cs-4', skillId: 'sk-4', proficiency: 4, yearsOfExperience: '3.0', skill: SKILLS[3] },
  ],
  resumes: [
    { id: 'res-2', version: 2, fileName: 'aarav-sharma-v2.pdf', fileUrl: '#', isPrimary: true, uploadedAt: iso(12) },
    { id: 'res-1', version: 1, fileName: 'aarav-sharma-v1.pdf', fileUrl: '#', isPrimary: false, uploadedAt: iso(90) },
  ],
  portfolio: {
    id: 'pf-1',
    bio: 'Freelance full-stack work, mostly greenfield SaaS dashboards.',
    hourlyRate: '2500.00',
    currency: 'INR',
    portfolioUrl: 'https://aarav.example',
    githubUrl: 'https://github.com/example',
    linkedinUrl: null,
    isAvailable: true,
    hideEarnings: false,
    avgRating: '4.80',
    totalContracts: 7,
    projects: [
      {
        id: 'prj-1',
        title: 'Logistics tracking dashboard',
        description: 'Real-time fleet map with WebSocket updates for 400 vehicles.',
        role: 'Lead frontend',
        repositoryUrl: null,
        liveUrl: 'https://example.com',
        clientNamePrivate: false,
        isFeatured: true,
        completedOn: iso(120),
        skills: [SKILLS[0], SKILLS[1]],
      },
    ],
  },
};

export const OTHER_CANDIDATES: CandidateProfile[] = [
  {
    id: 'cand-2', userId: 'usr-cand-2', headline: 'Senior Backend Engineer',
    location: 'Bengaluru, India', experienceYears: '8.0', highestEducation: 'M.Tech',
    openToFullTime: true, openToFreelance: false, fullTimeFeePaid: true,
    user: { id: 'usr-cand-2', fullName: 'Rhea Kapoor', email: 'rhea@example.com', role: 'CANDIDATE', isVerified: true, accountStatus: 'ACTIVE' },
  },
  {
    id: 'cand-3', userId: 'usr-cand-3', headline: 'Frontend Engineer · Design Systems',
    location: 'Remote', experienceYears: '4.0', highestEducation: 'B.E.',
    openToFullTime: true, openToFreelance: true, fullTimeFeePaid: false,
    user: { id: 'usr-cand-3', fullName: 'Dev Patel', email: 'dev@example.com', role: 'CANDIDATE', isVerified: true, accountStatus: 'ACTIVE' },
  },
  {
    id: 'cand-4', userId: 'usr-cand-4', headline: 'Platform Engineer',
    location: 'Pune, India', experienceYears: '7.0', highestEducation: 'B.Tech',
    openToFullTime: true, openToFreelance: true, fullTimeFeePaid: true,
    user: { id: 'usr-cand-4', fullName: 'Ishaan Rao', email: 'ishaan@example.com', role: 'CANDIDATE', isVerified: false, accountStatus: 'ACTIVE' },
  },
];

export const RECRUITER_PROFILE: RecruiterProfile = {
  id: 'rec-1',
  userId: 'usr-rec-1',
  designation: 'Head of Talent',
  isSolo: false,
  postingFeePaid: true,
  paymentMethodVerified: true,
  idVerified: false,
  kycStatus: 'NOT_STARTED',
  user: CURRENT_RECRUITER_USER,
  company: COMPANIES[0],
};

// ── Hiring stages & weightage ────────────────────────────────────────────────

const stagesFor = (jobId: string): HiringStage[] => [
  { id: `${jobId}-st-1`, jobId, name: 'Screening', sequence: 1, stageType: 'SCREENING', isTerminal: false },
  { id: `${jobId}-st-2`, jobId, name: 'Technical Round', sequence: 2, stageType: 'CUSTOM', isTerminal: false },
  { id: `${jobId}-st-3`, jobId, name: 'Manager Round', sequence: 3, stageType: 'INTERVIEW', isTerminal: false },
  { id: `${jobId}-st-4`, jobId, name: 'Offer', sequence: 4, stageType: 'OFFER', isTerminal: true },
];

// One shape covers both job types — unused factors are zeroed depending on
// jobType, matching the real AIWeightage table's sum-to-100 constraint.
const WEIGHTAGE: AIWeightage = {
  id: 'wt-1',
  skillWeight: 40, experienceWeight: 30, educationWeight: 15, domainWeight: 10, practicalFitWeight: 5,
  portfolioWeight: 0, rateFitWeight: 0, trackRecordWeight: 0, availabilityWeight: 0,
};

// ── Jobs ─────────────────────────────────────────────────────────────────────

export const JOBS: Job[] = [
  {
    id: 'job-1',
    recruiterId: 'rec-1',
    title: 'Senior Full Stack Engineer (React + Node.js)',
    description:
      'Own end-to-end delivery of customer-facing features. You will work across a Next.js frontend and a Node/Prisma backend, and be involved in schema design as well as UI.',
    jobType: 'FULL_TIME',
    location: 'Bengaluru, India',
    isRemote: true,
    salaryMin: '2500000.00',
    salaryMax: '3500000.00',
    budget: null,
    budgetType: null,
    salaryVisible: true,
    currency: 'INR',
    status: 'OPEN',
    vacancies: 2,
    deadline: iso(-30),
    publishedAt: iso(6),
    createdAt: iso(8),
    company: COMPANIES[0],
    recruiter: RECRUITER_PROFILE,
    skills: [jobSkill('js-1', 'sk-1', true), jobSkill('js-2', 'sk-2', true), jobSkill('js-3', 'sk-3'), jobSkill('js-4', 'sk-4')],
    weightage: WEIGHTAGE,
    hiringStages: stagesFor('job-1'),
    applicantCount: 24,
  },
  {
    id: 'job-2',
    recruiterId: 'rec-1',
    title: 'Escrow & Payments Backend Architect',
    description:
      'Design and build the milestone-escrow ledger: row-level locking, double-entry transactions, gateway reconciliation. Fixed-scope engagement across three milestones.',
    jobType: 'FREELANCE',
    location: 'Remote',
    isRemote: true,
    salaryMin: null,
    salaryMax: null,
    budget: '450000.00',
    budgetType: 'FIXED',
    salaryVisible: true,
    currency: 'INR',
    status: 'OPEN',
    vacancies: 1,
    deadline: iso(-14),
    publishedAt: iso(3),
    createdAt: iso(4),
    company: COMPANIES[2],
    recruiter: RECRUITER_PROFILE,
    skills: [jobSkill('js-5', 'sk-3', true), jobSkill('js-6', 'sk-5', true), jobSkill('js-7', 'sk-7')],
    weightage: WEIGHTAGE,
    hiringStages: [],
    proposalCount: 11,
  },
  {
    id: 'job-3',
    recruiterId: 'rec-1',
    title: 'Lead AI Matching System Engineer',
    description:
      'Build the candidate-to-job scoring engine: feature extraction from resumes, configurable weightings, and an explainable score breakdown.',
    jobType: 'FULL_TIME',
    location: 'Mumbai, India',
    isRemote: false,
    salaryMin: '3000000.00',
    salaryMax: '4200000.00',
    budget: null,
    budgetType: null,
    salaryVisible: true,
    currency: 'INR',
    status: 'OPEN',
    vacancies: 1,
    deadline: null,
    publishedAt: iso(11),
    createdAt: iso(12),
    company: COMPANIES[1],
    recruiter: RECRUITER_PROFILE,
    skills: [jobSkill('js-8', 'sk-9', true), jobSkill('js-9', 'sk-3'), jobSkill('js-10', 'sk-4')],
    weightage: WEIGHTAGE,
    hiringStages: stagesFor('job-3'),
    applicantCount: 9,
  },
  {
    id: 'job-4',
    recruiterId: 'rec-1',
    title: 'Design System Refresh (Figma → MUI)',
    description:
      'Audit the existing component library and deliver a themed MUI implementation with tokens, dark mode and documentation.',
    jobType: 'FREELANCE',
    location: 'Remote',
    isRemote: true,
    salaryMin: null,
    salaryMax: null,
    budget: '3500.00',
    budgetType: 'HOURLY',
    salaryVisible: true,
    currency: 'INR',
    status: 'OPEN',
    vacancies: 1,
    deadline: null,
    publishedAt: iso(1),
    createdAt: iso(2),
    company: COMPANIES[0],
    recruiter: RECRUITER_PROFILE,
    skills: [jobSkill('js-11', 'sk-10', true), jobSkill('js-12', 'sk-1')],
    weightage: WEIGHTAGE,
    hiringStages: [],
    proposalCount: 5,
  },
  {
    id: 'job-5',
    recruiterId: 'rec-1',
    title: 'DevOps Engineer — Kubernetes & CI/CD',
    description: 'Own the deployment pipeline, observability stack and cost optimisation.',
    jobType: 'FULL_TIME',
    location: 'Hyderabad, India',
    isRemote: true,
    salaryMin: '1800000.00',
    salaryMax: '2600000.00',
    budget: null,
    budgetType: null,
    salaryVisible: true,
    currency: 'INR',
    status: 'DRAFT',
    vacancies: 1,
    deadline: null,
    publishedAt: null,
    createdAt: iso(1),
    company: COMPANIES[0],
    recruiter: RECRUITER_PROFILE,
    skills: [jobSkill('js-13', 'sk-8', true)],
    weightage: WEIGHTAGE,
    hiringStages: stagesFor('job-5'),
    applicantCount: 0,
  },
];

// ── Match scores (AI shortlist) ──────────────────────────────────────────────

export const MATCH_SCORES: MatchScore[] = [
  {
    id: 'ms-1', jobId: 'job-1', candidateId: 'cand-1', score: '92.50',
    breakdown: { skill: { score: 38, max: 40 }, experience: { score: 27, max: 30 }, education: { score: 13, max: 15 }, domain: { score: 14.5, max: 15 } },
    modelVersion: 'v1', isCurrent: true, computedAt: iso(5),
    candidate: CANDIDATE_PROFILE,
    application: { id: 'app-1', status: 'IN_PROGRESS', currentStageId: 'job-1-st-2' },
  },
  {
    id: 'ms-2', jobId: 'job-1', candidateId: 'cand-2', score: '87.00',
    breakdown: { skill: { score: 33, max: 40 }, experience: { score: 30, max: 30 }, education: { score: 12, max: 15 }, domain: { score: 12, max: 15 } },
    modelVersion: 'v1', isCurrent: true, computedAt: iso(5),
    candidate: OTHER_CANDIDATES[0], application: null,
  },
  {
    id: 'ms-3', jobId: 'job-1', candidateId: 'cand-3', score: '74.25',
    breakdown: { skill: { score: 30, max: 40 }, experience: { score: 18, max: 30 }, education: { score: 12, max: 15 }, domain: { score: 14.25, max: 15 } },
    modelVersion: 'v1', isCurrent: true, computedAt: iso(5),
    candidate: OTHER_CANDIDATES[1],
    application: { id: 'app-3', status: 'APPLIED', currentStageId: 'job-1-st-1' },
  },
  {
    id: 'ms-4', jobId: 'job-1', candidateId: 'cand-4', score: '68.00',
    breakdown: { skill: { score: 24, max: 40 }, experience: { score: 26, max: 30 }, education: { score: 10, max: 15 }, domain: { score: 8, max: 15 } },
    modelVersion: 'v1', isCurrent: true, computedAt: iso(5),
    candidate: OTHER_CANDIDATES[2], application: null,
  },
];

// ── Applications ─────────────────────────────────────────────────────────────

const movements = (appId: string): StageMovement[] => [
  {
    id: `${appId}-mv-1`, applicationId: appId, fromStage: null,
    toStage: { id: 'job-1-st-1', name: 'Screening' },
    movedBy: { id: 'usr-rec-1', fullName: 'Priya Menon' },
    note: 'Auto-placed on application', movedAt: iso(5),
  },
  {
    id: `${appId}-mv-2`, applicationId: appId,
    fromStage: { id: 'job-1-st-1', name: 'Screening' },
    toStage: { id: 'job-1-st-2', name: 'Technical Round' },
    movedBy: { id: 'usr-rec-1', fullName: 'Priya Menon' },
    note: 'Strong portfolio, moving forward', movedAt: iso(2),
  },
];

export const APPLICATIONS: Application[] = [
  {
    id: 'app-1', jobId: 'job-1', candidateId: 'cand-1', currentStageId: 'job-1-st-2',
    resumeId: 'res-2', status: 'IN_PROGRESS', source: 'DIRECT', snapshotAiScore: '92.50',
    coverNote: 'Excited about the escrow ledger work.', appliedAt: iso(5),
    job: { id: 'job-1', title: JOBS[0].title, jobType: 'FULL_TIME', company: COMPANIES[0] },
    candidate: CANDIDATE_PROFILE,
    currentStage: stagesFor('job-1')[1],
    movements: movements('app-1'),
  },
  {
    id: 'app-2', jobId: 'job-2', candidateId: 'cand-1', currentStageId: 'job-2-st-1',
    resumeId: 'res-2', status: 'APPLIED', source: 'INVITED', snapshotAiScore: '81.00',
    coverNote: null, appliedAt: iso(1),
    job: { id: 'job-2', title: JOBS[1].title, jobType: 'FREELANCE', company: COMPANIES[0] },
    candidate: CANDIDATE_PROFILE,
    currentStage: { id: 'job-2-st-1', jobId: 'job-2', name: 'Proposed', sequence: 1, stageType: 'CUSTOM', isTerminal: false },
    movements: [],
  },
  {
    id: 'app-3', jobId: 'job-1', candidateId: 'cand-3', currentStageId: 'job-1-st-1',
    resumeId: null, status: 'APPLIED', source: 'DIRECT', snapshotAiScore: '74.25',
    coverNote: null, appliedAt: iso(3),
    job: { id: 'job-1', title: JOBS[0].title, jobType: 'FULL_TIME', company: COMPANIES[0] },
    candidate: OTHER_CANDIDATES[1],
    currentStage: stagesFor('job-1')[0],
    movements: [],
  },
  {
    id: 'app-4', jobId: 'job-1', candidateId: 'cand-2', currentStageId: 'job-1-st-3',
    resumeId: null, status: 'IN_PROGRESS', source: 'INVITED', snapshotAiScore: '87.00',
    coverNote: null, appliedAt: iso(7),
    job: { id: 'job-1', title: JOBS[0].title, jobType: 'FULL_TIME', company: COMPANIES[0] },
    candidate: OTHER_CANDIDATES[0],
    currentStage: stagesFor('job-1')[2],
    movements: [],
  },
];

export const INVITATIONS: Invitation[] = [
  {
    id: 'inv-1', jobId: 'job-3', candidateId: 'cand-1', status: 'SENT',
    message: 'Your matching-engine experience looks like a strong fit.',
    expiresAt: iso(2), createdAt: iso(-2),
    job: { id: 'job-3', title: JOBS[2].title, jobType: 'FULL_TIME', company: COMPANIES[1] },
  },
  {
    id: 'inv-2', jobId: 'job-2', candidateId: 'cand-1', status: 'SENT',
    message: 'Your background in design systems looks like a strong fit.',
    expiresAt: iso(5), createdAt: iso(-1),
    job: { id: 'job-2', title: JOBS[1].title, jobType: 'FREELANCE', company: COMPANIES[0] },
  },
];

export const OFFERS: Offer[] = [
  {
    id: 'off-1', applicationId: 'app-4', compensation: '3100000.00', currency: 'INR',
    joiningDate: iso(-45), offerLetterUrl: '#', status: 'SENT',
    expiresAt: iso(-10), createdAt: iso(1),
  },
];

// ── Proposals ────────────────────────────────────────────────────────────────

export const PROPOSALS: Proposal[] = [
  {
    id: 'prop-1', jobId: 'job-2', candidateId: 'cand-1',
    source: 'DIRECT',
    bidAmount: '420000.00', currency: 'INR', durationDays: 45,
    coverLetter: 'I have built escrow ledgers with row-level locking before; happy to walk through the transaction design.',
    status: 'ACCEPTED', submittedAt: iso(10), contractId: 'con-1', matchScore: '90.00',
    job: { id: 'job-2', title: JOBS[1].title, budget: '450000.00', company: COMPANIES[2] },
    candidate: CANDIDATE_PROFILE,
  },
  {
    id: 'prop-2', jobId: 'job-4', candidateId: 'cand-1',
    source: 'DIRECT',
    bidAmount: '3200.00', currency: 'INR', durationDays: 20,
    coverLetter: 'Design-system work is most of what I do. I can start next week.',
    status: 'SHORTLISTED', submittedAt: iso(2), contractId: null, matchScore: '76.50',
    job: { id: 'job-4', title: JOBS[3].title, budget: '3500.00', company: COMPANIES[0] },
    candidate: CANDIDATE_PROFILE,
  },
  {
    id: 'prop-3', jobId: 'job-2', candidateId: 'cand-4',
    source: 'DIRECT',
    bidAmount: '480000.00', currency: 'INR', durationDays: 60,
    coverLetter: 'Platform background, comfortable with BullMQ and Redis.',
    status: 'SUBMITTED', submittedAt: iso(1), contractId: null, matchScore: '71.00',
    job: { id: 'job-2', title: JOBS[1].title, budget: '450000.00', company: COMPANIES[2] },
    candidate: OTHER_CANDIDATES[2],
  },
];

// ── Contract & milestones ────────────────────────────────────────────────────

const MILESTONES: Milestone[] = [
  {
    id: 'ms-a', contractId: 'con-1', title: 'Schema & ledger design',
    description: 'ER model, constraint migration, transaction design document.',
    amount: '140000.00', sequence: 1, dueDate: iso(-5), status: 'PAID',
    approvedAt: iso(8),
    escrow: { id: 'esc-1', milestoneId: 'ms-a', amount: '140000.00', currency: 'INR', status: 'RELEASED', fundedAt: iso(12), releasedAt: iso(8) },
    submissions: [
      { id: 'sub-1', milestoneId: 'ms-a', versionNo: 1, note: 'Initial design doc', status: 'ACCEPTED', feedback: null, submittedAt: iso(9) },
    ],
  },
  {
    id: 'ms-b', contractId: 'con-1', title: 'Escrow release transaction',
    description: 'Row-locked release with fee split and ledger write.',
    amount: '160000.00', sequence: 2, dueDate: iso(-12), status: 'SUBMITTED',
    approvedAt: null,
    escrow: { id: 'esc-2', milestoneId: 'ms-b', amount: '160000.00', currency: 'INR', status: 'HELD', fundedAt: iso(6), releasedAt: null },
    submissions: [
      { id: 'sub-2', milestoneId: 'ms-b', versionNo: 1, note: 'First pass — needs test coverage', status: 'REVISION_REQUESTED', feedback: 'Please add the concurrency test.', submittedAt: iso(3) },
      { id: 'sub-3', milestoneId: 'ms-b', versionNo: 2, note: 'Added concurrent payout test', status: 'SUBMITTED', feedback: null, submittedAt: iso(1) },
    ],
  },
  {
    id: 'ms-c', contractId: 'con-1', title: 'Payout & reconciliation job',
    description: 'Withdrawal flow plus nightly ledger reconciliation.',
    amount: '120000.00', sequence: 3, dueDate: iso(-25), status: 'PENDING',
    approvedAt: null, escrow: null, submissions: [],
  },
];

export const CONTRACTS: Contract[] = [
  {
    id: 'con-1', jobId: 'job-2', proposalId: 'prop-1',
    clientId: 'rec-1', freelancerId: 'cand-1',
    agreedAmount: '420000.00', currency: 'INR', platformFeePercent: '10.00',
    status: 'ACTIVE', startedAt: iso(12), endedAt: null, createdAt: iso(12),
    job: { id: 'job-2', title: JOBS[1].title },
    client: RECRUITER_PROFILE,
    freelancer: CANDIDATE_PROFILE,
    milestones: MILESTONES,
  },
  {
    id: 'con-2', jobId: 'job-2', proposalId: 'prop-2',
    clientId: 'rec-1', freelancerId: 'cand-3',
    agreedAmount: '180000.00', currency: 'INR', platformFeePercent: '10.00',
    status: 'COMPLETED', startedAt: iso(30), endedAt: iso(14), createdAt: iso(30),
    job: { id: 'job-2', title: JOBS[1].title },
    client: RECRUITER_PROFILE,
    freelancer: OTHER_CANDIDATES[1],
    milestones: [
      {
        id: 'ms-x1',
        contractId: 'con-2',
        title: 'Initial Wireframes & Design System',
        description: 'Completed styling framework config',
        amount: '90000.00',
        sequence: 1,
        dueDate: iso(25),
        status: 'PAID',
        submissions: []
      },
      {
        id: 'ms-x2',
        contractId: 'con-2',
        title: 'Fully functional API integrations',
        description: 'Reconciliation tests set',
        amount: '90000.00',
        sequence: 2,
        dueDate: iso(15),
        status: 'PAID',
        submissions: []
      }
    ],
  },
  {
    id: 'con-3', jobId: 'job-2', proposalId: 'prop-3',
    clientId: 'rec-1', freelancerId: 'cand-4',
    agreedAmount: '300000.00', currency: 'INR', platformFeePercent: '10.00',
    status: 'CANCELLED', startedAt: iso(45), endedAt: iso(35), createdAt: iso(45),
    job: { id: 'job-2', title: JOBS[1].title },
    client: RECRUITER_PROFILE,
    freelancer: OTHER_CANDIDATES[2],
    milestones: [
      {
        id: 'ms-y1',
        contractId: 'con-3',
        title: 'Milestone 1 Core Architecture Setup',
        description: 'Setup framework repo',
        amount: '150000.00',
        sequence: 1,
        dueDate: iso(40),
        status: 'PENDING',
        submissions: []
      },
      {
        id: 'ms-y2',
        contractId: 'con-3',
        title: 'Milestone 2 API testing and coverage',
        description: 'Integration test suite config',
        amount: '150000.00',
        sequence: 2,
        dueDate: iso(30),
        status: 'PENDING',
        submissions: []
      }
    ],
  },
  {
    id: 'con-4', jobId: 'job-2', proposalId: 'prop-4',
    clientId: 'rec-1', freelancerId: 'cand-2',
    agreedAmount: '600000.00', currency: 'INR', platformFeePercent: '10.00',
    status: 'ACTIVE', startedAt: iso(5), endedAt: null, createdAt: iso(5),
    job: { id: 'job-2', title: JOBS[1].title },
    client: RECRUITER_PROFILE,
    freelancer: OTHER_CANDIDATES[0],
    milestones: [
      {
        id: 'ms-z1',
        contractId: 'con-4',
        title: 'Backend Database schema deployment',
        description: 'Complete PostgreSQL DB configuration and deployment',
        amount: '300000.00',
        sequence: 1,
        dueDate: iso(-10),
        status: 'PAID',
        submissions: []
      },
      {
        id: 'ms-z2',
        contractId: 'con-4',
        title: 'Kafka event streaming setup',
        description: 'Implement real-time streaming integration',
        amount: '300000.00',
        sequence: 2,
        dueDate: iso(10),
        status: 'PENDING',
        submissions: []
      }
    ],
  },
];

// ── Money ────────────────────────────────────────────────────────────────────

export const WALLET: Wallet = {
  id: 'wal-1', availableBalance: '126000.00', pendingBalance: '144000.00', currency: 'INR',
};

export const TRANSACTIONS: WalletTransaction[] = [
  { id: 'txn-1', direction: 'CREDIT', amount: '126000.00', balanceAfter: '126000.00', referenceType: 'ESCROW', description: 'Milestone released: Schema & ledger design', createdAt: iso(8) },
  { id: 'txn-2', direction: 'DEBIT', amount: '50000.00', balanceAfter: '76000.00', referenceType: 'PAYOUT', description: 'Withdrawal to UPI', createdAt: iso(4) },
  { id: 'txn-3', direction: 'CREDIT', amount: '50000.00', balanceAfter: '126000.00', referenceType: 'PAYOUT', description: 'Payout failed — reversed', createdAt: iso(3) },
];

export const REVENUE: RevenueSummary = {
  totalRevenue: '284500.00',
  currency: 'INR',
  byFeeType: [
    { feeType: 'FREELANCE_COMMISSION', amount: '142000.00', count: 18 },
    { feeType: 'JOB_POSTING', amount: '98500.00', count: 41 },
    { feeType: 'CANDIDATE_REGISTRATION', amount: '44000.00', count: 88 },
  ],
  monthly: [
    { month: '2026-02', amount: '38000.00' },
    { month: '2026-03', amount: '44500.00' },
    { month: '2026-04', amount: '52000.00' },
    { month: '2026-05', amount: '61000.00' },
    { month: '2026-06', amount: '89000.00' },
  ],
};

// ── Communication ────────────────────────────────────────────────────────────

export const NOTIFICATIONS: AppNotification[] = [
  { id: 'ntf-1', type: 'MILESTONE_UPDATE', priority: 'HIGH', title: 'Milestone approved', body: 'Schema & ledger design was approved and paid.', actionUrl: '/contracts/con-1', isRead: false, createdAt: iso(8) },
  { id: 'ntf-2', type: 'APPLICATION_UPDATE', priority: 'MEDIUM', title: 'Moved to Technical Round', body: 'Acme Corp advanced your application.', actionUrl: '/applications', isRead: false, createdAt: iso(2) },
  { id: 'ntf-3', type: 'INVITE', priority: 'MEDIUM', title: 'You were invited to apply', body: 'Nexus Talent AI invited you to Lead AI Matching System Engineer.', actionUrl: '/jobs/job-3', isRead: true, createdAt: iso(2) },
];

export const CHAT_MESSAGES: ChatMessage[] = [
  { id: 'msg-1', roomId: 'room-1', body: 'Milestone 2 is up for review — added the concurrency test you asked for.', sentAt: iso(1), isRead: true, isSystem: false, sender: { id: 'usr-cand-1', fullName: 'Aarav Sharma', profileImage: null } },
  { id: 'msg-2', roomId: 'room-1', body: 'Looking now. If the payout test passes I will approve today.', sentAt: iso(1), isRead: false, isSystem: false, sender: { id: 'usr-rec-1', fullName: 'Priya Menon', profileImage: null } },
];

export const CHAT_ROOMS: ChatRoom[] = [
  {
    id: 'room-1', roomType: 'CONTRACT', contractId: 'con-1', applicationId: null, isLocked: false,
    participants: [
      { id: 'usr-cand-1', fullName: 'Aarav Sharma', profileImage: null },
      { id: 'usr-rec-1', fullName: 'Priya Menon', profileImage: null },
    ],
    lastMessage: CHAT_MESSAGES[1], unreadCount: 1,
  },
];

// ── Admin ────────────────────────────────────────────────────────────────────

export const DISPUTES: Dispute[] = [
  {
    id: 'dsp-1', milestoneId: 'ms-b',
    reason: 'Client says the delivered scope does not match the milestone description.',
    status: 'UNDER_REVIEW', resolutionNote: null,
    amountToFreelancer: null, amountToClient: null,
    createdAt: iso(2), resolvedAt: null,
    raisedBy: { id: 'usr-rec-1', fullName: 'Priya Menon' },
    assignedAdmin: { id: 'usr-adm-1', fullName: 'Ops Admin' },
    milestoneTitle: 'Escrow release transaction',
    contractTitle: 'Escrow & Payments Backend Architect',
    escrowAmount: '160000.00',
  },
  {
    id: 'dsp-2', milestoneId: 'ms-a',
    reason: 'Freelancer disputes a late-delivery penalty applied by the client.',
    status: 'OPEN', resolutionNote: null,
    amountToFreelancer: null, amountToClient: null,
    createdAt: iso(1), resolvedAt: null,
    raisedBy: { id: 'usr-cand-1', fullName: 'Aarav Sharma' },
    assignedAdmin: null,
    milestoneTitle: 'Schema & ledger design',
    contractTitle: 'Escrow & Payments Backend Architect',
    escrowAmount: '140000.00',
  },
];

export const PLATFORM_USERS: User[] = [
  CURRENT_CANDIDATE_USER,
  CURRENT_RECRUITER_USER,
  CURRENT_ADMIN_USER,
  { id: 'usr-cand-2', fullName: 'Rhea Kapoor', email: 'rhea@example.com', role: 'CANDIDATE', isVerified: true, accountStatus: 'ACTIVE', createdAt: iso(120) },
  { id: 'usr-cand-3', fullName: 'Dev Patel', email: 'dev@example.com', role: 'CANDIDATE', isVerified: true, accountStatus: 'SUSPENDED', createdAt: iso(80) },
  { id: 'usr-cand-4', fullName: 'Ishaan Rao', email: 'ishaan@example.com', role: 'CANDIDATE', isVerified: false, accountStatus: 'PENDING_VERIFICATION', createdAt: iso(3) },
  { id: 'usr-rec-2', fullName: 'Meera Iyer', email: 'meera@nexus.example', role: 'RECRUITER', isVerified: true, accountStatus: 'BANNED', createdAt: iso(200) },
];

export const SETTINGS: PlatformSetting[] = [
  { key: 'PLATFORM_FEE_PERCENT', label: 'Freelance platform commission', value: '10', description: 'Commission taken on each freelance milestone release', type: 'PERCENTAGE', section: 'FEES', updatedAt: iso(30) },
  { key: 'JOB_POSTING_FEE', label: 'Recruiter one-time posting fee', value: '2500', description: 'Charged once per recruiter account before their first job can be published', type: 'DECIMAL', section: 'FEES', updatedAt: iso(30) },
  { key: 'CANDIDATE_PROFILE_FEE', label: 'Candidate full-time profile fee', value: '499', description: 'One-time fee for full-time access', type: 'DECIMAL', section: 'FEES', updatedAt: iso(60) },
  { key: 'PAYOUT_MINIMUM', label: 'Payout minimum', value: '500', description: 'Minimum wallet balance a freelancer can request as a payout', type: 'DECIMAL', section: 'THRESHOLDS', updatedAt: iso(90) },
];

// ── Helpers used by the router ───────────────────────────────────────────────

export function paginate<T>(rows: T[], page = 1, limit = 20): Paginated<T> {
  const start = (page - 1) * limit;
  return { data: rows.slice(start, start + limit), total: rows.length, page, limit };
}
