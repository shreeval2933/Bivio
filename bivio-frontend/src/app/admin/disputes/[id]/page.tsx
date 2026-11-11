'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Paper,
  CircularProgress,
  Avatar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GavelIcon from '@mui/icons-material/Gavel';
import MessageIcon from '@mui/icons-material/Message';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import HistoryIcon from '@mui/icons-material/History';
import InfoIcon from '@mui/icons-material/Info';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import {
  useGetDisputeDetailQuery,
  useAssignDisputeMutation,
  useResolveDisputeMutation,
  useEscalateDisputeMutation,
} from '@/store/api/adminApi';

type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED';

export default function DisputeDetailPage() {
  const params = useParams();
  const disputeId = params?.id as string;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // API Queries & Mutations
  const { data: dbDispute, isLoading: detailLoading, refetch } = useGetDisputeDetailQuery(disputeId, {
    skip: !mounted || !disputeId,
  });

  const [assignDispute, { isLoading: isAssigning }] = useAssignDisputeMutation();
  const [resolveDispute, { isLoading: isResolving }] = useResolveDisputeMutation();
  const [escalateDispute, { isLoading: isEscalating }] = useEscalateDisputeMutation();

  // Resolution Form inputs
  const [toFreelancer, setToFreelancer] = useState<string>('');
  const [toClient, setToClient] = useState<string>('');
  const [resolutionNoteInput, setResolutionNoteInput] = useState<string>('');
  const [showConfirmResolve, setShowConfirmResolve] = useState(false);

  // Escalation Modal state
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalationReasonInput, setEscalationReasonInput] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const statusColors: Record<string, { label: string; bg: string; text: string }> = {
    OPEN: { label: 'Open', bg: '#fee2e2', text: '#991b1b' },
    UNDER_REVIEW: { label: 'Under Review', bg: '#ffedd5', text: '#9a3412' },
    RESOLVED: { label: 'Resolved', bg: '#d1fae5', text: '#065f46' },
    ESCALATED: { label: 'Escalated', bg: '#f3e8ff', text: '#6b21a8' },
  };

  const currentStatus = dbDispute?.status || 'OPEN';
  const statusConfig = statusColors[currentStatus] || { label: currentStatus, bg: '#f3f4f6', text: '#374151' };

  const milestoneTitle = dbDispute?.milestone?.title || 'Milestone Arbitration';
  const contractTitle = dbDispute?.milestone?.contract?.job?.title || 'Freelance Contract';
  const milestoneDescription = dbDispute?.milestone?.description || 'Milestone deliverable specifications and deliverables agreement.';
  const escrowAmount = Number(dbDispute?.milestone?.escrow?.amount || dbDispute?.milestone?.amount || 0);
  const milestoneAmount = Number(dbDispute?.milestone?.amount || escrowAmount);
  const contractAmount = Number(dbDispute?.milestone?.contract?.totalBudget || dbDispute?.milestone?.contract?.amount || milestoneAmount);

  const raisedByName = dbDispute?.raisedBy?.fullName || 'Platform User';
  const raisedByRole = dbDispute?.raisedBy?.role ? dbDispute.raisedBy.role.toLowerCase() : 'user';
  const assignedAdminName = dbDispute?.assignedAdmin?.user?.fullName || (dbDispute?.assignedAdmin ? 'Assigned' : 'Unassigned');

  const submissions = dbDispute?.milestone?.submissions || [];
  const chatMessages = dbDispute?.chatTranscript || [];

  // Math validations
  const freelancerAmt = Number(toFreelancer || 0);
  const clientAmt = Number(toClient || 0);
  const totalSplit = freelancerAmt + clientAmt;
  const splitIsValid = Math.abs(totalSplit - escrowAmount) < 0.01;

  // Handle Assign to Me
  const handleAssignToMe = async () => {
    setActionError(null);
    try {
      await assignDispute(disputeId).unwrap();
      refetch();
    } catch (err: any) {
      setActionError(err?.data?.message || 'Failed to assign dispute.');
    }
  };

  // Handle Resolve Submission
  const handleConfirmResolve = async () => {
    if (!splitIsValid || !resolutionNoteInput.trim()) return;
    setActionError(null);
    try {
      await resolveDispute({
        id: disputeId,
        amountToFreelancer: freelancerAmt,
        amountToClient: clientAmt,
        resolutionNote: resolutionNoteInput.trim(),
      }).unwrap();
      setShowConfirmResolve(false);
      refetch();
    } catch (err: any) {
      setActionError(err?.data?.message || 'Failed to resolve dispute.');
    }
  };

  // Handle Escalation
  const handleConfirmEscalate = async () => {
    if (!escalationReasonInput.trim()) return;
    setActionError(null);
    try {
      await escalateDispute({
        id: disputeId,
        escalationReason: escalationReasonInput.trim(),
      }).unwrap();
      setShowEscalateModal(false);
      refetch();
    } catch (err: any) {
      setActionError(err?.data?.message || 'Failed to escalate dispute.');
    }
  };

  if (!mounted) return null;

  if (detailLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading dispute arbitration workspace...
          </Typography>
        </Stack>
      </Container>
    );
  }

  if (!dbDispute) {
    return (
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Card variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 4 }}>
          <GavelIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
            Dispute Not Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            The requested dispute record does not exist or has been removed.
          </Typography>
          <Button component={Link} href="/admin/disputes" variant="contained">
            Back to Disputes
          </Button>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ pb: 6 }}>
      {/* Back button */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Button
          component={Link}
          href="/admin/disputes"
          startIcon={<ArrowBackIcon />}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Back to Disputes
        </Button>
      </Stack>

      {/* Action Error Alert */}
      {actionError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3, fontWeight: 700 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {/* Header section */}
      <Card variant="outlined" sx={{ mb: 4, borderRadius: 4, borderColor: '#e2e8f0' }}>
        <CardContent sx={{ p: 3.5 }}>
          <Grid container spacing={3} alignItems="center" justifyContent="space-between">
            <Grid item xs={12} md={7}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    {milestoneTitle}
                  </Typography>
                  <Chip
                    label={statusConfig.label}
                    size="small"
                    sx={{
                      bgcolor: statusConfig.bg,
                      color: statusConfig.text,
                      fontWeight: 800,
                      fontSize: '0.725rem',
                    }}
                  />
                </Stack>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  Contract: {contractTitle}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Raised by {raisedByName} ({raisedByRole}) · {new Date(dbDispute.createdAt).toLocaleString()}
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                FROZEN ESCROW
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#ef4444' }}>
                {formatCurrency(escrowAmount)}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={4}>
        {/* Left Column — Evidence */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={4}>
            {/* Dispute Reason */}
            <Card variant="outlined" sx={{ borderRadius: 4, borderColor: '#e2e8f0' }}>
              <CardContent sx={{ p: 3.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <GavelIcon color="primary" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
                    Dispute Reason
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 3, borderLeft: '4px solid #ef4444' }}>
                  &quot;{dbDispute.reason}&quot;
                </Typography>
              </CardContent>
            </Card>

            {/* Milestone Scope */}
            <Card variant="outlined" sx={{ borderRadius: 4, borderColor: '#e2e8f0' }}>
              <CardContent sx={{ p: 3.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <InfoIcon color="primary" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
                    Milestone Scope
                  </Typography>
                </Stack>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      TITLE & SPECIFICATIONS
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5 }}>
                      {milestoneTitle}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {milestoneDescription}
                    </Typography>
                  </Box>
                  <Divider />
                  <Stack direction="row" spacing={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                        MILESTONE VALUE
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        {formatCurrency(milestoneAmount)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                        CONTRACT TOTAL
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        {formatCurrency(contractAmount)}
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {/* Submission History */}
            <Card variant="outlined" sx={{ borderRadius: 4, borderColor: '#e2e8f0' }}>
              <CardContent sx={{ p: 3.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <HistoryIcon color="primary" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
                    Submission History
                  </Typography>
                </Stack>

                {submissions.length === 0 ? (
                  <Alert severity="warning" sx={{ borderRadius: 3 }}>
                    No work deliverables submitted for this milestone yet.
                  </Alert>
                ) : (
                  <Stack spacing={2}>
                    {submissions.map((sub: any) => {
                      const attachmentList = sub.attachmentUrls || [];
                      return (
                        <Paper key={sub.id} variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                            <Chip
                              label={`Version ${sub.versionNo || sub.version || 1}`}
                              size="small"
                              color="primary"
                              sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(sub.submittedAt || sub.createdAt).toLocaleString()}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
                            {sub.note || 'No note attached.'}
                          </Typography>
                          {attachmentList.length > 0 && (
                            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                              {attachmentList.map((url: string, idx: number) => {
                                const filename = url.substring(url.lastIndexOf('/') + 1) || `Deliverable ${idx + 1}`;
                                return (
                                  <Stack
                                    key={idx}
                                    component="a"
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                    sx={{
                                      bgcolor: '#ffffff',
                                      p: 1.25,
                                      borderRadius: 2,
                                      border: '1px solid #e2e8f0',
                                      textDecoration: 'none',
                                      color: 'primary.main',
                                      '&:hover': { bgcolor: '#f1f5f9' },
                                    }}
                                  >
                                    <CloudUploadIcon fontSize="small" />
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                      {filename}
                                    </Typography>
                                  </Stack>
                                );
                              })}
                            </Stack>
                          )}
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Chat Transcript */}
            <Card variant="outlined" sx={{ borderRadius: 4, borderColor: '#e2e8f0' }}>
              <CardContent sx={{ p: 3.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <MessageIcon color="primary" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
                    Contract Chat Transcript
                  </Typography>
                </Stack>

                {chatMessages.length === 0 ? (
                  <Alert severity="info" sx={{ borderRadius: 3 }}>
                    No messages exchanged on this contract room.
                  </Alert>
                ) : (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      maxHeight: 350,
                      overflowY: 'auto',
                      bgcolor: '#f8fafc',
                    }}
                  >
                    <Stack spacing={2.5}>
                      {chatMessages.map((msg: any) => {
                        const senderName = msg.sender?.fullName || 'User';
                        const isClient = msg.sender?.role === 'RECRUITER';
                        return (
                          <Box key={msg.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: isClient ? 'flex-start' : 'flex-end' }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                              <Typography variant="caption" sx={{ fontWeight: 800 }}>
                                {senderName}
                              </Typography>
                              <Chip
                                label={isClient ? 'Client' : 'Freelancer'}
                                size="small"
                                sx={{
                                  height: 16,
                                  fontSize: '0.6rem',
                                  bgcolor: isClient ? 'rgba(37, 99, 235, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                  color: isClient ? 'primary.main' : 'success.main',
                                  fontWeight: 800,
                                }}
                              />
                            </Stack>
                            <Box
                              sx={{
                                p: 2,
                                borderRadius: 3.5,
                                bgcolor: isClient ? '#ffffff' : 'primary.main',
                                color: isClient ? 'text.primary' : '#ffffff',
                                maxWidth: '80%',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                                border: isClient ? '1px solid #e2e8f0' : 'none',
                              }}
                            >
                              <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                                {msg.body}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.65rem' }}>
                              {new Date(msg.sentAt).toLocaleString()}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Paper>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Right Column — Resolution */}
        <Grid item xs={12} lg={4}>
          <Card variant="outlined" sx={{ borderRadius: 4, borderColor: '#e2e8f0', position: 'sticky', top: 100 }}>
            <CardContent sx={{ p: 3.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 850, mb: 3 }}>
                Arbitration Resolution
              </Typography>

              {/* Assignment Notice */}
              <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                  ASSIGNED ARBITRATOR
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'primary.main' }}>
                      {assignedAdminName.slice(0, 2).toUpperCase()}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {assignedAdminName}
                    </Typography>
                  </Stack>
                  {currentStatus === 'OPEN' && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AssignmentIndIcon />}
                      onClick={handleAssignToMe}
                      disabled={isAssigning}
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
                    >
                      Assign to Me
                    </Button>
                  )}
                </Stack>
              </Box>

              {currentStatus === 'RESOLVED' ? (
                <Stack spacing={3}>
                  <Alert severity="success" sx={{ borderRadius: 3, fontWeight: 700 }}>
                    This dispute has been successfully resolved.
                  </Alert>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      RESOLUTION SUMMARY
                    </Typography>
                    <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Released to Freelancer:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {formatCurrency(Number(dbDispute.amountToFreelancer || 0))}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Refunded to Client:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {formatCurrency(Number(dbDispute.amountToClient || 0))}
                        </Typography>
                      </Stack>
                      {dbDispute.resolutionNote && (
                        <Box sx={{ mt: 1, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>NOTE</Typography>
                          <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                            &quot;{dbDispute.resolutionNote}&quot;
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                </Stack>
              ) : currentStatus === 'ESCALATED' ? (
                <Stack spacing={3}>
                  <Alert severity="info" sx={{ borderRadius: 3, fontWeight: 700 }}>
                    This dispute has been escalated for senior admin review.
                  </Alert>
                  {dbDispute.escalationReason && (
                    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>ESCALATION RATIONALE</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        &quot;{dbDispute.escalationReason}&quot;
                      </Typography>
                    </Box>
                  )}
                </Stack>
              ) : (
                <Stack spacing={3}>
                  {/* Amount to freelancer */}
                  <TextField
                    label="Amount to Freelancer (₹)"
                    type="number"
                    size="small"
                    value={toFreelancer}
                    onChange={(e) => setToFreelancer(e.target.value)}
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                    }}
                  />

                  {/* Amount to client */}
                  <TextField
                    label="Amount to Client (₹)"
                    type="number"
                    size="small"
                    value={toClient}
                    onChange={(e) => setToClient(e.target.value)}
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                    }}
                  />

                  {/* Running Total Validation display */}
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc' }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                        RUNNING TOTAL:
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>
                        {formatCurrency(totalSplit)} / {formatCurrency(escrowAmount)}
                      </Typography>
                    </Stack>
                    <Box sx={{ width: '100%' }}>
                      {splitIsValid ? (
                        <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          ✓ Split matches frozen escrow exactly.
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          ⚠ Split total must equal escrow amount exactly.
                        </Typography>
                      )}
                    </Box>
                  </Paper>

                  {/* Resolution note */}
                  <TextField
                    label="Resolution Note"
                    multiline
                    rows={4}
                    placeholder="Provide a detailed note explaining your resolution ruling. This note will be recorded permanently in the audit trail."
                    value={resolutionNoteInput}
                    onChange={(e) => setResolutionNoteInput(e.target.value)}
                    fullWidth
                    required
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                    }}
                  />

                  {/* Action Buttons */}
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={!splitIsValid || !resolutionNoteInput.trim() || isResolving}
                    onClick={() => setShowConfirmResolve(true)}
                    fullWidth
                    sx={{ borderRadius: 2.5, py: 1.25, fontWeight: 800, textTransform: 'none' }}
                  >
                    Resolve Dispute
                  </Button>

                  <Button
                    variant="outlined"
                    color="secondary"
                    disabled={isEscalating}
                    onClick={() => setShowEscalateModal(true)}
                    fullWidth
                    sx={{ borderRadius: 2.5, py: 1, fontWeight: 800, textTransform: 'none' }}
                  >
                    Escalate Dispute
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Resolve Confirmation Modal */}
      <Dialog
        open={showConfirmResolve}
        onClose={() => setShowConfirmResolve(false)}
        PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Confirm Dispute Arbitration</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Resolving this dispute will release <strong>{formatCurrency(freelancerAmt)}</strong> to the freelancer and refund <strong>{formatCurrency(clientAmt)}</strong> to the client — totaling the full frozen escrow of <strong>{formatCurrency(escrowAmount)}</strong>.
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
            This action executes wallet balance updates and is final.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowConfirmResolve(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={isResolving}
            onClick={handleConfirmResolve}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
          >
            {isResolving ? 'Resolving...' : 'Confirm Resolution'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Escalate Modal */}
      <Dialog
        open={showEscalateModal}
        onClose={() => setShowEscalateModal(false)}
        PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Escalate Dispute</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            If you determine this dispute requires senior administrator review (due to ambiguous evidence or policy questions), explain the reason below.
          </Typography>
          <TextField
            label="Escalation Reason"
            multiline
            rows={3}
            value={escalationReasonInput}
            onChange={(e) => setEscalationReasonInput(e.target.value)}
            fullWidth
            required
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowEscalateModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            disabled={!escalationReasonInput.trim() || isEscalating}
            onClick={handleConfirmEscalate}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
          >
            {isEscalating ? 'Escalating...' : 'Escalate Now'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
