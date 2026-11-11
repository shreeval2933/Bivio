'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Container,
  Typography,
  Tabs,
  Tab,
  Box,
  Card,
  CardContent,
  Stack,
  Button,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
  MenuItem,
  Divider,
  Paper,
  Snackbar,
  Alert,
  Tooltip
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FeedbackIcon from '@mui/icons-material/Feedback';
import HistoryIcon from '@mui/icons-material/History';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LinkIcon from '@mui/icons-material/Link';
import PersonIcon from '@mui/icons-material/Person';

import {
  useGetCompanyInterviewsQuery,
  useRescheduleInterviewMutation,
  useSubmitInterviewFeedbackMutation,
  useCancelInterviewMutation
} from '@/store/api/interviewsApi';
import { useGetApplicationsQuery, useScheduleInterviewMutation } from '@/store/api/applicationsApi';
import { useGetRecruiterJobsQuery } from '@/store/api/jobsApi';
import { useGetRecruiterProfileQuery, useGetRecruiterTeamQuery } from '@/store/api/profilesApi';
import CircularProgress from '@mui/material/CircularProgress';

import type { Interview, InterviewRecommendation, InterviewStatus, Application, Job } from '@/types';

export default function RecruiterInterviewsPage() {
  const [activeTab, setActiveTab] = useState<string>('UPCOMING');
  const [jobFilter, setJobFilter] = useState<string>('ALL');
  const [interviewerFilter, setInterviewerFilter] = useState<string>('ALL');

  // API Hooks
  const { data: recruiterProfile } = useGetRecruiterProfileQuery();
  const { data: teamData } = useGetRecruiterTeamQuery();
  const { data: interviewsData, isLoading: isLoadingInterviews } = useGetCompanyInterviewsQuery();
  const { data: appsData } = useGetApplicationsQuery({ limit: 50 });
  const { data: jobsData } = useGetRecruiterJobsQuery();

  const [scheduleInterview, { isLoading: isScheduling }] = useScheduleInterviewMutation();
  const [rescheduleInterview, { isLoading: isRescheduling }] = useRescheduleInterviewMutation();
  const [submitFeedback, { isLoading: isSubmittingFeedback }] = useSubmitInterviewFeedbackMutation();
  const [cancelInterview, { isLoading: isCancelling }] = useCancelInterviewMutation();

  const isSaving = isScheduling || isRescheduling || isSubmittingFeedback || isCancelling;

  const interviews = interviewsData || [];
  const apps = appsData?.data || [];
  const jobs = jobsData?.data || [];

  // Modal States
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [rescheduleModal, setRescheduleModal] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [viewPastModal, setViewPastModal] = useState(false);

  // Selected Item
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);

  // Feedback form state
  const [commRating, setCommRating] = useState<number | null>(3);
  const [techRating, setTechRating] = useState<number | null>(3);
  const [cultRating, setCultRating] = useState<number | null>(3);
  const [overallRating, setOverallRating] = useState<number | null>(3);
  const [writtenFeedback, setWrittenFeedback] = useState('');
  const [recommendation, setRecommendation] = useState<InterviewRecommendation>('PROCEED');

  // Reschedule form state
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Schedule Interview form state
  const [newAppId, setNewAppId] = useState('');
  const [newStageId, setNewStageId] = useState('');
  const [newRound, setNewRound] = useState(1);
  const [newInterviewer, setNewInterviewer] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newDuration, setNewDuration] = useState(60);
  const [newMode, setNewMode] = useState<'ONLINE' | 'PHONE' | 'ONSITE'>('ONLINE');
  const [newLink, setNewLink] = useState('');
  const [newAgenda, setNewAgenda] = useState('');

  // Toast Snackbar States
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'warning' | 'info'>('success');

  // Automatically pre-fill default interviewer user ID on profile fetch
  useEffect(() => {
    if (recruiterProfile?.userId) {
      setNewInterviewer(recruiterProfile.userId);
    }
  }, [recruiterProfile]);

  // Automatically pre-fill hiring stage ID when selecting candidate
  useEffect(() => {
    if (newAppId) {
      const app = apps.find(a => a.id === newAppId);
      if (app) {
        setNewStageId(app.currentStageId || '');
      }
    }
  }, [newAppId, apps]);

  const showToast = (msg: string, severity: 'success' | 'warning' | 'info' = 'success') => {
    setToastMsg(msg);
    setToastSeverity(severity);
    setToastOpen(true);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  // Helper to check if meeting Join button is active (15 mins before start time)
  const isJoinActive = (int: any) => {
    if (int.status === 'COMPLETED' || int.status === 'CANCELLED') {
      return false;
    }
    const meetTime = new Date(int.scheduledAt).getTime();
    const now = Date.now();
    const diffMins = (meetTime - now) / (1000 * 60);
    const duration = int.durationMinutes || 60;
    return diffMins <= 15 && diffMins >= -duration;
  };

  // Action Handlers
  const handleOpenFeedback = (interview: Interview) => {
    setSelectedInterview(interview);
    setFeedbackModal(true);
  };

  const handleSubmitFeedback = async () => {
    if (!selectedInterview) return;

    try {
      await submitFeedback({
        id: selectedInterview.id,
        rating: overallRating || 3,
        feedback: writtenFeedback,
        recommendation: recommendation,
      }).unwrap();

      setFeedbackModal(false);
      setSelectedInterview(null);
      setWrittenFeedback('');
      showToast('Feedback submitted successfully! Candidate stage progression updated.', 'success');
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to submit feedback.', 'warning');
    }
  };

  const handleOpenReschedule = (interview: Interview) => {
    setSelectedInterview(interview);
    setRescheduleModal(true);
  };

  const handleSubmitReschedule = async () => {
    if (!selectedInterview || !rescheduleDate) return;

    try {
      await rescheduleInterview({
        id: selectedInterview.id,
        scheduledAt: new Date(rescheduleDate).toISOString(),
        agendaNotes: rescheduleReason || undefined,
      }).unwrap();

      setRescheduleModal(false);
      setSelectedInterview(null);
      setRescheduleDate('');
      setRescheduleReason('');
      showToast('Interview session rescheduled. Candidate notified.', 'success');
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to reschedule interview.', 'warning');
    }
  };

  const handleCreateInterview = async () => {
    if (!newAppId) {
      showToast('Please select a Candidate / Application.', 'warning');
      return;
    }
    if (!newDate) {
      showToast('Please select a Date and Time.', 'warning');
      return;
    }
    const targetApp = apps.find(a => a.id === newAppId);
    if (!targetApp) return;

    try {
      await scheduleInterview({
        id: newAppId,
        roundNo: newRound,
        hiringStageId: newStageId || targetApp.currentStageId || undefined,
        interviewerId: newInterviewer || recruiterProfile?.userId || '',
        scheduledAt: new Date(newDate).toISOString(),
        durationMinutes: newDuration,
        mode: newMode,
        meetingLink: newMode === 'ONLINE' ? newLink : undefined,
        location: newMode === 'ONSITE' ? newLink : undefined,
        agendaNotes: newAgenda || undefined,
      }).unwrap();

      setScheduleModal(false);
      setNewAppId('');
      setNewDate('');
      setNewAgenda('');
      showToast(`Successfully scheduled Interview Round ${newRound} with Candidate.`, 'success');
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to schedule interview.', 'warning');
    }
  };

  // Filter application & job helper
  const getJobForApplication = (appId: string) => {
    const app = apps.find(a => a.id === appId);
    if (!app) return null;
    return jobs.find(j => j.id === app.jobId);
  };

  const getCandidateName = (appId: string) => {
    const app = apps.find(a => a.id === appId);
    return app?.candidate?.user.fullName || 'Candidate';
  };

  // Filtered List computations
  const filteredInterviews = interviews.filter((i: any) => {
    const app = i.application;
    if (!app) return false;

    // Job Filter
    if (jobFilter !== 'ALL' && app.jobId !== jobFilter) return false;

    // Interviewer Filter
    if (interviewerFilter !== 'ALL' && i.interviewer?.fullName !== interviewerFilter) return false;

    // Tab Filters
    if (activeTab === 'UPCOMING') {
      return (i.status === 'SCHEDULED' || i.status === 'RESCHEDULED') && new Date(i.scheduledAt) >= new Date();
    }
    if (activeTab === 'NEEDS_FEEDBACK') {
      return (i.status === 'COMPLETED' && !i.recommendation) || ((i.status === 'SCHEDULED' || i.status === 'RESCHEDULED') && new Date(i.scheduledAt) < new Date());
    }
    // PAST Tab
    return i.status === 'CANCELLED' || (i.status === 'COMPLETED' && i.recommendation);
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Page Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 850, fontFamily: 'Outfit, sans-serif', color: 'primary.main' }}>
            Interview Management Desk
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Centralized scheduler, assessment logs, and feedback dashboard.
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => setScheduleModal(true)} sx={{ fontWeight: 700 }}>
          Schedule Interview
        </Button>
      </Stack>

      {/* Tabs Menu */}
      <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tab value="UPCOMING" label="Upcoming" />
        <Tab value="NEEDS_FEEDBACK" label="Needs Feedback" />
        <Tab value="PAST" label="Past History" />
      </Tabs>

      {/* Filters toolbar */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <TextField select size="small" label="Filter by Job" value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} fullWidth>
            <MenuItem value="ALL">All Posted Jobs</MenuItem>
            {jobs.filter((j: any) => j.jobType === 'FULL_TIME' && j.status === 'OPEN').map((j: any) => (
              <MenuItem key={j.id} value={j.id}>{j.title}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField select size="small" label="Interviewer" value={interviewerFilter} onChange={(e) => setInterviewerFilter(e.target.value)} fullWidth>
            <MenuItem value="ALL">All Interviewers</MenuItem>
            {(teamData || []).map((member: any) => (
              <MenuItem key={member.id} value={member.user?.fullName || 'Colleague'}>
                {member.user?.fullName || 'Colleague'}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      {/* LIST OF INTERVIEWS */}
      <Stack spacing={2.5}>
        {filteredInterviews.map((int: any) => {
          const candidateName = int.application?.candidate?.user?.fullName || 'Candidate';
          const jobTitle = int.application?.job?.title || 'Unknown Job';

          if (activeTab === 'UPCOMING') {
            const joinActive = isJoinActive(int);
            return (
              <Card key={int.id} sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                        <Chip label={int.mode} color="primary" size="small" sx={{ fontWeight: 700 }} />
                        <Chip
                          label={
                            int.status === 'COMPLETED'
                              ? 'COMPLETED'
                              : int.candidateResponse === 'ACCEPTED'
                              ? 'ACCEPTED'
                              : int.status
                          }
                          color={
                            int.status === 'COMPLETED'
                              ? 'success'
                              : int.candidateResponse === 'ACCEPTED'
                              ? 'success'
                              : 'info'
                          }
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 700 }}
                        />
                      </Stack>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        <Link href={`/recruiter/applications/${int.applicationId}`} style={{ textDecoration: 'none', color: '#2563eb' }}>
                          {candidateName}
                        </Link>
                        {' '}— Round {int.roundNo} ({int.mode})
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mt: 0.5 }}>
                        Job: {jobTitle}
                      </Typography>
                      <Stack direction="row" spacing={2} sx={{ mt: 2 }} color="text.secondary">
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <CalendarMonthIcon sx={{ fontSize: 18 }} />
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>{new Date(int.scheduledAt).toLocaleString()}</Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <AccessTimeIcon sx={{ fontSize: 18 }} />
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>{int.durationMinutes} min session</Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <PersonIcon sx={{ fontSize: 18 }} />
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>Interviewer: {int.interviewer?.fullName || 'Assigned Interviewer'}</Typography>
                        </Stack>
                      </Stack>
                    </Box>

                    <Stack spacing={1}>
                      <Tooltip title={joinActive ? 'Join Video Room' : 'Join Call active 15 mins before start'}>
                        <span>
                          <Button
                            variant="contained"
                            disabled={!joinActive}
                            startIcon={<OpenInNewIcon />}
                            href={int.meetingLink || '#'}
                            target="_blank"
                            sx={{ fontWeight: 700 }}
                          >
                            Join Call
                          </Button>
                        </span>
                      </Tooltip>
                      <Button variant="outlined" size="small" onClick={() => handleOpenReschedule(int)}>
                        Reschedule
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          }

          if (activeTab === 'NEEDS_FEEDBACK') {
            return (
              <Card key={int.id} sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Alert severity="warning" sx={{ mb: 2, fontWeight: 700 }}>
                        Session Completed. Feedback submission is overdue.
                      </Alert>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {candidateName} — Evaluation Round {int.roundNo}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Job: {jobTitle}
                      </Typography>
                    </Box>
                    <Button variant="contained" color="warning" onClick={() => handleOpenFeedback(int)} sx={{ fontWeight: 700 }}>
                      Submit Feedback
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            );
          }

          // PAST Tab
          return (
            <Card key={int.id} sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none', opacity: 0.85 }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                      {int.status === 'CANCELLED' ? (
                        <Chip label="DECLINED / CANCELLED" color="error" size="small" sx={{ fontWeight: 750 }} />
                      ) : (
                        <>
                          {int.recommendation && (
                            <Chip label={int.recommendation} color={int.recommendation === 'PROCEED' ? 'success' : int.recommendation === 'HOLD' ? 'warning' : 'error'} size="small" sx={{ fontWeight: 750 }} />
                          )}
                          <Chip
                            label={int.candidateResponse === 'ACCEPTED' ? 'ACCEPTED' : int.status}
                            color={int.candidateResponse === 'ACCEPTED' ? 'success' : 'default'}
                            size="small"
                            variant="outlined"
                          />
                        </>
                      )}
                    </Stack>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {candidateName} — Evaluation Round {int.roundNo}
                    </Typography>
                    {int.status === 'CANCELLED' ? (
                      <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>
                        Decline Reason: {int.rescheduleReason || 'No decline reason was provided.'}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Interviewer overall rating: <Rating value={int.rating || 3} readOnly size="small" sx={{ verticalAlign: 'middle', ml: 1 }} />
                      </Typography>
                    )}
                  </Box>

                  <Button
                    variant="outlined"
                    onClick={() => {
                      setSelectedInterview(int);
                      setViewPastModal(true);
                    }}
                  >
                    View Details
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          );
        })}

        {filteredInterviews.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8, border: '1px dashed #cbd5e1', borderRadius: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>No interviews found</Typography>
            <Typography variant="body2" color="text.secondary">
              {activeTab === 'UPCOMING' ? 'No interviews scheduled. Advance a candidate to an interview stage to schedule one.' : 'You\'re all caught up — no pending feedback.'}
            </Typography>
          </Box>
        )}
      </Stack>

      {/* MODALS */}
      {/* Schedule Interview Modal */}
      <Dialog open={scheduleModal} onClose={() => setScheduleModal(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Schedule New Interview Session</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1.5 }}>
            <TextField select label="Select Candidate / Application" value={newAppId} onChange={(e) => setNewAppId(e.target.value)} fullWidth>
              {apps.filter((a: any) => a.status === 'APPLIED' || a.status === 'IN_PROGRESS').map((a: any) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.candidate?.user?.fullName || 'Candidate'} — {a.job?.title || 'Unknown Job'} ({a.currentStage?.name || 'Screening'})
                </MenuItem>
              ))}
            </TextField>

            <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
              <Box sx={{ flex: 1 }}>
                <TextField label="Round Number" type="number" value={newRound} onChange={(e) => setNewRound(parseInt(e.target.value) || 1)} fullWidth />
              </Box>
              <Box sx={{ flex: 1 }}>
                <TextField select label="Hiring Stage" value={newStageId} onChange={(e) => setNewStageId(e.target.value)} fullWidth>
                  {((apps.find(a => a.id === newAppId)?.job) as any)?.hiringStages?.map((stage: any) => (
                    <MenuItem key={stage.id} value={stage.id}>{stage.name}</MenuItem>
                  ))}
                </TextField>
              </Box>
            </Stack>

            <TextField select label="Select Interviewer" value={newInterviewer} onChange={(e) => setNewInterviewer(e.target.value)} fullWidth>
              {(teamData || []).map((member: any) => (
                <MenuItem key={member.id} value={member.userId}>
                  {member.designation ? `${member.user?.fullName} (${member.designation})` : member.user?.fullName}
                </MenuItem>
              ))}
            </TextField>

            <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
              <Box sx={{ flex: 1 }}>
                <TextField label="Date &amp; Time" type="datetime-local" InputLabelProps={{ shrink: true }} value={newDate} onChange={(e) => setNewDate(e.target.value)} fullWidth />
              </Box>
              <Box sx={{ flex: 1 }}>
                <TextField label="Duration (minutes)" type="number" InputProps={{ inputProps: { min: 15 } }} value={newDuration} onChange={(e) => setNewDuration(Math.max(15, parseInt(e.target.value) || 60))} fullWidth />
              </Box>
            </Stack>

            <TextField select label="Interview Mode" value={newMode} onChange={(e) => setNewMode(e.target.value as any)} fullWidth>
              <MenuItem value="ONLINE">Online Video Room</MenuItem>
              <MenuItem value="PHONE">Phone Call</MenuItem>
              <MenuItem value="ONSITE">Onsite Office</MenuItem>
            </TextField>

            {newMode === 'ONLINE' && (
              <TextField label="Meeting Room URL" value={newLink} onChange={(e) => setNewLink(e.target.value)} required placeholder="e.g. https://meet.google.com/abc-defg-hij" fullWidth />
            )}

            {newMode === 'ONSITE' && (
              <TextField label="Office Location Address" value={newLink} onChange={(e) => setNewLink(e.target.value)} required placeholder="e.g. 4th Floor, Nexus Towers, Bangalore" fullWidth />
            )}

            <TextField label="Agenda Notes" placeholder="Notes visible to the candidate..." multiline rows={3} value={newAgenda} onChange={(e) => setNewAgenda(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setScheduleModal(false)} disabled={isSaving}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateInterview} disabled={isSaving} startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null} sx={{ fontWeight: 700 }}>
            {isSaving ? 'Scheduling...' : 'Schedule'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={rescheduleModal} onClose={() => setRescheduleModal(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Reschedule Interview Session</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1.5 }}>
            <TextField
              label="Proposed New Date &amp; Time"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              fullWidth
            />
            <TextField
              label="Reason for Rescheduling"
              placeholder="Provide a brief explanation for the candidate..."
              multiline
              rows={3}
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setRescheduleModal(false)} disabled={isSaving}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitReschedule} disabled={isSaving} startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null} sx={{ fontWeight: 700 }}>
            {isSaving ? 'Rescheduling...' : 'Reschedule Session'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Submission Modal */}
      <Dialog open={feedbackModal} onClose={() => setFeedbackModal(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Submit Candidate Evaluation Feedback</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>Communication Rating (1-5)</Typography>
              <Rating value={commRating} onChange={(_, val) => setCommRating(val)} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>Technical Depth Rating (1-5)</Typography>
              <Rating value={techRating} onChange={(_, val) => setTechRating(val)} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>Culture Fit Rating (1-5)</Typography>
              <Rating value={cultRating} onChange={(_, val) => setCultRating(val)} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>Overall Rating (1-5)</Typography>
              <Rating value={overallRating} onChange={(_, val) => setOverallRating(val)} />
            </Box>

            <TextField
              label="Written feedback &amp; Assessment notes"
              multiline
              rows={4}
              required
              fullWidth
              value={writtenFeedback}
              onChange={(e) => setWrittenFeedback(e.target.value)}
            />

            <TextField select label="Recommendation Check" value={recommendation} onChange={(e) => setRecommendation(e.target.value as any)} fullWidth>
              <MenuItem value="PROCEED">Proceed - Advance to next stage</MenuItem>
              <MenuItem value="HOLD">Hold - Keep on backup standby</MenuItem>
              <MenuItem value="REJECT">Reject - Withdraw candidate</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setFeedbackModal(false)} disabled={isSaving}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleSubmitFeedback} disabled={isSaving} startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null} sx={{ fontWeight: 700 }}>
            {isSaving ? 'Submitting...' : 'Submit Evaluation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Past Evaluation Details Modal */}
      <Dialog open={viewPastModal} onClose={() => setViewPastModal(false)} fullWidth maxWidth="sm">
        {selectedInterview && (
          <>
            <DialogTitle sx={{ fontWeight: 800 }}>Evaluation Session Details</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {selectedInterview.status === 'CANCELLED' ? (
                  <>
                    <Box>
                      <Typography variant="caption" color="text.secondary">SESSION STATUS</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 800, color: 'error.main' }}>CANCELLED / DECLINED</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">CANCELLATION / DECLINE REASON</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ bgcolor: 'rgba(239, 68, 68, 0.05)', p: 2, borderRadius: 2, border: '1px solid rgba(239, 68, 68, 0.15)', fontWeight: 600 }}>
                        {selectedInterview.rescheduleReason || 'No written decline reason was detailed by the candidate.'}
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <>
                    <Box>
                      <Typography variant="caption" color="text.secondary">RECOMMENDATION</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 800, color: 'primary.main' }}>{selectedInterview.recommendation}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">OVERALL INTERVIEWER RATING</Typography>
                      <Box><Rating value={selectedInterview.rating || 3} readOnly size="small" /></Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">EVALUATION NOTES</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ bgcolor: 'rgba(0,0,0,0.01)', p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                        {selectedInterview.feedback || 'No written feedback detailed.'}
                      </Typography>
                    </Box>
                  </>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={() => setViewPastModal(false)}>Close</Button>
            </DialogActions>
          </>
        )}
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
