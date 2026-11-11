'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Avatar,
  Chip,
  CircularProgress,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { showNotification } from '@/store/slices/notificationSlice';
import {
  useGetWalletQuery,
  useGetTransactionsQuery,
  useGetPayoutsQuery,
  useRequestPayoutMutation,
  useRetryPayoutMutation,
} from '@/store/api/paymentsApi';
import { useGetPublicSettingsQuery } from '@/store/api/profilesApi';

// Icons
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

export default function WalletPage() {
  const dispatch = useDispatch();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // API Queries & Mutations
  const { data: publicSettings } = useGetPublicSettingsQuery();
  const PAYOUT_MINIMUM = publicSettings?.PAYOUT_MINIMUM ?? 500;
  const { data: walletData, isLoading: walletLoading } = useGetWalletQuery(undefined, { skip: !mounted });
  const { data: txData, isLoading: txLoading } = useGetTransactionsQuery(undefined, { skip: !mounted });
  const { data: payoutsData, isLoading: payoutsLoading } = useGetPayoutsQuery(undefined, { skip: !mounted });

  const [requestPayout, { isLoading: isRequestingPayout }] = useRequestPayoutMutation();
  const [retryPayout, { isLoading: isRetryingPayout }] = useRetryPayoutMutation();

  // Ledger state mapped from API
  const availableBalance = walletData ? Number(walletData.availableBalance) : 0;
  const pendingBalance = walletData ? Number(walletData.pendingBalance) : 0;
  const transactions = txData?.data || [];
  const payouts = payoutsData || [];

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Modal controls
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Form states
  const [withdrawAmount, setWithdrawAmount] = useState<number>(500);
  const [withdrawMethod, setWithdrawMethod] = useState<'UPI' | 'BANK_TRANSFER'>('UPI');
  const [upiId, setUpiId] = useState('candidate@okaxis');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  // Inline errors state
  const [errors, setErrors] = useState<{ amount?: string; upiId?: string; accountNumber?: string; ifscCode?: string }>({});

  const handleWithdrawClick = () => {
    // Reset form errors and show modal
    setErrors({});
    setShowWithdrawModal(true);
  };

  const validateForm = (): boolean => {
    const tempErrors: typeof errors = {};

    if (!withdrawAmount || withdrawAmount <= 0) {
      tempErrors.amount = 'Amount must be greater than zero.';
    } else if (withdrawAmount < PAYOUT_MINIMUM) {
      tempErrors.amount = `Minimum payout amount is ₹${PAYOUT_MINIMUM.toLocaleString('en-IN')}.`;
    } else if (withdrawAmount > availableBalance) {
      tempErrors.amount = 'Amount cannot exceed your available balance.';
    }

    if (withdrawMethod === 'UPI') {
      if (!upiId.trim()) {
        tempErrors.upiId = 'UPI ID is required.';
      } else if (!/^[\w.\-_]+@[\w]+$/.test(upiId.trim())) {
        tempErrors.upiId = 'Enter a valid UPI ID (e.g., candidate@okaxis).';
      }
    } else {
      if (!accountNumber.trim()) {
        tempErrors.accountNumber = 'Account number is required.';
      } else if (!/^\d{9,18}$/.test(accountNumber.trim())) {
        tempErrors.accountNumber = 'Account number must be between 9 and 18 digits.';
      }

      if (!ifscCode.trim()) {
        tempErrors.ifscCode = 'IFSC Code is required.';
      } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.trim())) {
        tempErrors.ifscCode = 'IFSC code must be standard format (e.g. SBIN0001234).';
      }
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleConfirmWithdraw = async () => {
    if (!validateForm()) return;

    try {
      const details = withdrawMethod === 'UPI'
        ? { upiId: upiId.trim() }
        : { accountNumber: accountNumber.trim(), ifsc: ifscCode.trim() };

      await requestPayout({
        amount: withdrawAmount,
        payoutMethod: withdrawMethod,
        payoutDetails: details,
      }).unwrap();

      setShowWithdrawModal(false);
      dispatch(
        showNotification({
          message: `Payout request for ₹${withdrawAmount.toLocaleString()} submitted! Wallet balance updated.`,
          severity: 'success',
        })
      );
      // Reset account inputs
      setWithdrawAmount(PAYOUT_MINIMUM);
      setAccountNumber('');
      setIfscCode('');
    } catch (err: any) {
      dispatch(
        showNotification({
          message: err?.data?.message || 'Failed to submit payout request. Please try again.',
          severity: 'error',
        })
      );
    }
  };

  const handleRetryPayout = async (payoutId: string) => {
    try {
      await retryPayout(payoutId).unwrap();
      dispatch(
        showNotification({
          message: 'Payout transaction processing restarted.',
          severity: 'success',
        })
      );
    } catch (err: any) {
      dispatch(
        showNotification({
          message: err?.data?.message || 'Failed to retry payout. Please try again.',
          severity: 'error',
        })
      );
    }
  };

  if (!mounted) return null;

  const isPageLoading = walletLoading || txLoading || payoutsLoading;

  if (isPageLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading your wallet &amp; ledgers...
          </Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* HEADER */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 850, fontFamily: 'Outfit, sans-serif', mb: 1, color: 'secondary.main' }}>
          Freelancer Wallet &amp; Ledgers
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your earnings, view pending milestones escrows, and request payouts.
        </Typography>
      </Box>

      {/* METERS */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6}>
              <Card sx={{ border: '1.5px solid teal', borderRadius: 4, bgcolor: 'rgba(13, 148, 136, 0.01)' }}>
                <CardContent sx={{ p: 4 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                        AVAILABLE BALANCE
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 800, color: 'teal', mt: 1 }}>
                        ₹{availableBalance.toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'secondary.main', width: 56, height: 56 }}>
                      <AccountBalanceWalletIcon fontSize="large" />
                    </Avatar>
                  </Stack>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    fullWidth
                    onClick={handleWithdrawClick}
                    sx={{ mt: 3, borderRadius: 2.5, fontWeight: 700 }}
                  >
                    Withdraw Funds
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4 }}>
                <CardContent sx={{ p: 4 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                        PENDING ESCROW (IN TRUST)
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 800, mt: 1 }}>
                        ₹{pendingBalance.toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'grey.300', width: 56, height: 56 }}>
                      <FileDownloadIcon fontSize="large" color="action" />
                    </Avatar>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 4.5, fontStyle: 'italic' }}>
                    * Funds are locked securely in escrow across active milestone contracts.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* TABS FOR DETAILS */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={(_e, val) => setActiveTab(val)} color="secondary">
              <Tab label="Transaction Ledger" sx={{ fontWeight: 700 }} />
              <Tab label="Payout Requests History" sx={{ fontWeight: 700 }} />
            </Tabs>
          </Box>

          {activeTab === 0 && (
            transactions.length === 0 ? (
              <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'rgba(241, 245, 249, 0.5)', borderRadius: 4, border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                <AccountBalanceWalletIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                  No Transactions Yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
                  Your milestone release credits and withdrawal debits will show up here.
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} sx={{ border: '1px solid #f1f5f9', borderRadius: 3, boxShadow: 'none' }}>
                <Table>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, py: 2, width: '18%', whiteSpace: 'nowrap' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 2, width: '12%', whiteSpace: 'nowrap' }}>Direction</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 2, width: '15%', whiteSpace: 'nowrap' }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 2 }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 2, width: '15%', whiteSpace: 'nowrap' }}>Balance After</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 2, width: '15%', whiteSpace: 'nowrap' }}>Reference</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id} hover>
                        <TableCell sx={{ py: 2.2 }}>
                          {new Date(tx.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </TableCell>
                        <TableCell sx={{ py: 2.2 }}>
                          <Chip
                            label={tx.direction}
                            color={tx.direction === 'CREDIT' ? 'success' : 'error'}
                            size="small"
                            sx={{ fontWeight: 800 }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 2.2, fontWeight: 700, color: tx.direction === 'CREDIT' ? 'success.main' : 'error.main' }}>
                          {tx.direction === 'CREDIT' ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell sx={{ py: 2.2 }}>{tx.description}</TableCell>
                        <TableCell sx={{ py: 2.2, fontWeight: 700 }}>₹{Number(tx.balanceAfter).toLocaleString('en-IN')}</TableCell>
                        <TableCell sx={{ py: 2.2, color: 'secondary.main', fontWeight: 600 }}>
                          {tx.referenceType} #{tx.referenceId ? tx.referenceId.substring(0, 8) : ''}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          )}

          {activeTab === 1 && (
            payouts.length === 0 ? (
              <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'rgba(241, 245, 249, 0.5)', borderRadius: 4, border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                <FileDownloadIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                  No Payout Requests
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
                  You haven't requested any withdrawals yet. When you do, they will appear here.
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} sx={{ border: '1px solid #f1f5f9', borderRadius: 3, boxShadow: 'none' }}>
                <Table>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, py: 2, width: '18%', whiteSpace: 'nowrap' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 2, width: '15%', whiteSpace: 'nowrap' }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 2, width: '15%', whiteSpace: 'nowrap' }}>Payout Method</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 2, width: '12%', whiteSpace: 'nowrap' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 2 }}>Details</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 2, width: '15%', whiteSpace: 'nowrap' }} align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payouts.map((pay) => (
                      <TableRow key={pay.id} hover>
                        <TableCell sx={{ py: 2.2 }}>
                          {new Date(pay.requestedAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </TableCell>
                        <TableCell sx={{ py: 2.2, fontWeight: 700 }}>₹{Number(pay.amount).toLocaleString('en-IN')}</TableCell>
                        <TableCell sx={{ py: 2.2 }}>{pay.payoutMethod === 'UPI' ? 'UPI' : 'Bank Transfer'}</TableCell>
                        <TableCell sx={{ py: 2.2 }}>
                          <Chip
                            label={pay.status}
                            color={
                              pay.status === 'PAID'
                                ? 'success'
                                : pay.status === 'FAILED'
                                ? 'error'
                                : 'warning'
                            }
                            size="small"
                            sx={{ fontWeight: 800 }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 2.2 }}>{pay.payoutDetailsMasked}</TableCell>
                        <TableCell sx={{ py: 2.2 }} align="right">
                          {pay.status === 'FAILED' ? (
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => handleRetryPayout(pay.id)}
                              disabled={isRetryingPayout}
                            >
                              {isRetryingPayout ? 'Retrying...' : 'Retry Transaction'}
                            </Button>
                          ) : (
                            <Typography variant="caption" color="text.disabled">No action</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          )}

      {/* WITHDRAW MODAL */}
      <Dialog
        open={showWithdrawModal}
        onClose={() => !isRequestingPayout && setShowWithdrawModal(false)}
        PaperProps={{ sx: { borderRadius: 4, p: 1, maxWidth: 450, width: '100%' } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Request Funds Withdrawal</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1.5 }}>
            <TextField
              label="Withdrawal Amount (INR)"
              type="number"
              fullWidth
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(Number(e.target.value))}
              helperText={errors.amount || `Available limit: ₹${availableBalance.toLocaleString('en-IN')}`}
              error={!!errors.amount}
            />

            <TextField
              select
              label="Payout Method"
              fullWidth
              value={withdrawMethod}
              onChange={(e) => setWithdrawMethod(e.target.value as 'UPI' | 'BANK_TRANSFER')}
            >
              <MenuItem value="UPI">UPI Transfer</MenuItem>
              <MenuItem value="BANK_TRANSFER">Bank Account Transfer</MenuItem>
            </TextField>

            {withdrawMethod === 'UPI' ? (
              <TextField
                label="UPI Address"
                fullWidth
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                error={!!errors.upiId}
                helperText={errors.upiId}
              />
            ) : (
              <>
                <TextField
                  label="Bank Account Number"
                  fullWidth
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  error={!!errors.accountNumber}
                  helperText={errors.accountNumber}
                />
                <TextField
                  label="IFSC Code"
                  fullWidth
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                  error={!!errors.ifscCode}
                  helperText={errors.ifscCode}
                />
              </>
            )}

            <Box sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 2.5 }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700, mb: 0.5 }}>
                NETWORK TRANSACTION FEES
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Payout Gateway Fee: ₹0 (Free Promo Plan)
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowWithdrawModal(false)} disabled={isRequestingPayout}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleConfirmWithdraw}
            disabled={isRequestingPayout}
          >
            {isRequestingPayout ? 'Processing...' : 'Confirm Withdrawal'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
