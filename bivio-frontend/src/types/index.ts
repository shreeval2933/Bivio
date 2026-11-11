// ============================================================================
// CANONICAL DOMAIN TYPES — the single source of truth.
//
// Reconciled from BIVIO_FRONTEND_AUDIT.md §2 against the actual backend
// (prisma/schema.prisma). Every type here matches a real API response shape.
//
// Money is ALWAYS a string (Prisma Decimal serialised via .toFixed(2)).
// Dates are ALWAYS ISO-8601 strings.
// Status enums are ALWAYS SCREAMING_SNAKE_CASE — several older pages used
// Title Case locally (e.g. 'In Progress'); those need a label-mapping layer
// (StatusBadge already does this correctly) rather than using the raw value
// as a display label.
// ============================================================================

// ── Enums ────────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'RECRUITER' | 'CANDIDATE';
export type AccountStatus =
  | 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
export type JobType = 'FULL_TIME' | 'FREELANCE';
export type BudgetType = 'FIXED' | 'HOURLY';

// OQ-1 — no PENDING_PAYMENT. The posting fee is a one-time account-level
// flag (RecruiterProfile.postingFeePaid), not a job status.
export type JobStatus = 'DRAFT' | 'CONFIGURING' | 'OPEN' | 'CLOSED' | 'CANCELLED';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT_TO_HIRE';
export type ExperienceLevel = 'ENTRY' | 'MID' | 'SENIOR' | 'LEAD' | 'EXECUTIVE';
export type FreelanceExperienceLevel = 'ENTRY' | 'INTERMEDIATE' | 'EXPERT';
export type EducationLevel = 'ANY' | 'BACHELORS' | 'MASTERS' | 'PHD';
export type NoticePeriod = 'IMMEDIATE' | 'DAYS_15' | 'DAYS_30' | 'DAYS_60' | 'DAYS_90' | 'ANY';
export type ProjectLength = 'UNDER_1_WEEK' | 'W1_4' | 'M1_3' | 'M3_PLUS';
export type StageType = 'SCREENING' | 'OA' | 'INTERVIEW' | 'CUSTOM' | 'OFFER';
export type CandidateWorkStatus = 'EMPLOYED' | 'FREELANCING' | 'OPEN_TO_WORK' | 'STUDENT';
export type WorkEmploymentType = 'FULL_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'FREELANCE';
export type Fluency = 'BASIC' | 'CONVERSATIONAL' | 'FLUENT' | 'NATIVE';
export type EngagementType = 'FIXED' | 'HOURLY' | 'RETAINER';
export type WeeklyCapacity = 'UNDER_10' | 'H10_20' | 'H20_40' | 'FULL_TIME';

export type ApplicationStatus =
  | 'APPLIED' | 'IN_PROGRESS' | 'OFFERED' | 'HIRED' | 'REJECTED' | 'WITHDRAWN';
export type ApplicationSource = 'DIRECT' | 'INVITED';
export type InviteStatus = 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
export type OfferStatus = 'SENT' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'EXPIRED';
export type InterviewMode = 'ONLINE' | 'PHONE' | 'ONSITE';
export type InterviewStatus =
  | 'SCHEDULED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type InterviewRecommendation = 'PROCEED' | 'HOLD' | 'REJECT';

export type ProposalStatus =
  | 'SUBMITTED' | 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
export type ProposalSource = 'DIRECT' | 'INVITED';
export type ContractStatus =
  | 'PENDING_FUNDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
export type MilestoneStatus =
  | 'PENDING' | 'FUNDED' | 'SUBMITTED' | 'REVISION_REQUESTED'
  | 'APPROVED' | 'PAID' | 'DISPUTED';
export type SubmissionStatus = 'SUBMITTED' | 'ACCEPTED' | 'REVISION_REQUESTED';
export type EscrowStatus = 'HELD' | 'FROZEN' | 'RELEASED' | 'REFUNDED';
export type PaymentStatus = 'INITIATED' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type PayoutStatus = 'REQUESTED' | 'PROCESSING' | 'PAID' | 'FAILED';
export type PayoutMethod = 'UPI' | 'BANK_TRANSFER';
export type TxnDirection = 'CREDIT' | 'DEBIT';

