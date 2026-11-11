'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Stack,
  Button,
  Grid,
  Chip,
  Avatar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Paper,
  Alert,
  Snackbar,
  LinearProgress,
  Popover,
  Select,
  InputLabel,
  FormControl
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import ArticleIcon from '@mui/icons-material/Article';
import DownloadIcon from '@mui/icons-material/Download';
import LinkIcon from '@mui/icons-material/Link';
import WorkIcon from '@mui/icons-material/Work';
import SchoolIcon from '@mui/icons-material/School';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

import { 
  useGetApplicationByIdQuery,
  useMoveStageMutation,
  useRejectApplicationMutation,
  useScheduleInterviewMutation,
  useExtendOfferMutation
} from '@/store/api/applicationsApi';
import { useGetRecruiterProfileQuery, useUploadOfferFileMutation, useGetPublicSettingsQuery } from '@/store/api/profilesApi';
import CircularProgress from '@mui/material/CircularProgress';

import type { Application, Interview, Offer, Job } from '@/types';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatCurrency, formatTimeAgo } from '@/lib/format';

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: appData, isLoading: appLoading, isError: appError } = useGetApplicationByIdQuery(id);
  const { data: recruiterProfile } = useGetRecruiterProfileQuery();
  const { data: publicSettings } = useGetPublicSettingsQuery();
  const OFFER_EXPIRY_DAYS = publicSettings?.OFFER_EXPIRY_DAYS ?? 7;

  const [moveStage, { isLoading: isMovingStage }] = useMoveStageMutation();
  const [rejectApplication, { isLoading: isRejecting }] = useRejectApplicationMutation();
  const [scheduleInterview, { isLoading: isScheduling }] = useScheduleInterviewMutation();
  const [extendOffer, { isLoading: isExtendingOffer }] = useExtendOfferMutation();
  const [uploadOfferFile, { isLoading: isUploadingOffer }] = useUploadOfferFileMutation();

  const isSaving = isMovingStage || isRejecting || isScheduling || isExtendingOffer || isUploadingOffer;

  const app = appData as any;
  const job = app?.job;
  const interviews = app?.interviews || [];

  // Reject Modal States
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('Skills mismatch');
  const [rejectNote, setRejectNote] = useState('');

  // Schedule Interview Modal States
  const [scheduleModal, setScheduleModal] = useState(false);
  const [intRound, setIntRound] = useState(1);
  const [intStageId, setIntStageId] = useState('');
  const [intInterviewer, setIntInterviewer] = useState('Priya Menon');
  const [intDate, setIntDate] = useState('');
  const [intDuration, setIntDuration] = useState(45);
  const [intMode, setIntMode] = useState<'ONLINE' | 'PHONE' | 'ONSITE'>('ONLINE');
  const [intLink, setIntLink] = useState('');

  // Offer Modal States
  const [offerModal, setOfferModal] = useState(false);
  const [compensation, setCompensation] = useState('1200000');
  const [joiningDate, setJoiningDate] = useState('');
  const [offerExpiry, setOfferExpiry] = useState('');
  const [offerLetterUrl, setOfferLetterUrl] = useState('');
  const [offerLetterFileName, setOfferLetterFileName] = useState('');

  // Toast Snackbar States
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('success');

  // Match Score Popover
  const [scoreAnchor, setScoreAnchor] = useState<HTMLElement | null>(null);

  const showToast = (msg: string, severity: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setToastMsg(msg);
    setToastSeverity(severity);
    setToastOpen(true);
  };

  // Pre-set stage for scheduling interview
  useEffect(() => {
    if (app?.currentStageId && !intStageId) {
      setIntStageId(app.currentStageId);
    }
  }, [app, intStageId]);

  // Loader UI same as Job Details Page
  if (appLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading application details...
          </Typography>
        </Stack>
      </Container>
    );
  }

  if (appError || !app) {
    return (
      <Container sx={{ py: 10 }}>
        <Alert severity="error" sx={{ borderRadius: 3, fontWeight: 700 }}>
          Could not find or load the application details. Please try again.
        </Alert>
      </Container>
    );
  }

  const isWithdrawn = app.status === 'WITHDRAWN';
  const stages = job?.hiringStages || [];

  const handleScoreOpen = (e: React.MouseEvent<HTMLElement>) => setScoreAnchor(e.currentTarget);
  const handleScoreClose = () => setScoreAnchor(null);

  // Jump to specific stage
  const handleJumpToStage = async (stageId: string) => {
    if (isWithdrawn) return;
    const targetStage = stages.find((s: any) => s.id === stageId);
    if (!targetStage) return;

    try {
      await moveStage({ id: app.id, jobId: app.jobId, toStageId: stageId, note: `Jumped directly to ${targetStage.name}` }).unwrap();
      showToast(`Candidate transitioned to stage ${targetStage.name}`);
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to transition stage.', 'error');
    }
  };

  // Step transitions
  const handleAdvance = async () => {
    if (isWithdrawn) return;
    const currentIdx = stages.findIndex((s: any) => s.id === app.currentStageId);
    if (currentIdx !== -1 && currentIdx < stages.length - 1) {
      const nextStage = stages[currentIdx + 1];
      const isOAOrInterview = nextStage.name.toLowerCase().includes('technical') ||
                              nextStage.name.toLowerCase().includes('manager') ||
                              nextStage.name.toLowerCase().includes('interview') ||
                              nextStage.name.toLowerCase().includes('oa');

      try {
        await moveStage({ id: app.id, jobId: app.jobId, toStageId: nextStage.id, note: `Advanced to ${nextStage.name}` }).unwrap();
        showToast(isOAOrInterview
          ? `Advanced to ${nextStage.name}! Automated invite email enqueued.`
          : `Advanced to ${nextStage.name}.`
        );
      } catch (err: any) {
        showToast(err.data?.message || 'Failed to advance stage.', 'error');
      }
    }
  };

  const handleReject = async () => {
    try {
      let reasonEnum: 'SKILLS_MISMATCH' | 'EXPERIENCE_MISMATCH' | 'CULTURE_FIT' | 'POSITION_FILLED' | 'OTHER' = 'OTHER';
      const rLower = rejectReason.toLowerCase();
      if (rLower.includes('skills')) reasonEnum = 'SKILLS_MISMATCH';
      else if (rLower.includes('experience')) reasonEnum = 'EXPERIENCE_MISMATCH';
      else if (rLower.includes('culture')) reasonEnum = 'CULTURE_FIT';
      else if (rLower.includes('filled')) reasonEnum = 'POSITION_FILLED';

      await rejectApplication({ id: app.id, reason: reasonEnum, note: rejectNote }).unwrap();
      setRejectModal(false);
      showToast('Candidate profile has been marked rejected. Email notification sent.', 'info');
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to reject candidate.', 'error');
    }
  };

  const handleScheduleInterview = async () => {
    if (!intDate) {
      showToast('Please select a Date and Time for the interview.', 'error');
      return;
    }

    const recruiterId = recruiterProfile?.userId;
    if (!recruiterId) {
      showToast('Could not resolve logged-in recruiter ID.', 'error');
      return;
    }

    try {
      await scheduleInterview({
        id: app.id,
        hiringStageId: intStageId || undefined,
        roundNo: intRound,
        scheduledAt: new Date(intDate).toISOString(),
        durationMinutes: intDuration,
        mode: intMode,
        meetingLink: intMode === 'ONLINE' ? (intLink || 'https://meet.google.com/mock-room') : undefined,
        location: intMode === 'ONSITE' ? (intLink || 'Onsite Office') : undefined,
        interviewerId: recruiterId,
      }).unwrap();

      setScheduleModal(false);
      showToast(`Interview round ${intRound} scheduled successfully with ${intInterviewer}.`);
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to schedule interview.', 'error');
    }
  };

  const handleOfferFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      try {
        const res = await uploadOfferFile({
          fileName: file.name,
          base64Data,
        }).unwrap();
        setOfferLetterUrl(res.fileUrl);
        setOfferLetterFileName(file.name);
        showToast('Offer letter PDF uploaded successfully!');
      } catch (err: any) {
        showToast(err.data?.message || 'Failed to upload offer letter PDF.', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenOfferModal = () => {
    if (!offerExpiry) {
      const defaultExp = new Date(Date.now() + OFFER_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setOfferExpiry(defaultExp);
    }
    setOfferModal(true);
  };

  const handleExtendOffer = async () => {
    if (!joiningDate || !offerExpiry) return;

    try {
      await extendOffer({
        id: app.id,
        compensation: Number(compensation),
        currency: 'INR',
        joiningDate: new Date(joiningDate).toISOString(),
        expiresAt: new Date(offerExpiry).toISOString(),
        offerLetterUrl: offerLetterUrl || 'https://bivio-documents.s3.amazonaws.com/mock-offer.pdf',
      }).unwrap();

      setOfferModal(false);
      setOfferLetterUrl('');
      setOfferLetterFileName('');
      showToast('Hiring offer extended successfully!');
      setTimeout(() => {
        router.push('/recruiter/offers');
      }, 1500);
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to extend offer.', 'error');
    }
  };

  // Mock scores for breakdown based on real score
  const scoreTotal = app?.snapshotAiScore ? Number(app.snapshotAiScore) : 87;
  const mockScore = { 
    total: scoreTotal, 
    skills: Math.round(scoreTotal * 0.35), 
    exp: Math.round(scoreTotal * 0.25), 
    edu: Math.round(scoreTotal * 0.15), 
    domain: Math.round(scoreTotal * 0.15), 
    practical: Math.round(scoreTotal * 0.10) 
  };

  const formatExternalUrl = (url?: string | null) => {
    if (!url || url === '#') return '#';
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return `https://${trimmed}`;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Link href={job ? `/recruiter/jobs/${job.id}/pipeline` : '/recruiter/jobs'} style={{ textDecoration: 'none' }}>
        <Button startIcon={<ArrowBackIcon />} sx={{ mb: 3 }}>
          Back to Pipeline Board
        </Button>
      </Link>

      {/* WITHDRAWN WARNING BANNER */}
      {isWithdrawn && (
        <Alert severity="error" variant="filled" sx={{ mb: 4, fontWeight: 700 }}>
          This candidate withdrew their application on {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'recently'}. Action capabilities are restricted.
        </Alert>
      )}

      {/* HEADER SECTION */}
      <Card sx={{ borderRadius: 4, mb: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <CardContent sx={{ p: 4 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="flex-start" spacing={3}>
            <Stack direction="row" spacing={3} alignItems="center">
              <Avatar sx={{ width: 64, height: 64, bgcolor: 'secondary.light', fontSize: '1.5rem', fontWeight: 800 }}>
                {app.candidate?.user.fullName[0]}
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 850, fontFamily: 'Outfit, sans-serif' }}>
                  {app.candidate?.user.fullName}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {app.candidate?.headline || 'Backend Architect'}
                </Typography>
                <Typography variant="body2" component="div" color="text.secondary" sx={{ mt: 0.5, display: 'flex', alignItems: 'center' }}>
                  Applied {formatTimeAgo(app.appliedAt)} · Source: <Chip label={app.source} size="small" sx={{ fontWeight: 700, ml: 0.5 }} />
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                  <StatusBadge domain="application" status={app.status} />
                  <Chip label={`Stage: ${app.currentStage?.name || 'Screening'}`} variant="outlined" />
                </Stack>
              </Box>
            </Stack>

            {/* Match Score Trigger */}
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                onClick={handleScoreOpen}
                sx={{
                  cursor: 'pointer',
                  p: 1.5,
                  borderRadius: 3,
                  border: '1px solid #e2e8f0',
                  bgcolor: 'rgba(37, 99, 235, 0.02)',
                  textAlign: 'center',
                  '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.05)' }
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
                  {mockScore.total}%
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  MATCH SCORE
                </Typography>
              </Box>

              {!isWithdrawn && app.status !== 'REJECTED' && (
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" color="error" disabled={isSaving || app.status === 'HIRED'} onClick={() => setRejectModal(true)}>
                    Reject
                  </Button>

                  {app.currentStage?.isTerminal ? (
                    <Button variant="contained" color="success" disabled={isSaving || app.status === 'HIRED'} onClick={handleOpenOfferModal} sx={{ fontWeight: 700 }}>
                      {app.status === 'HIRED' ? 'Offer Accepted — Hired' : (app.offer ? 'Extend Offer' : 'Send Offer Letter')}
                    </Button>
                  ) : (
                    <Button variant="contained" onClick={handleAdvance} disabled={isSaving || app.status === 'HIRED'} startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null} sx={{ fontWeight: 700 }}>
                      {isSaving ? 'Advancing...' : 'Advance Stage'}
                    </Button>
                  )}
                </Stack>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={4}>
        {/* LEFT COLUMN: Profile snapshot, Resume, Cover Note */}
        <Grid item xs={12} md={7.5}>
          <Stack spacing={4}>
            {/* Frozen resume & cover note block */}
            <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Pinned Application Materials</Typography>
                <Alert severity="info" sx={{ mb: 3, fontWeight: 600 }}>
                  Resume and cover note are frozen snapshot copies captured at application time.
                </Alert>

                <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e2e8f0', borderRadius: 3, mb: 3, boxShadow: 'none' }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <ArticleIcon color="primary" sx={{ fontSize: 32 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{app.resume?.fileName || 'resume.pdf'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Submitted snapshot · {app.resume?.sizeBytes ? `${(Number(app.resume.sizeBytes) / 1024 / 1024).toFixed(1)} MB` : 'Unknown size'}
                      </Typography>
                    </Box>
                  </Stack>
                  <Button 
                    variant="outlined" 
                    startIcon={<DownloadIcon />} 
                    size="small"
                    component="a"
                    href={
                      app.resume?.fileUrl && !app.resume.fileUrl.includes('bivio-resumes.s3.amazonaws.com')
                        ? app.resume.fileUrl
                        : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                  >
                    Download PDF
                  </Button>
                </Paper>

                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Cover Note</Typography>
                <Paper sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.01)', border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: 'none' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    "{app.coverNote || 'No custom cover note was submitted with this application.'}"
                  </Typography>
                </Paper>
              </CardContent>
            </Card>

            {/* Candidate Common profile view */}
            <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Candidate Common Profile</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                  Profile shown below reflects the candidate's current live details — may have changed since application.
                </Typography>

                <Stack spacing={3}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Summary Bio</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      {app.candidate?.summary || 'No summary bio detailed.'}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
                    <Box sx={{ flex: 1 }}>
                      <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: 'none', bgcolor: 'rgba(37, 99, 235, 0.01)', height: '100%' }}>
                        <Avatar sx={{ bgcolor: 'rgba(37, 99, 235, 0.1)', color: 'primary.main', width: 40, height: 40 }}>
                          <WorkIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, fontSize: '0.68rem', letterSpacing: 0.5 }}>
                            TOTAL EXPERIENCE
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            {app.candidate?.experienceYears || '3'} Years
                          </Typography>
                        </Box>
                      </Paper>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: 'none', bgcolor: 'rgba(16, 185, 129, 0.01)', height: '100%' }}>
                        <Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: 'success.main', width: 40, height: 40 }}>
                          <SchoolIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, fontSize: '0.68rem', letterSpacing: 0.5 }}>
                            EDUCATION DEGREE
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            {app.candidate?.highestEducation || 'Bachelor'}
                          </Typography>
                        </Box>
                      </Paper>
                    </Box>
                  </Stack>

                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Core Professional Skills</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {app.candidate?.skills?.map((sk: any) => (
                        <Chip key={sk.id} label={`${sk.skill.name} (${sk.proficiency || 4}/5)`} size="small" variant="outlined" />
                      ))}
                      {(!app.candidate?.skills || app.candidate.skills.length === 0) && (
                        <Typography variant="caption" color="text.secondary">No skills listed.</Typography>
                      )}
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Social Profiles</Typography>
                    <Stack direction="row" spacing={2}>
                      <Button 
                        size="small" 
                        startIcon={<LinkIcon />} 
                        component="a" 
                        href={formatExternalUrl(app.candidate?.portfolio?.linkedinUrl)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        LinkedIn
                      </Button>
                      <Button 
                        size="small" 
                        startIcon={<LinkIcon />} 
                        component="a" 
                        href={formatExternalUrl(app.candidate?.portfolio?.githubUrl)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        GitHub
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* RIGHT COLUMN: Stage transition timeline audit log & interviews */}
        <Grid item xs={12} md={4.5}>
          <Stack spacing={4}>
            {/* Quick Jumps Stage transitions */}
            {!isWithdrawn && app.status !== 'REJECTED' && (
              <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>Stage Progression Jump</Typography>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Move directly to stage</InputLabel>
                    <Select
                      label="Move directly to stage"
                      value={app.currentStageId || ''}
                      onChange={(e) => handleJumpToStage(e.target.value)}
                    >
                      {stages.map((st: any) => (
                        <MenuItem key={st.id} value={st.id}>{st.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            )}

            {/* Stage Timeline Audit */}
            <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Stage Transition History</Typography>
                
                <Stack spacing={2} sx={{ pl: 1 }}>
                  {app.movements?.map((mov: any) => (
                    <Box key={mov.id} sx={{ pl: 2, borderLeft: '2px solid #cbd5e1', py: 0.5, position: 'relative' }}>
                      <Box sx={{ width: 10, height: 10, bgcolor: 'primary.main', borderRadius: '50%', position: 'absolute', left: -6, top: 10 }} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{mov.toStage.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Moved by {mov.movedBy.fullName} · {new Date(mov.movedAt).toLocaleDateString()}
                      </Typography>
                      {mov.note && (
                        <Typography variant="caption" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                          "{mov.note}"
                        </Typography>
                      )}
                    </Box>
                  ))}
                  {(!app.movements || app.movements.length === 0) && (
                    <Typography variant="caption" color="text.secondary">No transitions recorded yet.</Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Interviews List */}
            <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>Interviews</Typography>
                  {!isWithdrawn && app.status !== 'REJECTED' && (
                    <Button variant="outlined" size="small" onClick={() => router.push('/recruiter/interviews')}>Schedule</Button>
                  )}
                </Stack>

                <Stack spacing={2}>
                  {interviews.map((int: any) => (
                    <Paper key={int.id} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: 'none' }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>Round {int.roundNo} - {int.mode}</Typography>
                        <Chip
                          label={
                            int.status === 'COMPLETED'
                              ? 'COMPLETED'
                              : int.status === 'CANCELLED'
                              ? 'DECLINED / CANCELLED'
                              : int.candidateResponse === 'ACCEPTED'
                              ? 'ACCEPTED'
                              : int.status
                          }
                          color={
                            int.status === 'COMPLETED'
                              ? 'success'
                              : int.status === 'CANCELLED'
                              ? 'error'
                              : int.candidateResponse === 'ACCEPTED'
                              ? 'success'
                              : 'info'
                          }
                          size="small"
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Scheduled: {new Date(int.scheduledAt).toLocaleString()} ({int.durationMinutes} mins)
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Interviewer: {int.interviewer?.fullName || 'Assigned Interviewer'}
                      </Typography>
                      {int.status === 'CANCELLED' && int.rescheduleReason && (
                        <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.75, fontWeight: 600 }}>
                          Decline Reason: {int.rescheduleReason}
                        </Typography>
                      )}
                    </Paper>
                  ))}

                  {interviews.length === 0 && (
                    <Typography variant="caption" color="text.secondary">No interviews scheduled for this application yet.</Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Popover Match Score Details */}
      <Popover
        open={Boolean(scoreAnchor)}
        anchorEl={scoreAnchor}
        onClose={handleScoreClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        PaperProps={{ sx: { p: 3, width: 320, borderRadius: 3 } }}
      >
        <Stack spacing={2}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Match Score Breakdown</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Captured at application ({new Date(app.appliedAt || Date.now()).toLocaleDateString()})
          </Typography>

          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>Skills Fit</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{mockScore.skills}/35</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={(mockScore.skills / 35) * 100} />
          </Box>

          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>Experience Level</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{mockScore.exp}/25</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={(mockScore.exp / 25) * 100} />
          </Box>

          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>Education Match</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{mockScore.edu}/15</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={(mockScore.edu / 15) * 100} />
          </Box>

          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>Domain Relevance</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{mockScore.domain}/15</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={(mockScore.domain / 15) * 100} />
          </Box>

          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>Practical Fit</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{mockScore.practical}/10</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={(mockScore.practical / 10) * 100} />
          </Box>
        </Stack>
      </Popover>

      {/* Reject Modal */}
      <Dialog open={rejectModal} onClose={() => setRejectModal(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Reject Candidate Application</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1.5 }}>
            <TextField
              select
              label="Rejection Reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              fullWidth
            >
              <MenuItem value="Skills mismatch">Skills mismatch</MenuItem>
              <MenuItem value="Experience mismatch">Experience mismatch</MenuItem>
              <MenuItem value="Culture fit">Culture fit</MenuItem>
              <MenuItem value="Position filled">Position filled</MenuItem>
              <MenuItem value="Other">Other Reason</MenuItem>
            </TextField>

            <TextField
              label="Optional Note"
              placeholder="Provide context or feedback details..."
              multiline
              rows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setRejectModal(false)} disabled={isSaving}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleReject} disabled={isSaving} startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null} sx={{ fontWeight: 700 }}>
            {isSaving ? 'Rejecting...' : 'Confirm Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Interview Modal */}
      <Dialog open={scheduleModal} onClose={() => setScheduleModal(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Schedule Interview Round</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1.5 }}>
            <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Round Number"
                  type="number"
                  value={intRound}
                  onChange={(e) => setIntRound(parseInt(e.target.value) || 1)}
                  fullWidth
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <TextField select label="Hiring Stage" value={intStageId} onChange={(e) => setIntStageId(e.target.value)} fullWidth>
                  {stages.map((st: any) => (
                    <MenuItem key={st.id} value={st.id}>{st.name}</MenuItem>
                  ))}
                </TextField>
              </Box>
            </Stack>

            <TextField label="Interviewer Name" value={intInterviewer} onChange={(e) => setIntInterviewer(e.target.value)} fullWidth />

            <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Date &amp; Time"
                  type="datetime-local"
                  InputLabelProps={{ shrink: true }}
                  value={intDate}
                  onChange={(e) => setIntDate(e.target.value)}
                  fullWidth
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Duration (Minutes)"
                  type="number"
                  value={intDuration}
                  onChange={(e) => setIntDuration(parseInt(e.target.value) || 45)}
                  fullWidth
                />
              </Box>
            </Stack>

            <TextField select label="Interview Mode" value={intMode} onChange={(e) => setIntMode(e.target.value as any)} fullWidth>
              <MenuItem value="ONLINE">Online Video Room</MenuItem>
              <MenuItem value="PHONE">Phone Call</MenuItem>
              <MenuItem value="ONSITE">Onsite Office</MenuItem>
            </TextField>

            <TextField
              label={intMode === 'ONSITE' ? 'Office Location Address' : 'Meeting Room URL'}
              value={intLink}
              onChange={(e) => setIntLink(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setScheduleModal(false)} disabled={isSaving}>Cancel</Button>
          <Button variant="contained" onClick={handleScheduleInterview} disabled={isSaving} startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null} sx={{ fontWeight: 700 }}>
            {isSaving ? 'Scheduling...' : 'Schedule Meeting'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Offer Modal */}
      <Dialog open={offerModal} onClose={() => setOfferModal(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Extend Employment Offer</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1.5 }}>
            <TextField
              label="Annual Compensation package (₹)"
              type="number"
              value={compensation}
              onChange={(e) => setCompensation(e.target.value)}
              fullWidth
            />
            <TextField
              label="Proposed Joining Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              fullWidth
            />
            <TextField
              label="Offer Expiry Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={offerExpiry}
              onChange={(e) => setOfferExpiry(e.target.value)}
              fullWidth
            />
            <Box sx={{ mt: 1 }}>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={<CloudUploadIcon />}
                sx={{ height: 48, textTransform: 'none', fontWeight: 700 }}
              >
                {isUploadingOffer ? 'Uploading PDF...' : 'Upload Offer Letter PDF'}
                <input type="file" hidden accept="application/pdf" onChange={handleOfferFileUpload} disabled={isSaving} />
              </Button>
              {offerLetterFileName && (
                <Typography variant="caption" display="block" sx={{ mt: 1, fontWeight: 600, color: 'success.main' }}>
                  Uploaded: {offerLetterFileName}
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOfferModal(false)} disabled={isSaving}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleExtendOffer} disabled={isSaving} startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null} sx={{ fontWeight: 700 }}>
            {isSaving ? 'Sending...' : 'Extend Offer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Notification */}
      <Snackbar open={toastOpen} autoHideDuration={4000} onClose={() => setToastOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toastSeverity} sx={{ width: '100%', fontWeight: 700 }}>
          {toastMsg}
        </Alert>
      </Snackbar>
    </Container>
  );
}
