'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  Avatar,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  IconButton,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Menu,
  MenuItem,
  Rating,
  Drawer
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import FilePresentIcon from '@mui/icons-material/FilePresent';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LockIcon from '@mui/icons-material/Lock';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import GavelIcon from '@mui/icons-material/Gavel';

import type { Contract } from '@/types';
import {
  useGetContractByIdQuery,
  useApproveMilestoneMutation,
  useRequestRevisionMutation,
  useFundMilestoneMutation,
  useVerifyFundingMutation,
  useRaiseDisputeMutation,
  useSubmitReviewMutation,
  useSendMessageMutation
} from '@/store/api/contractsApi';
import { useGetPublicSettingsQuery } from '@/store/api/profilesApi';
import { CircularProgress } from '@mui/material';

export default function RecruiterContractDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: dbContract, isLoading, isFetching, refetch } = useGetContractByIdQuery(id, { pollingInterval: 3000 });
  const { data: publicSettings } = useGetPublicSettingsQuery();
  const PLATFORM_FEE_PERCENT = publicSettings?.PLATFORM_FEE_PERCENT ?? 10;
  const REVIEW_PUBLISH_DAYS = publicSettings?.REVIEW_PUBLISH_DAYS ?? 14;
  const DISPUTE_SLA_HOURS = publicSettings?.DISPUTE_SLA_HOURS ?? 48;
  const REVIEW_MIN_RATING = Number(publicSettings?.REVIEW_MIN_RATING) || 1;
  const REVIEW_MAX_RATING = Number(publicSettings?.REVIEW_MAX_RATING) || 5;
  const REVIEW_EDIT_ALLOWED = publicSettings?.REVIEW_EDIT_ALLOWED === true || publicSettings?.REVIEW_EDIT_ALLOWED === 'true';
  const [approveMilestone, { isLoading: isApproving }] = useApproveMilestoneMutation();
  const [requestRevision, { isLoading: isRequestingRevision }] = useRequestRevisionMutation();
  const [fundMilestone, { isLoading: isFunding }] = useFundMilestoneMutation();
  const [verifyFunding] = useVerifyFundingMutation();
  const [raiseDispute, { isLoading: isDisputing }] = useRaiseDisputeMutation();
  const [submitReview, { isLoading: isSubmittingReview }] = useSubmitReviewMutation();
  const [sendMessage] = useSendMessageMutation();

  const contract = dbContract;

  const clientReview = contract?.reviews?.find((r: any) => r.reviewerId === contract.clientId || r.reviewerId === contract.client?.userId);
  const freelancerReview = contract?.reviews?.find((r: any) => r.reviewerId === contract.freelancerId || r.reviewerId === contract.freelancer?.userId);

  // Modal Controls
  const [activeMilestoneId, setActiveMilestoneId] = useState('');
  const [showFundModal, setShowFundModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  // Inputs
  const [revisionNotes, setRevisionNotes] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Drawer Controls
  const [drawerCandidate, setDrawerCandidate] = useState<any | null>(null);

  const milestonesList = (contract?.milestones || []) as any[];

  const allDeliverables = useMemo(() => {
    const list: Array<{ name: string; milestoneTitle: string; url: string; date: string }> = [];
    milestonesList.forEach((m) => {
      (m.submissions || []).forEach((sub: any) => {
        (sub.attachmentUrls || []).forEach((url: string) => {
          const name = url.substring(url.lastIndexOf('/') + 1) || 'Deliverable';
          list.push({
            name,
            milestoneTitle: m.title,
            url,
            date: sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
          });
        });
      });
    });
    return list;
  }, [milestonesList]);

  // Review Form (Client-side review)
  const [clientRating, setClientRating] = useState<number | null>(5);
  const [clientComment, setClientComment] = useState('');
  const [subComm, setSubComm] = useState<number | null>(5);
  const [subQual, setSubQual] = useState<number | null>(5);
  const [clientSubmittedReview, setClientSubmittedReview] = useState(false);

  // Mock chat messages with initial system logs
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  useEffect(() => {
    if (dbContract) {
      const name = dbContract.freelancer?.user?.fullName || 'Freelancer';

      const initialSys = [
        { id: 'sys-1', type: 'SYSTEM', sender: 'SYSTEM', text: `Contract signed by ${name}. ${PLATFORM_FEE_PERCENT}% platform fee locked.`, timestamp: new Date(dbContract.createdAt).toLocaleDateString() },
        { id: 'sys-2', type: 'SYSTEM', sender: 'SYSTEM', text: `Escrow funded: ₹${Number(dbContract.agreedAmount).toLocaleString()} held for Milestones.`, timestamp: new Date(dbContract.createdAt).toLocaleDateString() }
      ];

      const dbMsgs = (dbContract.chatRoom?.messages || []).map((m: any) => {
        const isSystem = m.isSystem || !m.senderId;
        const senderLabel = m.senderId === dbContract.client?.userId ? 'Client' : 'Freelancer';
        return {
          id: m.id,
          type: isSystem ? 'SYSTEM' : 'MESSAGE',
          sender: senderLabel,
          text: m.body,
          timestamp: new Date(m.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        };
      });

      setChatMessages([...initialSys, ...dbMsgs]);

      const clientReview = dbContract.reviews?.find((r: any) => r.reviewerId === dbContract.clientId || r.reviewerId === dbContract.client?.userId);
      if (clientReview) {
        if (!clientSubmittedReview) setClientSubmittedReview(true);
        if (clientRating !== clientReview.rating) setClientRating(clientReview.rating);
        if (clientComment !== clientReview.comment) setClientComment(clientReview.comment || '');
      }
    }
  }, [dbContract, clientSubmittedReview, clientRating, clientComment]);

  const verificationFired = useRef(false);

  useEffect(() => {
    const success = searchParams.get('payment_success');
    const sessionId = searchParams.get('session_id');
    const milestoneId = searchParams.get('milestone_id');
    if (success === 'true' && sessionId && milestoneId) {
      if (verificationFired.current) return;
      verificationFired.current = true;

      verifyFunding({ milestoneId, contractId: id, sessionId })
        .unwrap()
        .then(() => {
          refetch();
          router.replace(`/recruiter/contracts/${id}`);
        })
        .catch((err: any) => {
          console.error('Funding verification failed:', err);
        });
    }
  }, [searchParams, id, verifyFunding, refetch, router]);

  if (isLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading contract details...
          </Typography>
        </Stack>
      </Container>
    );
  }

  if (!contract) {
    return (
      <Container sx={{ py: 12 }}>
        <Card sx={{ maxWidth: 500, mx: 'auto', p: 4, textAlign: 'center', borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          <CardContent>
            <Box sx={{ display: 'inline-flex', p: 2, bgcolor: 'rgba(239, 68, 68, 0.1)', color: 'error.main', borderRadius: '50%', mb: 3 }}>
              <WarningAmberIcon sx={{ fontSize: 50 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5, fontFamily: 'Outfit, sans-serif' }}>
              Contract Not Found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
              We couldn&apos;t locate the contract details for this ID. It may have been archived, or you may not have permission to view it.
            </Typography>
            <Link href="/recruiter/contracts" style={{ textDecoration: 'none' }}>
              <Button variant="contained" color="secondary" startIcon={<ArrowBackIcon />} sx={{ fontWeight: 700, borderRadius: 2.5 }}>
                Back to Contracts Workspace
              </Button>
            </Link>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const formattedStartLong = contract.startedAt
    ? new Date(contract.startedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Not Started';

  const formattedStart = contract.startedAt
    ? new Date(contract.startedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Not Started';

  const formattedEnd = contract.endedAt
    ? new Date(contract.endedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';



  // 1. Escrow Funding Operation
  const handleFundEscrow = async () => {
    if (!contract || !activeMilestoneId) return;
    try {
      setIsTransitioning(true);
      const res = await fundMilestone({ milestoneId: activeMilestoneId, contractId: id }).unwrap();
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      await refetch();
      setShowFundModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTransitioning(false);
    }
  };

  // 2. Escrow Release Payment Operation
  const handleApproveRelease = async () => {
    if (!contract || !activeMilestoneId) return;
    try {
      setIsTransitioning(true);
      await approveMilestone({ milestoneId: activeMilestoneId, contractId: id }).unwrap();
      await refetch();
      setShowReleaseModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTransitioning(false);
    }
  };

  // 3. Request Revision Operation
  const handleRequestRevision = async () => {
    if (!contract || !activeMilestoneId) return;
    try {
      setIsTransitioning(true);
      await requestRevision({ milestoneId: activeMilestoneId, contractId: id, feedback: revisionNotes }).unwrap();
      await refetch();
      setShowRevisionModal(false);
      setRevisionNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsTransitioning(false);
    }
  };

  // 4. Raise Dispute Operation
  const handleRaiseDispute = async () => {
    if (!contract || !activeMilestoneId) return;
    try {
      setIsTransitioning(true);
      await raiseDispute({ milestoneId: activeMilestoneId, contractId: id, reason: disputeReason }).unwrap();
      await refetch();
      setShowDisputeModal(false);
      setDisputeReason('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsTransitioning(false);
    }
  };

  // 4.5 Submit Review Operation
  const handleReviewSubmit = async () => {
    if (!contract) return;
    try {
      setIsTransitioning(true);
      await submitReview({
        contractId: id,
        rating: clientRating ?? 5,
        commRating: subComm ?? 5,
        qualityRating: subQual ?? 5,
        comment: clientComment
      }).unwrap();
      await refetch();
      setClientSubmittedReview(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTransitioning(false);
    }
  };

  // 5. Send Chat Message
  const handleSendChat = async () => {
    if (!chatInput.trim() || !contract?.chatRoom?.id) return;
    try {
      const msgText = chatInput.trim();
      setChatInput('');
      await sendMessage({
        roomId: contract?.chatRoom?.id || '',
        text: msgText,
        contractId: id
      }).unwrap();
    } catch (err) {
      console.error('Send message failed:', err);
    }
  };

  const getMilestoneStatusDisplay = (m: any) => {
    switch (m.status) {
      case 'PENDING':
        return (
          <Button size="small" variant="contained" color="secondary" disabled={isTransitioning} onClick={() => { setActiveMilestoneId(m.id); setShowFundModal(true); }} sx={{ fontWeight: 700 }}>
            {isTransitioning ? 'Updating...' : 'Fund Escrow'}
          </Button>
        );
      case 'FUNDED':
        return <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Waiting for freelancer to deliver</Typography>;
      case 'SUBMITTED':
        return (
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
            <Button size="small" variant="contained" color="success" disabled={isTransitioning} onClick={() => { setActiveMilestoneId(m.id); setShowReleaseModal(true); }} sx={{ fontWeight: 700, px: 2 }}>
              {isTransitioning ? 'Updating...' : 'Approve & Release'}
            </Button>
            <Button size="small" variant="outlined" color="warning" disabled={isTransitioning} onClick={() => { setActiveMilestoneId(m.id); setShowRevisionModal(true); }} sx={{ fontWeight: 700, px: 2 }}>
              Request Revision
            </Button>
            <Button
              size="small"
              variant="text"
              color="error"
              disabled={isTransitioning}
              startIcon={<GavelIcon />}
              onClick={() => {
                setActiveMilestoneId(m.id);
                setShowDisputeModal(true);
              }}
              sx={{ textTransform: 'none', fontWeight: 700, px: 1 }}
            >
              Raise Dispute
            </Button>
          </Stack>
        );
      case 'REVISION_REQUESTED':
        return <Typography variant="caption" color="warning.main" sx={{ fontWeight: 750 }}>{isTransitioning ? 'Updating...' : 'Waiting for resubmission'}</Typography>;
      case 'APPROVED':
        return <Typography variant="caption" color="info.main" sx={{ fontWeight: 750 }}>Payment processing</Typography>;
      case 'PAID':
        return <Typography variant="caption" color="success.main" sx={{ fontWeight: 750 }}>Released — ₹{(Number(m.amount) * (1 - (PLATFORM_FEE_PERCENT / 100))).toLocaleString()} (after {PLATFORM_FEE_PERCENT}% fee)</Typography>;
      case 'DISPUTED':
        return <Typography variant="caption" color="error.main" sx={{ fontWeight: 750 }}>Under admin review</Typography>;
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 4 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Link href="/recruiter/contracts" style={{ textDecoration: 'none' }}>
            <IconButton sx={{ border: '1px solid #cbd5e1' }}>
              <ArrowBackIcon />
            </IconButton>
          </Link>
          <Box>
            <Link href={`/recruiter/jobs/${contract.jobId}`} style={{ textDecoration: 'none' }}>
              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700, '&:hover': { textDecoration: 'underline' } }}>
                Originating Job Posting: {contract.job?.title}
              </Typography>
            </Link>
            <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>
              Milestone Escrow Workspace
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {(contract.status || '').toUpperCase() !== 'COMPLETED' && 
           (contract.status || '').toUpperCase() !== 'CANCELLED' && 
           (contract.status || '').toUpperCase() !== 'DISPUTED' && (
            <Button
              variant="text"
              color="error"
              startIcon={<GavelIcon />}
              onClick={() => {
                setActiveMilestoneId(milestonesList.find(m => m.status === 'SUBMITTED' || m.status === 'REVISION_REQUESTED')?.id || 'm2');
                setShowDisputeModal(true);
              }}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Raise Dispute
            </Button>
          )}
        </Box>
      </Stack>

      {/* Main Grid Workspace */}
      <Grid container spacing={4}>
        {/* Left column: milestones timeline & submissions */}
        <Grid item xs={12} md={7.5}>
          <Stack spacing={4}>
            {/* Header statistics summary */}
            <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>CONTRACT STATUS</Typography>
                    <Chip label={contract.status} size="small" color={contract.status === 'COMPLETED' ? 'success' : 'primary'} sx={{ fontWeight: 800, mt: 0.5 }} />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>AGREED BUDGET</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.5 }}>₹{parseInt(contract.agreedAmount || '420000').toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>PLATFORM FEE</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.5 }}>{PLATFORM_FEE_PERCENT}% (deducted from payout)</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>STARTED ON</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.5 }}>{formattedStartLong}</Typography>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap">
                  <Typography variant="caption" color="text.secondary">
                    Started: <strong>{formattedStart}</strong> · Target End: <strong>{formattedEnd}</strong>
                  </Typography>
                  {(contract.status || '').toUpperCase() !== 'COMPLETED' && 
                   (contract.status || '').toUpperCase() !== 'CANCELLED' && 
                   (contract.status || '').toUpperCase() !== 'DISPUTED' && (
                    <Button
                      variant="text"
                      color="error"
                      startIcon={<GavelIcon />}
                      onClick={() => {
                        setActiveMilestoneId(milestonesList.find(m => m.status === 'SUBMITTED' || m.status === 'REVISION_REQUESTED')?.id || 'm2');
                        setShowDisputeModal(true);
                      }}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Raise Dispute
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Milestones timeline */}
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Escrow Milestone Timeline</Typography>
            {milestonesList.map((m, idx) => (
              <Card key={m.id} sx={{ borderRadius: 4, border: '1px solid #e2e8f0', borderLeft: `5px solid ${m.status === 'PAID' ? '#10b981' : '#3b82f6'}`, boxShadow: 'none' }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {idx + 1}. {m.title}
                      </Typography>
                      {m.dueDate && (
                        <Typography variant="caption" color="text.secondary">
                          Due by: {new Date(m.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Typography>
                      )}
                    </Box>
                    <Chip label={m.status} size="small" variant="outlined" sx={{ fontWeight: 800 }} />
                  </Stack>

                  {m.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      {m.description}
                    </Typography>
                  )}

                  {/* Submission History segment */}
                  {m.submissions?.map((sub: any) => (
                    <Box key={sub.id} sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.01)', border: '1px solid #cbd5e1', borderRadius: 3, mb: 3 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 1 }}>
                        FREELANCER SUBMISSION (Version {sub.versionNo})
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1.5 }}>
                        &quot;{sub.note || 'No submission notes provided.'}&quot;
                      </Typography>
                      {sub.attachmentUrls?.map((url: string, uIdx: number) => {
                        const filename = url.substring(url.lastIndexOf('/') + 1) || `attachment_${uIdx + 1}`;
                        return (
                          <Button
                            key={uIdx}
                            component="a"
                            href={url}
                            target="_blank"
                            size="small"
                            variant="outlined"
                            startIcon={<FileDownloadIcon />}
                            sx={{ fontWeight: 700, mr: 1, mb: 1 }}
                          >
                            {filename}
                          </Button>
                        );
                      })}
                    </Box>
                  ))}

                  <Divider sx={{ my: 2, borderStyle: 'dashed' }} />
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700 }}>
                        MILESTONE VALUE
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900 }}>
                        ₹{parseInt(m.amount).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
                      {getMilestoneStatusDisplay(m)}
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Grid>

        {/* Right column: Sticky Chat panel */}
        <Grid item xs={12} md={4.5}>
          <Stack spacing={3} sx={{ position: 'sticky', top: 90 }}>
            {/* Freelancer info */}
            <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    sx={{ bgcolor: 'secondary.light', color: 'secondary.dark', fontWeight: 800, cursor: 'pointer' }}
                    onClick={() => setDrawerCandidate(contract.freelancer)}
                  >
                    {contract.freelancer?.user?.fullName?.[0] || 'A'}
                  </Avatar>
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 800, color: 'text.primary', cursor: 'pointer', '&:hover': { color: 'primary.main', textDecoration: 'underline' } }}
                      onClick={() => setDrawerCandidate(contract.freelancer)}
                    >
                      {contract.freelancer?.user?.fullName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {contract.freelancer?.headline || 'Freelancer'}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Sticky chatroom */}
            <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none', height: 400, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0', bgcolor: 'rgba(0,0,0,0.01)' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Project Chat Feed</Typography>
              </Box>
              <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {chatMessages.map((msg) => {
                  if (msg.type === 'SYSTEM') {
                    return (
                      <Box key={msg.id} sx={{ alignSelf: 'center', p: 1, px: 2, bgcolor: 'rgba(15, 23, 42, 0.05)', borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', textAlign: 'center' }}>
                          ℹ️ {msg.text} · {msg.timestamp}
                        </Typography>
                      </Box>
                    );
                  }
                  const isMe = msg.sender === 'Client';
                  return (
                    <Stack
                      key={msg.id}
                      direction="row"
                      sx={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        flexDirection: isMe ? 'row-reverse' : 'row',
                        maxWidth: '85%',
                        gap: 1.5,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          fontSize: '0.65rem',
                          bgcolor: msg.sender === 'Client' ? 'teal' : 'secondary.main',
                        }}
                      >
                        {msg.sender[0]}
                      </Avatar>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: isMe ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                          bgcolor: isMe ? 'secondary.main' : '#ffffff',
                          color: isMe ? '#ffffff' : 'text.primary',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                          border: isMe ? 'none' : '1px solid #e2e8f0',
                        }}
                      >
                        <Typography variant="body2" sx={{ lineHeight: 1.4 }}>{msg.text}</Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.625rem', mt: 0.5, display: 'block', textAlign: 'right', opacity: 0.8 }}>
                          {msg.timestamp}
                        </Typography>
                      </Box>
                    </Stack>
                  );
                })}
              </Box>
              <Box sx={{ p: 3, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 1 }}>
                {(() => {
                  const isClosed = ['COMPLETED', 'CANCELLED', 'TERMINATED'].includes(contract.status);
                  return (
                    <>
                      <TextField
                        placeholder={isClosed ? `Chat locked - Contract ${contract.status.toLowerCase()}` : "Send instructions/chat..."}
                        size="small"
                        fullWidth
                        disabled={isClosed}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isClosed && handleSendChat()}
                      />
                      <IconButton color="primary" onClick={handleSendChat} disabled={isClosed}>
                        <SendIcon />
                      </IconButton>
                    </>
                  );
                })()}
              </Box>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Footer Area: Payments Table & Reviews */}
      <Divider sx={{ my: 6 }} />

      <Stack spacing={6}>
        {/* Deliverables section */}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Aggregated Project Deliverables</Typography>
          <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e2e8f0', borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.01)' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Deliverable Name</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Associated Milestone</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Date Uploaded</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allDeliverables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                      No deliverables uploaded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  allDeliverables.map((d, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ fontWeight: 700 }}>{d.name}</TableCell>
                      <TableCell>{d.milestoneTitle}</TableCell>
                      <TableCell>{d.date}</TableCell>
                      <TableCell>
                        <Button
                          component="a"
                          href={d.url}
                          target="_blank"
                          size="small"
                          startIcon={<FileDownloadIcon />}
                          sx={{ fontWeight: 700 }}
                        >
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Payment Summary Table */}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Payment Summary Table</Typography>
          <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e2e8f0', borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.01)' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Milestone</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Funded</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Approved</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Released</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Fee ({PLATFORM_FEE_PERCENT}%)</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Net to Freelancer</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {milestonesList.map((m, idx) => {
                  const milestoneAmountVal = parseFloat(m.amount || '0');
                  return (
                    <TableRow key={m.id}>
                      <TableCell sx={{ fontWeight: 700 }}>{idx + 1}. {m.title}</TableCell>
                      <TableCell>
                        {m.escrow?.fundedAt
                          ? new Date(m.escrow.fundedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'
                        }
                      </TableCell>
                      <TableCell>
                        {m.approvedAt
                          ? new Date(m.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'
                        }
                      </TableCell>
                      <TableCell>
                        {m.escrow?.releasedAt
                          ? new Date(m.escrow.releasedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'
                        }
                      </TableCell>
                      <TableCell>₹{(milestoneAmountVal * (PLATFORM_FEE_PERCENT / 100)).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>₹{(milestoneAmountVal * (1 - (PLATFORM_FEE_PERCENT / 100))).toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Double-Blind Reviews Section (Activated when Contract status is COMPLETED) */}
        {contract.status === 'COMPLETED' && (
          <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none', p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Double-Blind Contract Reviews</Typography>

            {!clientSubmittedReview ? (
              <Stack spacing={3} sx={{ maxWidth: 600 }}>
                <Alert severity="info" sx={{ fontWeight: 600 }}>
                  Submit your review of the freelancer. Both reviews will be unlocked and shown side-by-side once both parties submit or after {REVIEW_PUBLISH_DAYS} days.
                </Alert>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Overall Rating</Typography>
                  <Rating value={clientRating} max={REVIEW_MAX_RATING} onChange={(_, val) => setClientRating(val)} />
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>Communication Quality</Typography>
                    <Rating size="small" value={subComm} onChange={(_, val) => setSubComm(val)} />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>Deliverables Quality</Typography>
                    <Rating size="small" value={subQual} onChange={(_, val) => setSubQual(val)} />
                  </Grid>
                </Grid>
                <TextField
                  label="Review Comments"
                  multiline
                  rows={3}
                  fullWidth
                  value={clientComment}
                  onChange={(e) => setClientComment(e.target.value)}
                  placeholder={`Describe your experience collaborating with ${contract.freelancer?.user?.fullName || 'Freelancer'}...`}
                />
                <Button variant="contained" color="secondary" onClick={handleReviewSubmit} disabled={isSubmittingReview || isTransitioning} sx={{ fontWeight: 750, alignSelf: 'flex-start' }}>
                  {isTransitioning ? 'Submitting...' : 'Submit Review'}
                </Button>
              </Stack>
            ) : (
              <Box>
                {!freelancerReview ? (
                  <Box>
                    <Alert severity="warning" sx={{ fontWeight: 600, mb: REVIEW_EDIT_ALLOWED ? 1.5 : 0 }}>
                      🔒 You have submitted your review. Feedback will be revealed once the freelancer completes their review.
                    </Alert>
                    {REVIEW_EDIT_ALLOWED && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="secondary"
                        onClick={() => setClientSubmittedReview(false)}
                        sx={{ fontWeight: 700, textTransform: 'none' }}
                      >
                        Edit Submitted Review
                      </Button>
                    )}
                  </Box>
                ) : (
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <Card sx={{ bgcolor: 'rgba(0,0,0,0.01)', border: '1px dashed #cbd5e1', boxShadow: 'none', p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Your Review of Freelancer</Typography>
                        <Rating value={clientReview?.rating ?? clientRating ?? 5} readOnly size="small" sx={{ mb: 1 }} />
                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                          &quot;{clientReview?.comment || clientComment || 'Great collaborating with you!'}&quot;
                        </Typography>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Card sx={{ bgcolor: 'rgba(0,0,0,0.01)', border: '1px dashed #cbd5e1', boxShadow: 'none', p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Freelancer&apos;s Review of Client</Typography>
                        <Rating value={freelancerReview?.rating ?? 5} readOnly size="small" sx={{ mb: 1 }} />
                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                          &quot;{freelancerReview?.comment || 'Waiting for freelancer to submit review. Details will be shown once both parties complete.'}&quot;
                        </Typography>
                      </Card>
                    </Grid>
                  </Grid>
                )}
              </Box>
            )}
          </Card>
        )}
      </Stack>

      {/* Fund Escrow Modal */}
      <Dialog open={showFundModal} onClose={() => setShowFundModal(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Deposit Milestone Escrow</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 3 }}>
            Funding <strong>₹{(milestonesList.find(m => m.id === activeMilestoneId)?.amount || 140000).toLocaleString()}</strong> into escrow. This will be held securely by the platform until you approve the delivered milestone deliverables.
          </Typography>
          <TextField
            select
            label="Payment Method"
            size="small"
            fullWidth
            defaultValue="saved-card"
          >
            <MenuItem value="saved-card">HDFC Debit Card (ending in 8890)</MenuItem>
            <MenuItem value="upi">UPI (Bhavik@paytm)</MenuItem>
            <MenuItem value="netbanking">NetBanking (ICICI)</MenuItem>
          </TextField>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, fontWeight: 700 }}>
            Fee Note: A {PLATFORM_FEE_PERCENT}% platform fee will be deducted from the freelancer&apos;s payout upon escrow release — you fund the full milestone gross amount.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setShowFundModal(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={handleFundEscrow} disabled={isFunding || isTransitioning} sx={{ fontWeight: 700 }}>
            Confirm &amp; Pay
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approve & Release Payout Modal */}
      <Dialog open={showReleaseModal} onClose={() => setShowReleaseModal(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Approve Milestone Deliverables</DialogTitle>
        <DialogContent>
          {(() => {
            const amount = milestonesList.find(m => m.id === activeMilestoneId)?.amount || 140000;
            return (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                Approving this release will send <strong>₹{(amount * (1 - (PLATFORM_FEE_PERCENT / 100))).toLocaleString()}</strong> to {contract.freelancer?.user?.fullName || 'Freelancer'} (representing gross ₹{amount.toLocaleString()} minus {PLATFORM_FEE_PERCENT}% platform fee of ₹{(amount * (PLATFORM_FEE_PERCENT / 100)).toLocaleString()}). This transaction cannot be reversed once confirmed.
              </Typography>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setShowReleaseModal(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleApproveRelease} disabled={isApproving || isTransitioning} sx={{ fontWeight: 700 }}>
            Confirm Release
          </Button>
        </DialogActions>
      </Dialog>

      {/* Request Revision Modal */}
      <Dialog open={showRevisionModal} onClose={() => setShowRevisionModal(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Request Milestone Revision</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 2.5 }}>
            Explain what changes or additions are required before you can release this escrow milestone payout.
          </Typography>
          <TextField
            label="Feedback Description"
            multiline
            rows={4}
            fullWidth
            required
            value={revisionNotes}
            onChange={(e) => setRevisionNotes(e.target.value)}
            placeholder="Write details of what needs modification..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setShowRevisionModal(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleRequestRevision} disabled={isRequestingRevision || isTransitioning || !revisionNotes.trim()} sx={{ fontWeight: 700 }}>
            Submit Revision Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Raise Dispute Modal */}
      <Dialog open={showDisputeModal} onClose={() => setShowDisputeModal(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>File Project Dispute</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 2.5 }}>
            Raise a dispute to freeze all milestone escrow funds. An admin will be assigned to review the submissions, reviews, and chat context within {DISPUTE_SLA_HOURS} hours.
          </Typography>
          <TextField
            label="Dispute Details"
            multiline
            rows={4}
            fullWidth
            required
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="Provide context and details of the disagreement..."
            helperText={`${disputeReason.length}/1000 characters (minimum 20 characters required)`}
            error={disputeReason.length > 0 && disputeReason.length < 20}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setShowDisputeModal(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleRaiseDispute} disabled={isDisputing || isTransitioning || disputeReason.trim().length < 20} sx={{ fontWeight: 700 }}>
            File Dispute &amp; Freeze Escrow
          </Button>
        </DialogActions>
      </Dialog>
      {/* Freelancer Profile Drawer */}
      <Drawer
        anchor="right"
        open={Boolean(drawerCandidate)}
        onClose={() => setDrawerCandidate(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 3.5 } }}
        sx={{ zIndex: 1400 }}
      >
        {drawerCandidate && (
          <Stack spacing={3.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>
                Freelancer Profile
              </Typography>
              <IconButton onClick={() => setDrawerCandidate(null)}><CloseIcon /></IconButton>
            </Stack>

            <Divider />

            <Stack direction="row" spacing={2.5} alignItems="center">
              <Avatar sx={{ width: 64, height: 64, bgcolor: 'secondary.light', color: 'secondary.dark', fontWeight: 800 }}>
                {drawerCandidate.user?.fullName?.[0]}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{drawerCandidate.user?.fullName}</Typography>
                <Typography variant="body2" color="text.secondary">{drawerCandidate.headline}</Typography>
                <Typography variant="caption" color="text.secondary">{drawerCandidate.location}</Typography>
              </Box>
            </Stack>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 1 }}>
                ABOUT / BIO
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                {drawerCandidate.summary}
              </Typography>
            </Box>

            <Stack direction="row" spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">HOURLY RATE</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>₹{parseInt(drawerCandidate.portfolio?.hourlyRate || '3000').toLocaleString()}/hr</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">AVAILABILITY</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>Available Immediately</Typography>
              </Box>
            </Stack>

            <Divider />

            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Skills &amp; Proficiencies</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {drawerCandidate.skills?.map((cs: any) => (
                <Chip key={cs.id} label={`${cs.skill?.name || 'Skill'} · ${cs.proficiency}★`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
              ))}
            </Box>

            <Divider />

            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Completed Projects</Typography>
            <Stack spacing={2}>
              {drawerCandidate.portfolio?.projects?.map((proj: any) => (
                <Box key={proj.id} sx={{ p: 2, border: '1px solid #f1f5f9', borderRadius: 3, bgcolor: '#f8fafc' }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, mb: 0.5 }}>{proj.title}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Role: {proj.role}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>{proj.description}</Typography>
                </Box>
              ))}
            </Stack>
          </Stack>
        )}
      </Drawer>
    </Container>
  );
}
