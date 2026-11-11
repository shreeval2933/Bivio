'use client';

import React, { useState, useEffect, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';

// Icons
import VerifiedIcon from '@mui/icons-material/Verified';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FilePresentIcon from '@mui/icons-material/FilePresent';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface ProjectDetail {
  id: string;
  title: string;
  client: string;
  clientCountry: string;
  isClientVerified: boolean;
  postedDate: string;
  engagementType: 'Fixed' | 'Hourly';
  budgetFixed?: number;
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  projectLength: string;
  bidsCount: number;
  avgBidAmount: number;
  clientStats: {
    hiresCount: number;
    totalSpent: number;
    avgRatingGiven: number;
  };
  description: string;
  deliverables: string[];
  skills: { name: string; isMandatory: boolean }[];
  timeline: string;
  attachments: string[];
  aiScore: number;
  aiBreakdown: {
    skills: { score: number; max: number };
    experience: { score: number; max: number };
    portfolio: { score: number; max: number };
  };
}

const MOCK_PROJECT_DETAIL: Record<string, ProjectDetail> = {
  'proj-1': {
    id: 'proj-1',
    title: 'Enterprise Next.js & MUI Dashboard Overhaul',
    client: 'Stripeflow Technologies',
    clientCountry: 'United States',
    isClientVerified: true,
    postedDate: '2026-07-25',
    engagementType: 'Fixed',
    budgetFixed: 450000,
    projectLength: '1-3 months',
    bidsCount: 14,
    avgBidAmount: 435000,
    clientStats: {
      hiresCount: 22,
      totalSpent: 4800000,
      avgRatingGiven: 4.8,
    },
    description:
      'We are looking for an expert Next.js and Material-UI freelancer to restructure our main payment tracking operations workspace. The project requires high-performance widgets, custom charts, and responsive side drawers.',
    deliverables: [
      'Refactor existing page structures into unified grid system layouts.',
      'Construct re-usable charting components for analytics data.',
      'Integrate client-side WebSockets listeners for updates.',
      'Deliver final codebase compiled and verified for zero console errors.',
    ],
    skills: [
      { name: 'React', isMandatory: true },
      { name: 'Next.js', isMandatory: true },
      { name: 'MUI', isMandatory: true },
      { name: 'TypeScript', isMandatory: false },
    ],
    timeline: 'Expected project completion by September 15, 2026.',
    attachments: ['design_brief_v2.pdf', 'dashboard_wireframes.zip'],
    aiScore: 92,
    aiBreakdown: {
      skills: { score: 38, max: 40 },
      experience: { score: 28, max: 30 },
      portfolio: { score: 26, max: 30 },
    },
  },
};

import { useGetJobByIdQuery } from '@/store/api/jobsApi';
import { useGetPublicSettingsQuery } from '@/store/api/profilesApi';
import { useGetProposalsQuery, useSubmitProposalMutation } from '@/store/api/contractsApi';
import { useGetInvitationsQuery, useRespondInvitationMutation } from '@/store/api/applicationsApi';

interface MilestoneBid {
  title: string;
  description: string;
  amount: number;
}

interface ToastState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

/** Coerce any input (including '' and NaN) into a safe non-negative integer. */
const toSafeNumber = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const projectId = resolvedParams?.id || 'proj-1';

  // Live query hooks
  const { data: job, isLoading: isJobLoading, isError: isJobError } = useGetJobByIdQuery(projectId);
  const { data: proposalsRes, isLoading: isProposalsLoading } = useGetProposalsQuery({ mine: true });
  const { data: invitationsRes, isLoading: isInvitationsLoading } = useGetInvitationsQuery();
  const { data: publicSettings } = useGetPublicSettingsQuery();
  const PLATFORM_FEE_PERCENT = publicSettings?.PLATFORM_FEE_PERCENT ?? 10;
  const [submitProposal, { isLoading: isSubmitting }] = useSubmitProposalMutation();
  const [respondInvitation] = useRespondInvitationMutation();

  const [mounted, setMounted] = useState(false);
  const [hasPendingInvite, setHasPendingInvite] = useState(false);
  const [inviteId, setInviteId] = useState<string | null>(null);

  // Proposal form states
  const [bidAmountStr, setBidAmountStr] = useState<string>('1500');
  const [estimatedHoursStr, setEstimatedHoursStr] = useState<string>('40');
  const [durationDaysStr, setDurationDaysStr] = useState<string>('14');
  const [coverLetter, setCoverLetter] = useState('');
  const [milestones, setMilestones] = useState<MilestoneBid[]>([
    {
      title: 'Setup & Design Assets Integration',
      description: 'Create next skeleton structure and align styling guidelines',
      amount: 500,
    },
    {
      title: 'Core Functionality Release',
      description: 'Build layout elements and hook real data APIs',
      amount: 1000,
    },
  ]);

  const hasBid = useMemo(() => {
    return proposalsRes?.data?.some((p: any) => p.jobId === projectId && p.status !== 'WITHDRAWN' && p.status !== 'REJECTED') || false;
  }, [proposalsRes, projectId]);

  const project = useMemo(() => {
    if (!job) return null;
    const isHourly = job.budgetType === 'HOURLY';
    const budgetFixed = isHourly ? undefined : Number(job.budget || 0);
    const hourlyRateMin = isHourly ? Number(job.budget || 0) : undefined;
    const hourlyRateMax = isHourly ? Number(job.budget || 0) : undefined;

    const postedDate = job.publishedAt ? new Date(job.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';

    return {
      id: job.id,
      title: job.title,
      client: job.company?.name || job.recruiter?.user?.fullName || 'Acme Client',
      clientCountry: job.location || 'Remote',
      isClientVerified: job.recruiter?.user?.isVerified || false,
      postedDate,
      engagementType: isHourly ? 'Hourly' : ('Fixed' as const),
      budgetFixed,
      hourlyRateMin,
      hourlyRateMax,
      projectLength: job.projectLengthEstimate === 'UNDER_1_WEEK' ? 'Under 1 week'
                    : job.projectLengthEstimate === 'W1_4' ? '1–4 weeks'
                    : job.projectLengthEstimate === 'M1_3' ? '1–3 months'
                    : '3+ months',
      bidsCount: job.proposalCount || 0,
      avgBidAmount: Number(job.budget || 0),
      clientStats: {
        hiresCount: job.recruiter?.hiresCount || 0,
        totalSpent: Number((job.recruiter as any)?.totalSpent || 0),
        avgRatingGiven: Number((job.recruiter as any)?.avgRatingGiven || 0.0),
      },
      description: job.description,
      deliverables: job.deliverables || ['Setup Escrow Core API', 'Schema design documentation', 'Integrate payment gateways', 'Conducted integration testing'],
      skills: (job.skills || []).map((s: any) => ({ name: s.skill?.name || 'Skill', isMandatory: s.isMandatory })),
      timeline: `Expected proposal deadline by ${job.deadline ? new Date(job.deadline).toLocaleDateString() : 'N/A'}.`,
      attachments: (job as any).attachments || [],
      aiScore: 85,
      aiBreakdown: {
        skills: { score: 35, max: 40 },
        experience: { score: 25, max: 30 },
        portfolio: { score: 25, max: 30 },
      },
    };
  }, [job]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && invitationsRes && projectId) {
      const match = invitationsRes.find((inv: any) => 
        inv.jobId === projectId && inv.status === 'SENT'
      );
      if (match) {
        setHasPendingInvite(true);
        setInviteId(match.id);
      } else {
        setHasPendingInvite(false);
        setInviteId(null);
      }
    }
  }, [mounted, invitationsRes, projectId]);

  // Set default bid amount when project loads
  useEffect(() => {
    if (project) {
      const isHourly = project.engagementType === 'Hourly';
      const budgetVal = isHourly ? (project.hourlyRateMin || 1500) : (project.budgetFixed || 450000);
      setBidAmountStr(String(budgetVal));
      if (isHourly) {
        setEstimatedHoursStr('40');
      }
      
      const totalExpectedVal = isHourly ? (budgetVal * 40) : budgetVal;
      setMilestones([
        {
          title: 'Milestone 1',
          description: 'Phase 1 development',
          amount: Math.round(Number(totalExpectedVal) * 0.4),
        },
        {
          title: 'Milestone 2',
          description: 'Phase 2 development',
          amount: Math.round(Number(totalExpectedVal) * 0.6),
        }
      ]);
    }
  }, [project]);

  useEffect(() => {
    if (project && project.engagementType === 'Hourly' && milestones.length === 2 && milestones[0]?.title === 'Milestone 1') {
      const rate = toSafeNumber(bidAmountStr);
      const hours = toSafeNumber(estimatedHoursStr);
      const total = rate * hours;
      setMilestones([
        {
          title: 'Milestone 1',
          description: 'Phase 1 development',
          amount: Math.round(total * 0.4),
        },
        {
          title: 'Milestone 2',
          description: 'Phase 2 development',
          amount: Math.round(total * 0.6),
        }
      ]);
    }
  }, [bidAmountStr, estimatedHoursStr, project]);

  const isHourlyJob = project?.engagementType === 'Hourly';
  const hourlyRate = toSafeNumber(bidAmountStr);
  const estimatedHours = isHourlyJob ? toSafeNumber(estimatedHoursStr) : 1;

  const bidAmount = isHourlyJob ? (hourlyRate * estimatedHours) : hourlyRate;
  const platformFee = Math.round(bidAmount * (PLATFORM_FEE_PERCENT / 100));
  const netEarnings = bidAmount - platformFee;

  const milestoneTotal = milestones.reduce((sum, m) => sum + toSafeNumber(m.amount), 0);
  const isMilestoneTotalValid = milestoneTotal === bidAmount && bidAmount > 0;
  const isMilestonesValid =
    milestones.length > 0 &&
    milestones.every(
      (m) => m.title.trim().length >= 3 && (m.description?.trim()?.length || 0) >= 5 && toSafeNumber(m.amount) > 0
    );

  const isBudgetWarning = project?.budgetFixed ? bidAmount > project.budgetFixed * 1.2 : false;

  const handleAddMilestone = () => {
    setMilestones((prev) => [...prev, { title: '', description: '', amount: 0 }]);
  };

  const handleRemoveMilestone = (index: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMilestoneChange = (
    index: number,
    field: keyof MilestoneBid,
    value: string | number,
  ) => {
    setMilestones((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: field === 'amount' ? toSafeNumber(value) : String(value),
      };
      return next;
    });
  };


  const handleDeclineInvitation = async (invId: string) => {
    try {
      await respondInvitation({ id: invId, accept: false }).unwrap();
      setHasPendingInvite(false);
      showToast('Invitation declined successfully.', 'info');
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to decline invitation.', 'error');
    }
  };

  // Modal control
  const [showProposalModal, setShowProposalModal] = useState(false);

  // Local snackbar — replaces the Redux notification slice for this page
  const [toast, setToast] = useState<ToastState>({ open: false, message: '', severity: 'info' });
  const showToast = (message: string, severity: ToastState['severity']) =>
    setToast({ open: true, message, severity });
  const closeToast = () => setToast((t) => ({ ...t, open: false }));

  const handleProposalSubmit = async () => {
    if (!coverLetter.trim() || coverLetter.length < 100) {
      showToast('Cover letter must be at least 100 characters long.', 'error');
      return;
    }
    if (!isMilestoneTotalValid) {
      showToast('The sum of proposed milestones must equal your bid amount.', 'error');
      return;
    }

    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      if (!m.title.trim() || m.title.trim().length < 3) {
        showToast(`Milestone Stage ${i + 1} title must be at least 3 characters.`, 'error');
        return;
      }
      if (!m.description?.trim() || m.description.trim().length < 5) {
        showToast(`Milestone Stage ${i + 1} deliverables description must be at least 5 characters.`, 'error');
        return;
      }
      if (toSafeNumber(m.amount) <= 0) {
        showToast(`Milestone Stage ${i + 1} amount must be greater than zero.`, 'error');
        return;
      }
    }

    try {
      await submitProposal({
        jobId: projectId,
        bidAmount,
        durationDays: toSafeNumber(durationDaysStr) || 14,
        estimatedHours: isHourlyJob ? toSafeNumber(estimatedHoursStr) : undefined,
        coverLetter: coverLetter.trim(),
        milestones: milestones.map((m, idx) => ({
          title: m.title.trim(),
          description: m.description?.trim() || undefined,
          amount: m.amount,
          sequence: idx + 1,
        }))
      } as any).unwrap();

      if (hasPendingInvite && inviteId) {
        try {
          await respondInvitation({ id: inviteId, accept: true }).unwrap();
        } catch (e) {
          console.error(e);
        }
      }

      showToast('Proposal submitted successfully! Redirecting to proposals...', 'success');
      setShowProposalModal(false);
      setTimeout(() => router.push('/proposals'), 800);
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to submit proposal.', 'error');
    }
  };

  if (!mounted || isJobLoading || isProposalsLoading || isInvitationsLoading) {
    if (!mounted) return null;
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading project details...
          </Typography>
        </Stack>
      </Container>
    );
  }

  if (isJobError || !project) {
    return (
      <Container sx={{ py: 10 }}>
        <Alert severity="error">
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Project Not Found</Typography>
          <Typography variant="body2">The brief you are trying to view does not exist or has been closed.</Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Back button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push('/freelance-jobs')}
        sx={{ mb: 3, textTransform: 'none', fontWeight: 600, color: 'teal' }}
      >
        Back to Project board
      </Button>

      {hasPendingInvite && (
        <Card sx={{ mb: 4, border: '1.5px solid #0d9488', bgcolor: 'rgba(13, 148, 136, 0.03)', borderRadius: 4, boxShadow: 'none' }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'secondary.main', display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  📨 You were invited to bid on this project
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {project.client} thinks your background is a strong fit.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <Button variant="contained" color="secondary" size="small" onClick={() => setShowProposalModal(true)} sx={{ fontWeight: 800, color: '#fff' }}>
                  Submit a Proposal
                </Button>
                <Button variant="outlined" color="error" size="small" onClick={() => handleDeclineInvitation(inviteId!)} sx={{ fontWeight: 800 }}>
                  Decline Invitation
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={4}>
        {/* LEFT COLUMN: Project scope briefs */}
        <Grid item xs={12} md={8}>
          <Stack spacing={4}>
            {/* Main Header Info Card */}
            <Card sx={{ border: '1px solid #f1f5f9', borderRadius: 4, p: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip label="Freelance Project" size="small" color="secondary" sx={{ fontWeight: 600 }} />
                  <Chip label="Remote" size="small" variant="outlined" />
                </Stack>

                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, fontFamily: 'Outfit, sans-serif' }}>
                  {project.title}
                </Typography>

                 <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 2.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {project.client}
                  </Typography>
                  {(() => {
                    const approved = job?.recruiter?.kycStatus === 'APPROVED';
                    const verified = job?.recruiter?.paymentMethodVerified === true;
                    if (approved) {
                      return (
                        <Chip
                          icon={<VerifiedIcon sx={{ '&&': { color: '#2563eb', fontSize: 13 } }} />}
                          label="Identity verified"
                          size="small"
                          sx={{ height: 20, fontSize: '0.7rem', pl: 0.5, bgcolor: 'rgba(37, 99, 235, 0.05)', color: '#2563eb', border: '1px solid rgba(37, 99, 235, 0.15)', ml: 1 }}
                        />
                      );
                    } else if (verified) {
                      return (
                        <Chip
                          icon={<VerifiedIcon sx={{ '&&': { color: '#64748b', fontSize: 13 } }} />}
                          label="Payment verified"
                          size="small"
                          sx={{ height: 20, fontSize: '0.7rem', pl: 0.5, bgcolor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', ml: 1 }}
                        />
                      );
                    } else {
                      return (
                        <Chip label="New client" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem', px: 0.5, ml: 1 }} />
                      );
                    }
                  })()}
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Stack direction="row" alignItems="center" spacing={1} color="text.secondary">
                      <LocationOnIcon fontSize="small" />
                      <Typography variant="body2">{project.clientCountry}</Typography>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Stack direction="row" alignItems="center" spacing={1} color="text.secondary">
                      <CalendarTodayIcon fontSize="small" />
                      <Typography variant="body2">Posted on {project.postedDate}</Typography>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Project description details */}
            <Card sx={{ border: '1px solid #f1f5f9', borderRadius: 4, p: 1 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, fontFamily: 'Outfit, sans-serif' }}>
                  Project Description
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, mb: 3 }}>
                  {project.description}
                </Typography>

                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, fontFamily: 'Outfit, sans-serif' }}>
                  Required Deliverables
                </Typography>
                <Stack spacing={1} sx={{ pl: 2, mb: 4 }}>
                  {project.deliverables.map((del: string, i: number) => (
                    <Typography
                      key={i}
                      variant="body1"
                      color="text.secondary"
                      sx={{ display: 'list-item', listStyleType: 'disc', pl: 1, py: 0.5 }}
                    >
                      {del}
                    </Typography>
                  ))}
                </Stack>

                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, fontFamily: 'Outfit, sans-serif' }}>
                  Skills Demanded
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 4 }}>
                  {project.skills.map((s: any) => (
                    <Chip
                      key={s.name}
                      label={s.name}
                      color={s.isMandatory ? 'secondary' : 'default'}
                      variant={s.isMandatory ? 'filled' : 'outlined'}
                      sx={{ fontWeight: s.isMandatory ? 700 : 500 }}
                    />
                  ))}
                </Box>

                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontFamily: 'Outfit, sans-serif' }}>
                  Timeline & Attachments
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {project.timeline}
                </Typography>

                {project.attachments.length > 0 && (
                  <Stack spacing={1}>
                    {project.attachments.map((file: string) => {
                      const fileName = file.substring(file.lastIndexOf('/') + 1).replace(/^\d+-/, '');
                      const downloadUrl = file.startsWith('http') ? file : `http://localhost:4000/uploads/${file}`;
                      return (
                        <Box
                          key={file}
                          component="a"
                          href={downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            p: 1.5,
                            border: '1px solid #e2e8f0',
                            borderRadius: 2.5,
                            maxWidth: 350,
                            textDecoration: 'none',
                            color: 'inherit',
                            transition: 'all 0.2s',
                            '&:hover': {
                              borderColor: 'secondary.main',
                              bgcolor: 'rgba(0,0,0,0.01)',
                            }
                          }}
                        >
                          <FilePresentIcon color="secondary" />
                          <Typography variant="caption" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {fileName}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Client feedback stats card */}
            <Card sx={{ border: '1px solid #f1f5f9', borderRadius: 4, p: 1 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, fontFamily: 'Outfit, sans-serif' }}>
                  About the Client
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Previous Hires
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {project.clientStats.hiresCount} hires
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Total Spent
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      ₹{(project.clientStats.totalSpent / 100000).toFixed(1)} Lakhs
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Average Rating Given
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'secondary.main' }}>
                      ★ {project.clientStats.avgRatingGiven} / 5
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* RIGHT COLUMN: Budget, Match Score, Proposal CTA */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3} sx={{ position: 'sticky', top: 90 }}>
            {/* Match scorecard */}
            <Card
              sx={{
                border: '1.5px solid',
                borderColor:
                  project.aiScore >= 80
                    ? 'success.light'
                    : project.aiScore >= 60
                      ? 'warning.light'
                      : 'error.light',
                borderRadius: 4,
                boxShadow: '0 8px 32px rgba(13, 148, 136, 0.04)',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 800, textTransform: 'uppercase', mb: 2, color: 'text.secondary' }}
                >
                  Freelance Match Score
                </Typography>

                <Stack direction="row" alignItems="center" spacing={2.5} sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '5px solid',
                      borderColor:
                        project.aiScore >= 80
                          ? 'success.main'
                          : project.aiScore >= 60
                            ? 'warning.main'
                            : 'error.main',
                      fontWeight: 800,
                      fontSize: '1.15rem',
                    }}
                  >
                    {project.aiScore}%
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Excellent Fit
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Based on skills & rate criteria
                    </Typography>
                  </Box>
                </Stack>

                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  {[
                    { label: 'Skills Match', value: project.aiBreakdown.skills },
                    { label: 'Experience Level', value: project.aiBreakdown.experience },
                    { label: 'Portfolio Match', value: project.aiBreakdown.portfolio },
                  ].map((item) => (
                    <Box key={item.label}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {item.label}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          {item.value.score} / {item.value.max}
                        </Typography>
                      </Stack>
                      <Box sx={{ width: '100%', height: 6, bgcolor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                        <Box
                          sx={{
                            width: `${(item.value.score / item.value.max) * 100}%`,
                            height: '100%',
                            bgcolor: 'secondary.main',
                            borderRadius: 3,
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* Proposal CTA Card */}
            <Card sx={{ border: '1px solid #f1f5f9', borderRadius: 4 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', mb: 2 }}>
                  Client Budget
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: 'secondary.main' }}>
                  {project.engagementType === 'Hourly'
                    ? `₹${project.hourlyRateMin}/hr`
                    : `₹${project.budgetFixed?.toLocaleString()}`
                  }
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={1.5} sx={{ mb: 3 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Total Bids: <strong>{project.bidsCount} freelancers</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Average Bid Amount: <strong>₹{project.avgBidAmount.toLocaleString()}</strong>
                  </Typography>
                </Stack>

                <Button
                  variant="contained"
                  color="secondary"
                  fullWidth
                  size="large"
                  onClick={() => setShowProposalModal(true)}
                  disabled={hasBid}
                  sx={{
                    borderRadius: 3,
                    fontWeight: 700,
                    py: 1.5,
                  }}
                >
                  {hasBid ? 'Proposal Already Submitted' : 'Submit a Proposal'}
                </Button>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* PROPOSAL SUBMISSION MODAL */}
      <Dialog
        open={showProposalModal}
        onClose={() => setShowProposalModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, p: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Submit Freelance Proposal bid</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            {/* Bid fields */}
            <Grid item xs={12} sm={isHourlyJob ? 4 : 6}>
              <TextField
                label={isHourlyJob ? "Hourly Rate (INR/hr)" : "Your Propose Bid (INR)"}
                type="number"
                fullWidth
                size="small"
                value={bidAmountStr}
                onChange={(e) => setBidAmountStr(e.target.value)}
                inputProps={{ min: 0 }}
              />
            </Grid>
            {isHourlyJob && (
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Estimated Hours"
                  type="number"
                  fullWidth
                  size="small"
                  value={estimatedHoursStr}
                  onChange={(e) => setEstimatedHoursStr(e.target.value)}
                  inputProps={{ min: 0 }}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={isHourlyJob ? 4 : 6}>
              <TextField
                label="Duration Estimate (Days)"
                type="number"
                fullWidth
                size="small"
                value={durationDaysStr}
                onChange={(e) => setDurationDaysStr(e.target.value)}
                inputProps={{ min: 0 }}
              />
            </Grid>

            {/* Platform fee breakdown */}
            <Grid item xs={12}>
              <Box sx={{ p: 2.5, bgcolor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 3 }}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700, mb: 1.5 }}>
                  NO SURPRISES PAYMENT BREAKDOWN
                </Typography>
                <Grid container spacing={2}>
                  {isHourlyJob && (
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">
                        Hourly Rate
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        ₹{hourlyRate.toLocaleString()}/hr
                      </Typography>
                    </Grid>
                  )}
                  {isHourlyJob && (
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">
                        Est. Hours
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {estimatedHours} hrs
                      </Typography>
                    </Grid>
                  )}
                  <Grid item xs={isHourlyJob ? 3 : 4}>
                    <Typography variant="caption" color="text.secondary">
                      {isHourlyJob ? 'Estimated Total' : 'Your Bid'}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      ₹{bidAmount.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={isHourlyJob ? 3 : 4}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Platform Fee ({PLATFORM_FEE_PERCENT}%)
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
                      -₹{platformFee.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={isHourlyJob ? 12 : 4} sm={isHourlyJob ? 3 : 4}>
                    <Typography variant="caption" color="text.secondary">
                      You will Receive
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'secondary.main' }}>
                      ₹{netEarnings.toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
              {isBudgetWarning && (
                <Alert severity="warning" sx={{ mt: 2, borderRadius: 2.5 }}>
                  Your bid amount is more than 20% above the client&apos;s budget. This might reduce your match
                  competitiveness.
                </Alert>
              )}
            </Grid>

            {/* Cover letter — MUI multiline TextField instead of raw textarea */}
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 0.8, display: 'block' }}>
                Cover Letter Pitch
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={5}
                placeholder="Explain how you'd approach the problem, not just that you're qualified..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                error={coverLetter.length > 0 && coverLetter.length < 100}
                helperText={`${coverLetter.length} chars (minimum 100 required)`}
              />
            </Grid>

            {/* Milestones */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ my: 1.5 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Proposed Milestones
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Break down your project delivery stages. Total must equal your bid.
                  </Typography>
                </Box>
                <Button size="small" startIcon={<AddIcon />} onClick={handleAddMilestone} color="secondary">
                  Add Milestone
                </Button>
              </Stack>

              <Stack spacing={2}>
                {milestones.map((m, index) => (
                  <Card key={index} sx={{ border: '1px solid #f1f5f9', p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: 1 }}>
                        MILESTONE STAGE {index + 1}
                      </Typography>
                      {milestones.length > 1 && (
                        <Button
                          size="small"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleRemoveMilestone(index)}
                          sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                          Remove Stage
                        </Button>
                      )}
                    </Stack>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={8}>
                        <TextField
                          label="Milestone Title"
                          fullWidth
                          size="small"
                          required
                          value={m.title}
                          onChange={(e) => handleMilestoneChange(index, 'title', e.target.value)}
                          error={m.title.length > 0 && m.title.trim().length < 3}
                          helperText={
                            m.title.length > 0 && m.title.trim().length < 3
                              ? 'Title must be at least 3 characters'
                              : ''
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Amount (INR)"
                          type="number"
                          fullWidth
                          size="small"
                          required
                          value={m.amount === 0 ? '' : String(m.amount)}
                          onChange={(e) => handleMilestoneChange(index, 'amount', e.target.value)}
                          inputProps={{ min: 1 }}
                          error={m.amount <= 0}
                          helperText={m.amount <= 0 ? 'Amount must be > 0' : ''}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Milestone Deliverables Description"
                          fullWidth
                          size="small"
                          required
                          multiline
                          rows={2}
                          value={m.description}
                          onChange={(e) => handleMilestoneChange(index, 'description', e.target.value)}
                          error={Boolean(m.description && m.description.trim().length < 5)}
                          helperText={
                            m.description && m.description.trim().length < 5
                              ? 'Deliverables description must be at least 5 characters'
                              : 'Specify the exact deliverables for this stage'
                          }
                        />
                      </Grid>
                    </Grid>
                  </Card>
                ))}
              </Stack>

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption">
                  Total Milestone Sum: <strong>₹{milestoneTotal.toLocaleString()}</strong> / ₹
                  {bidAmount.toLocaleString()}
                </Typography>
                {isMilestoneTotalValid ? (
                  <Chip label="Milestone Sum Matches Bid" color="success" size="small" sx={{ fontWeight: 700 }} />
                ) : (
                  <Chip
                    icon={<WarningAmberIcon />}
                    label="Sum Mismatch"
                    color="warning"
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowProposalModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleProposalSubmit}
            disabled={coverLetter.length < 100 || !isMilestoneTotalValid || !isMilestonesValid || isSubmitting}
            sx={{ borderRadius: 2.5, fontWeight: 700 }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Proposal Bid'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Local snackbar for validation and success messages */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={closeToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={closeToast} severity={toast.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}