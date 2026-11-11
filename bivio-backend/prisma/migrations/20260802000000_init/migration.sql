-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'RECRUITER', 'CANDIDATE');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'FREELANCE');

-- CreateEnum
CREATE TYPE "BudgetType" AS ENUM ('FIXED', 'HOURLY');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'CONFIGURING', 'OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT_TO_HIRE');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('ENTRY', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "FreelanceExperienceLevel" AS ENUM ('ENTRY', 'INTERMEDIATE', 'EXPERT');

-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('ANY', 'BACHELORS', 'MASTERS', 'PHD');

-- CreateEnum
CREATE TYPE "NoticePeriod" AS ENUM ('IMMEDIATE', 'DAYS_15', 'DAYS_30', 'DAYS_60', 'DAYS_90', 'ANY');

-- CreateEnum
CREATE TYPE "ProjectLength" AS ENUM ('UNDER_1_WEEK', 'W1_4', 'M1_3', 'M3_PLUS');

-- CreateEnum
CREATE TYPE "StageType" AS ENUM ('SCREENING', 'OA', 'INTERVIEW', 'CUSTOM', 'OFFER');

-- CreateEnum
CREATE TYPE "CandidateWorkStatus" AS ENUM ('EMPLOYED', 'FREELANCING', 'OPEN_TO_WORK', 'STUDENT');

-- CreateEnum
CREATE TYPE "WorkEmploymentType" AS ENUM ('FULL_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE');

-- CreateEnum
CREATE TYPE "Fluency" AS ENUM ('BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE');

-- CreateEnum
CREATE TYPE "EngagementType" AS ENUM ('FIXED', 'HOURLY', 'RETAINER');

-- CreateEnum
CREATE TYPE "WeeklyCapacity" AS ENUM ('UNDER_10', 'H10_20', 'H20_40', 'FULL_TIME');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'IN_PROGRESS', 'OFFERED', 'HIRED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ApplicationSource" AS ENUM ('DIRECT', 'INVITED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('SENT', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InterviewMode" AS ENUM ('ONLINE', 'PHONE', 'ONSITE');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "InterviewRecommendation" AS ENUM ('PROCEED', 'HOLD', 'REJECT');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('SUBMITTED', 'SHORTLISTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ProposalSource" AS ENUM ('DIRECT', 'INVITED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('PENDING_FUNDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'FUNDED', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'PAID', 'DISPUTED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'REVISION_REQUESTED');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('HELD', 'FROZEN', 'RELEASED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('CANDIDATE_PROFILE_FEE', 'JOB_POSTING_FEE', 'ESCROW_FUNDING', 'PAYMENT_METHOD_VERIFICATION');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('CANDIDATE_REGISTRATION', 'JOB_POSTING', 'FREELANCE_COMMISSION');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('UPI', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "TxnDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "ChatRoomType" AS ENUM ('CONTRACT', 'INTERVIEW');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "ModerationType" AS ENUM ('WARN', 'SUSPEND', 'BAN', 'UNBAN');

-- CreateEnum
CREATE TYPE "AttachmentOwnerType" AS ENUM ('MESSAGE', 'SUBMISSION', 'DISPUTE', 'PORTFOLIO', 'JOB_REQUIREMENT', 'KYC_SUBMISSION');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "KycType" AS ENUM ('INDIVIDUAL', 'BUSINESS');

-- CreateEnum
CREATE TYPE "SettingType" AS ENUM ('DECIMAL', 'PERCENTAGE', 'INTEGER', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "SettingSection" AS ENUM ('FEES', 'THRESHOLDS', 'FLAGS', 'POLICY');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INVITE', 'APPLICATION_UPDATE', 'PROPOSAL_UPDATE', 'MILESTONE_UPDATE', 'PAYMENT', 'MESSAGE', 'DISPUTE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL,
    "profile_image_url" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "account_status" "AccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "last_login_at" TIMESTAMP(3),
    "last_active_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "headline" TEXT,
    "summary" TEXT,
    "location" TEXT,
    "experience_years" DECIMAL(4,1),
    "highest_education" TEXT,
    "current_status" "CandidateWorkStatus",
    "notice_period" "NoticePeriod",
    "primary_resume_id" UUID,
    "open_to_full_time" BOOLEAN NOT NULL DEFAULT true,
    "open_to_freelance" BOOLEAN NOT NULL DEFAULT false,
    "full_time_fee_paid" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_experiences" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "employment_type" "WorkEmploymentType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_education" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "field_of_study" TEXT NOT NULL,
    "start_year" SMALLINT NOT NULL,
    "end_year" SMALLINT NOT NULL,
    "grade" TEXT,

    CONSTRAINT "candidate_education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "issuing_org" TEXT NOT NULL,
    "issue_date" DATE NOT NULL,
    "expiry_date" DATE,
    "credential_url" TEXT,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "language_entries" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "language" TEXT NOT NULL,
    "fluency" "Fluency" NOT NULL,

    CONSTRAINT "language_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freelance_portfolios" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "bio" TEXT,
    "hourly_rate" DECIMAL(10,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "preferred_engagement" "EngagementType"[],
    "available_from" DATE,
    "weekly_capacity" "WeeklyCapacity",
    "portfolio_url" TEXT,
    "github_url" TEXT,
    "linkedin_url" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "hide_earnings" BOOLEAN NOT NULL DEFAULT false,
    "avg_rating" DECIMAL(3,2),
    "total_contracts" INTEGER NOT NULL DEFAULT 0,
    "total_earned" DECIMAL(14,2),
    "response_time_hours" DECIMAL(6,1),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "freelance_portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_projects" (
    "id" UUID NOT NULL,
    "portfolio_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "role" TEXT,
    "repository_url" TEXT,
    "live_url" TEXT,
    "cover_image_url" TEXT,
    "client_name" TEXT,
    "client_name_private" BOOLEAN NOT NULL DEFAULT false,
    "started_on" DATE,
    "completed_on" DATE,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freelance_services" (
    "id" UUID NOT NULL,
    "portfolio_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "starting_price" DECIMAL(10,2) NOT NULL,
    "delivery_time" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "freelance_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freelance_service_skills" (
    "id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,

    CONSTRAINT "freelance_service_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "logo_url" TEXT,
    "industry" TEXT,
    "description" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiter_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID,
    "designation" TEXT,
    "is_solo" BOOLEAN NOT NULL DEFAULT true,
    "posting_fee_paid" BOOLEAN NOT NULL DEFAULT false,
    "posting_fee_paid_at" TIMESTAMP(3),
    "payment_method_verified" BOOLEAN NOT NULL DEFAULT false,
    "payment_verified_at" TIMESTAMP(3),
    "id_verified" BOOLEAN NOT NULL DEFAULT false,
    "id_verified_at" TIMESTAMP(3),
    "kyc_status" "KycStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "jobs_posted_count" INTEGER NOT NULL DEFAULT 0,
    "hires_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recruiter_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_submissions" (
    "id" UUID NOT NULL,
    "recruiter_id" UUID NOT NULL,
    "kyc_type" "KycType" NOT NULL,
    "name_match" BOOLEAN NOT NULL DEFAULT false,
    "name_match_notes" TEXT,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "is_second_submission" BOOLEAN NOT NULL DEFAULT false,
    "rejection_reason" TEXT,
    "clarification_requested" TEXT,
    "reviewed_by_admin_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "permissions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "parsed_text" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "is_approved" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_skills" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "proficiency" SMALLINT,
    "years_of_experience" DECIMAL(4,1),

    CONSTRAINT "candidate_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_project_skills" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,

    CONSTRAINT "portfolio_project_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "recruiter_id" UUID NOT NULL,
    "company_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "job_type" "JobType" NOT NULL,
    "location" TEXT,
    "is_remote" BOOLEAN NOT NULL DEFAULT false,
    "employment_type" "EmploymentType",
    "experience_level" "ExperienceLevel",
    "department" TEXT,
    "responsibilities" TEXT,
    "salary_min" DECIMAL(12,2),
    "salary_max" DECIMAL(12,2),
    "salary_visible" BOOLEAN NOT NULL DEFAULT true,
    "min_experience_years" DECIMAL(4,1),
    "max_experience_years" DECIMAL(4,1),
    "min_education_level" "EducationLevel",
    "notice_period_preference" "NoticePeriod",
    "vacancies" INTEGER NOT NULL DEFAULT 1,
    "benefits" TEXT[],
    "internal_job_code" TEXT,
    "budget" DECIMAL(12,2),
    "budget_type" "BudgetType",
    "deliverables" TEXT[],
    "freelance_experience_level" "FreelanceExperienceLevel",
    "project_length_estimate" "ProjectLength",
    "proposal_deadline" TIMESTAMP(3),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "deadline" DATE,
    "published_at" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_skills" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "weight" SMALLINT,

    CONSTRAINT "job_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_weightages" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "skill_weight" SMALLINT NOT NULL DEFAULT 0,
    "experience_weight" SMALLINT NOT NULL DEFAULT 0,
    "education_weight" SMALLINT NOT NULL DEFAULT 0,
    "domain_weight" SMALLINT NOT NULL DEFAULT 0,
    "practical_fit_weight" SMALLINT NOT NULL DEFAULT 0,
    "portfolio_weight" SMALLINT NOT NULL DEFAULT 0,
    "rate_fit_weight" SMALLINT NOT NULL DEFAULT 0,
    "track_record_weight" SMALLINT NOT NULL DEFAULT 0,
    "availability_weight" SMALLINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_weightages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_scores" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "breakdown" JSONB,
    "model_version" TEXT,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hiring_stages" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" SMALLINT NOT NULL,
    "stage_type" "StageType" NOT NULL DEFAULT 'CUSTOM',
    "is_terminal" BOOLEAN NOT NULL DEFAULT false,
    "automation_link" TEXT,
    "email_subject" TEXT,
    "email_body_template" TEXT,
    "prerequisite" TEXT,
    "requirement_doc_url" TEXT,
    "requirement_doc_file_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hiring_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "current_stage_id" UUID,
    "resume_id" UUID,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "source" "ApplicationSource" NOT NULL DEFAULT 'DIRECT',
    "snapshot_ai_score" DECIMAL(5,2),
    "cover_note" TEXT,
    "rejection_reason" TEXT,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_movements" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "from_stage_id" UUID,
    "to_stage_id" UUID NOT NULL,
    "moved_by_user_id" UUID NOT NULL,
    "note" TEXT,
    "moved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stage_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "recruiter_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'SENT',
    "message" TEXT,
    "expires_at" TIMESTAMP(3),
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "compensation" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "joining_date" DATE,
    "offer_letter_url" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'SENT',
    "expires_at" TIMESTAMP(3),
    "responded_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "hiring_stage_id" UUID,
    "interviewer_id" UUID NOT NULL,
    "round_no" SMALLINT NOT NULL DEFAULT 1,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" SMALLINT NOT NULL DEFAULT 60,
    "mode" "InterviewMode" NOT NULL,
    "meeting_link" TEXT,
    "location" TEXT,
    "agenda_notes" TEXT,
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "feedback" TEXT,
    "comm_rating" SMALLINT,
    "tech_rating" SMALLINT,
    "culture_rating" SMALLINT,
    "rating" SMALLINT,
    "recommendation" "InterviewRecommendation",
    "reschedule_reason" TEXT,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "bid_amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "duration_days" INTEGER,
    "cover_letter" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'SUBMITTED',
    "source" "ProposalSource" NOT NULL DEFAULT 'DIRECT',
    "proposed_milestones" JSONB,
    "rejection_reason" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "proposal_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "freelancer_id" UUID NOT NULL,
    "agreed_amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "platform_fee_percent" DECIMAL(5,2) NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'PENDING_FUNDING',
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "cancelled_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "sequence" SMALLINT NOT NULL,
    "due_date" DATE,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestone_submissions" (
    "id" UUID NOT NULL,
    "milestone_id" UUID NOT NULL,
    "version_no" SMALLINT NOT NULL,
    "note" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "feedback" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "milestone_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "owner_type" "AttachmentOwnerType" NOT NULL,
    "owner_id" UUID NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrows" (
    "id" UUID NOT NULL,
    "milestone_id" UUID NOT NULL,
    "payment_id" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "EscrowStatus" NOT NULL DEFAULT 'HELD',
    "funded_at" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),

    CONSTRAINT "escrows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "payer_user_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "purpose" "PaymentPurpose" NOT NULL,
    "reference_id" UUID,
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "gateway" TEXT NOT NULL,
    "gateway_ref" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_fees" (
    "id" UUID NOT NULL,
    "payment_id" UUID,
    "contract_id" UUID,
    "fee_type" "FeeType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "percentage" DECIMAL(5,2),
    "charged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "available_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pending_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "direction" "TxnDirection" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balance_after" DECIMAL(14,2) NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" UUID,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'REQUESTED',
    "payout_method" "PayoutMethod" NOT NULL,
    "payout_details" JSONB,
    "payout_details_masked" TEXT,
    "gateway_ref" TEXT,
    "estimated_arrival" TIMESTAMP(3),
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" UUID NOT NULL,
    "room_type" "ChatRoomType" NOT NULL,
    "contract_id" UUID,
    "application_id" UUID,
    "context_label" TEXT,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_participants" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "last_read_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "sender_id" UUID,
    "body" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "action_url" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "reviewee_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comm_rating" SMALLINT,
    "quality_rating" SMALLINT,
    "comment" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" UUID NOT NULL,
    "milestone_id" UUID NOT NULL,
    "raised_by_user_id" UUID NOT NULL,
    "assigned_admin_id" UUID,
    "reason" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution_note" TEXT,
    "escalation_reason" TEXT,
    "amount_to_freelancer" DECIMAL(12,2),
    "amount_to_client" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" UUID NOT NULL,
    "target_user_id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "action" "ModerationType" NOT NULL,
    "reason" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "type" "SettingType" NOT NULL,
    "section" "SettingSection" NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "diff" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_account_status_idx" ON "users"("role", "account_status");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_profiles_user_id_key" ON "candidate_profiles"("user_id");

-- CreateIndex
CREATE INDEX "candidate_profiles_location_idx" ON "candidate_profiles"("location");

-- CreateIndex
CREATE INDEX "work_experiences_candidate_id_idx" ON "work_experiences"("candidate_id");

-- CreateIndex
CREATE INDEX "candidate_education_candidate_id_idx" ON "candidate_education"("candidate_id");

-- CreateIndex
CREATE INDEX "certifications_candidate_id_idx" ON "certifications"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "language_entries_candidate_id_language_key" ON "language_entries"("candidate_id", "language");

-- CreateIndex
CREATE UNIQUE INDEX "freelance_portfolios_candidate_id_key" ON "freelance_portfolios"("candidate_id");

-- CreateIndex
CREATE INDEX "freelance_portfolios_is_available_avg_rating_idx" ON "freelance_portfolios"("is_available", "avg_rating");

-- CreateIndex
CREATE INDEX "portfolio_projects_portfolio_id_display_order_idx" ON "portfolio_projects"("portfolio_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "freelance_service_skills_service_id_skill_id_key" ON "freelance_service_skills"("service_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "recruiter_profiles_user_id_key" ON "recruiter_profiles"("user_id");

-- CreateIndex
CREATE INDEX "kyc_submissions_recruiter_id_created_at_idx" ON "kyc_submissions"("recruiter_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "kyc_submissions_status_idx" ON "kyc_submissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "admin_profiles_user_id_key" ON "admin_profiles"("user_id");

-- CreateIndex
CREATE INDEX "resumes_candidate_id_is_primary_idx" ON "resumes"("candidate_id", "is_primary");

-- CreateIndex
CREATE UNIQUE INDEX "resumes_candidate_id_version_key" ON "resumes"("candidate_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE INDEX "skills_is_approved_name_idx" ON "skills"("is_approved", "name");

-- CreateIndex
CREATE INDEX "candidate_skills_skill_id_idx" ON "candidate_skills"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_skills_candidate_id_skill_id_key" ON "candidate_skills"("candidate_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_project_skills_project_id_skill_id_key" ON "portfolio_project_skills"("project_id", "skill_id");

-- CreateIndex
CREATE INDEX "jobs_status_job_type_created_at_idx" ON "jobs"("status", "job_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "jobs_recruiter_id_status_idx" ON "jobs"("recruiter_id", "status");

-- CreateIndex
CREATE INDEX "job_skills_skill_id_is_mandatory_idx" ON "job_skills"("skill_id", "is_mandatory");

-- CreateIndex
CREATE UNIQUE INDEX "job_skills_job_id_skill_id_key" ON "job_skills"("job_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_weightages_job_id_key" ON "ai_weightages"("job_id");

-- CreateIndex
CREATE INDEX "match_scores_job_id_score_idx" ON "match_scores"("job_id", "score" DESC);

-- CreateIndex
CREATE INDEX "match_scores_candidate_id_score_idx" ON "match_scores"("candidate_id", "score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "match_scores_job_id_candidate_id_model_version_key" ON "match_scores"("job_id", "candidate_id", "model_version");

-- CreateIndex
CREATE UNIQUE INDEX "hiring_stages_job_id_sequence_key" ON "hiring_stages"("job_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "hiring_stages_job_id_name_key" ON "hiring_stages"("job_id", "name");

-- CreateIndex
CREATE INDEX "applications_job_id_status_idx" ON "applications"("job_id", "status");

-- CreateIndex
CREATE INDEX "applications_candidate_id_applied_at_idx" ON "applications"("candidate_id", "applied_at" DESC);

-- CreateIndex
CREATE INDEX "stage_movements_application_id_moved_at_idx" ON "stage_movements"("application_id", "moved_at");

-- CreateIndex
CREATE INDEX "invitations_candidate_id_status_idx" ON "invitations"("candidate_id", "status");

-- CreateIndex
CREATE INDEX "invitations_job_id_status_idx" ON "invitations"("job_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "offers_application_id_key" ON "offers"("application_id");

-- CreateIndex
CREATE INDEX "interviews_interviewer_id_scheduled_at_idx" ON "interviews"("interviewer_id", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "interviews_application_id_round_no_key" ON "interviews"("application_id", "round_no");

-- CreateIndex
CREATE INDEX "proposals_job_id_status_idx" ON "proposals"("job_id", "status");

-- CreateIndex
CREATE INDEX "proposals_candidate_id_submitted_at_idx" ON "proposals"("candidate_id", "submitted_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "contracts_proposal_id_key" ON "contracts"("proposal_id");

-- CreateIndex
CREATE INDEX "contracts_freelancer_id_status_idx" ON "contracts"("freelancer_id", "status");

-- CreateIndex
CREATE INDEX "contracts_client_id_status_idx" ON "contracts"("client_id", "status");

-- CreateIndex
CREATE INDEX "milestones_contract_id_status_idx" ON "milestones"("contract_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "milestones_contract_id_sequence_key" ON "milestones"("contract_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "milestone_submissions_milestone_id_version_no_key" ON "milestone_submissions"("milestone_id", "version_no");

-- CreateIndex
CREATE INDEX "attachments_owner_type_owner_id_idx" ON "attachments"("owner_type", "owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "escrows_milestone_id_key" ON "escrows"("milestone_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_gateway_ref_key" ON "payments"("gateway_ref");

-- CreateIndex
CREATE INDEX "payments_payer_user_id_created_at_idx" ON "payments"("payer_user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "platform_fees_payment_id_key" ON "platform_fees"("payment_id");

-- CreateIndex
CREATE INDEX "platform_fees_fee_type_charged_at_idx" ON "platform_fees"("fee_type", "charged_at");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "transactions_wallet_id_created_at_idx" ON "transactions"("wallet_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "payouts_wallet_id_requested_at_idx" ON "payouts"("wallet_id", "requested_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "chat_rooms_contract_id_key" ON "chat_rooms"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_rooms_application_id_key" ON "chat_rooms"("application_id");

-- CreateIndex
CREATE INDEX "chat_participants_user_id_idx" ON "chat_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_participants_room_id_user_id_key" ON "chat_participants"("room_id", "user_id");

-- CreateIndex
CREATE INDEX "messages_room_id_sent_at_idx" ON "messages"("room_id", "sent_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "reviews_reviewee_id_is_published_idx" ON "reviews"("reviewee_id", "is_published");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_contract_id_reviewer_id_key" ON "reviews"("contract_id", "reviewer_id");

-- CreateIndex
CREATE INDEX "disputes_status_created_at_idx" ON "disputes"("status", "created_at");

-- CreateIndex
CREATE INDEX "moderation_actions_target_user_id_created_at_idx" ON "moderation_actions"("target_user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform_settings"("key");

-- CreateIndex
CREATE INDEX "platform_settings_section_idx" ON "platform_settings"("section");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_experiences" ADD CONSTRAINT "work_experiences_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_education" ADD CONSTRAINT "candidate_education_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "language_entries" ADD CONSTRAINT "language_entries_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freelance_portfolios" ADD CONSTRAINT "freelance_portfolios_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "freelance_portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freelance_services" ADD CONSTRAINT "freelance_services_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "freelance_portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freelance_service_skills" ADD CONSTRAINT "freelance_service_skills_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "freelance_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freelance_service_skills" ADD CONSTRAINT "freelance_service_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_profiles" ADD CONSTRAINT "recruiter_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_profiles" ADD CONSTRAINT "recruiter_profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submissions" ADD CONSTRAINT "kyc_submissions_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "recruiter_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_project_skills" ADD CONSTRAINT "portfolio_project_skills_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "portfolio_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_project_skills" ADD CONSTRAINT "portfolio_project_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "recruiter_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_weightages" ADD CONSTRAINT "ai_weightages_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_scores" ADD CONSTRAINT "match_scores_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_scores" ADD CONSTRAINT "match_scores_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_stages" ADD CONSTRAINT "hiring_stages_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_current_stage_id_fkey" FOREIGN KEY ("current_stage_id") REFERENCES "hiring_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_movements" ADD CONSTRAINT "stage_movements_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_movements" ADD CONSTRAINT "stage_movements_from_stage_id_fkey" FOREIGN KEY ("from_stage_id") REFERENCES "hiring_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_movements" ADD CONSTRAINT "stage_movements_to_stage_id_fkey" FOREIGN KEY ("to_stage_id") REFERENCES "hiring_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_movements" ADD CONSTRAINT "stage_movements_moved_by_user_id_fkey" FOREIGN KEY ("moved_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "recruiter_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_hiring_stage_id_fkey" FOREIGN KEY ("hiring_stage_id") REFERENCES "hiring_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "recruiter_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_freelancer_id_fkey" FOREIGN KEY ("freelancer_id") REFERENCES "candidate_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_submissions" ADD CONSTRAINT "milestone_submissions_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payer_user_id_fkey" FOREIGN KEY ("payer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_fees" ADD CONSTRAINT "platform_fees_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_fees" ADD CONSTRAINT "platform_fees_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewee_id_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_raised_by_user_id_fkey" FOREIGN KEY ("raised_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_assigned_admin_id_fkey" FOREIGN KEY ("assigned_admin_id") REFERENCES "admin_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admin_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- Custom Integrity Constraints
-- ============================================================================
-- Bivio — Integrity Constraints Migration
--
-- Prisma's schema language cannot express partial unique indexes or CHECK
-- constraints. Generate this migration with:
--   npx prisma migrate dev --create-only --name add_integrity_constraints
-- then paste this file's contents into the generated migration.sql before
-- running `npx prisma migrate dev` again.
-- ============================================================================

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

-- ═══ 4. AI weightage must sum to exactly 100, regardless of job type.
--         Unused factors for a given job type are zeroed by the service layer,
--         so one constraint covers both full-time and freelance weightage sets. ═══
ALTER TABLE "ai_weightages"
  ADD CONSTRAINT "ck_ai_weights_sum"
  CHECK (
    "skill_weight" + "experience_weight" + "education_weight"
    + "domain_weight" + "practical_fit_weight"
    + "portfolio_weight" + "rate_fit_weight" + "track_record_weight" + "availability_weight"
    = 100
  );

ALTER TABLE "ai_weightages"
  ADD CONSTRAINT "ck_ai_weights_range"
  CHECK (
    "skill_weight" BETWEEN 0 AND 100 AND "experience_weight" BETWEEN 0 AND 100
    AND "education_weight" BETWEEN 0 AND 100 AND "domain_weight" BETWEEN 0 AND 100
    AND "practical_fit_weight" BETWEEN 0 AND 100 AND "portfolio_weight" BETWEEN 0 AND 100
    AND "rate_fit_weight" BETWEEN 0 AND 100 AND "track_record_weight" BETWEEN 0 AND 100
    AND "availability_weight" BETWEEN 0 AND 100
  );

-- ═══ 5. Job shape rules ═══
-- Full-time uses salary_min/max; freelance uses budget/budget_type. Never both.
ALTER TABLE "jobs"
  ADD CONSTRAINT "ck_job_compensation_shape"
  CHECK (
    ("job_type" = 'FULL_TIME' AND "budget" IS NULL AND "budget_type" IS NULL)
    OR ("job_type" = 'FREELANCE' AND "salary_min" IS NULL AND "salary_max" IS NULL
                                 AND "budget" IS NOT NULL AND "budget_type" IS NOT NULL)
    -- allow both NULL while still in DRAFT/CONFIGURING, before the recruiter has
    -- filled in compensation yet
    OR ("status" IN ('DRAFT', 'CONFIGURING'))
  );

ALTER TABLE "jobs"
  ADD CONSTRAINT "ck_job_salary_band"
  CHECK ("salary_min" IS NULL OR "salary_max" IS NULL OR "salary_min" <= "salary_max");

ALTER TABLE "jobs"
  ADD CONSTRAINT "ck_job_experience_band"
  CHECK ("min_experience_years" IS NULL OR "max_experience_years" IS NULL
         OR "min_experience_years" <= "max_experience_years");

ALTER TABLE "jobs" ADD CONSTRAINT "ck_job_vacancies" CHECK ("vacancies" >= 1);

-- ═══ 6. Chat room has EXACTLY one parent ═══
ALTER TABLE "chat_rooms"
  ADD CONSTRAINT "ck_chat_room_single_parent"
  CHECK (num_nonnulls("contract_id", "application_id") = 1);

ALTER TABLE "chat_rooms"
  ADD CONSTRAINT "ck_chat_room_type_matches_parent"
  CHECK (
    ("room_type" = 'CONTRACT'  AND "contract_id"    IS NOT NULL) OR
    ("room_type" = 'INTERVIEW' AND "application_id" IS NOT NULL)
  );

-- Messages: system messages have no sender; user messages must have one.
ALTER TABLE "messages"
  ADD CONSTRAINT "ck_message_sender_matches_system_flag"
  CHECK (
    ("is_system" = true  AND "sender_id" IS NULL) OR
    ("is_system" = false AND "sender_id" IS NOT NULL)
  );

-- ═══ 7. Reviews ═══
ALTER TABLE "reviews" ADD CONSTRAINT "ck_review_rating" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "reviews" ADD CONSTRAINT "ck_review_comm_rating"
  CHECK ("comm_rating" IS NULL OR "comm_rating" BETWEEN 1 AND 5);
ALTER TABLE "reviews" ADD CONSTRAINT "ck_review_quality_rating"
  CHECK ("quality_rating" IS NULL OR "quality_rating" BETWEEN 1 AND 5);
ALTER TABLE "reviews" ADD CONSTRAINT "ck_review_not_self"
  CHECK ("reviewer_id" <> "reviewee_id");

-- ═══ 8. Money: positive amounts, non-negative balances ═══
-- NOTE: does NOT prevent double-spend under concurrency by itself — the release
-- and payout transactions MUST acquire a row lock (SELECT ... FOR UPDATE).
ALTER TABLE "wallets"
  ADD CONSTRAINT "ck_wallet_non_negative"
  CHECK ("available_balance" >= 0 AND "pending_balance" >= 0);

ALTER TABLE "transactions" ADD CONSTRAINT "ck_txn_positive" CHECK ("amount" > 0);
ALTER TABLE "payouts"      ADD CONSTRAINT "ck_payout_positive" CHECK ("amount" > 0);
ALTER TABLE "escrows"      ADD CONSTRAINT "ck_escrow_positive" CHECK ("amount" > 0);
ALTER TABLE "milestones"   ADD CONSTRAINT "ck_milestone_positive" CHECK ("amount" > 0);
ALTER TABLE "offers"       ADD CONSTRAINT "ck_offer_positive" CHECK ("compensation" > 0);
ALTER TABLE "proposals"    ADD CONSTRAINT "ck_proposal_bid_positive" CHECK ("bid_amount" > 0);

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
  ADD CONSTRAINT "ck_interview_sub_ratings"
  CHECK (
    ("comm_rating" IS NULL OR "comm_rating" BETWEEN 1 AND 5) AND
    ("tech_rating" IS NULL OR "tech_rating" BETWEEN 1 AND 5) AND
    ("culture_rating" IS NULL OR "culture_rating" BETWEEN 1 AND 5)
  );

ALTER TABLE "interviews"
  ADD CONSTRAINT "ck_interview_link_required"
  CHECK ("mode" <> 'ONLINE' OR "meeting_link" IS NOT NULL);

ALTER TABLE "interviews"
  ADD CONSTRAINT "ck_interview_location_required"
  CHECK ("mode" <> 'ONSITE' OR "location" IS NOT NULL);

ALTER TABLE "interviews"
  ADD CONSTRAINT "ck_interview_outcome_on_complete"
  CHECK ("status" <> 'COMPLETED' OR "recommendation" IS NOT NULL);

-- ═══ 11. Hiring stage automation completeness ═══
-- OA and INTERVIEW stage types must carry their automation link + email fields;
-- prerequisite / requirement doc remain genuinely optional even for those types.
ALTER TABLE "hiring_stages"
  ADD CONSTRAINT "ck_stage_automation_complete"
  CHECK (
    "stage_type" NOT IN ('OA', 'INTERVIEW')
    OR ("automation_link" IS NOT NULL AND "email_subject" IS NOT NULL
        AND "email_body_template" IS NOT NULL)
  );

-- ═══ 12. Skills / candidate proficiency ═══
ALTER TABLE "candidate_skills"
  ADD CONSTRAINT "ck_proficiency" CHECK ("proficiency" IS NULL OR "proficiency" BETWEEN 1 AND 5);

-- ═══ 13. Partial index for unread notification badge (hot path) ═══
CREATE INDEX "ix_notifications_unread"
  ON "notifications" ("user_id") WHERE NOT "is_read";

-- ═══ 14. KYC — only one PENDING submission per recruiter at a time ═══
CREATE UNIQUE INDEX "uq_kyc_pending_per_recruiter"
  ON "kyc_submissions" ("recruiter_id")
  WHERE "status" = 'PENDING';

-- ═══ 15. Education year sanity ═══
ALTER TABLE "candidate_education"
  ADD CONSTRAINT "ck_education_years"
  CHECK ("start_year" <= "end_year" AND "start_year" >= 1950 AND "end_year" <= 2100);

-- ═══ 16. Work experience: current role implies no end date ═══
ALTER TABLE "work_experiences"
  ADD CONSTRAINT "ck_work_current_no_end_date"
  CHECK (NOT "is_current" OR "end_date" IS NULL);
