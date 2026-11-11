'use client';

import React, { useState, useEffect, useRef, use, useMemo } from 'react';
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
  Avatar,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  IconButton,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Drawer,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import FilePresentIcon from '@mui/icons-material/FilePresent';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import GavelIcon from '@mui/icons-material/Gavel';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

import type { Contract } from '@/types';
import {
  useGetContractByIdQuery,
  useSubmitMilestoneMutation,
  useRaiseDisputeMutation,
  useSubmitReviewMutation,
  useSendMessageMutation
} from '@/store/api/contractsApi';
import { useGetPublicSettingsQuery } from '@/store/api/profilesApi';

export default function CandidateContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const { data: dbContract, isLoading, isFetching, refetch } = useGetContractByIdQuery(id, { pollingInterval: 3000 });
  const { data: publicSettings } = useGetPublicSettingsQuery();
  const PLATFORM_FEE_PERCENT = publicSettings?.PLATFORM_FEE_PERCENT ?? 10;
  const REVIEW_PUBLISH_DAYS = publicSettings?.REVIEW_PUBLISH_DAYS ?? 14;
  const DISPUTE_SLA_HOURS = publicSettings?.DISPUTE_SLA_HOURS ?? 48;
  const REVIEW_MIN_RATING = Number(publicSettings?.REVIEW_MIN_RATING) || 1;
  const REVIEW_MAX_RATING = Number(publicSettings?.REVIEW_MAX_RATING) || 5;
  const REVIEW_EDIT_ALLOWED = publicSettings?.REVIEW_EDIT_ALLOWED === true || publicSettings?.REVIEW_EDIT_ALLOWED === 'true';
  const [submitMilestone, { isLoading: isSubmitting }] = useSubmitMilestoneMutation();
  const [raiseDispute, { isLoading: isDisputing }] = useRaiseDisputeMutation();
  const [submitReview, { isLoading: isSubmittingReview }] = useSubmitReviewMutation();
  const [sendMessage] = useSendMessageMutation();

  const contract = dbContract;

  const clientReview = contract?.reviews?.find((r: any) => r.reviewerId === contract.clientId || r.reviewerId === contract.client?.userId);
  const freelancerReview = contract?.reviews?.find((r: any) => r.reviewerId === contract.freelancerId || r.reviewerId === contract.freelancer?.userId);

  // Modal Controls
  const [activeMilestoneId, setActiveMilestoneId] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  // Inputs
  const [submitNote, setSubmitNote] = useState('');
  const [submitFiles, setSubmitFiles] = useState('');
  const [submitFileBase64, setSubmitFileBase64] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Review states
  const [candidateRating, setCandidateRating] = useState<number | null>(5);
  const [candidateComment, setCandidateComment] = useState('');
  const [candidateSubmittedReview, setCandidateSubmittedReview] = useState(false);

  // Drawer Controls
  const [drawerClient, setDrawerClient] = useState<any | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<any[]>([]);

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

  useEffect(() => {
    if (dbContract) {
      const clientName = dbContract.client?.user?.fullName || 'Client';
      
      const initialSys = [
        { id: 'sys-1', type: 'SYSTEM', sender: 'SYSTEM', text: `Contract created with ${clientName}. ${PLATFORM_FEE_PERCENT}% platform fee locked.`, timestamp: new Date(dbContract.createdAt).toLocaleDateString() },
        { id: 'sys-2', type: 'SYSTEM', sender: 'SYSTEM', text: `Milestone escrow deposits will be managed securely by the platform.`, timestamp: new Date(dbContract.createdAt).toLocaleDateString() }
      ];

      const dbMsgs = (dbContract.chatRoom?.messages || []).map((m: any) => {
        const isSystem = m.isSystem || !m.senderId;
        const senderLabel = m.senderId === dbContract.freelancer?.userId ? 'Freelancer' : 'Client';
        return {
          id: m.id,
          type: isSystem ? 'SYSTEM' : 'MESSAGE',
          sender: senderLabel,
          text: m.body,
          timestamp: new Date(m.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        };
      });

      setChatMessages([...initialSys, ...dbMsgs]);

      const freelancerRev = dbContract.reviews?.find((r: any) => r.reviewerId === dbContract.freelancerId || r.reviewerId === dbContract.freelancer?.userId);
      if (freelancerRev) {
        if (!candidateSubmittedReview) setCandidateSubmittedReview(true);
        if (candidateRating !== freelancerRev.rating) setCandidateRating(freelancerRev.rating);
        if (candidateComment !== freelancerRev.comment) setCandidateComment(freelancerRev.comment || '');
      }
    }
  }, [dbContract, candidateSubmittedReview, candidateRating, candidateComment]);

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

  const handleSubmitMilestoneAction = async () => {
    if (!contract || !activeMilestoneId) return;
    try {
      setIsTransitioning(true);
      const secureUrl = `https://bivio-uploads.s3.amazonaws.com/${submitFiles.replace(/[^a-zA-Z0-9._-]/g, '')}`;
      await submitMilestone({
        milestoneId: activeMilestoneId,
        contractId: id,
        note: submitNote.trim(),
        attachmentUrls: [secureUrl],
        fileBase64: submitFileBase64 || undefined,
        fileName: submitFiles || undefined
      }).unwrap();
      await refetch();
      setShowSubmitModal(false);
      setSubmitNote('');
      setSubmitFileBase64(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleRaiseDisputeAction = async () => {
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

  const handleReviewSubmit = async () => {
    if (!contract) return;
    try {
      setIsTransitioning(true);
      await submitReview({
        contractId: id,
        rating: candidateRating || 5,
        comment: candidateComment.trim()
      }).unwrap();
      await refetch();
      setCandidateSubmittedReview(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTransitioning(false);
    }
  };

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
            <Button variant="contained" color="secondary" onClick={() => router.push('/contracts')} startIcon={<ArrowBackIcon />} sx={{ fontWeight: 700, borderRadius: 2.5 }}>
              Back to Contracts Workspace
            </Button>
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

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Back CTA */}
      <Box sx={{ mb: 4 }}>
        <Button
          variant="text"
          color="secondary"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/contracts')}
          sx={{ fontWeight: 750, textTransform: 'none', px: 0, mb: 2 }}
        >
          Back to Contracts
        </Button>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: 'Outfit, sans-serif', color: 'secondary.main', mb: 0.5 }}>
              {contract.job?.title || 'Freelance Engagement'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              CONTRACT ID: {contract.id} · STARTED ON: {formattedStartLong}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {contract.status !== 'COMPLETED' && contract.status !== 'CANCELLED' && contract.status !== 'DISPUTED' && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<GavelIcon />}
                onClick={() => {
                  const targetMilestone = milestonesList.find(m => m.status === 'FUNDED' || m.status === 'SUBMITTED' || m.status === 'REVISION_REQUESTED');
                  if (targetMilestone) {
                    setActiveMilestoneId(targetMilestone.id);
                    setShowDisputeModal(true);
                  }
                }}
                sx={{ fontWeight: 750, textTransform: 'none', borderRadius: 2.5 }}
              >
                Raise Dispute
              </Button>
            )}
            <Chip label={contract.status} size="medium" sx={{ fontWeight: 800, bgcolor: 'teal', color: '#fff', px: 1.5 }} />
          </Stack>
        </Stack>
      </Box>

      <Grid container spacing={4}>
        {/* Left column: Milestones, Details */}
        <Grid item xs={12} md={7.5}>
          <Stack spacing={4}>
            {/* Financial Status Summary */}
            <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  <Grid item xs={6} sm={3.5}>
                    <Typography variant="caption" color="text.secondary" display="block">BUDGET</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>₹{parseInt(contract.agreedAmount || '0').toLocaleString('en-IN')}</Typography>
                    <Typography variant="caption" color="text.secondary">Gross amount</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3.5}>
                    <Typography variant="caption" color="text.secondary" display="block">NET PAYOUT</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'teal' }}>₹{(parseInt(contract.agreedAmount || '0') * (1 - (PLATFORM_FEE_PERCENT / 100))).toLocaleString('en-IN')}</Typography>
                    <Typography variant="caption" color="text.secondary">Minus {PLATFORM_FEE_PERCENT}% platform fee</Typography>
                  </Grid>
                  <Grid item xs={6} sm={2.5}>
                    <Typography variant="caption" color="text.secondary" display="block">STARTED</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5 }}>{formattedStart}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={2.5}>
                    <Typography variant="caption" color="text.secondary" display="block">COMPLETED</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5 }}>{formattedEnd}</Typography>
                  </Grid>
                </Grid>
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

                  {/* Submissions */}
                  {m.submissions?.map((sub: any) => (
                    <Box key={sub.id} sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.01)', border: '1px solid #cbd5e1', borderRadius: 3, mb: 3 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 1 }}>
                        YOUR DELIVERABLES SUBMISSION (Version {sub.versionNo})
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1.5 }}>
                        &quot;{sub.note || 'No notes provided.'}&quot;
                      </Typography>
                      {sub.attachmentUrls?.map((url: string, uIdx: number) => {
                        const filename = url.substring(url.lastIndexOf('/') + 1) || `attachment_${uIdx + 1}`;
                        return (
                          <Button key={uIdx} component="a" href={url} target="_blank" size="small" variant="outlined" startIcon={<FileDownloadIcon />} sx={{ fontWeight: 700, mr: 1, mb: 1 }}>
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
                      {m.status === 'FUNDED' && (
                        <Button
                          variant="contained"
                          color="secondary"
                          disabled={isTransitioning}
                          onClick={() => { setActiveMilestoneId(m.id); setShowSubmitModal(true); }}
                          sx={{ fontWeight: 700 }}
                        >
                          {isTransitioning ? 'Updating...' : 'Submit Deliverables'}
                        </Button>
                      )}
                      {m.status === 'REVISION_REQUESTED' && (
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="contained"
                            color="secondary"
                            disabled={isTransitioning}
                            onClick={() => { setActiveMilestoneId(m.id); setShowSubmitModal(true); }}
                            sx={{ fontWeight: 700 }}
                          >
                            {isTransitioning ? 'Updating...' : 'Resubmit Deliverables'}
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            disabled={isTransitioning}
                            startIcon={<GavelIcon />}
                            onClick={() => { setActiveMilestoneId(m.id); setShowDisputeModal(true); }}
                            sx={{ fontWeight: 700 }}
                          >
                            File Dispute
                          </Button>
                        </Stack>
                      )}
                      {m.status === 'SUBMITTED' && (
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                          Awaiting Client Approval
                        </Typography>
                      )}
                      {m.status === 'PAID' && (
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'success.main' }}>
                          Escrow Funds Released
                        </Typography>
                      )}
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
            {/* Recruiter info */}
            <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    src={contract.client?.user?.profileImage || undefined}
                    sx={{ bgcolor: 'secondary.light', color: 'secondary.dark', fontWeight: 800, cursor: 'pointer' }}
                    onClick={() => setDrawerClient(contract.client)}
                  >
                    {contract.client?.user?.fullName?.[0] || 'C'}
                  </Avatar>
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 800, color: 'text.primary', cursor: 'pointer', '&:hover': { color: 'primary.main', textDecoration: 'underline' } }}
                      onClick={() => setDrawerClient(contract.client)}
                    >
                      {contract.client?.user?.fullName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {contract.client?.designation || 'Client Recruiter'}
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
                  const isMe = msg.sender === 'Freelancer';
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
                          bgcolor: isMe ? 'secondary.main' : 'teal',
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

        {/* Double-Blind Reviews Section */}
        {contract.status === 'COMPLETED' && (
          <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none', p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Double-Blind Contract Reviews</Typography>

            {!candidateSubmittedReview ? (
              <Stack spacing={3} sx={{ maxWidth: 600 }}>
                <Alert severity="info" sx={{ fontWeight: 600 }}>
                  Submit your review of the client. Both reviews will be unlocked and shown side-by-side once both parties submit or after {REVIEW_PUBLISH_DAYS} days.
                </Alert>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Overall Rating</Typography>
                  <Rating value={candidateRating} max={REVIEW_MAX_RATING} onChange={(_, val) => setCandidateRating(val)} />
                </Box>
                <TextField
                  label="Review Comments"
                  multiline
                  rows={3}
                  fullWidth
                  value={candidateComment}
                  onChange={(e) => setCandidateComment(e.target.value)}
                  placeholder={`Describe your experience collaborating with ${contract.client?.user?.fullName || 'Client'}...`}
                />
                <Button variant="contained" color="secondary" onClick={handleReviewSubmit} disabled={isSubmittingReview || isTransitioning} sx={{ fontWeight: 750, alignSelf: 'flex-start' }}>
                  {isTransitioning ? 'Submitting...' : 'Submit Review'}
                </Button>
              </Stack>
            ) : (
              <Box>
                {!clientReview ? (
                  <Box>
                    <Alert severity="warning" sx={{ fontWeight: 600, mb: REVIEW_EDIT_ALLOWED ? 1.5 : 0 }}>
                      🔒 You have submitted your review. Feedback will be revealed once the client completes their review.
                    </Alert>
                    {REVIEW_EDIT_ALLOWED && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="secondary"
                        onClick={() => setCandidateSubmittedReview(false)}
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
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Your Review of Client</Typography>
                        <Rating value={candidateRating ?? 5} readOnly size="small" sx={{ mb: 1 }} />
                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                          &quot;{candidateComment || 'Excellent working relationship!'}&quot;
                        </Typography>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Card sx={{ bgcolor: 'rgba(0,0,0,0.01)', border: '1px dashed #cbd5e1', boxShadow: 'none', p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Client&apos;s Review of You</Typography>
                        <Rating value={clientReview?.rating ?? 5} readOnly size="small" sx={{ mb: 1 }} />
                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                          &quot;{clientReview?.comment || 'Waiting for client to submit review. Details will be shown once both parties complete.'}&quot;
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

      {/* Submit deliverables modal */}
      <Dialog open={showSubmitModal} onClose={() => setShowSubmitModal(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Submit Milestone Deliverables</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 2.5 }}>
            Submit your finished deliverables and code repository files for approval.
          </Typography>
          <Stack spacing={2.5}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setSubmitFiles(file.name);
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setSubmitFileBase64(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <Paper
              variant="outlined"
              onClick={() => fileInputRef.current?.click()}
              sx={{
                p: 3.5,
                borderStyle: 'dashed',
                borderColor: submitFiles ? 'success.main' : 'secondary.main',
                bgcolor: 'rgba(0,0,0,0.01)',
                textAlign: 'center',
                cursor: 'pointer',
                borderRadius: 3,
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: 'rgba(0,0,0,0.03)',
                  borderColor: 'primary.main'
                }
              }}
            >
              <CloudUploadIcon sx={{ fontSize: 40, color: submitFiles ? 'success.main' : 'text.secondary', mb: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {submitFiles ? 'File Selected' : 'Click to Upload Deliverable'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {submitFiles ? submitFiles : 'ZIP, TAR, PDF or documents up to 50MB'}
              </Typography>
            </Paper>

            <TextField
              label="Or enter File URL/Name manually"
              size="small"
              fullWidth
              value={submitFiles}
              onChange={(e) => setSubmitFiles(e.target.value)}
              placeholder="e.g. project_submission.zip"
            />

            <TextField
              label="Submission Note"
              multiline
              rows={4}
              fullWidth
              required
              value={submitNote}
              onChange={(e) => setSubmitNote(e.target.value)}
              placeholder="Provide notes, local testing confirmations, etc..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setShowSubmitModal(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={handleSubmitMilestoneAction} disabled={isSubmitting || isTransitioning || !submitFiles.trim() || !submitNote.trim()} sx={{ fontWeight: 700 }}>
            Confirm &amp; Submit
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
          <Button variant="contained" color="error" onClick={handleRaiseDisputeAction} disabled={isDisputing || isTransitioning || disputeReason.trim().length < 20} sx={{ fontWeight: 700 }}>
            File Dispute &amp; Freeze Escrow
          </Button>
        </DialogActions>
      </Dialog>

      {/* Client Profile Drawer */}
      <Drawer
        anchor="right"
        open={Boolean(drawerClient)}
        onClose={() => setDrawerClient(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 3.5 } }}
        sx={{ zIndex: 1400 }}
      >
        {drawerClient && (
          <Stack spacing={3.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>
                Client Profile
              </Typography>
              <IconButton onClick={() => setDrawerClient(null)}>
                <CloseIcon />
              </IconButton>
            </Stack>

            <Stack spacing={2} alignItems="center">
              <Avatar
                src={drawerClient.user?.profileImage || undefined}
                sx={{ width: 90, height: 90, bgcolor: 'secondary.light', color: 'secondary.dark', fontSize: '2rem', fontWeight: 800 }}
              >
                {drawerClient.user?.fullName?.[0] || 'C'}
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                {drawerClient.user?.fullName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {drawerClient.designation || 'Client Recruiter'}
              </Typography>
            </Stack>

            <Divider />

            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Account &amp; History</Typography>
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Registered email</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{drawerClient.user?.email || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Payment Method Verified</Typography>
                <Chip
                  label={drawerClient.paymentMethodVerified ? 'VERIFIED' : 'NOT VERIFIED'}
                  color={drawerClient.paymentMethodVerified ? 'success' : 'default'}
                  size="small"
                  sx={{ fontWeight: 800, mt: 0.5 }}
                />
              </Box>
            </Stack>
          </Stack>
        )}
      </Drawer>
    </Container>
  );
}
