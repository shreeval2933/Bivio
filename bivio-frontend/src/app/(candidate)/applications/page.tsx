'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  Stack,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { showNotification } from '@/store/slices/notificationSlice';
import { 
  useGetApplicationsQuery, 
  useGetInvitationsQuery, 
  useWithdrawApplicationMutation, 
  useRespondInvitationMutation, 
  useGetOffersQuery 
} from '@/store/api/applicationsApi';
import { useCandidateRespondInterviewMutation } from '@/store/api/interviewsApi';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

// Icons
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BlockIcon from '@mui/icons-material/Block';

export default function ApplicationsPage() {
  const router = useRouter();
  const dispatch = useDispatch();

  // RTK Query Hooks
  const { data: applicationsData, isLoading: appsLoading, isError: appsError } = useGetApplicationsQuery({ mine: true });
  const { data: invitationsData, isLoading: invLoading } = useGetInvitationsQuery();
  const { data: offersData } = useGetOffersQuery();
  
  const [withdrawApp] = useWithdrawApplicationMutation();
  const [respondInv] = useRespondInvitationMutation();
  const [candidateRespondInterview, { isLoading: isRespondingInterview }] = useCandidateRespondInterviewMutation();

  // Tabs state
  const [activeTab, setActiveTab] = useState(0);

  // Modal state
  const [withdrawTargetId, setWithdrawTargetId] = useState<string | null>(null);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [selectedDeclineIntId, setSelectedDeclineIntId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const apps = (applicationsData?.data || []) as any[];
  const invitations = invitationsData || [];
  const offersCount = (offersData || []).filter((o: any) => o.status === 'SENT').length;
  const activeInvitations = invitations.filter((inv: any) => 
    inv.status === 'SENT' && !apps.some((app: any) => app.jobId === inv.jobId)
  );

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleWithdrawClick = (id: string) => {
    setWithdrawTargetId(id);
  };

  const handleDeclineInvitation = async (invId: string) => {
    try {
      await respondInv({ id: invId, accept: false }).unwrap();
      dispatch(showNotification({ message: 'Invitation declined successfully.', severity: 'info' }));
    } catch (err) {
      dispatch(showNotification({ message: 'Failed to decline invitation.', severity: 'error' }));
    }
  };

  const handleConfirmWithdraw = async () => {
    if (withdrawTargetId) {
      try {
        await withdrawApp(withdrawTargetId).unwrap();
        dispatch(showNotification({ message: 'Application withdrawn successfully.', severity: 'info' }));
      } catch (err) {
        dispatch(showNotification({ message: 'Failed to withdraw application.', severity: 'error' }));
      } finally {
        setWithdrawTargetId(null);
      }
    }
  };

  const handleAcceptInterview = async (id: string) => {
    try {
      await candidateRespondInterview({ id, status: 'ACCEPTED' }).unwrap();
      dispatch(showNotification({ message: 'Interview slot accepted successfully.', severity: 'success' }));
    } catch (err) {
      dispatch(showNotification({ message: 'Failed to accept interview slot.', severity: 'error' }));
    }
  };

  const handleDeclineClick = (id: string) => {
    setSelectedDeclineIntId(id);
    setDeclineModalOpen(true);
  };

  const handleConfirmDeclineInterview = async () => {
    if (!selectedDeclineIntId) return;
    if (!declineReason.trim()) {
      dispatch(showNotification({ message: 'Please provide a reason for declining the interview.', severity: 'warning' }));
      return;
    }
    try {
      await candidateRespondInterview({
        id: selectedDeclineIntId,
        status: 'DECLINED',
        rescheduleReason: declineReason,
      }).unwrap();
      dispatch(showNotification({ message: 'Interview declined successfully.', severity: 'info' }));
      setDeclineModalOpen(false);
      setDeclineReason('');
      setSelectedDeclineIntId(null);
    } catch (err) {
      dispatch(showNotification({ message: 'Failed to decline interview slot.', severity: 'error' }));
    }
  };

  // Filter application rows
  const filteredApps = apps.filter((app: any) => {
    if (activeTab === 0) return false; // Handled by separate invitations loop
    if (activeTab === 1) return app.status === 'APPLIED' || app.status === 'IN_PROGRESS';
    if (activeTab === 2) return app.status === 'OFFERED';
    if (activeTab === 3) return app.status === 'HIRED' || app.status === 'REJECTED' || app.status === 'WITHDRAWN';
    return true;
  });

  const getStatusColor = (status: string) => {
    if (status === 'IN_PROGRESS' || status === 'APPLIED') return 'warning';
    if (status === 'OFFERED' || status === 'HIRED') return 'success';
    if (status === 'REJECTED') return 'error';
    return 'default';
  };

  // Loader UI
  if (appsLoading || invLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading applications...
          </Typography>
        </Stack>
      </Container>
    );
  }

  if (appsError) {
    return (
      <Container sx={{ py: 10 }}>
        <Alert severity="error" sx={{ borderRadius: 3, fontWeight: 700 }}>
          Could not load applications. Please try again.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* HEADER */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 850, fontFamily: 'Outfit, sans-serif', mb: 1, color: 'primary.main' }}>
          Your Job Applications
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track interview stage movements, review frozen cover letters, and manage offers.
        </Typography>
      </Box>

      {/* TABS CONTROLS */}
      <Card sx={{ border: '1px solid #f1f5f9', borderRadius: 4, mb: 4, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>Invitations</span>
                {activeInvitations.length > 0 && <Chip label={activeInvitations.length} size="small" color="primary" sx={{ height: 20, fontSize: '0.75rem', fontWeight: 800 }} />}
              </Stack>
            }
            sx={{ fontWeight: 700, px: 3, py: 2 }}
          />
          <Tab label="In Progress" sx={{ fontWeight: 700, px: 3, py: 2 }} />
          <Tab
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>Offers Received</span>
                {offersCount > 0 && <Chip label={offersCount} size="small" color="success" sx={{ height: 20, fontSize: '0.75rem', fontWeight: 800 }} />}
              </Stack>
            }
            sx={{ fontWeight: 700, px: 3, py: 2 }}
          />
          <Tab label="Closed / Archived" sx={{ fontWeight: 700, px: 3, py: 2 }} />
        </Tabs>
      </Card>

      {/* RESULTS LIST */}
      <Stack spacing={3}>
        {activeTab === 0 && (
          activeInvitations.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center', bgcolor: '#fff', border: '1px solid #f1f5f9', borderRadius: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>No active invitations</Typography>
              <Typography variant="body2" color="text.secondary">
                Recruiters will invite you here if your profile matches their needs.
              </Typography>
            </Box>
          ) : (
            activeInvitations.map((inv: any) => {
              const expDays = Math.ceil((new Date(inv.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isClose = expDays <= 3;
              return (
                <Card key={inv.id} sx={{ border: '1px solid #e2e8f0', borderRadius: 4, boxShadow: 'none' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          📨 Invited by {inv.job?.company?.name || 'Nexus Talent AI'}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 950, mb: 1 }}>{inv.job?.title}</Typography>
                        {inv.message && (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', bgcolor: 'rgba(0,0,0,0.01)', p: 1.5, borderRadius: 2, mb: 2 }}>
                            "{inv.message}"
                          </Typography>
                        )}
                      </Box>
                      <Chip
                        label={expDays > 0 ? `Expires in ${expDays} days` : 'Expired'}
                        size="small"
                        color={isClose ? 'warning' : 'default'}
                        sx={{ fontWeight: 800, mt: { xs: 1, sm: 0 } }}
                      />
                    </Stack>
                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                      <Link href={`/jobs/${inv.jobId}`} style={{ textDecoration: 'none' }}>
                        <Button variant="contained" size="small" sx={{ fontWeight: 800 }}>
                          View Job &amp; Accept →
                        </Button>
                      </Link>
                      <Button variant="outlined" size="small" color="error" onClick={() => handleDeclineInvitation(inv.id)} sx={{ fontWeight: 800 }}>
                        Decline
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })
          )
        )}


        {activeTab !== 0 && filteredApps.map((app) => (
          <Card
            key={app.id}
            sx={{
              border: '1px solid #f1f5f9',
              borderRadius: 4,
              boxShadow: 'none',
              overflow: 'hidden',
              bgcolor: app.status === 'REJECTED' || app.status === 'WITHDRAWN' ? 'rgba(248, 250, 252, 0.6)' : '#ffffff',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Grid container spacing={3} alignItems="center">
                {/* Job & Company Info */}
                <Grid item xs={12} md={5}>
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: app.status === 'REJECTED' ? 'text.disabled' : 'text.primary' }}>
                        {app.job?.title}
                      </Typography>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {app.job?.company?.name}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                      <Chip label={`Applied ${Math.floor((Date.now() - new Date(app.appliedAt).getTime()) / (1000 * 60 * 60 * 24))}d ago`} size="small" variant="outlined" />
                      <Chip
                        label={app.status.replace('_', ' ')}
                        size="small"
                        color={getStatusColor(app.status)}
                        sx={{ fontWeight: 700 }}
                      />
                    </Stack>

                    <Box sx={{ mt: 1, p: 1.5, bgcolor: 'rgba(37, 99, 235, 0.02)', border: '1px dashed rgba(37, 99, 235, 0.15)', borderRadius: 2.5 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontWeight: 500 }}>
                        Match score at application: <strong>{app.snapshotAiScore ?? 0}%</strong> (15 Jul)
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, display: 'block' }}>
                        Your current profile matches this job at {Number(app.snapshotAiScore ?? 0) + 4}% — this doesn't affect this application.
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                {/* Stage Stepper progress */}
                <Grid item xs={12} md={4.5}>
                  {app.status !== 'REJECTED' && app.status !== 'WITHDRAWN' ? (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700, mb: 1 }}>
                        CURRENT STAGE
                      </Typography>
                      <Stepper activeStep={app.job?.hiringStages?.findIndex((s: any) => s.id === app.currentStageId) ?? 0} alternativeLabel>
                        {(app.job?.hiringStages || []).map((stg: any) => (
                          <Step key={stg.id}>
                            <StepLabel>
                              <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 700 }}>
                                {stg.name}
                              </Typography>
                            </StepLabel>
                          </Step>
                        ))}
                      </Stepper>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Application conversation closed.
                    </Typography>
                  )}
                </Grid>

                {/* Actions */}
                <Grid item xs={12} md={2.5} sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: { xs: 'flex-start', md: 'flex-end' } }}>
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    onClick={() => router.push(`/jobs/${app.jobId}`)}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    View Job details
                  </Button>

                  {app.status === 'OFFERED' && (
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      fullWidth
                      onClick={() => router.push('/offers')}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                    >
                      View Offer
                    </Button>
                  )}

                  {(app.status === 'IN_PROGRESS' || app.status === 'APPLIED') && (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      fullWidth
                      onClick={() => handleWithdrawClick(app.id)}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                    >
                      Withdraw Application
                    </Button>
                  )}
                </Grid>
              </Grid>

              {/* Collapsed Drawer Detail Expansion Accordion */}
              <Box sx={{ mt: 3 }}>
                <Accordion sx={{ boxShadow: 'none', border: '1px solid #f1f5f9', borderRadius: 3, '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                      VIEW SUBMITTED DETAILS & PIPELINE HISTORY
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ bgcolor: '#f8fafc', p: 3, borderRadius: 2 }}>
                    <Grid container spacing={3}>
                      {/* Timeline */}
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>
                          Pipeline Movements
                        </Typography>
                        <Stack spacing={2}>
                          {(app.movements || []).map((move: any, i: number) => (
                            <Box key={i} sx={{ borderLeft: '2.5px solid #cbd5e1', pl: 2, py: 0.5, position: 'relative' }}>
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main', position: 'absolute', left: -6, top: 8 }} />
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {move.toStage?.name || 'Application Started'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(move.movedAt).toLocaleDateString()} {move.note && `· ${move.note}`}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Grid>

                      {/* Cover note & details */}
                      <Grid item xs={12} md={6}>
                        <Stack spacing={2.5}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                              Cover Pitch Note
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ p: 2, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 2.5, fontStyle: 'italic' }}>
                              "{app.coverNote || 'No cover note provided.'}"
                            </Typography>
                          </Box>

                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                              Attached Resume Version
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              📄 {app.resume?.fileName || 'No resume attached'} (Locked Snapshot)
                            </Typography>
                          </Box>

                          {app.interviews?.length > 0 && (
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                                Scheduled Interviews
                              </Typography>
                              {(app.interviews || []).map((intr: any, idx: number) => (
                                <Card key={idx} sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', p: 1.5, borderRadius: 2.5 }}>
                                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Box>
                                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                        Round {intr.roundNo}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        {new Date(intr.scheduledAt).toLocaleString()} · {intr.mode}
                                      </Typography>
                      {intr.status === 'CANCELLED' && intr.rescheduleReason && (
                                        <Typography variant="caption" color="error.main" display="block" sx={{ mt: 0.5, fontWeight: 600 }}>
                                          Decline Reason: {intr.rescheduleReason}
                                        </Typography>
                                      )}
                                    </Box>
                                     <Stack direction="row" spacing={1} alignItems="center">
                                       <Chip
                                         label={
                                           intr.status === 'COMPLETED'
                                             ? 'COMPLETED'
                                             : intr.status === 'CANCELLED'
                                             ? 'DECLINED'
                                             : intr.candidateResponse === 'ACCEPTED'
                                             ? 'ACCEPTED'
                                             : intr.status
                                         }
                                         size="small"
                                         color={
                                           intr.status === 'COMPLETED'
                                             ? 'success'
                                             : intr.status === 'CANCELLED'
                                             ? 'error'
                                             : intr.candidateResponse === 'ACCEPTED'
                                             ? 'success'
                                             : 'primary'
                                         }
                                         variant="outlined"
                                         sx={{ height: 20, fontSize: '0.65rem' }}
                                       />
                                      {intr.status === 'SCHEDULED' && intr.candidateResponse !== 'ACCEPTED' && (
                                        <>
                                          <Button size="small" variant="contained" color="success" onClick={() => handleAcceptInterview(intr.id)} sx={{ py: 0.1, px: 1, minWidth: 0, fontSize: '0.65rem', fontWeight: 800 }}>
                                            Accept
                                          </Button>
                                          <Button size="small" variant="outlined" color="error" onClick={() => handleDeclineClick(intr.id)} sx={{ py: 0.1, px: 1, minWidth: 0, fontSize: '0.65rem', fontWeight: 800 }}>
                                            Decline
                                          </Button>
                                        </>
                                      )}
                                    </Stack>
                                  </Stack>
                                </Card>
                              ))}
                            </Box>
                          )}
                        </Stack>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Box>
            </CardContent>
          </Card>
        ))}

        {activeTab !== 0 && filteredApps.length === 0 && (
          <Card sx={{ p: 6, textAlign: 'center', border: '1.5px dashed #e2e8f0', borderRadius: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
              No applications in this category.
            </Typography>
            <Button variant="contained" onClick={() => router.push('/jobs')} sx={{ borderRadius: 2.5, mt: 1 }}>
              Browse Open Jobs
            </Button>
          </Card>
        )}
      </Stack>

      {/* WITHDRAW CONFIRMATION MODAL */}
      <Dialog open={Boolean(withdrawTargetId)} onClose={() => setWithdrawTargetId(null)} PaperProps={{ sx: { borderRadius: 4, p: 2, maxWidth: 450 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <BlockIcon /> Withdraw Application?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to withdraw this application? This action is destructive. It closes your active chat conversation with the recruiter.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setWithdrawTargetId(null)} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmWithdraw} sx={{ borderRadius: 2.5, fontWeight: 700 }}>
            Confirm Withdrawal
          </Button>
        </DialogActions>
      </Dialog>

      {/* DECLINE INTERVIEW MODAL */}
      <Dialog open={declineModalOpen} onClose={() => setDeclineModalOpen(false)} PaperProps={{ sx: { borderRadius: 4, p: 2, maxWidth: 450, width: '100%' } }}>
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main' }}>
          Decline Interview Session?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please let the recruiter know why you are declining this slot (e.g. scheduling conflict, or request a reschedule).
          </Typography>
          <input
            type="text"
            placeholder="e.g. I have a conflict, can we do next Tuesday at 2 PM?"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeclineModalOpen(false)} disabled={isRespondingInterview} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDeclineInterview} disabled={isRespondingInterview || !declineReason.trim()} sx={{ borderRadius: 2.5, fontWeight: 700 }}>
            {isRespondingInterview ? 'Declining...' : 'Decline Interview'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
