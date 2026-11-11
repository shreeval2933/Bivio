-- =====================================================================
-- RMS — Integrity constraints + optional entities
-- Target: PostgreSQL 14+   (MySQL variants noted inline)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. APPLICATIONS — no duplicate live applications
-- ---------------------------------------------------------------------
-- A plain UNIQUE(job_id, candidate_id) would permanently block a
-- candidate who withdrew or was rejected. Scope uniqueness to live rows.

CREATE UNIQUE INDEX uq_applications_active
    ON applications (job_id, candidate_id)
    WHERE status NOT IN ('WITHDRAWN', 'REJECTED');

-- MySQL 8 has no partial indexes. Emulate with a generated column:
--   active_key VARCHAR(80) GENERATED ALWAYS AS (
--     CASE WHEN status IN ('WITHDRAWN','REJECTED') THEN NULL
--          ELSE CONCAT(job_id,':',candidate_id) END) STORED,
--   UNIQUE KEY uq_applications_active (active_key)
-- (NULLs are exempt from UNIQUE in MySQL, which is what we want.)


-- ---------------------------------------------------------------------
-- 2. PROPOSALS — no duplicate live bids on the same job
-- ---------------------------------------------------------------------
CREATE UNIQUE INDEX uq_proposals_active
    ON proposals (job_id, candidate_id)
    WHERE status NOT IN ('WITHDRAWN', 'REJECTED');


-- ---------------------------------------------------------------------
-- 3. CANDIDATE_SKILLS — one row per candidate/skill
-- ---------------------------------------------------------------------
ALTER TABLE candidate_skills
    ADD CONSTRAINT uq_candidate_skill UNIQUE (candidate_id, skill_id);

ALTER TABLE candidate_skills
    ADD CONSTRAINT ck_candidate_skill_proficiency
    CHECK (proficiency IS NULL OR proficiency BETWEEN 1 AND 5);

ALTER TABLE candidate_skills
    ADD CONSTRAINT ck_candidate_skill_years
    CHECK (years_of_experience IS NULL OR years_of_experience >= 0);


-- ---------------------------------------------------------------------
-- 4. JOB_SKILLS — one row per job/skill
-- ---------------------------------------------------------------------
ALTER TABLE job_skills
    ADD CONSTRAINT uq_job_skill UNIQUE (job_id, skill_id);

ALTER TABLE job_skills
    ADD CONSTRAINT ck_job_skill_weight
    CHECK (weight IS NULL OR weight BETWEEN 0 AND 100);


-- ---------------------------------------------------------------------
-- 5. REVIEWS — one review per reviewer per contract
-- ---------------------------------------------------------------------
ALTER TABLE reviews
    ADD CONSTRAINT uq_review_per_reviewer UNIQUE (contract_id, reviewer_id);

ALTER TABLE reviews
    ADD CONSTRAINT ck_review_rating CHECK (rating BETWEEN 1 AND 5);

-- A reviewer must not review themselves.
ALTER TABLE reviews
    ADD CONSTRAINT ck_review_not_self CHECK (reviewer_id <> reviewee_id);


-- ---------------------------------------------------------------------
-- 6. CHAT_ROOMS — exactly one parent (XOR)
-- ---------------------------------------------------------------------
ALTER TABLE chat_rooms
    ADD CONSTRAINT ck_chat_room_single_parent
    CHECK (num_nonnulls(contract_id, application_id) = 1);

-- MySQL 8:
--   CHECK ((contract_id IS NULL) <> (application_id IS NULL))

-- Keep room_type consistent with whichever parent is set.
ALTER TABLE chat_rooms
    ADD CONSTRAINT ck_chat_room_type_matches_parent
    CHECK (
        (room_type = 'CONTRACT'  AND contract_id    IS NOT NULL) OR
        (room_type = 'INTERVIEW' AND application_id IS NOT NULL)
    );

