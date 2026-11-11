'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Stack,
  Button,
  Chip,
  Divider,
  LinearProgress,
  Avatar,
  CircularProgress,
} from '@mui/material';
import Link from 'next/link';

// Icons
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EventIcon from '@mui/icons-material/Event';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import DescriptionIcon from '@mui/icons-material/Description';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import GavelIcon from '@mui/icons-material/Gavel';
import NotificationsIcon from '@mui/icons-material/Notifications';

// API queries
import { useGetMeQuery } from '@/store/api/authApi';
import { useGetCandidateProfileQuery } from '@/store/api/profilesApi';
import { useGetInvitationsQuery } from '@/store/api/applicationsApi';
import { useGetOffersQuery } from '@/store/api/applicationsApi';
import { useGetContractsQuery } from '@/store/api/contractsApi';
import { useGetInterviewsQuery } from '@/store/api/interviewsApi';
import { useGetProposalsQuery } from '@/store/api/contractsApi';
import { useGetApplicationsQuery } from '@/store/api/applicationsApi';
import { useGetJobsQuery } from '@/store/api/jobsApi';

export default function CandidateDashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // API Hooks
  const { data: me, isLoading: meLoading } = useGetMeQuery(undefined, { skip: !mounted });
  const { data: profile, isLoading: profileLoading } = useGetCandidateProfileQuery(undefined, { skip: !mounted });
  const { data: invitations = [], isLoading: invitationsLoading } = useGetInvitationsQuery(undefined, { skip: !mounted });
  const { data: offers = [], isLoading: offersLoading } = useGetOffersQuery(undefined, { skip: !mounted });
  const { data: contractsResponse, isLoading: contractsLoading } = useGetContractsQuery(undefined, { skip: !mounted });
  const { data: interviews = [], isLoading: interviewsLoading } = useGetInterviewsQuery(undefined, { skip: !mounted });
  const { data: proposalsResponse, isLoading: proposalsLoading } = useGetProposalsQuery(undefined, { skip: !mounted });
  const { data: applicationsResponse, isLoading: appsLoading } = useGetApplicationsQuery(undefined, { skip: !mounted });
  const { data: jobsResponse, isLoading: jobsLoading } = useGetJobsQuery({ limit: 3 }, { skip: !mounted });

  // Map Paginated data structures
  const contracts = useMemo(() => contractsResponse?.data || [], [contractsResponse]);
  const proposals = useMemo(() => proposalsResponse?.data || [], [proposalsResponse]);
  const applications = useMemo(() => applicationsResponse?.data || [], [applicationsResponse]);
  const jobs = useMemo(() => jobsResponse?.data || [], [jobsResponse]);

  // Onboarding metrics evaluation
  const emailVerified = me?.isVerified || false;

  const calculateCompleteness = () => {
    if (!profile) return 0;
    let score = 0;
    if (profile.headline) score += 20;
    if (profile.summary) score += 20;
    if (profile.skills && profile.skills.length > 0) score += 20;
    if (profile.workExperience && profile.workExperience.length > 0) score += 20;
    if (profile.education && profile.education.length > 0) score += 20;
    return score;
  };

  const profileCompleteness = useMemo(() => calculateCompleteness(), [profile]);
  const isProfileComplete = profileCompleteness >= 60;
  const hasResume = useMemo(() => profile?.resumes && profile.resumes.length > 0, [profile]);
  const feePaid = profile?.fullTimeFeePaid || false;
  const hasApplied = useMemo(() => applications.length > 0, [applications]);

  const onboardingTasks = useMemo(() => ({
    email: emailVerified,
    profile: isProfileComplete,
    resume: hasResume,
    fee: feePaid,
    firstJob: hasApplied,
  }), [emailVerified, isProfileComplete, hasResume, feePaid, hasApplied]);

  const showOnboardingChecklist = useMemo(() => {
    return !emailVerified || !isProfileComplete || !hasResume || !feePaid || !hasApplied;
  }, [emailVerified, isProfileComplete, hasResume, feePaid, hasApplied]);

  // Triage actions computation
  const triageActions = useMemo(() => {
    if (!mounted) return [];
    const actions: any[] = [];

    // 1. Expiring invites
    const activeInvites = invitations.filter(inv => inv.status === 'SENT');
    activeInvites.forEach((inv) => {
      const expDays = inv.expiresAt ? Math.ceil((new Date(inv.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
      actions.push({
        type: 'INVITE',
        id: inv.id,
        badge: 'Invitation Expiring Soon',
        title: inv.job?.title || 'Job Invitation',
        desc: `From ${inv.job?.company?.name || 'Recruiter Partner'} · Expires in ${expDays > 0 ? expDays : 1} day(s)`,
        btnText: 'Respond',
        btnColor: 'warning' as const,
        link: '/jobs',
      });
    });

    // 2. Pending offers
    const pendingOffers = offers.filter(o => o.status === 'SENT');
    pendingOffers.forEach((o) => {
      actions.push({
        type: 'OFFER',
        id: o.id,
        badge: 'Offer Pending Review',
        title: `${o.job?.title || 'Employment'} Offer`,
        desc: `From ${o.job?.company?.name || 'Client Corp'} · Awaiting your response`,
        btnText: 'Respond to Offer',
        btnColor: 'error' as const,
        link: '/offers',
      });
    });

    // 3. Funded milestones (Ready to submit)
    const fundedMilestones = contracts.flatMap(c =>
      (c.milestones || []).map(m => ({ contract: c, milestone: m }))
    ).filter(x => x.milestone.status === 'FUNDED');

    fundedMilestones.forEach((item) => {
      actions.push({
        type: 'MILESTONE_SUBMIT',
        id: item.milestone.id,
        badge: 'Milestone Funded',
        title: `Submit: ${item.milestone.title}`,
        desc: `Project: ${item.contract.job?.title || 'Freelance Engagement'} · Budget: ₹${Number(item.milestone.amount).toLocaleString('en-IN')}`,
        btnText: 'Submit Work',
        btnColor: 'secondary' as const,
        link: `/contracts/${item.contract.id}`,
      });
    });

    // 4. Milestone revision requests
    const revisionMilestones = contracts.flatMap(c =>
      (c.milestones || []).map(m => ({ contract: c, milestone: m }))
    ).filter(x => x.milestone.status === 'REVISION_REQUESTED');

    revisionMilestones.forEach((item) => {
      actions.push({
        type: 'REVISION_REQUESTED',
        id: item.milestone.id,
        badge: 'Revision Requested',
        title: `Revision: ${item.milestone.title}`,
        desc: `Client requested updates on: ${item.contract.job?.title || 'Freelance Contract'}`,
        btnText: 'Review Feedback',
        btnColor: 'warning' as const,
        link: `/contracts/${item.contract.id}`,
      });
    });

    // 5. Upcoming interviews
    const upcomingInterviews = interviews.filter(i =>
      (i.status === 'SCHEDULED' || i.status === 'RESCHEDULED') && new Date(i.scheduledAt) >= new Date()
    );
    upcomingInterviews.forEach((i) => {
      actions.push({
        type: 'INTERVIEW',
        id: i.id,
        badge: 'Interview Scheduled',
        title: `Interview Round ${i.roundNo}`,
        desc: `With ${i.interviewer?.fullName || 'Client'} at ${new Date(i.scheduledAt).toLocaleString()}`,
        btnText: 'Join Call',
        btnColor: 'primary' as const,
        link: i.meetingLink || '/help',
        isExternal: !!i.meetingLink,
      });
    });

    return actions;
  }, [invitations, offers, contracts, interviews, mounted]);

  // Active freelance engagements list
  const activeEngagements = useMemo(() => {
    return contracts
      .filter(c => c.status === 'ACTIVE' || c.status === 'PENDING_FUNDING' || c.status === 'DISPUTED')
      .slice(0, 3)
      .map(c => {
        const total = c.milestones?.length || 1;
        const paid = c.milestones?.filter(m => m.status === 'PAID').length || 0;
        const pct = Math.round((paid / total) * 100);
        return {
          id: c.id,
          title: c.job?.title || 'Freelance Engagement',
          pct,
          progressText: `${paid} of ${total} milestones released`,
        };
      });
  }, [contracts]);

  // Active proposals/bids list
  const activeBids = useMemo(() => {
    return proposals
      .filter(p => p.status === 'SUBMITTED' || p.status === 'SHORTLISTED')
      .slice(0, 3)
      .map(p => ({
        id: p.id,
        title: p.job?.title || 'Freelance Project',
        clientName: p.job?.company?.name || 'Recruiter Client',
        status: p.status,
      }));
  }, [proposals]);

  // Earned snapshot statistics sum
  const totalEarnedThisQuarter = useMemo(() => {
    const total = contracts.reduce((acc, c) => {
      const paidAmt = c.milestones?.filter(m => m.status === 'PAID')
        .reduce((sum, m) => sum + Number(m.amount), 0) || 0;
      return acc + paidAmt;
    }, 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(total);
  }, [contracts]);

  if (!mounted) return null;

  if (meLoading || profileLoading || invitationsLoading || offersLoading || contractsLoading || interviewsLoading || proposalsLoading || appsLoading || jobsLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading your dashboard...
          </Typography>
        </Stack>
      </Container>
    );
  }

  const candidateName = me?.fullName || 'Candidate';

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* WELCOME / MAIN HEADER */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 850, fontFamily: 'Outfit, sans-serif', color: 'text.primary', mb: 0.5 }}>
          Welcome back, {candidateName}!
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Here is what requires your attention today.
        </Typography>
      </Box>

      {/* ONBOARDING STATE CHECKLIST */}
      {showOnboardingChecklist && (
        <Card sx={{ mb: 5, border: '2px solid #3b82f6', borderRadius: 4, bgcolor: 'rgba(59, 130, 246, 0.02)', boxShadow: 'none' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontFamily: 'Outfit, sans-serif', color: '#1d4ed8' }}>
              Get Started with Bivio Onboarding
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Complete these steps to unlock search visibility, matching algorithms, and job applications:
            </Typography>

            <Grid container spacing={2}>
              {[
                { key: 'email', label: 'Verify your email address', completed: onboardingTasks.email, link: '/settings' },
                { key: 'profile', label: 'Complete profile details (60%+)', completed: onboardingTasks.profile, link: '/profile' },
                { key: 'resume', label: 'Upload your primary Resume', completed: onboardingTasks.resume, link: '/profile' },
                { key: 'fee', label: 'Pay platform verification profile fee', completed: onboardingTasks.fee, link: '/profile' },
                { key: 'firstJob', label: 'Apply to your first job opening', completed: onboardingTasks.firstJob, link: '/freelance-jobs' },
              ].map((task) => (
                <Grid item xs={12} sm={6} md={4} lg={2.4} key={task.key}>
                  <Link href={task.link} style={{ textDecoration: 'none' }}>
                    <Card
                      sx={{
                        border: '1px solid',
                        borderColor: task.completed ? 'success.light' : 'divider',
                        borderRadius: 3,
                        transition: 'transform 0.15s',
                        '&:hover': { transform: 'scale(1.02)' },
                        bgcolor: task.completed ? 'success.light' : '#ffffff',
                        opacity: task.completed ? 0.9 : 1,
                        boxShadow: 'none',
                      }}
                    >
                      <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {task.completed ? (
                          <CheckCircleIcon color="success" />
                        ) : (
                          <RadioButtonUncheckedIcon color="action" />
                        )}
                        <Typography variant="caption" sx={{ fontWeight: 700, color: task.completed ? 'success.dark' : 'text.primary' }}>
                          {task.label}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Link>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* SECTION 1: NEEDS YOUR ACTION */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: 'Outfit, sans-serif', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          Needs Your Action {triageActions.length > 0 && <Chip label="Triage Pending" color="error" size="small" sx={{ fontWeight: 800 }} />}
        </Typography>
        {triageActions.length > 0 ? (
          <Grid container spacing={3}>
            {triageActions.map((act) => (
              <Grid item xs={12} md={6} key={act.id}>
                <Card sx={{
                  border: '2px solid',
                  borderColor: act.btnColor === 'warning' ? '#f59e0b' : act.btnColor === 'error' ? '#ef4444' : '#cbd5e1',
                  borderRadius: 4,
                  bgcolor: act.btnColor === 'warning' ? 'rgba(245, 158, 11, 0.02)' : act.btnColor === 'error' ? 'rgba(239, 68, 68, 0.02)' : '#ffffff',
                  boxShadow: 'none'
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                      <Box>
                        <Chip label={act.badge} color={act.btnColor === 'warning' ? 'warning' : act.btnColor === 'error' ? 'error' : 'secondary'} size="small" sx={{ fontWeight: 800, mb: 1 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                          {act.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {act.desc}
                        </Typography>
                      </Box>
                    </Stack>
                    <Divider sx={{ my: 1.5 }} />
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {act.isExternal ? (
                        <Button href={act.link} target="_blank" variant="contained" color={act.btnColor} size="small" sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 800 }}>
                          {act.btnText} →
                        </Button>
                      ) : (
                        <Button component={Link} href={act.link} variant="contained" color={act.btnColor} size="small" sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 800 }}>
                          {act.btnText} →
                        </Button>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Card sx={{ border: '1px dashed #cbd5e1', borderRadius: 4, p: 4, textAlign: 'center', bgcolor: '#fafafa', boxShadow: 'none' }}>
            <CardContent>
              <CheckCircleIcon color="success" sx={{ fontSize: 44, mb: 1.5 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
                You're all caught up!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Nothing needs your immediate attention right now. Keep exploring new matches.
              </Typography>
              <Button component={Link} href="/freelance-jobs" variant="contained" color="secondary" sx={{ textTransform: 'none', borderRadius: 2.5, fontWeight: 700 }}>
                Browse Projects
              </Button>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* SECTION 2: ACTIVE WORK */}
      <Grid container spacing={4} sx={{ mb: 5 }}>
        {/* Active Engagements */}
        <Grid item xs={12} md={6}>
          <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4, height: '100%', boxShadow: 'none' }}>
            <CardContent sx={{ p: 4 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
                  Active Engagements
                </Typography>
                <Button component={Link} href="/contracts" size="small" color="secondary" endIcon={<ArrowForwardIcon />}>
                  View all
                </Button>
              </Stack>
              <Stack spacing={3}>
                {activeEngagements.map((eng) => (
                  <Box key={eng.id}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Link href={`/contracts/${eng.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" sx={{ fontWeight: 750, '&:hover': { color: 'secondary.main' } }}>
                          {eng.title}
                        </Typography>
                      </Link>
                      <Typography variant="caption" color="text.secondary">
                        {eng.progressText}
                      </Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={eng.pct} color="secondary" sx={{ height: 6, borderRadius: 3 }} />
                  </Box>
                ))}
                {activeEngagements.length === 0 && (
                  <Card sx={{ border: '1px dashed #cbd5e1', borderRadius: 3, p: 3, textAlign: 'center', bgcolor: '#fafafa', boxShadow: 'none' }}>
                    <GavelIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                      No active freelance contracts
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Your active contract agreements and escrow milestones will show up here.
                    </Typography>
                  </Card>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Bids & Proposals */}
        <Grid item xs={12} md={6}>
          <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4, height: '100%', boxShadow: 'none' }}>
            <CardContent sx={{ p: 4 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
                  Bids & Proposals
                </Typography>
                <Button component={Link} href="/proposals" size="small" color="secondary" endIcon={<ArrowForwardIcon />}>
                  View all
                </Button>
              </Stack>
              <Stack spacing={3}>
                {activeBids.map((bid) => (
                  <Stack key={bid.id} direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {bid.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {bid.clientName}
                      </Typography>
                    </Box>
                    <Chip
                      label={bid.status === 'SHORTLISTED' ? 'Shortlisted' : bid.status === 'SUBMITTED' ? 'Submitted' : bid.status}
                      color={bid.status === 'SHORTLISTED' ? 'primary' : 'default'}
                      size="small"
                      sx={{ fontWeight: 800 }}
                    />
                  </Stack>
                ))}
                {activeBids.length === 0 && (
                  <Card sx={{ border: '1px dashed #cbd5e1', borderRadius: 3, p: 3, textAlign: 'center', bgcolor: '#fafafa', boxShadow: 'none' }}>
                    <DescriptionIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                      No proposals submitted
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Bids you send for freelance project listings will appear here.
                    </Typography>
                  </Card>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* SECTION 3: DISCOVER */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: 'Outfit, sans-serif', mb: 2 }}>
          Discover Career Opportunities
        </Typography>
        <Grid container spacing={3}>
          {jobs.map((job) => (
            <Grid item xs={12} sm={4} key={job.id}>
              <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: 'none' }}>
                <CardContent sx={{ p: 3 }}>
                  <Chip label="Matching" color="success" size="small" sx={{ fontWeight: 800, mb: 1.5 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
                    {job.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    {job.company?.name || 'Recruiter Client'}
                  </Typography>
                </CardContent>
                <Box sx={{ p: 2, borderTop: '1px solid #f1f5f9' }}>
                  <Button
                    component={Link}
                    href={job.jobType === 'FREELANCE' ? '/freelance-jobs' : '/jobs'}
                    variant="outlined"
                    color={job.jobType === 'FREELANCE' ? 'secondary' : 'primary'}
                    size="small"
                    fullWidth
                    sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
                  >
                    View Opportunity
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
          {jobs.length === 0 && (
            <Grid item xs={12}>
              <Card sx={{ border: '1px dashed #cbd5e1', borderRadius: 4, p: 4, textAlign: 'center', bgcolor: '#fafafa', boxShadow: 'none' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                  No jobs currently open for matching. Check back soon!
                </Typography>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* SECTION 4: SNAPSHOT STATS */}
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: 'Outfit, sans-serif', mb: 2 }}>
          Snapshot Metrics
        </Typography>
        <Grid container spacing={3}>
          {/* Earned */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: 'none' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: 'secondary.light', color: 'secondary.dark' }}>
                    <AccountBalanceWalletIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      EARNED THIS QUARTER
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {totalEarnedThisQuarter}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Applications */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: 'none' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}>
                    <DescriptionIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      APPLICATIONS SENT
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {applications.length}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Active contracts */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: 'none' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: 'success.light', color: 'success.dark' }}>
                    <BusinessCenterIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      ACTIVE CONTRACTS
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {contracts.filter(c => c.status === 'ACTIVE' || c.status === 'PENDING_FUNDING' || c.status === 'DISPUTED').length}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Active proposals */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: 'none' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: 'grey.100', color: 'text.secondary' }}>
                    <NotificationsIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      ACTIVE PROPOSALS
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {proposals.filter(p => p.status === 'SUBMITTED' || p.status === 'SHORTLISTED').length}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

    </Container>
  );
}