export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED';
export type ModerationType = 'WARN' | 'SUSPEND' | 'BAN' | 'UNBAN';
export type VerificationTier = 'NONE' | 'PAYMENT_VERIFIED' | 'IDENTITY_VERIFIED';
export type KycStatus = 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';
export type KycType = 'INDIVIDUAL' | 'BUSINESS';

export type NotificationType =
  | 'INVITE' | 'APPLICATION_UPDATE' | 'PROPOSAL_UPDATE'
  | 'MILESTONE_UPDATE' | 'PAYMENT' | 'MESSAGE' | 'DISPUTE' | 'SYSTEM';
export type NotificationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type FeeType = 'JOB_POSTING' | 'CANDIDATE_REGISTRATION' | 'FREELANCE_COMMISSION';
export type SettingType = 'DECIMAL' | 'PERCENTAGE' | 'INTEGER' | 'BOOLEAN';
export type SettingSection = 'FEES' | 'THRESHOLDS' | 'FLAGS' | 'POLICY';

/**
 * Which entity a status belongs to. REQUIRED because status values collide:
 * OPEN is success for a Job but error for a Dispute; ACTIVE is a Contract
 * state and an Account state.
 */
export type StatusDomain =
  | 'job' | 'application' | 'proposal' | 'contract' | 'milestone' | 'escrow'
  | 'dispute' | 'account' | 'payout' | 'offer' | 'invite' | 'interview' | 'verification';

// ── Identity ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: Role;
  profileImage?: string | null;
  isVerified: boolean;
  accountStatus: AccountStatus;
  createdAt?: string;
  lastActiveAt?: string;
  recruiterProfile?: any | null;
  candidateProfile?: any | null;
}

export interface Company {
  id: string;
  name: string;
  website?: string | null;
  logoUrl?: string | null;
  industry?: string | null;
  description?: string | null;
  isVerified: boolean;
}

export interface Skill {
  id: string;
  name: string;
  category?: string | null;
}

export interface CandidateSkill {
  id: string;
  skillId: string;
  proficiency?: number | null;
  yearsOfExperience?: string | null;
  skill: Skill;
}

export interface Resume {
  id: string;
  version: number;
  fileName: string;
  fileUrl: string;
  isPrimary: boolean;
  uploadedAt: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  title: string;
  employmentType: WorkEmploymentType;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  description?: string | null;
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
  grade?: string | null;
}

export interface Certification {
  id: string;
  name: string;
  issuingOrg: string;
  issueDate: string;
  expiryDate?: string | null;
  credentialUrl?: string | null;
}

export interface LanguageEntry {
  id: string;
  language: string;
  fluency: Fluency;
}

export interface PortfolioProject {
  id: string;
  title: string;
  coverImageUrl?: string | null;
  role?: string | null;
  description?: string | null;
  repositoryUrl?: string | null;
  liveUrl?: string | null;
  clientName?: string | null;
  clientNamePrivate: boolean;
  startedOn?: string | null;
  completedOn?: string | null;
  isFeatured: boolean;
  skills: Skill[];
}

export interface FreelanceService {
  id: string;
  title: string;
  description?: string | null;
  startingPrice: string;
  deliveryTime: string;
  skills: Skill[];
}

export interface FreelancePortfolio {
  id: string;
  bio?: string | null;
  hourlyRate?: string | null;
  currency: string;
  preferredEngagement?: EngagementType[];
  availableFrom?: string | null;
  weeklyCapacity?: WeeklyCapacity | null;
  portfolioUrl?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  isAvailable: boolean;
  hideEarnings: boolean;
  avgRating?: string | null;
  totalContracts: number;
  totalEarned?: string | null;
  responseTimeHours?: number | null;
  projects?: PortfolioProject[];
  services?: FreelanceService[];
}