-- At most one room per parent.
CREATE UNIQUE INDEX uq_chat_room_contract
    ON chat_rooms (contract_id) WHERE contract_id IS NOT NULL;

CREATE UNIQUE INDEX uq_chat_room_application
    ON chat_rooms (application_id) WHERE application_id IS NOT NULL;

-- One participant row per user per room.
ALTER TABLE chat_participants
    ADD CONSTRAINT uq_chat_participant UNIQUE (room_id, user_id);


-- ---------------------------------------------------------------------
-- 7. MATCH_SCORES — current score is unique, history is retained
-- ---------------------------------------------------------------------
ALTER TABLE match_scores
    ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT TRUE;

-- Full uniqueness per model run (allows an audit trail).
ALTER TABLE match_scores
    ADD CONSTRAINT uq_match_score_run
    UNIQUE (job_id, candidate_id, model_version);

-- Exactly one live score per (job, candidate).
CREATE UNIQUE INDEX uq_match_score_current
    ON match_scores (job_id, candidate_id)
    WHERE is_current;

ALTER TABLE match_scores
    ADD CONSTRAINT ck_match_score_range CHECK (score BETWEEN 0 AND 100);

-- If you do NOT want history, drop the two indexes above and use:
--   ALTER TABLE match_scores
--     ADD CONSTRAINT uq_match_score UNIQUE (job_id, candidate_id);
-- then recompute via INSERT ... ON CONFLICT (job_id, candidate_id) DO UPDATE.


-- ---------------------------------------------------------------------
-- 8. AI_WEIGHTAGES — weights must total 100
-- ---------------------------------------------------------------------
ALTER TABLE ai_weightages
    ADD CONSTRAINT ck_ai_weights_sum
    CHECK (skill_weight + experience_weight
         + education_weight + project_weight = 100);

ALTER TABLE ai_weightages
    ADD CONSTRAINT ck_ai_weights_range
    CHECK (skill_weight     BETWEEN 0 AND 100
       AND experience_weight BETWEEN 0 AND 100
       AND education_weight  BETWEEN 0 AND 100
       AND project_weight    BETWEEN 0 AND 100);

ALTER TABLE ai_weightages
    ADD CONSTRAINT uq_ai_weightage_job UNIQUE (job_id);


-- ---------------------------------------------------------------------
-- 9. WALLETS — non-negative balances
-- ---------------------------------------------------------------------
ALTER TABLE wallets
    ADD CONSTRAINT ck_wallet_non_negative
    CHECK (available_balance >= 0 AND pending_balance >= 0);

ALTER TABLE wallets
    ADD CONSTRAINT uq_wallet_user UNIQUE (user_id);

-- NOTE: this CHECK does not prevent double-spend under concurrency.
-- Every debit must lock the wallet row first:
--
--   BEGIN;
--   SELECT available_balance FROM wallets WHERE id = $1 FOR UPDATE;
--   -- application asserts balance >= amount
--   UPDATE wallets SET available_balance = available_balance - $2 WHERE id = $1;
--   INSERT INTO transactions (...) VALUES (...);
--   COMMIT;
--
-- Treat `wallets` as a cache of the `transactions` ledger and reconcile:
--   SELECT wallet_id,
--          SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END)
--   FROM transactions GROUP BY wallet_id;

ALTER TABLE transactions
    ADD CONSTRAINT ck_transaction_amount_positive CHECK (amount > 0);

ALTER TABLE payouts
    ADD CONSTRAINT ck_payout_amount_positive CHECK (amount > 0);


-- ---------------------------------------------------------------------
-- 10. ESCROW / MILESTONES / CONTRACTS — money integrity
-- ---------------------------------------------------------------------
ALTER TABLE escrows
    ADD CONSTRAINT uq_escrow_milestone UNIQUE (milestone_id);

ALTER TABLE escrows
    ADD CONSTRAINT ck_escrow_amount_positive CHECK (amount > 0);

