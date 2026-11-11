'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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
  MenuItem,
  FormControlLabel,
  Checkbox,
  Rating,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { showNotification } from '@/store/slices/notificationSlice';

// Icons
import VerifiedIcon from '@mui/icons-material/Verified';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WorkIcon from '@mui/icons-material/Work';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// APIs
import { useGetJobByIdQuery } from '@/store/api/jobsApi';
import { useGetCandidateProfileQuery, useConfirmProfileFeeMutation, useGetPublicSettingsQuery } from '@/store/api/profilesApi';
import { useGetApplicationsQuery, useApplyToJobMutation, useGetInvitationsQuery, useRespondInvitationMutation } from '@/store/api/applicationsApi';

const formatSalary = (minVal?: string | number | null, maxVal?: string | number | null) => {
  const min = Number(minVal ?? 0);
  const max = Number(maxVal ?? 0);

  if (min === 0 && max === 0) return 'Competitive';

  const formatSingle = (val: number) => {
    if (val >= 100000) {
      const lakhs = val / 100000;
      return lakhs % 1 === 0 ? `${lakhs}L` : `${lakhs.toFixed(1)}L`;
    }
    if (val >= 1000) {
      const thousands = val / 1000;
      return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(1)}K`;
    }
    return val.toString();
  };

  return `₹${formatSingle(min)} - ${formatSingle(max)}`;
};

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useDispatch();
  const jobId = (params?.id as string);

  // API Queries & Mutations
  const { data: job, isLoading, isError } = useGetJobByIdQuery(jobId);
  const { data: publicSettings } = useGetPublicSettingsQuery();
  const CANDIDATE_PROFILE_FEE = publicSettings?.CANDIDATE_PROFILE_FEE ?? 499;
  const { data: profileData } = useGetCandidateProfileQuery();
  const { data: appsData } = useGetApplicationsQuery();
  const [applyToJob, { isLoading: isApplying }] = useApplyToJobMutation();

  // Live profile status calculations from API
  const feePaid = !!profileData?.fullTimeFeePaid;
  const hasHeadline = !!profileData?.headline;
  const hasResume = !!(profileData?.resumes && profileData.resumes.length > 0);
  const hasThreeSkills = !!(profileData?.skills && profileData.skills.length >= 3);

  const profileComplete = useMemo(() => {
    return hasHeadline && hasResume && hasThreeSkills;
  }, [hasHeadline, hasResume, hasThreeSkills]);

  const appliedApp = useMemo(() => {
    return appsData?.data?.find((app) => app.jobId === jobId);
  }, [appsData, jobId]);

  const alreadyApplied = !!appliedApp;
  const isHired = appliedApp?.status === 'HIRED';

  const { data: invitationsData } = useGetInvitationsQuery();
  const [respondInv] = useRespondInvitationMutation();

  const { hasPendingInvite, inviteId } = useMemo(() => {
    if (alreadyApplied) {
      return { hasPendingInvite: false, inviteId: null };
    }
    const invite = invitationsData?.find(
      (inv: any) => inv.jobId === jobId && inv.status === 'SENT'
    );
    return {
      hasPendingInvite: !!invite,
      inviteId: invite?.id || null,
    };
  }, [invitationsData, jobId, alreadyApplied]);

  const searchParams = useSearchParams();
  const sessionIdParam = searchParams?.get('session_id');
  const cancelParam = searchParams?.get('cancel');

  const [confirmProfileFee, { isLoading: isPayingFee }] = useConfirmProfileFeeMutation();
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  const verificationStarted = React.useRef(false);

  // Verify payment session on redirect back from Stripe
  useEffect(() => {
    if (sessionIdParam && !verificationStarted.current) {
      verificationStarted.current = true;
      const verifySession = async () => {
        setIsVerifyingPayment(true);
        try {
          const res = await confirmProfileFee({ sessionId: sessionIdParam, jobId }).unwrap();
          if (res.fullTimeFeePaid) {
            dispatch(
              showNotification({
                message: 'Stripe payment verified successfully! Profile unlocked.',
                severity: 'success',
              })
            );
            router.replace(`/jobs/${jobId}`);
            setTimeout(() => {
              if (!profileComplete) {
                setShowIncompleteModal(true);
              } else {
                setShowApplyModal(true);
              }
            }, 800);
          }
        } catch (err: any) {
          dispatch(
            showNotification({
              message: err?.data?.message || 'Failed to verify payment session.',
              severity: 'error',
            })
          );
          router.replace(`/jobs/${jobId}`);
        } finally {
          setIsVerifyingPayment(false);
        }
      };
      verifySession();
    } else if (cancelParam) {
      dispatch(
        showNotification({
          message: 'Profile fee payment was cancelled.',
          severity: 'info',
        })
      );
      router.replace(`/jobs/${jobId}`);
    }
  }, [sessionIdParam, cancelParam, confirmProfileFee, jobId, profileComplete, router, dispatch]);

  const handleDeclineInvitation = async (invId: string) => {
    try {
      await respondInv({ id: invId, accept: false }).unwrap();
      dispatch(
        showNotification({
          message: 'Invitation declined successfully.',
          severity: 'info',
        })
      );
    } catch (err) {
      dispatch(
        showNotification({
          message: 'Failed to decline invitation.',
          severity: 'error',
        })
      );
    }
  };



  // --- MODAL CONTROLS ---
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);

  // --- FORM STATES ---
  const [selectedResume, setSelectedResume] = useState('');
  const [coverNote, setCoverNote] = useState('');

  // Pre-select primary resume once loaded
  useEffect(() => {
    if (profileData?.resumes && profileData.resumes.length > 0) {
      const primary = profileData.resumes.find(r => r.isPrimary) || profileData.resumes[0];
      setSelectedResume(primary.id);
    }
  }, [profileData]);

  const handleApplyClick = () => {
    if (alreadyApplied) {
      dispatch(
        showNotification({
          message: 'You have already applied to this role.',
          severity: 'info',
        })
      );
      return;
    }

    if (!feePaid) {
      setShowFeeModal(true);
      return;
    }

    if (!profileComplete) {
      setShowIncompleteModal(true);
      return;
    }

    setShowApplyModal(true);
  };

  const handlePayFee = async () => {
    try {
      const res = await confirmProfileFee({ jobId }).unwrap();
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else if (res.fullTimeFeePaid) {
        dispatch(
          showNotification({
            message: `Profile fee payment verified successfully! Full-time profile unlocked.`,
            severity: 'success',
          })
        );
        setShowFeeModal(false);
        setTimeout(() => {
          if (!profileComplete) {
            setShowIncompleteModal(true);
          } else {
            setShowApplyModal(true);
          }
        }, 500);
      }
    } catch (err: any) {
      dispatch(
        showNotification({
          message: err?.data?.message || 'Failed to initiate payment.',
          severity: 'error',
        })
      );
    }
  };

  const handleConfirmApply = async () => {
    try {
      await applyToJob({
        jobId,
        resumeId: selectedResume || undefined,
        coverNote: coverNote || undefined,
      }).unwrap();


      dispatch(
        showNotification({
          message: `Successfully applied for ${job?.title}!`,
          severity: 'success',
        })
      );
      setShowApplyModal(false);
    } catch (err: any) {
      dispatch(
        showNotification({
          message: err?.data?.message || 'An error occurred while submitting your application.',
          severity: 'error',
        })
      );
    }
  };

  // Dynamic AI match scoring based on profile data skills
  const aiScore = useMemo(() => {
    if (!profileData || !job) return 70;
    const candidateSkills = profileData.skills?.map((s: any) => s.skill?.name?.toLowerCase()) ?? [];
    const jobSkills = job.skills?.map((s: any) => s.skill?.name?.toLowerCase() ?? '') ?? [];
    const matchingSkills = jobSkills.filter((s: string) => candidateSkills.includes(s));
    
    if (jobSkills.length === 0) return 75;
    const matchRatio = matchingSkills.length / jobSkills.length;
    return Math.min(100, Math.round(55 + matchRatio * 35 + (job.title.toLowerCase().includes('senior') ? 5 : 0)));
  }, [profileData, job]);

  const aiBreakdown = useMemo(() => {
    return {
      skills: { score: Math.round(aiScore * 0.4), max: 40 },
      experience: { score: Math.round(aiScore * 0.3), max: 30 },
      education: { score: Math.round(aiScore * 0.15), max: 15 },
      projects: { score: Math.round(aiScore * 0.15), max: 15 }
    };
  }, [aiScore]);

  const mappedJob = useMemo(() => {
    if (!job) return null;
    return {
      title: job.title,
      company: job.company?.name ?? 'Bivio Client',
      companyDescription: job.company?.description ?? 'We are a fast-growing company hiring through Bivio.',
      isVerified: job.company?.isVerified ?? false,
      website: job.company?.website ?? '',
      location: job.location,
      remoteType: job.isRemote ? 'Remote' : 'On-site',
      salaryMin: job.salaryMin ?? 0,
      salaryMax: job.salaryMax ?? 0,
      salaryDetails: job.salaryMin && job.salaryMax 
        ? `₹${job.salaryMin.toLocaleString()} - ₹${job.salaryMax.toLocaleString()} per annum`
        : 'Competitive',
      postedDate: job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A',
      deadlineDate: job.deadline ? new Date(job.deadline).toLocaleDateString() : 'N/A',
      aboutRole: job.description,
      responsibilities: job.responsibilities 
        ? job.responsibilities.split('\n').filter(Boolean)
        : ['Own feature development lifecycle.', 'Ensure quality code reviews.', 'Work closely with product team.'],
      requirements: {
        skills: job.skills?.map((s: any) => ({ name: s.skill?.name ?? 'Skill', isMandatory: s.isMandatory })) ?? [],
        experienceYears: job.minExperienceYears ?? 0,
        education: job.minEducationLevel ?? 'Any',
      },
      niceToHaves: job.skills?.filter((s: any) => !s.isMandatory).map((s: any) => `Bonus proficiency: ${s.skill?.name}`) ?? [],
      hiringStages: job.hiringStages?.map((stage: any) => stage.name) ?? ['Applied', 'Review', 'Interview', 'Offer'],
    };
  }, [job]);

  const myApp = useMemo(() => {
    return appsData?.data?.find((app: any) => app.jobId === jobId);
  }, [appsData, jobId]);

  const activeStep = useMemo(() => {
    if (!myApp || !job?.hiringStages) return 0;
    const idx = job.hiringStages.findIndex((s: any) => s.id === myApp.currentStageId);
    return idx !== -1 ? idx : 0;
  }, [myApp, job]);

  if (isLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading job details...
          </Typography>
        </Stack>
      </Container>
    );
  }

  if (isVerifyingPayment) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Verifying your Stripe payment...
          </Typography>
        </Stack>
      </Container>
    );
  }

  if (isError || !job) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Alert severity="error">Failed to load job details. Please try again later.</Alert>
      </Container>
    );
  }

  if (!mappedJob) return null;

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Back button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push('/jobs')}
        sx={{ mb: 3, textTransform: 'none', fontWeight: 600 }}
      >
        Back to Jobs list
      </Button>

      {hasPendingInvite && (
        <Card sx={{ mb: 4, border: '1.5px solid #0d9488', bgcolor: 'rgba(13, 148, 136, 0.03)', borderRadius: 4, boxShadow: 'none' }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'secondary.main', display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  📨 You were invited to apply for this role
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {mappedJob.company} thinks your background is a strong fit.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <Button variant="contained" color="secondary" size="small" onClick={() => setShowApplyModal(true)} sx={{ fontWeight: 800, color: '#fff' }}>
                  Accept &amp; Apply
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
        {/* LEFT COLUMN: Main Description Details */}
        <Grid item xs={12} md={8}>
          <Stack spacing={4}>
            
            {/* Header info */}
            <Card sx={{ border: '1px solid #f1f5f9', borderRadius: 4, p: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip label={mappedJob.remoteType} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
                  <Chip label="Full-Time" size="small" variant="outlined" />
                </Stack>
                
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, fontFamily: 'Outfit, sans-serif' }}>
                  {mappedJob.title}
                </Typography>
                
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 2.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {mappedJob.company}
                  </Typography>
                  {mappedJob.isVerified && <VerifiedIcon color="primary" sx={{ fontSize: 18 }} />}
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Stack direction="row" alignItems="center" spacing={1} color="text.secondary">
                      <LocationOnIcon fontSize="small" />
                      <Typography variant="body2">{mappedJob.location}</Typography>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Stack direction="row" alignItems="center" spacing={1} color="text.secondary">
                      <CalendarTodayIcon fontSize="small" />
                      <Typography variant="body2">Posted on {mappedJob.postedDate}</Typography>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Stack direction="row" alignItems="center" spacing={1} color="text.secondary">
                      <WorkIcon fontSize="small" />
                      <Typography variant="body2">Deadline: {mappedJob.deadlineDate}</Typography>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Stack direction="row" alignItems="center" spacing={1} color="text.secondary">
                      <AttachMoneyIcon fontSize="small" />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {formatSalary(mappedJob.salaryMin, mappedJob.salaryMax)} / yr
                      </Typography>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* About role */}
            <Card sx={{ border: '1px solid #f1f5f9', borderRadius: 4, p: 1 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, fontFamily: 'Outfit, sans-serif' }}>
                  About the Role
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, mb: 3 }}>
                  {mappedJob.aboutRole}
                </Typography>

                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, fontFamily: 'Outfit, sans-serif' }}>
                  Key Responsibilities
                </Typography>
                <Stack spacing={1} sx={{ pl: 2, mb: 4 }}>
                  {mappedJob.responsibilities.map((resp: string, i: number) => (
                    <Typography key={i} variant="body1" color="text.secondary" sx={{ display: 'list-item', listStyleType: 'disc', pl: 1, py: 0.5 }}>
                      {resp}
                    </Typography>
                  ))}
                </Stack>

                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, fontFamily: 'Outfit, sans-serif' }}>
                  Requirements
                </Typography>
                <Stack spacing={2} sx={{ mb: 4 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      Required Skills
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {mappedJob.requirements.skills.map((s: any) => (
                        <Chip
                           key={s.name}
                           label={s.name}
                           color={s.isMandatory ? 'primary' : 'default'}
                           variant={s.isMandatory ? 'filled' : 'outlined'}
                           sx={{ fontWeight: s.isMandatory ? 700 : 500 }}
                        />
                      ))}
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Minimum Experience Needed
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {mappedJob.requirements.experienceYears} Years
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Preferred Education
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {mappedJob.requirements.education}
                    </Typography>
                  </Box>
                </Stack>

                {mappedJob.niceToHaves.length > 0 && (
                  <>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, fontFamily: 'Outfit, sans-serif' }}>
                      Nice to Haves (Weighted Bonus)
                    </Typography>
                    <Stack spacing={1} sx={{ pl: 2 }}>
                      {mappedJob.niceToHaves.map((nice: string, i: number) => (
                        <Typography key={i} variant="body1" color="text.secondary" sx={{ display: 'list-item', listStyleType: 'disc', pl: 1, py: 0.5 }}>
                          {nice}
                        </Typography>
                      ))}
                    </Stack>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Hiring Process Stepper */}
            <Card sx={{ border: '1px solid #f1f5f9', borderRadius: 4, p: 1 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, fontFamily: 'Outfit, sans-serif' }}>
                  Hiring Process Stages
                </Typography>
                 <Stepper activeStep={myApp ? activeStep : -1} alternativeLabel>
                  {mappedJob.hiringStages.map((stage: string, idx: number) => {
                    const isRejectedStep = myApp?.status === 'REJECTED' && idx === activeStep;
                    return (
                      <Step key={`${stage}-${idx}`}>
                        <StepLabel
                          error={isRejectedStep}
                          optional={
                            isRejectedStep ? (
                              <Typography variant="caption" color="error" sx={{ display: 'block', textAlign: 'center' }}>
                                Rejected
                              </Typography>
                            ) : null
                          }
                        >
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {stage}
                          </Typography>
                        </StepLabel>
                      </Step>
                    );
                  })}
                </Stepper>
              </CardContent>
            </Card>

            {/* About company */}
            <Card sx={{ border: '1px solid #f1f5f9', borderRadius: 4, p: 1 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, fontFamily: 'Outfit, sans-serif' }}>
                  About the Company
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
                  {mappedJob.companyDescription}
                </Typography>
                {mappedJob.website && (
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                    Website: <a href={mappedJob.website.startsWith('http') ? mappedJob.website : `https://${mappedJob.website}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{mappedJob.website}</a>
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* RIGHT COLUMN: AI Match Score & Apply Action Box */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3} sx={{ position: 'sticky', top: 90 }}>
            {/* Match scorecard */}
            <Card
              sx={{
                border: '1.5px solid',
                borderColor: aiScore >= 80 ? 'success.light' : aiScore >= 60 ? 'warning.light' : 'error.light',
                borderRadius: 4,
                boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', mb: 2, color: 'text.secondary' }}>
                  AI Match Breakdown
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
                      borderColor: aiScore >= 80 ? 'success.main' : aiScore >= 60 ? 'warning.main' : 'error.main',
                      fontWeight: 800,
                      fontSize: '1.15rem',
                    }}
                  >
                    {aiScore}%
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {aiScore >= 80 ? 'Excellent Match Profile' : aiScore >= 60 ? 'Good Match Profile' : 'Fair Match Profile'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Based on your skills & experience
                    </Typography>
                  </Box>
                </Stack>

                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  {[
                    { label: 'Key Skills', value: aiBreakdown.skills },
                    { label: 'Work Experience', value: aiBreakdown.experience },
                    { label: 'Education Level', value: aiBreakdown.education },
                    { label: 'Project Portfolio', value: aiBreakdown.projects },
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
                            bgcolor: aiScore >= 80 ? 'success.main' : 'primary.main',
                            borderRadius: 3,
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* Apply Action Box */}
            <Card sx={{ border: '1px solid #f1f5f9', borderRadius: 4 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', mb: 2 }}>
                  Salary Package Offered
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: 'primary.main' }}>
                  {formatSalary(mappedJob.salaryMin, mappedJob.salaryMax)} / yr
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                  {mappedJob.salaryDetails}
                </Typography>

                {alreadyApplied ? (
                  <Stack spacing={1}>
                    <Button variant="contained" color="success" disabled fullWidth sx={{ borderRadius: 2.5, fontWeight: 700 }}>
                      {isHired ? 'Offer Accepted — Hired!' : 'Already Applied'}
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => router.push('/applications')}
                      sx={{ borderRadius: 2.5, fontWeight: 700 }}
                    >
                      Track in Applications
                    </Button>
                  </Stack>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                    onClick={handleApplyClick}
                    disabled={isApplying}
                    sx={{
                      borderRadius: 3,
                      fontWeight: 700,
                      py: 1.5,
                      boxShadow: '0 8px 24px rgba(37, 99, 235, 0.15)',
                    }}
                  >
                    {isApplying ? 'Submitting Application...' : 'Apply for this role'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* 1. FEE PAYMENT GATEWAY MODAL */}
      <Dialog open={showFeeModal} onClose={() => setShowFeeModal(false)} PaperProps={{ sx: { borderRadius: 4, p: 2, maxWidth: 450 } }}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem' }}>
          Unlock Full-Time Applications
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            You need to pay a one-time profile activation fee of ₹{CANDIDATE_PROFILE_FEE} to unlock applications.
          </Typography>

          <Stack spacing={2} sx={{ p: 2.5, bgcolor: 'rgba(37, 99, 235, 0.02)', border: '1px solid #e2e8f0', borderRadius: 3, mb: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CheckCircleIcon color="primary" fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Apply to unlimited full-time positions</Typography>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CheckCircleIcon color="primary" fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Real-time match scoring breakdown</Typography>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CheckCircleIcon color="primary" fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Priority discoverability in recruiter shortlists</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowFeeModal(false)} disabled={isPayingFee} sx={{ fontWeight: 700 }}>Not Now</Button>
          <Button variant="contained" color="primary" onClick={handlePayFee} disabled={isPayingFee} startIcon={isPayingFee ? <CircularProgress size={16} color="inherit" /> : null} sx={{ borderRadius: 2.5, fontWeight: 700, px: 3 }}>
            {isPayingFee ? 'Processing...' : `Pay ₹${CANDIDATE_PROFILE_FEE} & Continue`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 2. INCOMPLETE PROFILE MODAL */}
      <Dialog open={showIncompleteModal} onClose={() => setShowIncompleteModal(false)} PaperProps={{ sx: { borderRadius: 4, p: 2, maxWidth: 450 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main' }}>
          <WarningAmberIcon /> Profile Incomplete
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            We noticed that some mandatory profile fields are missing. Complete them to build trust and apply:
          </Typography>
          <Stack spacing={1} sx={{ pl: 2, mb: 2 }}>
            {!hasResume && (
              <Typography variant="body2" color="text.secondary" sx={{ display: 'list-item', listStyleType: 'disc' }}>
                Primary Resume upload
              </Typography>
            )}
            {!hasThreeSkills && (
              <Typography variant="body2" color="text.secondary" sx={{ display: 'list-item', listStyleType: 'disc' }}>
                Minimum 3 key skills verified (currently: {profileData?.skills?.length ?? 0}/3)
              </Typography>
            )}
            {!hasHeadline && (
              <Typography variant="body2" color="text.secondary" sx={{ display: 'list-item', listStyleType: 'disc' }}>
                Profile pitch headline filled
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowIncompleteModal(false)} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={() => router.push('/profile')} sx={{ borderRadius: 2.5, fontWeight: 700 }}>
            Complete Profile Now
          </Button>
        </DialogActions>
      </Dialog>

      {/* 3. CONFIRM APPLY MODAL */}
      <Dialog open={showApplyModal} onClose={() => setShowApplyModal(false)} PaperProps={{ sx: { borderRadius: 4, p: 2, maxWidth: 500 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Apply to {mappedJob.company}
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" color="text.primary" sx={{ mb: 2, fontWeight: 700 }}>
            Applying for: {mappedJob.title}
          </Typography>

          <Stack spacing={3}>
            {profileData?.resumes && profileData.resumes.length > 0 ? (
              <TextField
                select
                label="Select Resume Version"
                fullWidth
                size="small"
                value={selectedResume}
                onChange={(e) => setSelectedResume(e.target.value)}
              >
                {profileData.resumes.map((res: any) => (
                  <MenuItem key={res.id} value={res.id}>
                    {res.fileName} {res.isPrimary ? '(Active Primary)' : ''}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <Alert severity="error">No resumes uploaded. Please upload a resume in your profile page first.</Alert>
            )}

            <TextField
              label="Cover Note / Pitch (Optional)"
              multiline
              rows={4}
              fullWidth
              placeholder="Tell the recruiter why you're a fit..."
              inputProps={{ maxLength: 1000 }}
              helperText={`${1000 - coverNote.length} characters left`}
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
            />

            <Box sx={{ p: 2, border: '1px solid #f1f5f9', borderRadius: 3, bgcolor: '#f8fafc' }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700, mb: 1 }}>
                WHAT WILL BE SENT TO RECRUITER
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'list-item', listStyleType: 'circle', ml: 2 }}>
                Your complete profile details & contact info.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'list-item', listStyleType: 'circle', ml: 2 }}>
                Attached resume document.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'list-item', listStyleType: 'circle', ml: 2 }}>
                Snapshot Match Score of {aiScore}% verified.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowApplyModal(false)} disabled={isApplying} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleConfirmApply} disabled={isApplying} startIcon={isApplying ? <CircularProgress size={16} color="inherit" /> : null} sx={{ borderRadius: 2.5, fontWeight: 700 }}>
            {isApplying ? 'Applying...' : 'Submit Application'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
