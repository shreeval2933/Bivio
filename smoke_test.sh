#!/usr/bin/env bash
# ============================================================================
# Bivio Backend — Full Smoke Test
#
# Exercises the critical path of all 8 modules against a REAL running
# instance + real database. Requires: the backend running (npm run dev),
# seeded (npm run seed), and `jq` installed (`sudo apt install jq` /
# `brew install jq`).
#
# This is NOT a substitute for the unit tests already in tests/ — those
# check pure logic with no DB. This checks the opposite: does the whole
# thing actually work end-to-end against a live Postgres instance, which
# static analysis and unit tests structurally cannot tell you.
#
# Usage:
#   BASE_URL=http://localhost:4000 ./smoke_test.sh
# ============================================================================

set -u  # error on unset vars; deliberately NOT -e — one failed step
        # shouldn't stop the whole report, we want to see every result

BASE_URL="${BASE_URL:-http://localhost:4000}"
API="$BASE_URL/api"
PASS=0
FAIL=0
FAILED_STEPS=()

# ── Output helpers ──────────────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

section() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }

# check <label> <expected_status> <actual_status> <body>
# Prints PASS/FAIL, tracks counts, and on FAIL prints the response body so
# you can see the actual error instead of just "something broke".
check() {
  local label="$1" expected="$2" actual="$3" body="$4"
  if [ "$actual" = "$expected" ]; then
    echo -e "  ${GREEN}✓ PASS${NC}  $label  (HTTP $actual)"
    PASS=$((PASS+1))
  else
    echo -e "  ${RED}✗ FAIL${NC}  $label  (expected $expected, got $actual)"
    echo -e "         ${YELLOW}Response:${NC} $(echo "$body" | head -c 300)"
    FAIL=$((FAIL+1))
    FAILED_STEPS+=("$label")
  fi
}

# req <method> <path> <token-or-empty> <json-body-or-empty>
# Fires the request, returns "STATUS<TAB>BODY" — callers split on tab.
req() {
  local method="$1" path="$2" token="$3" data="$4"
  local args=(-s -w "\n%{http_code}" -X "$method" "$API$path" -H "Content-Type: application/json")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$data" ] && args+=(-d "$data")
  local response
  response=$(curl "${args[@]}")
  local status body
  status=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  echo -e "${status}\t${body}"
}

TS=$(date +%s)  # unique suffix so reruns don't collide on unique constraints

echo "============================================================"
echo " Bivio Backend Smoke Test — $(date)"
echo " Target: $BASE_URL"
echo "============================================================"

# ═══════════════════════════════════════════════════════════════
# 0. HEALTH CHECK
# ═══════════════════════════════════════════════════════════════
section "0. Health check"
health_response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
status=$(echo "$health_response" | tail -n1)
body=$(echo "$health_response" | sed '$d')
check "GET /health" "200" "$status" "$body"

# ═══════════════════════════════════════════════════════════════
# 1. AUTH — register a fresh recruiter + candidate, log in as admin
# ═══════════════════════════════════════════════════════════════
section "1. Auth module"

RECRUITER_EMAIL="smoketest-recruiter-${TS}@example.com"
resp=$(req POST /auth/register "" "{\"fullName\":\"Smoke Recruiter\",\"email\":\"$RECRUITER_EMAIL\",\"password\":\"Password123!\",\"role\":\"RECRUITER\",\"companyName\":\"Smoke Test Co\"}")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "Register recruiter" "201" "$status" "$body"
RECRUITER_TOKEN=$(echo "$body" | jq -r '.accessToken // empty')

CANDIDATE_EMAIL="smoketest-candidate-${TS}@example.com"
resp=$(req POST /auth/register "" "{\"fullName\":\"Smoke Candidate\",\"email\":\"$CANDIDATE_EMAIL\",\"password\":\"Password123!\",\"role\":\"CANDIDATE\"}")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "Register candidate" "201" "$status" "$body"
CANDIDATE_TOKEN=$(echo "$body" | jq -r '.accessToken // empty')

resp=$(req POST /auth/login "" "{\"email\":\"admin@bivio.example\",\"password\":\"Password123!\"}")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "Login as seeded admin" "200" "$status" "$body"
ADMIN_TOKEN=$(echo "$body" | jq -r '.accessToken // empty')

resp=$(req GET /me "$RECRUITER_TOKEN" "")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "GET /me (recruiter)" "200" "$status" "$body"