-- Released/refunded escrows must carry a timestamp.
ALTER TABLE escrows
    ADD CONSTRAINT ck_escrow_released_at
    CHECK (status <> 'RELEASED' OR released_at IS NOT NULL);

ALTER TABLE milestones
    ADD CONSTRAINT uq_milestone_sequence UNIQUE (contract_id, sequence);

ALTER TABLE milestones
    ADD CONSTRAINT ck_milestone_amount_positive CHECK (amount > 0);

ALTER TABLE milestone_submissions
    ADD CONSTRAINT uq_submission_version UNIQUE (milestone_id, version_no);

ALTER TABLE contracts
    ADD CONSTRAINT uq_contract_proposal UNIQUE (proposal_id);

ALTER TABLE contracts
    ADD CONSTRAINT ck_contract_fee_percent
    CHECK (platform_fee_percent BETWEEN 0 AND 100);

-- Disputes split the escrowed amount between the two parties.
ALTER TABLE disputes
    ADD CONSTRAINT ck_dispute_resolution_amounts
    CHECK (
        status <> 'RESOLVED'
        OR (amount_to_freelancer IS NOT NULL
            AND amount_to_client IS NOT NULL
            AND amount_to_freelancer >= 0
            AND amount_to_client >= 0)
    );


-- ---------------------------------------------------------------------
-- 11. JOBS / OFFERS / INVITATIONS — shape and lifecycle
-- ---------------------------------------------------------------------
-- Full-time jobs carry a salary band; freelance jobs carry a budget.
ALTER TABLE jobs
    ADD CONSTRAINT ck_job_compensation_shape
    CHECK (
        (job_type = 'FULL_TIME'
            AND budget IS NULL AND budget_type IS NULL)
     OR (job_type = 'FREELANCE'
            AND salary_min IS NULL AND salary_max IS NULL
            AND budget IS NOT NULL AND budget_type IS NOT NULL)
    );

ALTER TABLE jobs
    ADD CONSTRAINT ck_job_salary_band
    CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max);

ALTER TABLE jobs
    ADD CONSTRAINT ck_job_vacancies CHECK (vacancies >= 1);

ALTER TABLE hiring_stages
    ADD CONSTRAINT uq_hiring_stage_sequence UNIQUE (job_id, sequence);

ALTER TABLE hiring_stages
    ADD CONSTRAINT uq_hiring_stage_name UNIQUE (job_id, name);

ALTER TABLE offers
    ADD CONSTRAINT uq_offer_application UNIQUE (application_id);

ALTER TABLE offers
    ADD CONSTRAINT ck_offer_compensation_positive CHECK (compensation > 0);

-- One live invitation per job/candidate; re-invite allowed after decline.
CREATE UNIQUE INDEX uq_invitation_active
    ON invitations (job_id, candidate_id)
    WHERE status = 'SENT';


-- =====================================================================
-- OPTIONAL ENTITIES
-- =====================================================================

-- ---------------------------------------------------------------------
-- INTERVIEWS — sits between APPLICATIONS and OFFERS
-- ---------------------------------------------------------------------
CREATE TABLE interviews (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id    UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    hiring_stage_id   UUID REFERENCES hiring_stages(id),
    interviewer_id    UUID NOT NULL REFERENCES users(id),
    round_no          SMALLINT NOT NULL DEFAULT 1,
    scheduled_at      TIMESTAMPTZ NOT NULL,
    duration_minutes  SMALLINT NOT NULL DEFAULT 60,
    mode              TEXT NOT NULL,   -- ONLINE | PHONE | ONSITE
    meeting_link      TEXT,
    location          TEXT,
    status            TEXT NOT NULL DEFAULT 'SCHEDULED',
                      -- SCHEDULED | COMPLETED | CANCELLED | NO_SHOW | RESCHEDULED
    feedback          TEXT,
    rating            SMALLINT,
    recommendation    TEXT,            -- PROCEED | HOLD | REJECT
    submitted_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_interview_round UNIQUE (application_id, round_no),
    CONSTRAINT ck_interview_mode
        CHECK (mode IN ('ONLINE', 'PHONE', 'ONSITE')),
    CONSTRAINT ck_interview_rating
        CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
    CONSTRAINT ck_interview_link_required
        CHECK (mode <> 'ONLINE' OR meeting_link IS NOT NULL),
    CONSTRAINT ck_interview_feedback_on_complete
        CHECK (status <> 'COMPLETED' OR recommendation IS NOT NULL)
);