export interface CandidateProfile {
  id: string;
  userId: string;
  headline?: string | null;
  summary?: string | null;
  location?: string | null;
  experienceYears?: string | null;
  highestEducation?: string | null;
  currentStatus?: CandidateWorkStatus | null;
  noticePeriod?: NoticePeriod | null;
  openToFullTime: boolean;
  openToFreelance: boolean;
  fullTimeFeePaid: boolean;
  user: User;
  skills?: CandidateSkill[];
  resumes?: Resume[];
  workExperience?: WorkExperience[];
  education?: EducationEntry[];
  certifications?: Certification[];
  languages?: LanguageEntry[];
  portfolio?: FreelancePortfolio | null;
}

export interface RecruiterProfile {
  id: string;
  userId: string;
  designation?: string | null;
  isSolo: boolean;
  user: User;
  company?: Company | null;
  postingFeePaid: boolean;
  paymentMethodVerified: boolean;
  idVerified: boolean;
  kycStatus: KycStatus;
  jobsPostedCount?: number;
  hiresCount?: number;
}

// ── Jobs & matching ──────────────────────────────────────────────────────

export interface JobSkill {
  id: string;
  skillId: string;
  isMandatory: boolean;
  weight?: number | null;
  skill: Skill;
}

export interface AIWeightage {
  id: string;
  skillWeight: number;
  experienceWeight: number;
  educationWeight: number;
  domainWeight: number;
  practicalFitWeight: number;
  portfolioWeight: number;
  rateFitWeight: number;
  trackRecordWeight: number;
  availabilityWeight: number;
}

export interface HiringStage {
  id: string;
  jobId: string;
  name: string;
  sequence: number;
  stageType: StageType;
  isTerminal: boolean;
  automationLink?: string | null;
  emailSubject?: string | null;
  emailBodyTemplate?: string | null;
  prerequisite?: string | null;
  requirementDocUrl?: string | null;
  requirementDocFileName?: string | null;
}

export interface Job {
  id: string;
  recruiterId: string;
  title: string;
  description: string;
  jobType: JobType;
  location?: string | null;
  isRemote: boolean;

  employmentType?: EmploymentType | null;
  experienceLevel?: ExperienceLevel | null;
  department?: string | null;
  responsibilities?: string | null;
  salaryMin?: string | null;
  salaryMax?: string | null;
  salaryVisible: boolean;
  minExperienceYears?: string | null;
  maxExperienceYears?: string | null;
  minEducationLevel?: EducationLevel | null;
  noticePeriodPreference?: NoticePeriod | null;
  vacancies: number;
  benefits?: string[];
  internalJobCode?: string | null;

  budget?: string | null;
  budgetType?: BudgetType | null;
  deliverables?: string[];
  freelanceExperienceLevel?: FreelanceExperienceLevel | null;
  projectLengthEstimate?: ProjectLength | null;
  proposalDeadline?: string | null;

  currency: string;
  status: JobStatus;
  deadline?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  company?: Company | null;
  recruiter?: RecruiterProfile;
  skills: JobSkill[];
  weightage?: AIWeightage | null;
  hiringStages?: HiringStage[];
  applicantCount?: number;
  proposalCount?: number;
  viewCount?: number;
}

export interface MatchScore {
  id: string;
  jobId: string;
  candidateId: string;
  score: string;
  breakdown?: Record<string, { score: number; max: number }> | null;
  modelVersion?: string | null;
  isCurrent: boolean;
  computedAt: string;
  candidate: CandidateProfile;
  application?: Pick<Application, 'id' | 'status' | 'currentStageId'> | null;
  proposal?: Pick<Proposal, 'id' | 'status'> | null;
}

// ── Full-time pipeline ───────────────────────────────────────────────────

