'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  Box,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CelebrationIcon from '@mui/icons-material/Celebration';

import { useGetOffersQuery, useWithdrawOfferMutation } from '@/store/api/applicationsApi';
import type { Offer } from '@/types';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatCurrency, formatTimeAgo } from '@/lib/format';

export default function RecruiterOffersPage() {
  const { data: offers = [], isLoading, isError, refetch } = useGetOffersQuery();
  const [withdrawOffer, { isLoading: isWithdrawing }] = useWithdrawOfferMutation();

  const [activeTab, setActiveTab] = useState<string>('ACTIVE');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [withdrawModal, setWithdrawModal] = useState(false);

  // Toast Snackbar States
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('success');

  const showToast = (msg: string, severity: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setToastMsg(msg);
    setToastSeverity(severity);
    setToastOpen(true);
  };

  const handleWithdrawOffer = async () => {
    if (!selectedOffer) return;
    try {
      await withdrawOffer(selectedOffer.id).unwrap();
      setWithdrawModal(false);
      setSelectedOffer(null);
      showToast('Hiring offer has been withdrawn successfully.', 'warning');
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to withdraw offer.', 'error');
    }
  };

  // Expiry Calculations
  const getDaysLeft = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return 0;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getExpiryLabel = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return { text: 'No Expiry', color: 'text.secondary' };
    const days = getDaysLeft(expiresAt);
    if (days <= 0) return { text: 'Expired', color: 'error.main' };
    if (days === 1) return { text: 'Expires in 1 day', color: 'error.main' };
    if (days <= 3) return { text: `Expires in ${days} days`, color: 'warning.main' };
    return { text: `Expires in ${days} days`, color: 'text.secondary' };
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  // Filtered Lists
  const filteredOffers = offers.filter(offer => {
    if (activeTab === 'ACTIVE') {
      return offer.status === 'SENT';
    }
    if (activeTab === 'ACCEPTED') {
      return offer.status === 'ACCEPTED';
    }
    // REJECTED / EXPIRED / WITHDRAWN
    return offer.status === 'REJECTED' || offer.status === 'EXPIRED' || offer.status === 'WITHDRAWN';
  }).sort((a, b) => {
    // Sort Active by soonest expiry
    if (activeTab === 'ACTIVE') {
      return new Date(a.expiresAt || '').getTime() - new Date(b.expiresAt || '').getTime();
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (isLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading offer details...
          </Typography>
        </Stack>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container sx={{ py: 10 }}>
        <Alert severity="error" sx={{ borderRadius: 3, fontWeight: 700 }}>
          Could not find or load the extended offers tracking details. Please try again.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 850, fontFamily: 'Outfit, sans-serif', color: 'primary.main' }}>
          Offer Tracking
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monitor compensation structures, active candidates offers status, and expiry timelines.
        </Typography>
      </Box>

      {/* Tabs Menu */}
      <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3.5 }}>
        <Tab value="ACTIVE" label="Active Sent" />
        <Tab value="ACCEPTED" label="Accepted Hires" />
        <Tab value="REJECTED_EXPIRED" label="Rejected / Expired / Withdrawn" />
      </Tabs>

      {/* Offers Render Grid */}
      <Stack spacing={2.5}>
        {filteredOffers.map((offer: any) => {
          const app = offer.application;
          const job = app?.job;
          const candidateName = app?.candidate?.user?.fullName || 'Candidate';
          
          if (activeTab === 'ACTIVE') {
            const exp = getExpiryLabel(offer.expiresAt);
            return (
              <Card key={offer.id} sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                        <AccessTimeIcon sx={{ fontSize: 16, color: exp.color }} />
                        <Typography variant="caption" sx={{ fontWeight: 800, color: exp.color }}>
                          {exp.text.toUpperCase()}
                        </Typography>
                      </Stack>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {app ? (
                          <Link href={`/recruiter/applications/${app.id}`} style={{ textDecoration: 'none', color: '#2563eb' }}>
                            {candidateName}
                          </Link>
                        ) : candidateName}
                        {' '}— {job ? job.title : 'Loading Role...'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 600 }}>
                        Annual Package: ₹{parseInt(offer.compensation).toLocaleString()} /yr · Joining date: {offer.joiningDate ? new Date(offer.joiningDate).toLocaleDateString() : 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Sent {formatTimeAgo(offer.createdAt)}
                      </Typography>
                    </Box>
                    <Button variant="outlined" color="error" disabled={isWithdrawing} onClick={() => { setSelectedOffer(offer); setWithdrawModal(true); }}>
                      Withdraw Offer
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            );
          }

          if (activeTab === 'ACCEPTED') {
            return (
              <Card key={offer.id} sx={{ borderRadius: 4, borderLeft: '5px solid #22c55e', borderTop: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                        <CelebrationIcon color="success" />
                        <Typography variant="caption" color="success.main" sx={{ fontWeight: 850 }}>
                          OFFER ACCEPTED — HIRED!
                        </Typography>
                      </Stack>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {app ? (
                          <Link href={`/recruiter/applications/${app.id}`} style={{ textDecoration: 'none', color: '#2563eb' }}>
                            {candidateName}
                          </Link>
                        ) : candidateName}
                        {' '}— {job ? job.title : 'Loading Role...'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 600 }}>
                        Compensation: ₹{parseInt(offer.compensation).toLocaleString()} /yr · Joining date: {offer.joiningDate ? new Date(offer.joiningDate).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </Box>
                    <Chip label="Hired" color="success" sx={{ fontWeight: 800 }} />
                  </Stack>
                </CardContent>
              </Card>
            );
          }

          // REJECTED / EXPIRED / WITHDRAWN
          return (
            <Card key={offer.id} sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none', opacity: 0.8 }}>
              <CardContent sx={{ p: 3 }}>
                <Box>
                  <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                    <StatusBadge domain="offer" status={offer.status} />
                  </Stack>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {app ? (
                      <Link href={`/recruiter/applications/${app.id}`} style={{ textDecoration: 'none', color: '#2563eb' }}>
                        {candidateName}
                      </Link>
                    ) : candidateName}
                    {' '}— {job ? job.title : 'Loading Role...'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 600 }}>
                    Annual Package: ₹{parseInt(offer.compensation).toLocaleString()} /yr
                  </Typography>
                  
                  {offer.status === 'REJECTED' && (
                    <Alert severity="error" sx={{ mt: 2, fontWeight: 600 }}>
                      Candidate Refusal Reason: {offer.rejectionReason || "Compensation package below current expectation."}
                    </Alert>
                  )}
                </Box>
              </CardContent>
            </Card>
          );
        })}

        {filteredOffers.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8, border: '1px dashed #cbd5e1', borderRadius: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>No offers found</Typography>
            <Typography variant="body2" color="text.secondary">
              No offers currently outstanding. Extend an offer from a candidate's application once they reach the final stage.
            </Typography>
          </Box>
        )}
      </Stack>

      {/* WITHDRAW MODAL */}
      <Dialog open={withdrawModal} onClose={() => setWithdrawModal(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>Withdraw Employment Offer</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to withdraw this offer? The candidate will receive a notification and will no longer be able to accept it.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setWithdrawModal(false)} disabled={isWithdrawing}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleWithdrawOffer} disabled={isWithdrawing}>
            {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
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
