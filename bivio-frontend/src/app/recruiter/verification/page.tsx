'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Alert,
  Avatar,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { showNotification } from '@/store/slices/notificationSlice';
import { FullPageLoader } from '@/components/common/FullPageLoader';

// Icons
import VerifiedIcon from '@mui/icons-material/Verified';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

import {
  useGetRecruiterProfileQuery,
  useVerifyPaymentMethodMutation,
  useSubmitKycMutation,
  useVerifyCheckoutSessionMutation,
  useGetPublicSettingsQuery,
} from '@/store/api/profilesApi';

export default function VerificationPage() {
  const dispatch = useDispatch();
  const [mounted, setMounted] = useState(false);

  // --- API HOOKS ---
  const { data: publicSettings } = useGetPublicSettingsQuery();
  const KYC_THRESHOLD = publicSettings?.KYC_THRESHOLD ?? 500000;
  const { data: profile, isLoading: isProfileLoading, refetch } = useGetRecruiterProfileQuery();
  const [verifyPaymentMethod, { isLoading: isVerifyingPayment }] = useVerifyPaymentMethodMutation();
  const [submitKyc, { isLoading: isSubmittingKyc }] = useSubmitKycMutation();
  const [verifyCheckoutSession, { isLoading: isVerifyingSession }] = useVerifyCheckoutSessionMutation();

  // Core States
  const [emailVerified, setEmailVerified] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [kycStatus, setKycStatus] = useState<'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED'>('NOT_STARTED');
  const [kycReason, setKycReason] = useState('');
  const [kycType, setKycType] = useState<'INDIVIDUAL' | 'BUSINESS'>('INDIVIDUAL');
  const [retryCount, setRetryCount] = useState(0);

  // Form inputs
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cardNo, setCardNo] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cvv, setCvv] = useState('');

  const [showKycModal, setShowKycModal] = useState(false);
  const [docName, setDocName] = useState('');
  const [attachedFileName, setAttachedFileName] = useState('');
  const [attachedFileBase64, setAttachedFileBase64] = useState('');

  // Sync loaded database state
  useEffect(() => {
    if (profile) {
      setEmailVerified(profile.user?.isVerified ?? false);
      setPaymentVerified(profile.paymentMethodVerified ?? false);
      setKycStatus(profile.kycStatus || 'NOT_STARTED');
      const latestKyc = profile.kycSubmissions?.[0];
      setKycReason(latestKyc?.rejectionReason || profile.kycReason || '');
      setKycType(profile.isSolo ? 'INDIVIDUAL' : 'BUSINESS');
      
      // Load retry count from local storage for simulation purposes
      const rc = parseInt(localStorage.getItem('bivio_kycRetryCount') || '0', 10);
      setRetryCount(rc);
    }
  }, [profile]);

  useEffect(() => {
    setMounted(true);
    document.title = "Verification — Bivio";

    const query = new URLSearchParams(window.location.search);
    const sessionId = query.get('session_id');
    const isCancelled = query.get('cancel') === 'true';

    if (sessionId) {
      const runVerify = async () => {
        try {
          await verifyCheckoutSession({ sessionId }).unwrap();
          dispatch(showNotification({ message: 'Payout Card verified via Stripe Checkout successfully.', severity: 'success' }));
          refetch();
        } catch (err: any) {
          dispatch(showNotification({ message: err.data?.message || 'Stripe Session verification failed.', severity: 'error' }));
        } finally {
          window.history.replaceState(null, '', window.location.pathname);
        }
      };
      runVerify();
    } else if (isCancelled) {
      dispatch(showNotification({ message: 'Stripe Checkout was cancelled.', severity: 'warning' }));
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [verifyCheckoutSession, refetch, dispatch]);

  if (!mounted) return null;
  if (isProfileLoading || isVerifyingSession) {
    return <FullPageLoader message={isVerifyingSession ? "Verifying Stripe session..." : "Loading verification status..."} />;
  }

  const handleVerifyPayment = async () => {
    if (!cardNo.trim() || !cardHolder.trim() || !cvv.trim()) {
      dispatch(showNotification({ message: 'Please fill in all card details.', severity: 'error' }));
      return;
    }

    try {
      const response = await verifyPaymentMethod({
        paymentMethodToken: 'mock_card_nonce_stripe_elements',
        email: profile?.user?.email,
        cardHolder: cardHolder,
      }).unwrap();
      
      if (response.checkoutUrl) {
        dispatch(showNotification({ message: 'Redirecting to Stripe Checkout...', severity: 'info' }));
        window.location.href = response.checkoutUrl;
        return;
      }

      dispatch(showNotification({ message: 'Payout Card verified successfully.', severity: 'success' }));
      setShowPaymentModal(false);
      setCardNo('');
      setCardHolder('');
      setCvv('');
      refetch();
    } catch (err: any) {
      dispatch(showNotification({ message: err.data?.message || 'Verification failed.', severity: 'error' }));
    }
  };

  const handleVerifyKyc = async () => {
    if (!docName.trim() || !attachedFileName) {
      dispatch(showNotification({ message: 'Please fill out all details and attach a verification document.', severity: 'error' }));
      return;
    }

    try {
      const fileExt = attachedFileName.substring(attachedFileName.lastIndexOf('.')) || '';
      const finalFileName = docName.trim() 
        ? (docName.trim().toLowerCase().endsWith(fileExt.toLowerCase()) ? docName.trim() : `${docName.trim()}${fileExt}`) 
        : attachedFileName;

      await submitKyc({
        kycType,
        documents: [
          {
            fileUrl: attachedFileBase64 || 'data:image/jpeg;base64,mock...',
            fileName: finalFileName,
            mimeType: attachedFileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
            sizeBytes: 1048576,
          }
        ]
      }).unwrap();

      dispatch(showNotification({ message: 'KYC documents submitted successfully. Status is now Pending Review.', severity: 'success' }));
      setShowKycModal(false);
      setDocName('');
      setAttachedFileName('');
      setAttachedFileBase64('');
      refetch();
    } catch (err: any) {
      dispatch(showNotification({ message: err.data?.message || 'KYC submission failed.', severity: 'error' }));
    }
  };

  // Sandbox simulation triggers: Since admin panel is a separate role, we can mock it in sandbox mode
  const handleSimulateApproval = () => {
    // Modify local state temporarily & show notification
    setKycStatus('APPROVED');
    localStorage.setItem('bivio_kycStatus', 'APPROVED');
    localStorage.setItem('bivio_idVerified', 'true');
    dispatch(showNotification({ message: 'Sandbox: KYC status updated to APPROVED locally.', severity: 'success' }));
  };

  const handleSimulateRejection = () => {
    const nextRetry = retryCount + 1;
    setRetryCount(nextRetry);
    localStorage.setItem('bivio_kycRetryCount', String(nextRetry));
    setKycStatus('REJECTED');
    setKycReason('Government ID photo was blurry or details mismatched account name.');
    localStorage.setItem('bivio_kycStatus', 'REJECTED');
    localStorage.setItem('bivio_idVerified', 'false');
    dispatch(showNotification({ message: 'Sandbox: KYC status updated to REJECTED locally.', severity: 'error' }));
  };

  const handleResetKyc = () => {
    setRetryCount(0);
    localStorage.setItem('bivio_kycRetryCount', '0');
    setKycStatus('NOT_STARTED');
    setKycReason('');
    setPaymentVerified(false);
    localStorage.setItem('bivio_kycStatus', 'NOT_STARTED');
    localStorage.setItem('bivio_idVerified', 'false');
    localStorage.setItem('bivio_paymentMethodVerified', 'false');
    dispatch(showNotification({ message: 'Sandbox: Verification status reset locally.', severity: 'info' }));
  };

  const getCurrentTierName = () => {
    if (kycStatus === 'APPROVED') return 'Identity Verified (Tier 3)';
    if (paymentVerified) return 'Payment Verified (Tier 2)';
    return 'Email Verified (Tier 1)';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 855, fontFamily: 'Outfit, sans-serif', color: 'text.primary', mb: 1 }}>
          Verification
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Confirm your account details to lift contract limits and display trust signals to candidates.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Left Column: Status Checklist & Form Triggers */}
        <Grid item xs={12} md={7.5}>
          <Stack spacing={3}>
            
            {/* Account Verification Status */}
            <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 3 }}>
                  Account Verification Status
                </Typography>
                
                <Stack spacing={3}>
                  {/* Email */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={2} alignItems="center">
                      <CheckCircleIcon color="success" />
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Email Verified</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Verified at signup ({profile?.user?.email || 'priya@acme.example'})
                        </Typography>
                      </Box>
                    </Stack>
                    <Chip label="Verified" color="success" size="small" sx={{ fontWeight: 700 }} />
                  </Stack>

                  <Divider />

                  {/* Payment Method */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={2} alignItems="center">
                      {paymentVerified ? <CheckCircleIcon color="success" /> : <Box sx={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #cbd5e1' }} />}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Payment Method Verified</Typography>
                        <Typography variant="caption" color="text.secondary">$1 temporary authorization hold test</Typography>
                      </Box>
                    </Stack>
                    {paymentVerified ? (
                      <Chip label="Verified" color="success" size="small" sx={{ fontWeight: 700 }} />
                    ) : (
                      <Button variant="outlined" size="small" onClick={() => setShowPaymentModal(true)} sx={{ fontWeight: 700 }}>
                        Verify Now
                      </Button>
                    )}
                  </Stack>

                  <Divider />

                  {/* Identity Verification */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={2} alignItems="center">
                      {kycStatus === 'APPROVED' ? (
                        <CheckCircleIcon color="success" />
                      ) : kycStatus === 'REJECTED' ? (
                        <ErrorIcon color="error" />
                      ) : (
                        <Box sx={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #cbd5e1' }} />
                      )}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Identity Verification</Typography>
                        <Typography variant="caption" color="text.secondary">Government registration / ID checks</Typography>
                      </Box>
                    </Stack>
                    
                    {kycStatus === 'APPROVED' && (
                      <Chip label="Approved" color="success" size="small" sx={{ fontWeight: 700 }} />
                    )}
                    {kycStatus === 'PENDING' && (
                      <Chip label="Pending Review" color="warning" size="small" sx={{ fontWeight: 700 }} />
                    )}
                    {kycStatus === 'REJECTED' && (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label="Rejected" color="error" size="small" sx={{ fontWeight: 700 }} />
                        {retryCount < 2 ? (
                          <Button variant="outlined" size="small" onClick={() => setShowKycModal(true)} sx={{ fontWeight: 700 }}>
                            Retry
                          </Button>
                        ) : (
                          <Button variant="outlined" size="small" color="error" disabled sx={{ fontWeight: 700 }}>
                            Locked
                          </Button>
                        )}
                      </Stack>
                    )}
                    {kycStatus === 'NOT_STARTED' && (
                      <Button variant="outlined" size="small" disabled={!paymentVerified} onClick={() => setShowKycModal(true)} sx={{ fontWeight: 700 }}>
                        Verify Now
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {/* Current Tier Info */}
            <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', bgcolor: '#f8fafc', boxShadow: 'none' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', display: 'block', mb: 0.5 }}>
                  CURRENT STATUS
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.5 }}>
                  {getCurrentTierName()}
                </Typography>

                {kycStatus === 'APPROVED' ? (
                  <Typography variant="body2" color="text.secondary">
                    You have unlocked the highest trust level. You can now publish unlimited value contracts, extend offers, and enjoy priority dispute resolution queues.
                  </Typography>
                ) : paymentVerified ? (
                  <Typography variant="body2" color="text.secondary">
                    Unlocked: Publish freelance/full-time jobs, accept proposals, extend offers, and fund escrow accounts up to **₹{KYC_THRESHOLD.toLocaleString('en-IN')}** maximum value per contract.
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    You can currently browse freelance profiles and create job posting drafts. You must verify a payment method to publish jobs or accept bids.
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* KYC Upload Nudge */}
            {kycStatus !== 'APPROVED' && (
              <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>
                    Unlock Identity Verification
                  </Typography>
                  
                  <Stack spacing={1} sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary">• Hire on contracts above ₹{KYC_THRESHOLD.toLocaleString('en-IN')}</Typography>
                    <Typography variant="body2" color="text.secondary">• Earn a blue &quot;Identity Verified&quot; badge on your job postings</Typography>
                    <Typography variant="body2" color="text.secondary">• Receive priority queue allocation in dispute resolution</Typography>
                  </Stack>

                  {kycStatus === 'REJECTED' && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
                      <strong>Rejection Reason:</strong> {kycReason} {retryCount >= 2 ? '(Limit reached. Please contact admin support.)' : ''}
                    </Alert>
                  )}

                  {kycStatus === 'PENDING' && (
                    <Alert 
                      severity={profile.kycSubmissions?.[0]?.clarificationRequested ? "warning" : "info"} 
                      sx={{ mb: 3, borderRadius: 3 }}
                    >
                      {profile.kycSubmissions?.[0]?.clarificationRequested ? (
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                            Clarification Requested by Compliance:
                          </Typography>
                          <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1.5 }}>
                            "{profile.kycSubmissions[0].clarificationRequested}"
                          </Typography>
                          <Button 
                            variant="contained" 
                            color="warning" 
                            size="small" 
                            onClick={() => setShowKycModal(true)} 
                            sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
                          >
                            Update Verification Documents
                          </Button>
                        </Box>
                      ) : (
                        "Verification submitted. Our compliance team is verifying files. Usually resolved within 24 hours."
                      )}
                    </Alert>
                  )}

                  {!profile.kycSubmissions?.[0]?.clarificationRequested && (
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        color="primary"
                        disabled={!paymentVerified || kycStatus === 'PENDING' || retryCount >= 2}
                        onClick={() => setShowKycModal(true)}
                        sx={{ fontWeight: 800 }}
                      >
                        Verify with Government ID / Business Registration
                      </Button>
                    </Stack>
                  )}
                </CardContent>
              </Card>
            )}

          </Stack>
        </Grid>

        {/* Right Column: Preview of what Candidates/Freelancers see */}
        <Grid item xs={12} md={4.5}>
          <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
                Candidate Perspective Preview
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3 }}>
                This is how your verification badges and status will appear to talent on the marketplace.
              </Typography>

              <Card sx={{ p: 2.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: 'none' }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar src={(profile?.isSolo ? profile.user?.profileImage : profile?.company?.logoUrl) || undefined} sx={{ bgcolor: 'teal', width: 36, height: 36, fontSize: '0.9rem', fontWeight: 800 }}>
                      {profile?.isSolo ? (profile?.user?.fullName?.[0]?.toUpperCase() || 'R') : (profile?.company?.name?.[0]?.toUpperCase() || 'C')}
                    </Avatar>
                    <Box>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 850 }}>
                          {profile?.isSolo ? (profile?.user?.fullName || 'Recruiter') : (profile?.company?.name || 'Company')}
                        </Typography>
                        {kycStatus === 'APPROVED' ? (
                          <VerifiedIcon sx={{ color: 'primary.main', fontSize: 16 }} />
                        ) : paymentVerified ? (
                          <VerifiedIcon sx={{ color: 'text.disabled', fontSize: 16 }} />
                        ) : null}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {profile?.isSolo ? `${profile?.designation || 'Recruiter'}` : `${profile?.company?.industry || 'Software'} Industry · ${profile?.company?.website || ''}`}
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider />

                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>VERIFICATION TIER</Typography>
                    {kycStatus === 'APPROVED' ? (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <VerifiedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main' }}>
                          Identity Verified (Fully Verified)
                        </Typography>
                      </Stack>
                    ) : paymentVerified ? (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <VerifiedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                          Payment Verified (2nd Phase)
                        </Typography>
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                        Unverified
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              </Card>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* VERIFY PAYMENT METHOD MODAL */}
      <Dialog open={showPaymentModal} onClose={() => setShowPaymentModal(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 900 }}>Verify Payment Method</DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Stack spacing={2.5} sx={{ pt: 1.5 }}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              A temporary authorization hold of $1 will be initiated and automatically voided immediately.
            </Alert>
            <TextField
              label="Card Number"
              fullWidth
              size="small"
              value={cardNo}
              onChange={(e) => setCardNo(e.target.value)}
              placeholder="4111 2222 3333 4444"
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Card Holder Name"
                fullWidth
                size="small"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
              />
              <TextField
                label="CVV"
                type="password"
                size="small"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                sx={{ width: 100 }}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setShowPaymentModal(false)} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleVerifyPayment}
            disabled={!cardNo.trim() || !cardHolder.trim() || !cvv.trim() || isVerifyingPayment}
            startIcon={isVerifyingPayment ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{ fontWeight: 800 }}
          >
            {isVerifyingPayment ? 'Authorizing Hold...' : 'Verify Card'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* KYC DOCUMENT UPLOAD MODAL */}
      <Dialog open={showKycModal} onClose={() => setShowKycModal(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 900 }}>Identity Verification Document</DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Stack spacing={2.5} sx={{ pt: 1.5 }}>
            <RadioGroup value={kycType} onChange={(e) => setKycType(e.target.value as any)}>
              <FormControlLabel value="INDIVIDUAL" control={<Radio />} label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Individual Government ID (PAN/Aadhaar/Passport)</Typography>} />
              <FormControlLabel value="BUSINESS" control={<Radio />} label={<Typography variant="body2" sx={{ fontWeight: 700 }}>GST certificate / Incorporation registration</Typography>} />
            </RadioGroup>

            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Supported formats: PDF, JPG, PNG (Max 5MB). Make sure the name matches the official registration document exactly.
            </Alert>

            <TextField
              label={kycType === 'INDIVIDUAL' ? "Full Name on ID" : "Business Name"}
              fullWidth
              size="small"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
            />

            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
              fullWidth
              sx={{ py: 3, borderStyle: 'dashed', borderRadius: 3, textTransform: 'none', fontWeight: 700 }}
            >
              Upload Document File
              <input
                type="file"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setAttachedFileName(file.name);
                    // Prefill ID name if empty
                    if (!docName.trim()) {
                      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                      setDocName(nameWithoutExt);
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setAttachedFileBase64(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </Button>
            
            {attachedFileName && (
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.main' }}>
                File Attached: {attachedFileName}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setShowKycModal(false)} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleVerifyKyc}
            disabled={!docName.trim() || !attachedFileName || isSubmittingKyc}
            startIcon={isSubmittingKyc ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{ fontWeight: 800 }}
          >
            {isSubmittingKyc ? 'Uploading Docs...' : 'Submit Verification'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