export interface StageMovement {
  id: string;
  applicationId: string;
  fromStage?: Pick<HiringStage, 'id' | 'name'> | null;
  toStage: Pick<HiringStage, 'id' | 'name'>;
  movedBy: Pick<User, 'id' | 'fullName'>;
  note?: string | null;
  movedAt: string;
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  currentStageId?: string | null;
  resumeId?: string | null;
  status: ApplicationStatus;
  source: ApplicationSource;
  snapshotAiScore?: string | null;
  coverNote?: string | null;
  appliedAt: string;
  job?: Pick<Job, 'id' | 'title' | 'jobType'> & { company?: Company | null };
  candidate?: CandidateProfile;
  currentStage?: HiringStage | null;
  movements?: StageMovement[];
  offer?: Offer | null;
}

export interface Invitation {
  id: string;
  jobId: string;
  candidateId: string;
  status: InviteStatus;
  message?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  job?: Pick<Job, 'id' | 'title' | 'jobType'> & { company?: Company | null };
}

export interface Offer {
  id: string;
  applicationId: string;
  compensation: string;
  currency: string;
  joiningDate?: string | null;
  offerLetterUrl?: string | null;
  status: OfferStatus;
  expiresAt?: string | null;
  createdAt: string;
  respondedAt?: string | null;
  rejectionReason?: string | null;
  job?: Pick<Job, 'id' | 'title'> & { company?: Company | null };
  candidate?: Pick<CandidateProfile, 'id'> & { user: Pick<User, 'fullName'> };
}

export interface Interview {
  id: string;
  applicationId: string;
  hiringStageId?: string | null;
  roundNo: number;
  scheduledAt: string;
  durationMinutes: number;
  mode: InterviewMode;
  meetingLink?: string | null;
  location?: string | null;
  agendaNotes?: string | null;
  status: InterviewStatus;
  feedback?: string | null;
  commRating?: number | null;
  techRating?: number | null;
  cultureRating?: number | null;
  rating?: number | null;
  recommendation?: InterviewRecommendation | null;
  rescheduleReason?: string | null;
  interviewer: Pick<User, 'id' | 'fullName'>;
}

// ── Freelance ────────────────────────────────────────────────────────────

export interface Proposal {
  id: string;
  jobId: string;
  candidateId: string;
  bidAmount: string;
  currency: string;
  durationDays?: number | null;
  coverLetter: string;
  status: ProposalStatus;
  source: ProposalSource;
  submittedAt: string;
  job?: Pick<Job, 'id' | 'title' | 'budget'> & { company?: Company | null };
  candidate?: CandidateProfile;
  contractId?: string | null;
  matchScore?: string | null;
  proposedMilestones?: Array<{ title: string; description?: string; amount: string; sequence: number }>;
  rejectionReason?: string | null;
}

export interface Escrow {
  id: string;
  milestoneId: string;
  amount: string;
  currency: string;
  status: EscrowStatus;
  fundedAt?: string | null;
  releasedAt?: string | null;
}

export interface MilestoneSubmission {
  id: string;
  milestoneId: string;
  versionNo: number;
  note?: string | null;
  status: SubmissionStatus;
  feedback?: string | null;
  submittedAt: string;
}

export interface Milestone {
  id: string;
  contractId: string;
  title: string;
  description?: string | null;
  amount: string;
  sequence: number;
  dueDate?: string | null;
  status: MilestoneStatus;
  approvedAt?: string | null;
  escrow?: Escrow | null;
  submissions?: MilestoneSubmission[];
}

export interface Contract {
  id: string;
  jobId: string;
  proposalId: string;
  clientId: string;
  freelancerId: string;
  agreedAmount: string;
  currency: string;
  platformFeePercent: string;
  status: ContractStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  cancelledReason?: string | null;
  createdAt: string;
  job?: Pick<Job, 'id' | 'title'>;
  client?: RecruiterProfile;
  freelancer?: CandidateProfile;
  milestones: Milestone[];
  reviews?: Review[];
  proposal?: any;
  chatRoom?: any;
}

