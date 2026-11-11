'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  Chip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
} from '@mui/material';

// Icons
import VerifiedIcon from '@mui/icons-material/Verified';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FilePresentIcon from '@mui/icons-material/FilePresent';
import WarningIcon from '@mui/icons-material/Warning';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VisibilityIcon from '@mui/icons-material/Visibility';

import { useAppDispatch } from '@/hooks/useAppDispatch';
import { showNotification } from '@/store/slices/notificationSlice';

// API hooks
import {
  useGetVerificationsQuery,
  useApproveVerificationMutation,
  useRejectVerificationMutation,
  useRequestVerificationInfoMutation,
  VerificationRequest,
} from '@/store/api/adminApi';

export default function AdminVerificationsPage() {
  const dispatch = useAppDispatch();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<number>(0);

  // Dialog controllers
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReasonType, setRejectReasonType] = useState('Document unclear');
  const [rejectNote, setRejectNote] = useState('');

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveNote, setApproveNote] = useState('');

  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tab mapping for API query status parameter
  const currentTabFilter = useMemo(() => {
    switch (activeTab) {
      case 0:
        return 'PENDING';
      case 1:
        return 'APPROVED';
      case 2:
        return 'REJECTED';
      case 3:
        return 'MANUAL_REVIEW';
      default:
        return 'PENDING';
    }
  }, [activeTab]);

  // Fetch verifications query
  const { data: verifications = [], isLoading: listLoading, refetch } = useGetVerificationsQuery(
    { status: currentTabFilter },
    { skip: !mounted }
  );

  // Mutation hooks
  const [approveVerification, { isLoading: approveLoading }] = useApproveVerificationMutation();
  const [rejectVerification, { isLoading: rejectLoading }] = useRejectVerificationMutation();
  const [requestVerificationInfo, { isLoading: infoLoading }] = useRequestVerificationInfoMutation();

  const actionsLoading = approveLoading || rejectLoading || infoLoading;

  // Handle Approve Action
  const handleApprove = (req: VerificationRequest) => {
    setSelectedRequest(req);
    setShowApproveModal(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedRequest) return;

    try {
      await approveVerification({ id: selectedRequest.id, note: approveNote }).unwrap();
      
      dispatch(
        showNotification({
          message: `${selectedRequest.recruiter?.company?.name || selectedRequest.recruiter?.user?.fullName || 'Client'} verified successfully.`,
          severity: 'success',
        })
      );
      
      setShowApproveModal(false);
      setApproveNote('');
      setSelectedRequest(null);
      refetch();
    } catch (err: any) {
      dispatch(
        showNotification({
          message: err?.data?.message || 'Failed to approve verification request.',
          severity: 'error',
        })
      );
    }
  };

  // Handle Reject Action
  const handleReject = (req: VerificationRequest) => {
    setSelectedRequest(req);
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedRequest || !rejectNote.trim()) return;

    const reasonMapping: Record<string, string> = {
      "Document unclear": "DOCUMENT_UNCLEAR",
      "Name mismatch": "NAME_MISMATCH",
      "Invalid document type": "INVALID_DOCUMENT_TYPE",
      "Suspected fraud": "SUSPECTED_FRAUD",
      "Other": "OTHER",
    };
    const apiReason = reasonMapping[rejectReasonType] || "OTHER";

    try {
      await rejectVerification({
        id: selectedRequest.id,
        reason: apiReason as any,
        note: rejectNote,
      }).unwrap();

      dispatch(
        showNotification({
          message: `${selectedRequest.recruiter?.company?.name || selectedRequest.recruiter?.user?.fullName || 'Client'} KYC verification rejected.`,
          severity: 'info',
        })
      );

      setShowRejectModal(false);
      setRejectNote('');
      setSelectedRequest(null);
      refetch();
    } catch (err: any) {
      dispatch(
        showNotification({
          message: err?.data?.message || 'Failed to reject verification request.',
          severity: 'error',
        })
      );
    }
  };

  // Handle Clarification Action
  const handleRequestInfo = (req: VerificationRequest) => {
    setSelectedRequest(req);
    setShowInfoModal(true);
  };

  const handleConfirmInfo = async () => {
    if (!selectedRequest || !infoMessage.trim()) return;

    try {
      await requestVerificationInfo({ id: selectedRequest.id, message: infoMessage }).unwrap();

      dispatch(
        showNotification({
          message: `Clarification request sent to ${selectedRequest.recruiter?.user?.fullName || 'Client'}.`,
          severity: 'info',
        })
      );

      setShowInfoModal(false);
      setInfoMessage('');
      setSelectedRequest(null);
      refetch();
    } catch (err: any) {
      dispatch(
        showNotification({
          message: err?.data?.message || 'Failed to request clarification info.',
          severity: 'error',
        })
      );
    }
  };

  // UI mapping fields helper
  const requests = useMemo(() => {
    return verifications.map((req) => {
      const diffMs = Date.now() - new Date(req.createdAt).getTime();
      const minutesAgo = Math.floor(diffMs / (1000 * 60));
      const hoursAgo = Math.floor(diffMs / (1000 * 60 * 60));
      return {
        ...req,
        kycType: req.recruiter?.isSolo === false ? ('BUSINESS' as const) : ('INDIVIDUAL' as const),
        entityName: req.recruiter?.company?.name || req.recruiter?.user?.fullName || 'Client Corp',
        submittedBy: req.recruiter?.user?.fullName || 'Client Partner',
        designation: req.recruiter?.designation || 'Client Representative',
        hoursAgo: hoursAgo > 0 ? hoursAgo : 0,
        minutesAgo: minutesAgo > 0 ? minutesAgo : 0,
        nameMatchNotes: req.nameMatchNotes || (req.nameMatch ? 'Matches account details' : 'Name mismatch check'),
      };
    });
  }, [verifications]);

  // SLA indicator helper
  const getSlaChip = (hours: number, minutes: number = 0) => {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return (
        <Chip
          icon={<AccessTimeIcon sx={{ fontSize: '14px !important', color: '#ffffff' }} />}
          label={`${days}d ago (SLA Breached)`}
          sx={{ bgcolor: '#ef4444', color: '#ffffff', fontWeight: 800, fontSize: '0.725rem' }}
        />
      );
    }
    if (hours >= 20) {
      return (
        <Chip
          icon={<AccessTimeIcon sx={{ fontSize: '14px !important', color: '#78350f' }} />}
          label={`${hours}h ago (Warning)`}
          sx={{ bgcolor: '#fef3c7', color: '#78350f', fontWeight: 800, fontSize: '0.725rem' }}
        />
      );
    }
    if (hours < 1) {
      const labelText = minutes < 1 ? 'Submitted just now' : `Submitted ${minutes}m ago`;
      return (
        <Chip
          icon={<AccessTimeIcon sx={{ fontSize: '14px !important', color: '#166534' }} />}
          label={labelText}
          sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 800, fontSize: '0.725rem' }}
        />
      );
    }
    return (
      <Chip
        icon={<AccessTimeIcon sx={{ fontSize: '14px !important', color: '#166534' }} />}
        label={`Submitted ${hours}h ago`}
        sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 800, fontSize: '0.725rem' }}
      />
    );
  };

  if (!mounted) return null;

  if (listLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading verifications queue...
          </Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: 'primary.main', mb: 0.5 }}>
            Client KYC Verifications Queue
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Process pending government ID uploads, review documents, and audit client verification tiers.
          </Typography>
        </Box>
      </Stack>

      {/* Tabs Menu */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
          <Tab label="Pending" sx={{ fontWeight: 800 }} />
          <Tab label="Approved" sx={{ fontWeight: 800 }} />
          <Tab label="Rejected" sx={{ fontWeight: 800 }} />
          <Tab label="Manual Review" sx={{ fontWeight: 800 }} />
        </Tabs>
      </Box>

      {/* Queue items */}
      <Stack spacing={3}>
        {requests.length === 0 ? (
          <Card sx={{ p: 5, textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: 4, boxShadow: 'none' }}>
            <VerifiedIcon color="disabled" sx={{ fontSize: 50, mb: 1.5 }} />
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 700 }}>
              {activeTab === 0 && 'No pending verifications. Queue is clear.'}
              {activeTab === 1 && 'No approved verifications yet.'}
              {activeTab === 2 && 'No rejected verifications recorded.'}
              {activeTab === 3 && 'No manual reviews pending.'}
            </Typography>
          </Card>
        ) : (
          requests.map((req) => (
            <Card key={req.id} sx={{ border: '1px solid #cbd5e1', borderRadius: 4, boxShadow: 'none', overflow: 'hidden' }}>
              <CardContent sx={{ p: 4 }}>
                
                {/* Second Submission Warning */}
                {req.isSecondSubmission && (
                  <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3, borderRadius: 2.5, fontWeight: 700 }}>
                    Second submission — previously rejected for "{req.rejectionReason || 'Name mismatch'}"
                  </Alert>
                )}

                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }} flexWrap="wrap" gap={1.5}>
                  <Box>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>
                        {req.entityName}
                      </Typography>
                      <Chip label={req.kycType} size="small" variant="outlined" sx={{ fontWeight: 800, fontSize: '0.65rem' }} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 600 }}>
                      Submitted by: {req.submittedBy} ({req.designation})
                    </Typography>
                  </Box>
                  {getSlaChip(req.hoursAgo, req.minutesAgo)}
                </Stack>

                <Divider sx={{ my: 2.5 }} />

                {/* Documents Block */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 1.5 }}>
                    SUBMITTED DOCUMENTS
                  </Typography>
                  <Stack spacing={1.5}>
                    {req.documents?.map((doc, idx) => (
                      <Box key={idx} sx={{ p: 2, border: '1px solid #cbd5e1', borderRadius: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <FilePresentIcon color="primary" />
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{doc.name}</Typography>
                        </Stack>
                        <Button
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => setPdfViewerUrl(doc.url)}
                          sx={{ textTransform: 'none', fontWeight: 800 }}
                        >
                          View Document
                        </Button>
                      </Box>
                    ))}
                    {(!req.documents || req.documents.length === 0) && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No documents uploaded for this verification request.
                      </Typography>
                    )}
                  </Stack>
                </Box>

                {/* Name Match Checker Block */}
                <Box sx={{ p: 2, bgcolor: req.nameMatch ? 'rgba(34, 197, 94, 0.05)' : 'rgba(245, 158, 11, 0.05)', border: '1.5px solid', borderColor: req.nameMatch ? '#bbf7d0' : '#fef3c7', borderRadius: 3, mb: 3.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {req.nameMatch ? <CheckCircleIcon color="success" /> : <WarningIcon sx={{ color: 'warning.main' }} />}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: req.nameMatch ? 'success.main' : 'warning.main' }}>
                      Name match verification
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {req.nameMatchNotes}
                    </Typography>
                  </Box>
                </Box>

                {/* Approving notes or rejection actions history */}
                {req.status === 'APPROVED' && req.reviewedAt && (
                  <Alert severity="success" sx={{ mb: 3, borderRadius: 2.5 }}>
                    Approved on {new Date(req.reviewedAt).toLocaleDateString()}
                  </Alert>
                )}

                {req.status === 'REJECTED' && req.rejectionReason && (
                  <Alert severity="error" sx={{ mb: 3, borderRadius: 2.5 }}>
                    <strong>Rejected Reason:</strong> {req.rejectionReason}
                  </Alert>
                )}

                {/* Actions Row */}
                {(req.status === 'PENDING' || req.status === 'MANUAL_REVIEW') && (
                  <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1}>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => handleApprove(req)}
                      disabled={actionsLoading}
                      sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2 }}
                    >
                      Approve Verification
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => handleReject(req)}
                      disabled={actionsLoading}
                      sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2 }}
                    >
                      Reject Submission
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => handleRequestInfo(req)}
                      disabled={actionsLoading}
                      sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2 }}
                    >
                      Request More Info
                    </Button>
                  </Stack>
                )}

              </CardContent>
            </Card>
          ))
        )}
      </Stack>

      {/* PDF / IMAGE DOCUMENT PREVIEW VIEW DIALOG */}
      <Dialog
        open={pdfViewerUrl !== null}
        onClose={() => setPdfViewerUrl(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, height: '80vh' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800 }}>
          Document Viewer Preview
          <Button onClick={() => setPdfViewerUrl(null)}>Close</Button>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: 'hidden', bgcolor: '#f8fafc' }}>
          {pdfViewerUrl && (pdfViewerUrl.endsWith('.jpg') || pdfViewerUrl.endsWith('.png') || pdfViewerUrl.includes('images.unsplash.com')) ? (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
              <img src={pdfViewerUrl} alt="Document Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            </Box>
          ) : pdfViewerUrl ? (
            <iframe
              src={pdfViewerUrl}
              title="PDF Viewer"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* APPROVAL DIALOG MODAL */}
      <Dialog
        open={showApproveModal}
        onClose={() => !actionsLoading && setShowApproveModal(false)}
        PaperProps={{ sx: { borderRadius: 4, p: 1, maxWidth: 500, width: '100%' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>Approve Verification</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This will mark client {selectedRequest?.recruiter?.company?.name || selectedRequest?.recruiter?.user?.fullName || 'Client'} as fully identity verified. The verified blue badge will display next to their name platform-wide.
          </Typography>
          <TextField
            label="Optional approval note"
            multiline
            rows={3}
            fullWidth
            value={approveNote}
            onChange={(e) => setApproveNote(e.target.value)}
            disabled={actionsLoading}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowApproveModal(false)} disabled={actionsLoading}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleConfirmApprove}
            disabled={actionsLoading}
            sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
          >
            {approveLoading ? <CircularProgress size={20} color="inherit" /> : 'Approve & Notify Client'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* REJECTION DIALOG MODAL */}
      <Dialog
        open={showRejectModal}
        onClose={() => !actionsLoading && setShowRejectModal(false)}
        PaperProps={{ sx: { borderRadius: 4, p: 1, maxWidth: 500, width: '100%' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>Reject Verification</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Please select the reason for rejection. This will be visible to the client and they will be allowed one retry submission.
          </Typography>
          
          <FormControl fullWidth size="small" sx={{ mb: 3 }} disabled={actionsLoading}>
            <InputLabel>Rejection Reason</InputLabel>
            <Select
              value={rejectReasonType}
              label="Rejection Reason"
              onChange={(e) => setRejectReasonType(e.target.value)}
            >
              <MenuItem value="Document unclear">Document unclear / blurry photo</MenuItem>
              <MenuItem value="Name mismatch">Name mismatch on documents</MenuItem>
              <MenuItem value="Invalid document type">Invalid document type</MenuItem>
              <MenuItem value="Suspected fraud">Suspected fraud or account violation</MenuItem>
              <MenuItem value="Other">Other (Specify in note)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Rejection reason note (Required)"
            required
            multiline
            rows={3}
            fullWidth
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            disabled={actionsLoading}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowRejectModal(false)} disabled={actionsLoading}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={!rejectNote.trim() || actionsLoading}
            onClick={handleConfirmReject}
            sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
          >
            {rejectLoading ? <CircularProgress size={20} color="inherit" /> : 'Reject & Notify Client'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* REQUEST INFO DIALOG MODAL */}
      <Dialog
        open={showInfoModal}
        onClose={() => !actionsLoading && setShowInfoModal(false)}
        PaperProps={{ sx: { borderRadius: 4, p: 1, maxWidth: 500, width: '100%' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>Request More Info</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Ask the client for clarification or resubmission. The verification status stays PENDING and doesn't count as a formal rejection.
          </Typography>
          <TextField
            label="Clarification Message (Required)"
            required
            multiline
            rows={4}
            fullWidth
            value={infoMessage}
            onChange={(e) => setInfoMessage(e.target.value)}
            placeholder="e.g. Please provide a copy of your revised certificate showing the updated company address."
            disabled={actionsLoading}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowInfoModal(false)} disabled={actionsLoading}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!infoMessage.trim() || actionsLoading}
            onClick={handleConfirmInfo}
            sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
          >
            {infoLoading ? <CircularProgress size={20} color="inherit" /> : 'Send Clarification Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