CREATE INDEX ix_interviews_application ON interviews (application_id);
CREATE INDEX ix_interviews_interviewer ON interviews (interviewer_id, scheduled_at);
CREATE INDEX ix_interviews_upcoming
    ON interviews (scheduled_at) WHERE status = 'SCHEDULED';


-- ---------------------------------------------------------------------
-- RESUMES — versioned, replaces candidate_profiles.resume_url
-- ---------------------------------------------------------------------
CREATE TABLE resumes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id  UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    version       SMALLINT NOT NULL,
    file_url      TEXT NOT NULL,
    file_name     TEXT NOT NULL,
    mime_type     TEXT NOT NULL,
    size_bytes    BIGINT NOT NULL,
    parsed_text   TEXT,          -- feeds the AI matcher
    is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_resume_version UNIQUE (candidate_id, version),
    CONSTRAINT ck_resume_size CHECK (size_bytes > 0)
);

-- Exactly one primary resume per candidate.
CREATE UNIQUE INDEX uq_resume_primary
    ON resumes (candidate_id) WHERE is_primary;

-- Applications should pin the resume that was actually sent.
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS resume_id UUID REFERENCES resumes(id);

-- Then retire the denormalized column:
--   ALTER TABLE candidate_profiles DROP COLUMN resume_url;


-- ---------------------------------------------------------------------
-- PORTFOLIO_PROJECTS — replaces the single portfolio_url
-- ---------------------------------------------------------------------
CREATE TABLE portfolio_projects (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id   UUID NOT NULL REFERENCES freelance_portfolios(id) ON DELETE CASCADE,
    title          TEXT NOT NULL,
    description    TEXT,
    role           TEXT,
    repository_url TEXT,
    live_url       TEXT,
    cover_image_url TEXT,
    started_on     DATE,
    completed_on   DATE,
    display_order  SMALLINT NOT NULL DEFAULT 0,
    is_featured    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_project_dates
        CHECK (completed_on IS NULL OR started_on IS NULL
               OR completed_on >= started_on)
);

CREATE INDEX ix_portfolio_projects_portfolio
    ON portfolio_projects (portfolio_id, display_order);

-- Tech stack per project, reusing the shared skills table.
CREATE TABLE portfolio_project_skills (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
    skill_id   UUID NOT NULL REFERENCES skills(id),

    CONSTRAINT uq_project_skill UNIQUE (project_id, skill_id)
);


-- =====================================================================
-- SUPPORTING INDEXES
-- =====================================================================
CREATE INDEX ix_jobs_browse         ON jobs (status, job_type, created_at DESC);
CREATE INDEX ix_applications_job    ON applications (job_id, status);
CREATE INDEX ix_applications_cand   ON applications (candidate_id, applied_at DESC);
CREATE INDEX ix_proposals_job       ON proposals (job_id, status);
CREATE INDEX ix_match_scores_rank   ON match_scores (job_id, score DESC) WHERE is_current;
CREATE INDEX ix_messages_room       ON messages (room_id, sent_at DESC);
CREATE INDEX ix_notifications_unread ON notifications (user_id) WHERE NOT is_read;
CREATE INDEX ix_transactions_wallet ON transactions (wallet_id, created_at DESC);
CREATE INDEX ix_stage_movements_app ON stage_movements (application_id, moved_at);
CREATE INDEX ix_audit_logs_entity   ON audit_logs (entity_type, entity_id, created_at DESC);