// ── Money ────────────────────────────────────────────────────────────────

export interface Wallet {
  id: string;
  availableBalance: string;
  pendingBalance: string;
  currency: string;
}

export interface WalletTransaction {
  id: string;
  direction: TxnDirection;
  amount: string;
  balanceAfter: string;
  referenceType: string;
  referenceId?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface Payout {
  id: string;
  amount: string;
  status: PayoutStatus;
  payoutMethod: PayoutMethod;
  payoutDetailsMasked?: string | null;
  requestedAt: string;
  processedAt?: string | null;
  estimatedArrival?: string | null;
}

export interface RevenueSummary {
  totalRevenue: string;
  currency: string;
  byFeeType: { feeType: FeeType; amount: string; count: number }[];
  monthly: { month: string; amount: string }[];
  transactions?: PlatformFeeTransaction[];
}

export interface PlatformFeeTransaction {
  id: string;
  date: string;
  feeType: FeeType;
  amount: number | string;
  relatedEntity: string;
  relatedLink: string;
  payerName: string;
}

// ── Communication ────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  roomId: string;
  body: string;
  sentAt: string;
  isRead: boolean;
  isSystem: boolean;
  sender: Pick<User, 'id' | 'fullName' | 'profileImage'> | null;
}

export interface ChatRoom {
  id: string;
  roomType: 'CONTRACT' | 'INTERVIEW';
  contractId?: string | null;
  applicationId?: string | null;
  isLocked: boolean;
  contextLabel?: string | null;
  participants: Pick<User, 'id' | 'fullName' | 'profileImage'>[];
  lastMessage?: ChatMessage | null;
  unreadCount: number;
  contract?: Contract | null;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body?: string | null;
  actionUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

// ── Trust & admin ────────────────────────────────────────────────────────

export interface Review {
  id: string;
  contractId: string;
  rating: number;
  commRating?: number | null;
  qualityRating?: number | null;
  comment?: string | null;
  isPublished: boolean;
  createdAt: string;
  reviewer: Pick<User, 'id' | 'fullName'>;
  reviewee: Pick<User, 'id' | 'fullName'>;
}

export interface Dispute {
  id: string;
  milestoneId: string;
  reason: string;
  status: DisputeStatus;
  resolutionNote?: string | null;
  escalationReason?: string | null;
  amountToFreelancer?: string | null;
  amountToClient?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  raisedBy: Pick<User, 'id' | 'fullName'> & { role?: 'CANDIDATE' | 'RECRUITER' };
  assignedAdmin?: Pick<User, 'id' | 'fullName'> | null;
  milestoneTitle?: string;
  milestoneDescription?: string;
  milestoneAmount?: string;
  contractTitle?: string;
  contractAmount?: string;
  platformFeePercent?: string;
  escrowAmount?: string;
  submissions?: MilestoneSubmission[];
  chatTranscript?: ChatMessage[];
}

export interface ModerationAction {
  id: string;
  targetUserId: string;
  action: ModerationType;
  reason: string;
  adminName?: string;
  expiresAt?: string | null;
  createdAt: string;
}

export interface PlatformSetting {
  key: string;
  label: string;
  value: string;
  description?: string | null;
  type: SettingType;
  section: SettingSection;
  updatedAt: string;
  updatedBy?: string | null;
}

export interface VerificationRequest {
  id: string;
  recruiterId: string;
  entityName: string;
  kycType: KycType;
  submittedByName: string;
  designation?: string | null;
  submittedAt: string;
  documents: { name: string; url: string }[];
  nameMatch: boolean;
  nameMatchNotes?: string | null;
  kycStatus: KycStatus;
  isSecondSubmission: boolean;
  previousRejectionReason?: string | null;
}

export interface AdminUserRow extends User {
  flagsCount: number;
  verificationTier: VerificationTier;
  moderationHistory?: ModerationAction[];
}

// ── Envelopes ────────────────────────────────────────────────────────────

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  error: string;
  message: string;
}
