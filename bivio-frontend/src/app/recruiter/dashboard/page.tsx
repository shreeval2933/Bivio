'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Stack,
  Box,
  Button,
  Grid,
  Chip,
  Divider,
  LinearProgress,
  CircularProgress,
} from '@mui/material';

// Icons
import WarningIcon from '@mui/icons-material/Warning';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import NotificationsIcon from '@mui/icons-material/Notifications';
import GavelIcon from '@mui/icons-material/Gavel';

import { useGetRecruiterProfileQuery } from '@/store/api/profilesApi';
import { useGetRecruiterJobsQuery } from '@/store/api/jobsApi';
import { useGetContractsQuery } from '@/store/api/contractsApi';
import { useGetProposalsQuery } from '@/store/api/contractsApi';
import { useGetCompanyInterviewsQuery } from '@/store/api/interviewsApi';
import { useGetOffersQuery } from '@/store/api/applicationsApi';

export default function RecruiterDashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // API Queries
  const { data: profile, isLoading: profileLoading } = useGetRecruiterProfileQuery(undefined, { skip: !mounted });
  const { data: jobsResponse, isLoading: jobsLoading } = useGetRecruiterJobsQuery(undefined, { skip: !mounted });
  const { data: contractsResponse, isLoading: contractsLoading } = useGetContractsQuery(undefined, { skip: !mounted });
  const { data: proposalsResponse, isLoading: proposalsLoading } = useGetProposalsQuery(undefined, { skip: !mounted });
  const { data: interviews = [], isLoading: interviewsLoading } = useGetCompanyInterviewsQuery(undefined, { skip: !mounted });
  const { data: offers = [], isLoading: offersLoading } = useGetOffersQuery(undefined, { skip: !mounted });

  // Map paginated data arrays
  const jobs = useMemo(() => jobsResponse?.data || [], [jobsResponse]);
  const contracts = useMemo(() => contractsResponse?.data || [], [contractsResponse]);
  const proposals = useMemo(() => proposalsResponse?.data || [], [proposalsResponse]);

  const paymentVerified = profile?.paymentMethodVerified || false;
  const idVerified = profile?.kycStatus === 'APPROVED';

  const recruiterName = profile?.user?.fullName || 'Recruiter';

  // Triage Actions calculations
  const triageActions = useMemo(() => {
    if (!mounted) return [];
    const actions = [];

    // 1. New applications received (full-time only)
    const openFtJobs = jobs.filter(j => j.jobType === 'FULL_TIME' && j.status === 'OPEN');
    const ftAppsCount = openFtJobs.reduce((acc, cur) => acc + (cur.applicantCount || 0), 0);
    if (ftAppsCount > 0) {
      actions.push({
        title: 'New applications received',
        desc: `You have ${ftAppsCount} candidate application(s) awaiting screening across your full-time job openings.`,
        buttonText: 'Review Applications',
        link: '/recruiter/jobs',
      });
    }

    // 2. New proposals received (freelance only)
    const submittedProposals = proposals.filter(p => p.status === 'SUBMITTED');
    if (submittedProposals.length > 0) {
      actions.push({
        title: 'New proposals received',
        desc: `You have ${submittedProposals.length} fresh bid proposal(s) on your active freelance postings.`,
        buttonText: 'Review Proposals',
        link: '/recruiter/proposals?status=submitted',
      });
    }

    // 3. Interviews to schedule
    const unscheduledInterviews = interviews.filter(i => (i.status as string) === 'PENDING');
    if (unscheduledInterviews.length > 0) {
      actions.push({
        title: 'Interviews to schedule',
        desc: `You have ${unscheduledInterviews.length} interview round(s) pending scheduling.`,
        buttonText: 'Schedule Interview',
        link: '/recruiter/interviews',
      });
    }

    // 4. Interview feedback pending
    const needsFeedbackInterviews = interviews.filter(i => 
      (i.status === 'COMPLETED' && !i.recommendation) || 
      (((i.status as string) === 'SCHEDULED' || (i.status as string) === 'RESCHEDULED') && new Date(i.scheduledAt) < new Date())
    );
    if (needsFeedbackInterviews.length > 0) {
      actions.push({
        title: 'Interview feedback pending',
        desc: `Technical round completed for ${needsFeedbackInterviews.length} candidate(s). Please submit feedback scorecards.`,
        buttonText: 'Submit Feedback',
        link: '/recruiter/interviews',
      });
    }

    // 5. Milestones awaiting approval
    const awaitingMilestones = contracts.flatMap(c => 
      (c.milestones || []).map(m => ({ contract: c, milestone: m }))
    ).filter(x => x.milestone.status === 'SUBMITTED');

    if (awaitingMilestones.length > 0) {
      actions.push({
        title: 'Milestones awaiting approval',
        desc: `${awaitingMilestones.length} milestone(s) have deliverables submitted and require payment release reviews.`,
        buttonText: 'Review Submission',
        link: `/recruiter/contracts/${awaitingMilestones[0].contract.id}`,
      });
    }

    // 6. Offers about to expire
    const pendingOffers = offers.filter(o => o.status === 'SENT');
    if (pendingOffers.length > 0) {
      actions.push({
        title: 'Offers pending response',
        desc: `You have ${pendingOffers.length} outstanding offer letter(s) awaiting candidate decisions.`,
        buttonText: 'View Offers',
        link: '/recruiter/offers',
      });
    }

    // 7. Disputes on your contracts
    const disputedContracts = contracts.filter(c => c.status === 'DISPUTED');
    if (disputedContracts.length > 0) {
      actions.push({
        title: 'Disputes on your contracts',
        desc: `An active payment dispute has been raised on ${disputedContracts.length} contract(s). Action required.`,
        buttonText: 'View Dispute',
        link: `/recruiter/contracts/${disputedContracts[0].id}`,
      });
    }

    // 8. Jobs stuck in Configuring
    const configuringJobs = jobs.filter(j => j.status === 'CONFIGURING' || j.status === 'DRAFT');
    if (configuringJobs.length > 0) {
      actions.push({
        title: 'Jobs stuck in Configuring',
        desc: `You have ${configuringJobs.length} draft posting(s) awaiting weightage parameter setup.`,
        buttonText: 'Finish Setup',
        link: `/recruiter/jobs/new?id=${configuringJobs[0].id}&step=2`,
      });
    }

    return actions;
  }, [jobs, contracts, proposals, interviews, offers, mounted]);

  // Active Postings (top 3)
  const activePostings = useMemo(() => {
    return jobs
      .filter(j => j.status === 'OPEN')
      .slice(0, 3);
  }, [jobs]);

  // Active Engagements
  const activeFtPipelines = useMemo(() => {
    return jobs
      .filter(j => j.jobType === 'FULL_TIME' && j.status === 'OPEN')
      .slice(0, 3)
      .map(j => {
        const screeningCount = Math.max(0, (j.applicantCount || 0));
        return {
          id: j.id,
          title: j.title,
          summary: `${screeningCount} candidate(s) in talent pipeline`,
        };
      });
  }, [jobs]);

  const activeFreelanceContracts = useMemo(() => {
    return contracts
      .filter(c => c.status === 'ACTIVE')
      .slice(0, 3)
      .map(c => {
        const totalMilestones = c.milestones?.length || 1;
        const paidMilestones = c.milestones?.filter(m => m.status === 'PAID').length || 0;
        const pct = Math.round((paidMilestones / totalMilestones) * 100);
        return {
          id: c.id,
          freelancerName: c.freelancer?.user?.fullName || 'Freelancer Partner',
          title: c.job?.title || 'Freelance Engagement',
          percent: pct,
          progressText: `${paidMilestones} of ${totalMilestones} milestones completed`,
        };
      });
  }, [contracts]);

  // Total quarterly spend calculation
  const totalQuarterlySpend = useMemo(() => {
    const total = contracts.reduce((acc, cur) => acc + Number(cur.agreedAmount || 0), 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(total);
  }, [contracts]);

  // Onboarding Checklist Completeness
  const onboardingComplete = useMemo(() => {
    const hasJob = jobs.length > 0;
    return paymentVerified && hasJob && idVerified;
  }, [paymentVerified, jobs, idVerified]);

  if (!mounted) return null;

  if (jobsLoading || contractsLoading || proposalsLoading || profileLoading || interviewsLoading || offersLoading) {
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Salutation */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 855, mb: 1, fontFamily: 'Outfit, sans-serif', color: 'text.primary' }}>
          Good morning, {recruiterName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Here is what is happening across your talent pipeline today.
        </Typography>
      </Box>

      {/* Onboarding Checklist Card */}
      {!onboardingComplete && (
        <Card sx={{ border: '1px dashed #cbd5e1', borderRadius: 4, mb: 4, bgcolor: '#fafafa', boxShadow: 'none' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 2 }}>
              Onboarding Checklist
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {paymentVerified ? <CheckCircleIcon color="success" fontSize="small" /> : <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #94a3b8' }} />}
                    <Typography variant="body2" sx={{ fontWeight: paymentVerified ? 700 : 500 }}>
                      Verify payment method
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center">
                    {jobs.length > 0 ? <CheckCircleIcon color="success" fontSize="small" /> : <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #94a3b8' }} />}
                    <Typography variant="body2" sx={{ fontWeight: jobs.length > 0 ? 700 : 500 }}>
                      Post your first job
                    </Typography>
                  </Stack>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CheckCircleIcon color="success" fontSize="small" />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Complete company profile
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center">
                    {idVerified ? <CheckCircleIcon color="success" fontSize="small" /> : <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #94a3b8' }} />}
                    <Typography variant="body2" sx={{ fontWeight: idVerified ? 700 : 500 }}>
                      Verify identity for higher-value contracts
                    </Typography>
                  </Stack>
                </Stack>
              </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Link href="/recruiter/verification" style={{ textDecoration: 'none' }}>
              <Button size="small" variant="text" sx={{ fontWeight: 750, textTransform: 'none' }}>
                Go to Verification Desk →
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Section 1: Needs Your Action */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" /> Needs Your Action
        </Typography>

        {triageActions.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: 4, bgcolor: '#fafafa', boxShadow: 'none' }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
              You're all caught up!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Nothing requires your immediate attention right now.
            </Typography>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {triageActions.map((act, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card sx={{ height: '100%', border: '1px solid #e2e8f0', borderRadius: 4, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1, color: 'text.primary' }}>
                      {act.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      {act.desc}
                    </Typography>
                  </CardContent>
                  <Box sx={{ p: 2, borderTop: '1px solid #f1f5f9', bgcolor: '#fafafa' }}>
                    <Link href={act.link} style={{ textDecoration: 'none' }}>
                      <Button size="small" variant="contained" fullWidth sx={{ fontWeight: 750 }}>
                        {act.buttonText}
                      </Button>
                    </Link>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Section 2: Active Postings */}
      <Box sx={{ mb: 5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Active Postings
          </Typography>
          <Link href="/recruiter/jobs" style={{ textDecoration: 'none' }}>
            <Button size="small" endIcon={<ArrowForwardIcon />} sx={{ fontWeight: 750, textTransform: 'none' }}>
              View all jobs
            </Button>
          </Link>
        </Stack>

        {activePostings.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: 4, boxShadow: 'none' }}>
            <NotificationsIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
              No active job postings. Click "Create Job Posting" in the top header to start recruiting talent.
            </Typography>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {activePostings.map((job) => (
              <Grid item xs={12} sm={4} key={job.id}>
                <Card sx={{ height: '100%', border: '1px solid #e2e8f0', borderRadius: 4, boxShadow: 'none' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                      <Chip label={job.jobType === 'FULL_TIME' ? 'Full-Time' : 'Freelance'} size="small" color={job.jobType === 'FULL_TIME' ? 'primary' : 'secondary'} sx={{ fontWeight: 800 }} />
                      <Chip label="OPEN" size="small" variant="outlined" color="success" sx={{ fontWeight: 800 }} />
                    </Stack>
                    <Typography variant="subtitle1" sx={{ fontWeight: 850, mb: 1 }}>
                      {job.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {job.jobType === 'FULL_TIME' ? `${job.applicantCount || 0} candidates` : `${job.applicantCount || 0} bids received`}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Link href={`/recruiter/jobs/${job.id}`} style={{ textDecoration: 'none' }}>
                      <Button size="small" variant="outlined" fullWidth sx={{ fontWeight: 700 }}>
                        Manage Posting
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Section 3: Active Engagements */}
      <Grid container spacing={4} sx={{ mb: 5 }}>
        {/* Full-time pipelines Column */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2.5 }}>
            Full-time pipelines
          </Typography>
          <Stack spacing={2}>
            {activeFtPipelines.length === 0 ? (
              <Card sx={{ border: '1px dashed #cbd5e1', borderRadius: 3, p: 3, textAlign: 'center', bgcolor: '#fafafa', boxShadow: 'none' }}>
                <BusinessCenterIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                  No active full-time pipelines
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Candidates will appear here once you post full-time jobs.
                </Typography>
              </Card>
            ) : (
              activeFtPipelines.map((pipe) => (
                <Card key={pipe.id} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: 'none' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{pipe.title}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                      {pipe.summary}
                    </Typography>
                    <Link href={`/recruiter/jobs/${pipe.id}`} style={{ textDecoration: 'none' }}>
                      <Button size="small" variant="text" sx={{ fontWeight: 700, p: 0, textTransform: 'none' }}>
                        Go to Pipeline Board →
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))
            )}
          </Stack>
        </Grid>

        {/* Freelance contracts Column */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2.5 }}>
            Freelance contracts
          </Typography>
          <Stack spacing={2}>
            {activeFreelanceContracts.length === 0 ? (
              <Card sx={{ border: '1px dashed #cbd5e1', borderRadius: 3, p: 3, textAlign: 'center', bgcolor: '#fafafa', boxShadow: 'none' }}>
                <GavelIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                  No active freelance contracts
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Your active contract agreements and escrow milestones will show up here.
                </Typography>
              </Card>
            ) : (
              activeFreelanceContracts.map((con) => (
                <Card key={con.id} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: 'none' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{con.freelancerName}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      Project: {con.title}
                    </Typography>
                    <Box sx={{ mb: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">{con.progressText}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800 }}>{con.percent}%</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={con.percent} color="secondary" sx={{ height: 6, borderRadius: 3 }} />
                    </Box>
                    <Link href={`/recruiter/contracts/${con.id}`} style={{ textDecoration: 'none' }}>
                      <Button size="small" variant="text" sx={{ fontWeight: 700, p: 0, textTransform: 'none', color: 'secondary.main' }}>
                        View Contract Workspace →
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))
            )}
          </Stack>
        </Grid>
      </Grid>

      {/* Section 4: Company Snapshot */}
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 2.5 }}>
          Company Snapshot
        </Typography>

        <Grid container spacing={3}>
          {/* Tile 1 */}
          <Grid item xs={6} sm={3}>
            <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4, boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>ACTIVE JOBS</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, my: 1 }}>
                  {jobs.filter(j => j.status === 'OPEN').length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {jobs.filter(j => j.jobType === 'FULL_TIME' && j.status === 'OPEN').length} FT · {jobs.filter(j => j.jobType === 'FREELANCE' && j.status === 'OPEN').length} Freelance
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Tile 2 */}
          <Grid item xs={6} sm={3}>
            <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4, boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>COMPLETED PROJECTS</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, my: 1 }}>
                  {contracts.filter(c => c.status === 'COMPLETED').length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Freelance contracts completed
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Tile 3 */}
          <Grid item xs={6} sm={3}>
            <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4, boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>TOTAL VALUE HIRED</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, my: 1 }}>
                  {totalQuarterlySpend}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Active agreed values
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Tile 4 */}
          <Grid item xs={6} sm={3}>
            <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4, boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>TOTAL APPLICATIONS</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, my: 1 }}>
                  {jobs.reduce((acc, j) => acc + (j.applicantCount || 0), 0)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Across all active openings
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

    </Container>
  );
}
