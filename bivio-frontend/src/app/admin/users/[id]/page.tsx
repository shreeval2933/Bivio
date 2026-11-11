'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Stack,
  Button,
  Grid,
  Avatar,
  Chip,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Radio,
  RadioGroup,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WarningIcon from '@mui/icons-material/Warning';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockResetIcon from '@mui/icons-material/LockReset';
import VerifiedIcon from '@mui/icons-material/Verified';
import RefreshIcon from '@mui/icons-material/Refresh';

import {
  useGetUserDetailQuery,
  useModerateUserMutation,
  useResetUserPasswordMutation,
} from '@/store/api/adminApi';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate, formatCurrency, formatTimeAgo } from '@/lib/format';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { showNotification } from '@/store/slices/notificationSlice';

export default function SingleUserDetailPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const params = useParams();
  const userId = params.id as string;
  const [mounted, setMounted] = useState(false);

  // Live Query
  const { data: user, isLoading, isFetching, refetch } = useGetUserDetailQuery(userId);
  const [moderateUser, { isLoading: isModerating }] = useModerateUserMutation();
  const [resetUserPassword, { isLoading: isResettingPassword }] = useResetUserPasswordMutation();

  // Dialog States
  const [activeModal, setActiveModal] = useState<
    'WARN' | 'SUSPEND' | 'BAN' | 'UNBAN' | 'RESET_PASSWORD' | 'DELETE' | null
  >(null);
  const [reason, setReason] = useState('');
  const [suspensionDuration, setSuspensionDuration] = useState('7');
  const [customSuspensionDate, setCustomSuspensionDate] = useState('');

  useEffect(() => {
    setMounted(true);
    if (user?.fullName) {
      document.title = `${user.fullName} — User Details (Admin)`;
    }
  }, [user]);

  // Derived user details from live database
  const details = useMemo(() => {
    if (!user) return null;

    const isRecruiter = user.role === 'RECRUITER';
    const isCandidate = user.role === 'CANDIDATE';

    const headline =
      user.candidateProfile?.headline ||
      user.recruiterProfile?.designation ||
      (isRecruiter ? 'Talent Recruiter' : isCandidate ? 'Candidate' : 'Administrator');

    const location = user.candidateProfile?.location || 'Not Specified';
    const skills = user.candidateProfile?.skills?.map((s) => s.skill.name) || [];

    const currency = user.wallet?.currency || 'INR';
    const walletBalance = formatCurrency(user.wallet?.availableBalance || '0.00', currency);

    const activeContractsCount = user.activity?.contracts ?? 0;
    const totalApplicationsCount = user.activity?.applications ?? 0;
    const totalProposalsCount = user.activity?.proposals ?? 0;
    const totalJobsCount = user.activity?.jobsPosted ?? 0;

    const disputes = user.disputesRaised || [];
    const moderationHistory =
      user.moderationsRecvd?.map((m) => ({
        action: m.action,
        reason: m.reason,
        adminName: m.admin?.user?.fullName || 'Administrator',
        date: formatTimeAgo(m.createdAt),
      })) || [];

    return {
      headline,
      location,
      skills,
      walletBalance,
      activeContractsCount,
      totalApplicationsCount,
      totalProposalsCount,
      totalJobsCount,
      disputes,
      moderationHistory,
    };
  }, [user]);

  const handleModerationSubmit = async () => {
    if (!user || !activeModal) return;

    if (['WARN', 'SUSPEND', 'BAN', 'UNBAN', 'DELETE'].includes(activeModal) && !reason.trim()) {
      return;
    }

    try {
      const actionType: any = activeModal === 'DELETE' ? 'BAN' : activeModal;
      let expiresAt: string | undefined = undefined;
      if (activeModal === 'SUSPEND') {
        const days = parseInt(suspensionDuration, 10);
        if (!isNaN(days)) {
          const date = new Date();
          date.setDate(date.getDate() + days);
          expiresAt = date.toISOString();
        } else if (customSuspensionDate) {
          expiresAt = new Date(customSuspensionDate).toISOString();
        }
      }

      await moderateUser({
        id: user.id,
        action: actionType,
        reason,
        expiresAt,
      }).unwrap();

      dispatch(
        showNotification({
          message: `Successfully executed ${activeModal} on ${user.fullName}.`,
          severity: 'success',
        })
      );

      setReason('');
      setActiveModal(null);
      refetch();
    } catch (err: any) {
      dispatch(
        showNotification({
          message: err?.data?.message || 'Failed to apply moderation action.',
          severity: 'error',
        })
      );
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;
    try {
      await resetUserPassword(user.id).unwrap();
      dispatch(
        showNotification({
          message: `Password reset link dispatched successfully to ${user.email}.`,
          severity: 'success',
        })
      );
      setActiveModal(null);
    } catch (err: any) {
      dispatch(
        showNotification({
          message: err?.data?.message || 'Failed to dispatch password reset link.',
          severity: 'error',
        })
      );
    }
  };

  if (!mounted) return null;

  if (isLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading user profile &amp; audit history...
          </Typography>
        </Stack>
      </Container>
    );
  }

  if (!user || !details) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin/users')}
          sx={{ mb: 3, textTransform: 'none', fontWeight: 800 }}
        >
          Back to Users
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          User not found
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Back navigation & Refresh */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin/users')}
          sx={{ textTransform: 'none', fontWeight: 800, color: '#334155' }}
        >
          Back to Users
        </Button>

        <Tooltip title="Refresh User Details">
          <IconButton
            onClick={() => refetch()}
            disabled={isFetching}
            sx={{
              bgcolor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              '&:hover': { bgcolor: '#e2e8f0' },
            }}
          >
            <RefreshIcon sx={{ color: '#475569' }} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Header Profile Summary */}
      <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4, mb: 4, boxShadow: 'none', bgcolor: '#ffffff' }}>
        <CardContent sx={{ p: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar
                sx={{
                  bgcolor: 'primary.main',
                  width: 64,
                  height: 64,
                  fontSize: '1.75rem',
                  fontWeight: 900,
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                }}
              >
                {user.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </Avatar>
            </Grid>
            <Grid item xs>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={1}>
                <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: 'Outfit, sans-serif', color: '#0f172a' }}>
                  {user.fullName}
                </Typography>
                <StatusBadge domain="account" status={user.accountStatus} />

                {user.role === 'RECRUITER' && (
                  <Stack direction="row" spacing={1}>
                    {user.recruiterProfile?.kycStatus === 'APPROVED' ? (
                      <Chip
                        icon={<VerifiedIcon />}
                        label="Identity Verified"
                        color="success"
                        size="small"
                        sx={{ fontWeight: 800 }}
                      />
                    ) : user.recruiterProfile?.postingFeePaid ? (
                      <Chip label="Payment Verified" color="primary" size="small" sx={{ fontWeight: 800 }} />
                    ) : (
                      <Chip label="Unverified Recruiter" size="small" sx={{ fontWeight: 800 }} />
                    )}
                  </Stack>
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 600 }}>
                {user.email} · <span style={{ textTransform: 'capitalize' }}>{user.role.toLowerCase()}</span> · Joined{' '}
                {formatDate(user.createdAt || '')}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={4}>
        {/* Left Column: Profile, Activity, Finances, Disputes & Audit Trail */}
        <Grid item xs={12} lg={8.5}>
          <Stack spacing={4}>
            {/* Profile Summary */}
            <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4, boxShadow: 'none', bgcolor: '#ffffff' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 2, fontFamily: 'Outfit, sans-serif' }}>
                  Profile Summary
                </Typography>
                <Stack spacing={2.5}>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}
                    >
                      HEADLINE / DESIGNATION
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      {details.headline}
                    </Typography>
                  </Box>

                  {user.recruiterProfile?.company && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}
                      >
                        COMPANY
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        {user.recruiterProfile.company.name}
                      </Typography>
                    </Box>
                  )}

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}
                    >
                      LOCATION
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      {details.location}
                    </Typography>
                  </Box>

                  {details.skills.length > 0 && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 800, display: 'block', mb: 1 }}
                      >
                        SKILLS &amp; EXPERTISE
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap gap={1}>
                        {details.skills.map((s, idx) => (
                          <Chip key={idx} label={s} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Financial Context & Summary */}
            <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4, boxShadow: 'none', bgcolor: '#ffffff' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 3, fontFamily: 'Outfit, sans-serif' }}>
                  Financial Ledger Context
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}
                      >
                        AVAILABLE WALLET BALANCE
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>
                        {details.walletBalance}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Platform Activity */}
            <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4, boxShadow: 'none', bgcolor: '#ffffff' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 2, fontFamily: 'Outfit, sans-serif' }}>
                  Platform Activity
                </Typography>
                <Grid container spacing={2}>
                  {user.role === 'CANDIDATE' ? (
                    <>
                      <Grid item xs={6} md={4}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                          APPLICATIONS
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5, color: '#0f172a' }}>
                          {details.totalApplicationsCount}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={4}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                          PROPOSALS
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5, color: '#0f172a' }}>
                          {details.totalProposalsCount}
                        </Typography>
                      </Grid>
                    </>
                  ) : (
                    <Grid item xs={6} md={4}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                        JOBS POSTED
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5, color: '#0f172a' }}>
                        {details.totalJobsCount}
                      </Typography>
                    </Grid>
                  )}
                  <Grid item xs={6} md={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                      ACTIVE CONTRACTS
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5, color: '#0f172a' }}>
                      {details.activeContractsCount}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Moderation History Audit Trail */}
            <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4, boxShadow: 'none', bgcolor: '#ffffff' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 3, fontFamily: 'Outfit, sans-serif' }}>
                  Moderation History &amp; Audit Trail
                </Typography>

                {details.moderationHistory.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No prior moderation actions recorded for this user.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {details.moderationHistory.map((item, idx) => (
                      <Box key={idx} sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: '#f8fafc' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Chip
                            label={item.action}
                            size="small"
                            color={item.action === 'BAN' ? 'error' : item.action === 'SUSPEND' ? 'warning' : 'info'}
                            sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            {item.date}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 700, color: '#1e293b' }}>
                          Reason: <span style={{ fontWeight: 500, color: '#475569' }}>{item.reason}</span>
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 600 }}>
                          Enforced by: {item.adminName}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Right Column: Moderation Actions panel */}
        <Grid item xs={12} lg={3.5}>
          <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4, boxShadow: 'none', bgcolor: '#ffffff' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 3, fontFamily: 'Outfit, sans-serif' }}>
                Moderation Actions
              </Typography>

              <Stack spacing={2}>
                {user.accountStatus !== 'SUSPENDED' && user.accountStatus !== 'BANNED' ? (
                  <>
                    <Button
                      variant="outlined"
                      color="info"
                      fullWidth
                      startIcon={<WarningIcon />}
                      onClick={() => setActiveModal('WARN')}
                      disabled={isModerating}
                      sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2.5 }}
                    >
                      Issue Formal Warning
                    </Button>

                    <Button
                      variant="outlined"
                      color="warning"
                      fullWidth
                      startIcon={<BlockIcon />}
                      onClick={() => setActiveModal('SUSPEND')}
                      disabled={isModerating}
                      sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2.5 }}
                    >
                      Suspend Account
                    </Button>

                    <Button
                      variant="contained"
                      color="error"
                      fullWidth
                      startIcon={<BlockIcon />}
                      onClick={() => setActiveModal('BAN')}
                      disabled={isModerating}
                      sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2.5 }}
                    >
                      Ban Account
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    startIcon={<CheckCircleIcon />}
                    onClick={() => setActiveModal('UNBAN')}
                    disabled={isModerating}
                    sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2.5 }}
                  >
                    Reactivate Account
                  </Button>
                )}

                <Divider sx={{ my: 1 }} />

                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<LockResetIcon />}
                  onClick={() => setActiveModal('RESET_PASSWORD')}
                  disabled={isResettingPassword}
                  sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2.5 }}
                >
                  Reset User Password
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* CONFIRMATION DIALOG MODAL */}
      <Dialog
        open={activeModal !== null}
        onClose={() => {
          setActiveModal(null);
          setReason('');
        }}
        PaperProps={{ sx: { borderRadius: 4, p: 1, maxWidth: 500, width: '100%' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>
          {activeModal === 'WARN' && `Warn ${user.fullName}`}
          {activeModal === 'SUSPEND' && `Suspend ${user.fullName}`}
          {activeModal === 'BAN' && `Ban ${user.fullName}`}
          {activeModal === 'UNBAN' && `Reactivate ${user.fullName}`}
          {activeModal === 'RESET_PASSWORD' && `Send Password Reset`}
        </DialogTitle>
        <DialogContent>
          {user.role === 'RECRUITER' &&
            details.activeContractsCount > 0 &&
            (activeModal === 'SUSPEND' || activeModal === 'BAN') && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2.5, fontWeight: 700 }}>
                This recruiter has {details.activeContractsCount} active contracts. Suspending them will not affect
                existing contracts, but they cannot post new jobs or accept new proposals until reinstated.
              </Alert>
            )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {activeModal === 'WARN' &&
              'This will issue a policy violation warning. The user will receive an email but can continue using the platform.'}
            {activeModal === 'SUSPEND' &&
              'This will temporarily block access. The user cannot log in for the selected duration.'}
            {activeModal === 'BAN' &&
              'This will indefinitely lock the account. Sessions will be immediately terminated.'}
            {activeModal === 'UNBAN' &&
              'This will restore full login privileges and mark the account status as ACTIVE.'}
            {activeModal === 'RESET_PASSWORD' &&
              `Send password recovery setup links directly to ${user.email}.`}
          </Typography>

          {/* Suspension duration selection */}
          {activeModal === 'SUSPEND' && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 1 }}>
                SUSPENSION DURATION
              </Typography>
              <RadioGroup row value={suspensionDuration} onChange={(e) => setSuspensionDuration(e.target.value)}>
                <FormControlLabel value="7" control={<Radio />} label="7 Days" />
                <FormControlLabel value="14" control={<Radio />} label="14 Days" />
                <FormControlLabel value="30" control={<Radio />} label="30 Days" />
                <FormControlLabel value="CUSTOM" control={<Radio />} label="Custom Date" />
              </RadioGroup>

              {suspensionDuration === 'CUSTOM' && (
                <TextField
                  type="date"
                  fullWidth
                  size="small"
                  sx={{ mt: 2 }}
                  value={customSuspensionDate}
                  onChange={(e) => setCustomSuspensionDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              )}
            </Box>
          )}

          {activeModal !== 'RESET_PASSWORD' && (
            <TextField
              label="Reason (Required)"
              required
              multiline
              rows={4}
              fullWidth
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              helperText="Describe the specific rule violation or support context. This is recorded in the moderation history audit trail."
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setActiveModal(null);
              setReason('');
            }}
            sx={{ fontWeight: 700 }}
          >
            Cancel
          </Button>

          {activeModal === 'RESET_PASSWORD' ? (
            <Button
              variant="contained"
              onClick={handleResetPassword}
              disabled={isResettingPassword}
              sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
            >
              {isResettingPassword ? 'Sending...' : 'Send Reset Link'}
            </Button>
          ) : (
            <Button
              variant="contained"
              color={
                activeModal === 'BAN' ? 'error' : activeModal === 'SUSPEND' ? 'warning' : 'primary'
              }
              disabled={!reason.trim() || isModerating}
              onClick={handleModerationSubmit}
              sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
            >
              {isModerating ? (
                'Processing...'
              ) : (
                <>
                  {activeModal === 'WARN' && 'Confirm Warning'}
                  {activeModal === 'SUSPEND' && 'Confirm Suspension'}
                  {activeModal === 'BAN' && 'Confirm Ban'}
                  {activeModal === 'UNBAN' && 'Confirm Activation'}
                </>
              )}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}
