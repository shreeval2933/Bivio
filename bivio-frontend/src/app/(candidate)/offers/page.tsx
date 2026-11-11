'use client';

import React, { useState } from 'react';
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
  MenuItem,
  CircularProgress,
  Alert
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { showNotification } from '@/store/slices/notificationSlice';

// Icons
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import TimerIcon from '@mui/icons-material/Timer';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import { useGetOffersQuery, useRespondOfferMutation } from '@/store/api/applicationsApi';
import type { Offer } from '@/types';

export default function OffersPage() {
  const router = useRouter();
  const dispatch = useDispatch();

  const { data: offers = [], isLoading, isError } = useGetOffersQuery();
  const [respondOffer, { isLoading: isResponding }] = useRespondOfferMutation();

  // Modals state
  const [acceptTargetId, setAcceptTargetId] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  // Form state
  const [rejectReason, setRejectReason] = useState('Compensation');

  const activeOffers = offers.filter((o) => o.status === 'SENT');
  const closedOffers = offers.filter((o) => o.status !== 'SENT');

  const handleAcceptConfirm = async () => {
    if (acceptTargetId) {
      try {
        await respondOffer({ id: acceptTargetId, accept: true }).unwrap();
        dispatch(
          showNotification({
            message: 'Congratulations! You have accepted the job offer. Onboarding details will be emailed shortly.',
            severity: 'success',
          })
        );
        setAcceptTargetId(null);
      } catch (err: any) {
        dispatch(
          showNotification({
            message: err.data?.message || 'Failed to accept offer.',
            severity: 'error',
          })
        );
      }
    }
  };

  const handleRejectConfirm = async () => {
    if (rejectTargetId) {
      try {
        await respondOffer({ id: rejectTargetId, accept: false, rejectionReason: rejectReason }).unwrap();
        dispatch(
          showNotification({
            message: 'Offer declined. Thank you for your feedback.',
            severity: 'info',
          })
        );
        setRejectTargetId(null);
      } catch (err: any) {
        dispatch(
          showNotification({
            message: err.data?.message || 'Failed to decline offer.',
            severity: 'error',
          })
        );
      }
    }
  };

  // Expiry Calculations
  const getDaysLeft = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return 0;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading offer letter details...
          </Typography>
        </Stack>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container sx={{ py: 10 }}>
        <Alert severity="error" sx={{ borderRadius: 3, fontWeight: 700 }}>
          Could not find or load your outstanding offers. Please try again.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* HEADER */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 850, fontFamily: 'Outfit, sans-serif', mb: 1, color: 'primary.main' }}>
          Offers &amp; Career Decisions
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Review legal joining terms, download offer letters, and submit decisions.
        </Typography>
      </Box>

      {/* ACTIVE OFFERS SECTION */}
      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
        Active Offers
      </Typography>

      <Stack spacing={3} sx={{ mb: 6 }}>
        {activeOffers.map((o: any) => {
          const daysLeft = getDaysLeft(o.expiresAt);
          return (
            <Card key={o.id} sx={{ border: '1.5px solid', borderColor: daysLeft <= 3 ? 'error.light' : 'divider', borderRadius: 4, boxShadow: 'none' }}>
              <CardContent sx={{ p: 4 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={8}>
                    <Stack spacing={1.5}>
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800 }}>
                          {o.application?.job?.title || 'Role'}
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 700 }}>
                          at {o.application?.job?.company?.name || 'Nexus Talent'}
                        </Typography>
                      </Box>

                      <Divider />

                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          COMPENSATION PACKAGE
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          ₹{parseInt(o.compensation).toLocaleString()} per annum
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          EXPECTED JOINING DATE
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {o.joiningDate ? new Date(o.joiningDate).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>

                  <Grid item xs={12} sm={4} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-end' } }}>
                    {/* Expiry Badge */}
                    <Chip
                      icon={<TimerIcon sx={{ fontSize: 16 }} />}
                      label={daysLeft <= 0 ? 'Expired' : `Expires in ${daysLeft} days`}
                      color={daysLeft <= 3 ? 'error' : 'default'}
                      sx={{ fontWeight: 700, mb: { xs: 3, sm: 0 } }}
                    />

                    {/* Letter PDF */}
                    {o.offerLetterUrl && (
                      <Button
                        variant="outlined"
                        startIcon={<PictureAsPdfIcon />}
                        size="small"
                        href={o.offerLetterUrl}
                        target="_blank"
                        sx={{ textTransform: 'none', fontWeight: 600, mb: 2 }}
                      >
                        Download Offer PDF
                      </Button>
                    )}
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                {/* Decision Action Buttons */}
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={isResponding}
                    startIcon={<ThumbDownIcon />}
                    onClick={() => setRejectTargetId(o.id)}
                    sx={{ borderRadius: 2.5, px: 3, textTransform: 'none', fontWeight: 700 }}
                  >
                    Decline
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    disabled={isResponding}
                    startIcon={<ThumbUpIcon />}
                    onClick={() => setAcceptTargetId(o.id)}
                    sx={{ borderRadius: 2.5, px: 4, textTransform: 'none', fontWeight: 700 }}
                  >
                    Accept Offer
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          );
        })}

        {activeOffers.length === 0 && (
          <Card sx={{ p: 4, textAlign: 'center', border: '1.5px dashed #e2e8f0', borderRadius: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No active pending offers at this time.
            </Typography>
          </Card>
        )}
      </Stack>

      {/* CLOSED / HISTORICAL OFFERS */}
      {closedOffers.length > 0 && (
        <>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, color: 'text.secondary' }}>
            Closed Offers (Past 30 Days)
          </Typography>

          <Stack spacing={2}>
            {closedOffers.map((o: any) => (
              <Card key={o.id} sx={{ border: '1px solid #f1f5f9', borderRadius: 3, boxShadow: 'none', bgcolor: 'rgba(248, 250, 252, 0.7)' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                        {o.application?.job?.title} — {o.application?.job?.company?.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Compensation: ₹{parseInt(o.compensation).toLocaleString()} · Joined: {o.joiningDate ? new Date(o.joiningDate).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </Box>
                    <Chip label={o.status} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      )}

      {/* 1. ACCEPT CONFIRMATION MODAL */}
      <Dialog open={Boolean(acceptTargetId)} onClose={() => setAcceptTargetId(null)} PaperProps={{ sx: { borderRadius: 4, p: 2, maxWidth: 450 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Accept Job Offer?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This will accept the offer and update your status in the application history.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: '#f8fafc' }}>
            ⚠️ <strong>Note:</strong> Your other in-progress applications will remain active. You can withdraw them from the Applications tab.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAcceptTargetId(null)} disabled={isResponding} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleAcceptConfirm} disabled={isResponding} sx={{ borderRadius: 2.5, fontWeight: 700 }}>
            {isResponding ? 'Accepting...' : 'Confirm Acceptance'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 2. REJECT DECLINE FEEDBACK MODAL */}
      <Dialog open={Boolean(rejectTargetId)} onClose={() => setRejectTargetId(null)} PaperProps={{ sx: { borderRadius: 4, p: 2, maxWidth: 450 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          Decline Job Offer
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Help Bivio improve. Please share why you are declining this offer:
          </Typography>

          <TextField
            select
            label="Reason for Declining"
            fullWidth
            size="small"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          >
            <MenuItem value="Compensation">Compensation package too low</MenuItem>
            <MenuItem value="Role">Role / Responsibilities misalignment</MenuItem>
            <MenuItem value="Company">Company culture / Work environment</MenuItem>
            <MenuItem value="Timing">Timing / Extended start dates</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectTargetId(null)} disabled={isResponding} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleRejectConfirm} disabled={isResponding} sx={{ borderRadius: 2.5, fontWeight: 700 }}>
            {isResponding ? 'Declining...' : 'Confirm Decline'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