resp=$(req POST /auth/login "" "{\"email\":\"$RECRUITER_EMAIL\",\"password\":\"wrong-password\"}")
status=$(echo "$resp" | cut -f1)
check "Login with wrong password is rejected" "401" "$status" ""

if [ -z "$RECRUITER_TOKEN" ] || [ -z "$CANDIDATE_TOKEN" ] || [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${RED}Cannot continue without all three tokens — stopping here.${NC}"
  echo "PASS=$PASS FAIL=$FAIL"
  exit 1
fi

# ═══════════════════════════════════════════════════════════════
# 2. PROFILES — skills lookup, candidate profile, recruiter profile
# ═══════════════════════════════════════════════════════════════
section "2. Profiles module"

resp=$(req GET /skills "$CANDIDATE_TOKEN" "")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "GET /skills" "200" "$status" "$body"
SKILL_ID_1=$(echo "$body" | jq -r '.[0].id // empty')
SKILL_ID_2=$(echo "$body" | jq -r '.[1].id // empty')

resp=$(req GET /candidates/me "$CANDIDATE_TOKEN" "")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "GET /candidates/me" "200" "$status" "$body"

resp=$(req PATCH /candidates/me "$CANDIDATE_TOKEN" '{"headline":"Full Stack Engineer","openToFullTime":true,"openToFreelance":true}')
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "PATCH /candidates/me" "200" "$status" "$body"

resp=$(req PUT /candidates/me/skills "$CANDIDATE_TOKEN" "{\"skills\":[{\"skillId\":\"$SKILL_ID_1\",\"proficiency\":5},{\"skillId\":\"$SKILL_ID_2\",\"proficiency\":4}]}")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "PUT /candidates/me/skills" "200" "$status" "$body"

resp=$(req GET /recruiters/me "$RECRUITER_TOKEN" "")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "GET /recruiters/me" "200" "$status" "$body"

resp=$(req PATCH /recruiters/me "$RECRUITER_TOKEN" '{"designation":"Head of Talent"}')
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "PATCH /recruiters/me" "200" "$status" "$body"

# NOTE — a real gap, not a test bug: there is no candidate-side equivalent of
# /recruiters/me/posting-fee/confirm. CandidateProfile.fullTimeFeePaid can
# only be set true directly in the database right now (see the .md guide's
# workaround). Flagging this here so it isn't missed.

# ═══════════════════════════════════════════════════════════════
# 3. JOBS — the full-time wizard, including the one-time fee gate
# ═══════════════════════════════════════════════════════════════
section "3. Jobs module (full-time wizard + OQ-1 fee gate)"

resp=$(req POST /jobs "$RECRUITER_TOKEN" "{
  \"jobType\":\"FULL_TIME\",\"title\":\"Smoke Test Backend Engineer\",
  \"description\":\"Own the core API for a growing platform, end to end.\",
  \"skillIds\":[\"$SKILL_ID_1\",\"$SKILL_ID_2\"],\"mandatorySkillIds\":[\"$SKILL_ID_1\"],
  \"employmentType\":\"FULL_TIME\",\"experienceLevel\":\"SENIOR\",
  \"salaryMin\":2000000,\"salaryMax\":3000000,\"minExperienceYears\":4,\"minEducationLevel\":\"BACHELORS\"
}")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "POST /jobs (create full-time draft)" "201" "$status" "$body"
JOB_ID=$(echo "$body" | jq -r '.id // empty')

resp=$(req POST "/jobs/$JOB_ID/stages" "$RECRUITER_TOKEN" '{"stages":[{"name":"Technical Round","stageType":"CUSTOM"}]}')
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "POST /jobs/:id/stages" "200" "$status" "$body"
STAGE_SCREENING=$(echo "$body" | jq -r '.[] | select(.stageType=="SCREENING") | .id')
STAGE_CUSTOM=$(echo "$body" | jq -r '.[] | select(.stageType=="CUSTOM") | .id')
STAGE_OFFER=$(echo "$body" | jq -r '.[] | select(.stageType=="OFFER") | .id')

resp=$(req PUT "/jobs/$JOB_ID/weightage" "$RECRUITER_TOKEN" '{"skillWeight":40,"experienceWeight":30,"educationWeight":15,"domainWeight":10,"practicalFitWeight":5}')
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "PUT /jobs/:id/weightage (sums to 100)" "200" "$status" "$body"

resp=$(req PUT "/jobs/$JOB_ID/weightage" "$RECRUITER_TOKEN" '{"skillWeight":40,"experienceWeight":30}')
status=$(echo "$resp" | cut -f1)
check "PUT /jobs/:id/weightage rejects a sum != 100" "422" "$status" ""

resp=$(req POST "/jobs/$JOB_ID/publish" "$RECRUITER_TOKEN" "")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "OQ-1: publish BLOCKED — new recruiter hasn't paid the one-time fee" "402" "$status" "$body"

resp=$(req POST /recruiters/me/posting-fee/confirm "$RECRUITER_TOKEN" "")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "POST /recruiters/me/posting-fee/confirm" "200" "$status" "$body"

resp=$(req POST "/jobs/$JOB_ID/publish" "$RECRUITER_TOKEN" "")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "OQ-1: publish SUCCEEDS after the one-time fee is paid" "200" "$status" "$body"

resp=$(req POST "/jobs/$JOB_ID/publish" "$RECRUITER_TOKEN" "")
status=$(echo "$resp" | cut -f1)
check "Publishing an already-OPEN job is rejected (state machine)" "409" "$status" ""

resp=$(req GET /jobs "" "")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "GET /jobs (public listing)" "200" "$status" "$body"

resp=$(req GET "/jobs/$JOB_ID" "" "")
status=$(echo "$resp" | cut -f1)
check "GET /jobs/:id" "200" "$status" ""

# ── Freelance job, for the freelance flow later ──
resp=$(req POST /jobs "$RECRUITER_TOKEN" '{
  "jobType":"FREELANCE","title":"Smoke Test Landing Page",
  "description":"Redesign the marketing landing page for conversion.",
  "skillIds":["'"$SKILL_ID_1"'"],"deliverables":["Figma mockups","Responsive build"],
  "budgetType":"FIXED","budget":50000,"freelanceExperienceLevel":"INTERMEDIATE",
  "projectLengthEstimate":"W1_4"
}')
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "POST /jobs (create freelance draft)" "201" "$status" "$body"
FL_JOB_ID=$(echo "$body" | jq -r '.id // empty')

resp=$(req PUT "/jobs/$FL_JOB_ID/weightage" "$RECRUITER_TOKEN" '{"skillWeight":35,"portfolioWeight":30,"rateFitWeight":15,"trackRecordWeight":15,"availabilityWeight":5}')
status=$(echo "$resp" | cut -f1)
check "PUT /jobs/:id/weightage (freelance factor set)" "200" "$status" ""

resp=$(req POST "/jobs/$FL_JOB_ID/publish" "$RECRUITER_TOKEN" "")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "POST /jobs/:id/publish (freelance, fee already paid)" "200" "$status" "$body"

# ═══════════════════════════════════════════════════════════════
# 4. HIRING — apply, move stages, schedule interview, extend + accept offer
# ═══════════════════════════════════════════════════════════════
section "4. Hiring module"

# OQ-1 candidate profile-fee confirmation
resp=$(req POST /candidates/me/profile-fee/confirm "$CANDIDATE_TOKEN" "")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "POST /candidates/me/profile-fee/confirm" "200" "$status" "$body"

resp=$(req POST "/jobs/$JOB_ID/apply" "$CANDIDATE_TOKEN" '{"coverNote":"Excited about this role."}')
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "POST /jobs/:id/apply" "201" "$status" "$body"
APPLICATION_ID=$(echo "$body" | jq -r '.id // empty')

resp=$(req GET /applications "$CANDIDATE_TOKEN" "")
status=$(echo "$resp" | cut -f1)
check "GET /applications" "200" "$status" ""

resp=$(req PATCH "/applications/$APPLICATION_ID/stage" "$RECRUITER_TOKEN" "{\"toStageId\":\"$STAGE_CUSTOM\"}")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "PATCH /applications/:id/stage (Screening -> Technical Round)" "200" "$status" "$body"

RECRUITER_USER_ID=$(req GET /me "$RECRUITER_TOKEN" "" | cut -f2 | jq -r '.id // empty')
resp=$(req POST "/applications/$APPLICATION_ID/interviews" "$RECRUITER_TOKEN" "{
  \"interviewerId\":\"$RECRUITER_USER_ID\",\"scheduledAt\":\"2026-09-01T10:00:00.000Z\",
  \"mode\":\"ONLINE\",\"meetingLink\":\"https://meet.example.com/smoke-test\"
}")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "POST /applications/:id/interviews" "201" "$status" "$body"
INTERVIEW_ID=$(echo "$body" | jq -r '.id // empty')

resp=$(req PATCH "/interviews/$INTERVIEW_ID/feedback" "$RECRUITER_TOKEN" '{"rating":5,"recommendation":"PROCEED","feedback":"Strong technical round."}')
status=$(echo "$resp" | cut -f1)
check "PATCH /interviews/:id/feedback (requires recommendation)" "200" "$status" ""

resp=$(req PATCH "/applications/$APPLICATION_ID/stage" "$RECRUITER_TOKEN" "{\"toStageId\":\"$STAGE_OFFER\"}")
status=$(echo "$resp" | cut -f1)
check "PATCH /applications/:id/stage (-> Offer)" "200" "$status" ""

resp=$(req POST "/applications/$APPLICATION_ID/offer" "$RECRUITER_TOKEN" '{"compensation":2500000,"currency":"INR"}')
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "POST /applications/:id/offer" "201" "$status" "$body"
OFFER_ID=$(echo "$body" | jq -r '.id // empty')

resp=$(req PATCH "/offers/$OFFER_ID/respond" "$CANDIDATE_TOKEN" '{"accept":true}')
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "PATCH /offers/:id/respond (accept -> HIRED)" "200" "$status" "$body"

# ═══════════════════════════════════════════════════════════════
# 5. FREELANCE — proposal → contract → milestone → escrow release
#    THIS IS THE MOST IMPORTANT SECTION. If only one section gets a manual
#    re-check beyond this script, make it this one.
# ═══════════════════════════════════════════════════════════════
section "5. Freelance module — the centerpiece escrow transaction"

resp=$(req POST "/jobs/$FL_JOB_ID/proposals" "$CANDIDATE_TOKEN" '{
  "bidAmount":50000,"coverLetter":"I have built escrow ledgers with row-level locking before and can start immediately, delivering the full redesign within the stated timeline.",
  "milestones":[{"title":"Full delivery","amount":50000,"sequence":1}]
}')
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "POST /jobs/:id/proposals" "201" "$status" "$body"
PROPOSAL_ID=$(echo "$body" | jq -r '.id // empty')

resp=$(req POST "/proposals/$PROPOSAL_ID/accept" "$RECRUITER_TOKEN" '{}')
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "POST /proposals/:id/accept (creates Contract + Milestones)" "201" "$status" "$body"
CONTRACT_ID=$(echo "$body" | jq -r '.id // empty')
MILESTONE_ID=$(echo "$body" | jq -r '.milestones[0].id // empty')

resp=$(req GET "/contracts/$CONTRACT_ID" "$RECRUITER_TOKEN" "")
status=$(echo "$resp" | cut -f1)
check "GET /contracts/:id (client can view)" "200" "$status" ""

resp=$(req GET "/contracts/$CONTRACT_ID" "$CANDIDATE_TOKEN" "")
status=$(echo "$resp" | cut -f1)
check "GET /contracts/:id (freelancer can view)" "200" "$status" ""

# Wallet balance BEFORE approval — the number we'll check against after.
BALANCE_BEFORE=$(req GET /wallet "$CANDIDATE_TOKEN" "" | cut -f2 | jq -r '.availableBalance // "0"')

resp=$(req POST "/milestones/$MILESTONE_ID/fund" "$RECRUITER_TOKEN" '{}')
status=$(echo "$resp" | cut -f1)
check "POST /milestones/:id/fund" "200" "$status" ""

resp=$(req POST "/milestones/$MILESTONE_ID/submit" "$CANDIDATE_TOKEN" '{"note":"Delivered — see attached mockups and build."}')
status=$(echo "$resp" | cut -f1)
check "POST /milestones/:id/submit" "200" "$status" ""

resp=$(req POST "/milestones/$MILESTONE_ID/approve" "$RECRUITER_TOKEN" "")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "POST /milestones/:id/approve (THE guarded release transaction)" "200" "$status" "$body"

resp=$(req POST "/milestones/$MILESTONE_ID/approve" "$RECRUITER_TOKEN" "")
status=$(echo "$resp" | cut -f1)
check "Approving an already-PAID milestone is rejected (idempotency guard)" "409" "$status" ""

BALANCE_AFTER=$(req GET /wallet "$CANDIDATE_TOKEN" "" | cut -f2 | jq -r '.availableBalance // "0"')
EXPECTED_NET="45000.00"  # 50000 - 10% platform fee, matches the seeded PLATFORM_FEE_PERCENT default
echo -e "  ${YELLOW}Wallet check:${NC} before=$BALANCE_BEFORE after=$BALANCE_AFTER (expected +$EXPECTED_NET)"
if jq -e -n "($BALANCE_AFTER - $BALANCE_BEFORE) == $EXPECTED_NET" >/dev/null; then
  echo -e "  ${GREEN}✓ PASS${NC}  Wallet credited the correct net amount after the platform fee"
  PASS=$((PASS+1))
else
  echo -e "  ${RED}✗ FAIL${NC}  Wallet delta does not match expected net (check PLATFORM_FEE_PERCENT setting value, or Decimal math)"
  FAIL=$((FAIL+1))
  FAILED_STEPS+=("Wallet balance arithmetic")
fi

resp=$(req GET "/contracts/$CONTRACT_ID" "$RECRUITER_TOKEN" "")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
CONTRACT_STATUS=$(echo "$body" | jq -r '.status // empty')
check "Contract auto-COMPLETED after its only milestone was paid" "200" "$status" ""
if [ "$CONTRACT_STATUS" = "COMPLETED" ]; then
  echo -e "  ${GREEN}✓ PASS${NC}  Contract status is COMPLETED"; PASS=$((PASS+1))
else
  echo -e "  ${RED}✗ FAIL${NC}  Contract status is '$CONTRACT_STATUS', expected COMPLETED"; FAIL=$((FAIL+1))
  FAILED_STEPS+=("Contract auto-completion")
fi

resp=$(req POST "/contracts/$CONTRACT_ID/reviews" "$CANDIDATE_TOKEN" '{"rating":5,"comment":"Great client, clear scope."}')
status=$(echo "$resp" | cut -f1)
check "POST /contracts/:id/reviews (freelancer reviews client)" "201" "$status" ""

resp=$(req POST "/contracts/$CONTRACT_ID/reviews" "$RECRUITER_TOKEN" '{"rating":5,"comment":"Delivered on time, great communication."}')
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "POST /contracts/:id/reviews (client reviews freelancer -> both publish)" "201" "$status" "$body"

# ═══════════════════════════════════════════════════════════════
# 6. PAYMENTS — payout request
# ═══════════════════════════════════════════════════════════════
section "6. Payments module"

resp=$(req GET /wallet/transactions "$CANDIDATE_TOKEN" "")
status=$(echo "$resp" | cut -f1)
check "GET /wallet/transactions" "200" "$status" ""

resp=$(req POST /payouts "$CANDIDATE_TOKEN" '{"amount":1000,"payoutMethod":"UPI","payoutDetails":{"upiId":"smoketest@upi"}}')
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "POST /payouts (request)" "201" "$status" "$body"
PAYOUT_ID=$(echo "$body" | jq -r '.id // empty')
PAYOUT_STATUS=$(echo "$body" | jq -r '.status // empty')
echo -e "  ${YELLOW}Payout resolved to:${NC} $PAYOUT_STATUS (mock gateway succeeds unless mockFail:true was sent)"

resp=$(req GET /payouts "$CANDIDATE_TOKEN" "")
status=$(echo "$resp" | cut -f1)
check "GET /payouts" "200" "$status" ""

# Deliberately trigger a mock failure, then retry it — exercises the
# reversal-on-failure path and the retry state transition.
resp=$(req POST /payouts "$CANDIDATE_TOKEN" '{"amount":1000,"payoutMethod":"UPI","payoutDetails":{"upiId":"smoketest@upi"},"mockFail":true}')
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
FAILED_PAYOUT_ID=$(echo "$body" | jq -r '.id // empty')
FAILED_PAYOUT_STATUS=$(echo "$body" | jq -r '.status // empty')
check "POST /payouts with mockFail:true" "201" "$status" "$body"
if [ "$FAILED_PAYOUT_STATUS" = "FAILED" ]; then
  echo -e "  ${GREEN}✓ PASS${NC}  Payout correctly resolved to FAILED"; PASS=$((PASS+1))
else
  echo -e "  ${RED}✗ FAIL${NC}  Expected FAILED, got '$FAILED_PAYOUT_STATUS'"; FAIL=$((FAIL+1))
  FAILED_STEPS+=("mockFail payout resolution")
fi

resp=$(req POST "/payouts/$FAILED_PAYOUT_ID/retry" "$CANDIDATE_TOKEN" "")
status=$(echo "$resp" | cut -f1)
check "POST /payouts/:id/retry" "200" "$status" ""

# ═══════════════════════════════════════════════════════════════
# 7. MESSAGING — notifications + chat (contract's room was created on accept)
# ═══════════════════════════════════════════════════════════════
section "7. Messaging module"

resp=$(req GET /notifications "$CANDIDATE_TOKEN" "")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "GET /notifications" "200" "$status" "$body"
NOTIF_ID=$(echo "$body" | jq -r '.[0].id // empty')

if [ -n "$NOTIF_ID" ]; then
  resp=$(req PATCH "/notifications/$NOTIF_ID/read" "$CANDIDATE_TOKEN" "")
  status=$(echo "$resp" | cut -f1)
  check "PATCH /notifications/:id/read" "200" "$status" ""
fi

resp=$(req PATCH /notifications/read-all "$CANDIDATE_TOKEN" "")
status=$(echo "$resp" | cut -f1)
check "PATCH /notifications/read-all" "200" "$status" ""

resp=$(req GET /chat/rooms "$CANDIDATE_TOKEN" "")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "GET /chat/rooms (contract room from proposal acceptance)" "200" "$status" "$body"
ROOM_ID=$(echo "$body" | jq -r '.[0].id // empty')

if [ -n "$ROOM_ID" ]; then
  resp=$(req GET "/chat/rooms/$ROOM_ID/messages" "$CANDIDATE_TOKEN" "")
  status=$(echo "$resp" | cut -f1)
  check "GET /chat/rooms/:id/messages" "200" "$status" ""

  resp=$(req POST "/chat/rooms/$ROOM_ID/messages" "$CANDIDATE_TOKEN" '{"body":"Smoke test message — everything delivered as agreed."}')
  status=$(echo "$resp" | cut -f1)
  check "POST /chat/rooms/:id/messages (REST fallback path)" "201" "$status" ""
else
  echo -e "  ${YELLOW}(skipped message send — no room id resolved)${NC}"
fi

# ═══════════════════════════════════════════════════════════════
# 8. ADMIN — disputes, users, verifications, financials, settings
# ═══════════════════════════════════════════════════════════════
section "8. Admin module"

resp=$(req GET /admin/disputes "$ADMIN_TOKEN" "")
status=$(echo "$resp" | cut -f1)
check "GET /admin/disputes" "200" "$status" ""

resp=$(req GET /admin/users "$ADMIN_TOKEN" "")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "GET /admin/users" "200" "$status" "$body"

resp=$(req GET /admin/verifications "$ADMIN_TOKEN" "")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "GET /admin/verifications (empty until KYC submission exists — see .md)" "200" "$status" "$body"

resp=$(req GET /admin/financials "$ADMIN_TOKEN" "")
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "GET /admin/financials" "200" "$status" "$body"
REVENUE=$(echo "$body" | jq -r '.totalRevenue // "0"')
echo -e "  ${YELLOW}Total revenue recorded so far:${NC} ₹$REVENUE (should include this run's posting fee + commission)"

resp=$(req GET /admin/settings "$ADMIN_TOKEN" "")
status=$(echo "$resp" | cut -f1)
check "GET /admin/settings" "200" "$status" ""

resp=$(req GET /admin/users "$CANDIDATE_TOKEN" "")
status=$(echo "$resp" | cut -f1)
check "GET /admin/* rejects a non-admin token" "403" "$status" ""

# Impersonation — mandatory reason, then confirm the guard actually blocks
# a money-moving action while impersonating.
CANDIDATE_USER_ID=$(req GET /me "$CANDIDATE_TOKEN" "" | cut -f2 | jq -r '.id // empty')
resp=$(req POST "/admin/users/$CANDIDATE_USER_ID/impersonate" "$ADMIN_TOKEN" '{"reason":"Smoke test verifying the impersonation guard."}')
status=$(echo "$resp" | cut -f1); body=$(echo "$resp" | cut -f2)
check "POST /admin/users/:id/impersonate (requires a reason)" "201" "$status" "$body"
IMPERSONATION_TOKEN=$(echo "$body" | jq -r '.accessToken // empty')

resp=$(req POST /payouts "$IMPERSONATION_TOKEN" '{"amount":1000,"payoutMethod":"UPI","payoutDetails":{"upiId":"x@upi"}}')
status=$(echo "$resp" | cut -f1)
check "blockDuringImpersonation: payout request BLOCKED during impersonation" "403" "$status" ""

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════
echo ""
echo "============================================================"
echo -e " ${GREEN}PASS: $PASS${NC}   ${RED}FAIL: $FAIL${NC}"
if [ "$FAIL" -gt 0 ]; then
  echo -e " ${RED}Failed steps:${NC}"
  for step in "${FAILED_STEPS[@]}"; do echo "   - $step"; done
fi
echo "============================================================"

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
