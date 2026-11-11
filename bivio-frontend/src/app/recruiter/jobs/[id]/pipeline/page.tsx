'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Stack,
  Button,
  Grid,
  Chip,
  Avatar,
  TextField,
  Slider,
  MenuItem,
  IconButton,
  Alert,
  Snackbar,
  Select,
  Paper,
  Tooltip,
  Divider,
  Drawer,
  Checkbox,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControlLabel,
  Switch,
  LinearProgress,
  CircularProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

import { useGetJobByIdQuery } from '@/store/api/jobsApi';
import { 
  useGetApplicationsQuery, 
  useMoveStageMutation, 
  useBulkMoveStageMutation, 
  useBulkRejectMutation,
  useResendStageEmailsMutation,
  useExtendOfferMutation
} from '@/store/api/applicationsApi';
import { useUploadOfferFileMutation } from '@/store/api/profilesApi';
import type { Job, Application, HiringStage } from '@/types';

export default function JobPipelinePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: job, isLoading: isJobLoading, error: jobError } = useGetJobByIdQuery(id);
  const { data: applicationsData, isLoading: isAppsLoading } = useGetApplicationsQuery({ jobId: id });
  
  const applications = applicationsData?.data || [];
  const isLoading = isJobLoading || isAppsLoading;

  const [moveStage] = useMoveStageMutation();
  const [bulkMoveStage] = useBulkMoveStageMutation();
  const [bulkReject] = useBulkRejectMutation();
  const [resendStageEmails, { isLoading: isResending }] = useResendStageEmailsMutation();
  const [extendOffer, { isLoading: isExtendingOffer }] = useExtendOfferMutation();
  const [uploadOfferFile, { isLoading: isUploadingOffer }] = useUploadOfferFileMutation();

  const isSaving = isExtendingOffer || isUploadingOffer || isResending;
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreThreshold, setScoreThreshold] = useState<number>(0);
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'DIRECT' | 'INVITED'>('ALL');
  const [staleOnly, setStaleOnly] = useState(false);
  const [focusedStageFilter, setFocusedStageFilter] = useState<string | null>(null); // "View all in this stage"

  // Bulk Selection
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);

  // Candidate Detail Drawer State
  const [drawerAppId, setDrawerAppId] = useState<string | null>(null);

  // Offer Modal States
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerModalAppId, setOfferModalAppId] = useState<string | null>(null);
  const [compensation, setCompensation] = useState('1200000');
  const [joiningDate, setJoiningDate] = useState('');
  const [offerExpiry, setOfferExpiry] = useState('');
  const [offerLetterUrl, setOfferLetterUrl] = useState('');
  const [offerLetterFileName, setOfferLetterFileName] = useState('');

  // Reordering Backward confirmation dialog
  const [backwardConfirmOpen, setBackwardConfirmOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ app: Application; toStageId: string; toStageName: string } | null>(null);

  // Menus
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);
  const [activeColumnMenuStage, setActiveColumnMenuStage] = useState<string | null>(null);

  // Notification Toast
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const showToast = (message: string, severity: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setToast({ open: true, message, severity });
  };

  if (isLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading hiring pipeline...
          </Typography>
        </Stack>
      </Container>
    );
  }

  if (jobError || !job) {
    return (
      <Container sx={{ py: 10 }}>
        <Alert severity="error" sx={{ borderRadius: 3, fontWeight: 700 }}>
          Could not find or load the pipeline details. Please try again.
        </Alert>
      </Container>
    );
  }

  const stages = job.hiringStages || [];

  // Helper to move application stage
  const moveAppStage = async (app: Application, toStageId: string, toStageName: string, bypassWarning = false) => {
    const currentIdx = stages.findIndex(s => s.id === app.currentStageId);
    const targetIdx = stages.findIndex(s => s.id === toStageId);

    // Warning when dragging backwards
    if (targetIdx < currentIdx && !bypassWarning) {
      setPendingMove({ app, toStageId, toStageName });
      setBackwardConfirmOpen(true);
      return;
    }

    const isOAOrInterview = toStageName.toLowerCase().includes('technical') ||
                            toStageName.toLowerCase().includes('manager') ||
                            toStageName.toLowerCase().includes('interview') ||
                            toStageName.toLowerCase().includes('oa');

    try {
      await moveStage({ id: app.id, jobId: id, toStageId }).unwrap();
      
      if (isOAOrInterview) {
        showToast(`Automated assessment/meeting invite email enqueued for ${app.candidate?.user.fullName || 'Candidate'}!`, 'success');
      } else {
        showToast(`Application for ${app.candidate?.user.fullName || 'Candidate'} transitioned to ${toStageName}.`, 'info');
      }
    } catch (err: any) {
      showToast(err?.data?.message || 'Failed to move candidate.', 'error');
    }
  };

  const handleConfirmBackwardMove = () => {
    if (pendingMove) {
      moveAppStage(pendingMove.app, pendingMove.toStageId, pendingMove.toStageName, true);
    }
    setBackwardConfirmOpen(false);
    setPendingMove(null);
  };

  // Bulk Actions
  const handleBulkAdvance = async () => {
    if (selectedAppIds.length === 0) return;
    
    // Simplification for bulk-advance logic: assuming all selected are in the same stage
    // Since the API requires a single toStageId, we must determine the next stage.
    const firstApp = applications.find(a => a.id === selectedAppIds[0]);
    if (!firstApp) return;
    
    const currentIdx = stages.findIndex(s => s.id === firstApp.currentStageId);
    if (currentIdx !== -1 && currentIdx < stages.length - 1) {
      const nextStage = stages[currentIdx + 1];
      try {
        await bulkMoveStage({ applicationIds: selectedAppIds, toStageId: nextStage.id }).unwrap();
        showToast(`Bulk advanced ${selectedAppIds.length} candidate(s).`, 'success');
        setSelectedAppIds([]);
        setBulkMode(false);
      } catch (err: any) {
        showToast(err?.data?.message || 'Failed to bulk advance.', 'error');
      }
    } else {
      showToast('Cannot advance these candidates further.', 'warning');
    }
  };

  const handleBulkReject = async () => {
    if (selectedAppIds.length === 0) return;
    try {
      await bulkReject({ applicationIds: selectedAppIds, reason: 'Bulk rejected by recruiter.' }).unwrap();
      showToast(`Bulk rejected ${selectedAppIds.length} candidate(s).`, 'warning');
      setSelectedAppIds([]);
      setBulkMode(false);
    } catch (err: any) {
      showToast(err?.data?.message || 'Failed to bulk reject.', 'error');
    }
  };

  const toggleSelectApp = (appId: string) => {
    setSelectedAppIds(prev =>
      prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]
    );
  };

  // HTML5 Drag handlers
  const handleDragStart = (e: React.DragEvent, app: Application) => {
    e.dataTransfer.setData('applicationId', app.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stage: HiringStage) => {
    const appId = e.dataTransfer.getData('applicationId');
    const app = applications.find(a => a.id === appId);
    if (app && app.currentStageId !== stage.id) {
      moveAppStage(app, stage.id, stage.name);
    }
  };

  const handleOfferFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      try {
        const res = await uploadOfferFile({
          fileName: file.name,
          base64Data,
        }).unwrap();
        setOfferLetterUrl(res.fileUrl);
        setOfferLetterFileName(file.name);
        showToast('Offer letter PDF uploaded successfully!');
      } catch (err: any) {
        showToast(err.data?.message || 'Failed to upload offer letter PDF.', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExtendOffer = async () => {
    if (!joiningDate || !offerExpiry || !offerModalAppId) return;

    try {
      await extendOffer({
        id: offerModalAppId,
        compensation: Number(compensation),
        currency: 'INR',
        joiningDate: new Date(joiningDate).toISOString(),
        expiresAt: new Date(offerExpiry).toISOString(),
        offerLetterUrl: offerLetterUrl || 'https://bivio-documents.s3.amazonaws.com/mock-offer.pdf',
      }).unwrap();

      setOfferModalOpen(false);
      setOfferModalAppId(null);
      setOfferLetterUrl('');
      setOfferLetterFileName('');
      showToast('Hiring offer extended successfully!');
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to extend offer.', 'error');
    }
  };

  // Filter application cards
  const filteredApps = applications.filter(a => {
    const candidateName = a.candidate?.user.fullName || '';
    const skillsList = a.candidate?.skills?.map(sk => sk.skill.name).join(' ') || '';
    const matchesSearch = candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          skillsList.toLowerCase().includes(searchTerm.toLowerCase());

    const score = parseFloat(a.snapshotAiScore || '0');
    const matchesScore = score >= scoreThreshold;

    const matchesSource = sourceFilter === 'ALL' ? true : a.source === sourceFilter;

    // Stale: Mock 7+ days (e.g. cand-2 is stale, cand-1 is not)
    const isStale = a.candidateId === 'cand-2';
    const matchesStale = staleOnly ? isStale : true;

    return matchesSearch && matchesScore && matchesSource && matchesStale && a.status !== 'REJECTED';
  });

  const getDaysInStageColor = (days: number) => {
    if (days >= 14) return 'error.main';
    if (days >= 7) return 'warning.main';
    return 'text.secondary';
  };

  // Target App Details for Drawer
  const drawerApp = applications.find(a => a.id === drawerAppId);

  return (
    <Container maxWidth={false} sx={{ py: 4 }}>
      {/* Header */}
      <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Link href={`/recruiter/jobs/${id}`} style={{ textDecoration: 'none' }}>
          <Button startIcon={<ArrowBackIcon />}>
            Back to Job Details
          </Button>
        </Link>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={() => setBulkMode(!bulkMode)} color={bulkMode ? 'secondary' : 'primary'} sx={{ fontWeight: 700 }}>
            {bulkMode ? 'Exit Selection Mode' : 'Bulk Select'}
          </Button>
          <Link href={`/recruiter/jobs/${id}/candidates`} style={{ textDecoration: 'none' }}>
            <Button variant="outlined" color="primary" sx={{ fontWeight: 700 }}>
              AI Match Discovery
            </Button>
          </Link>
        </Stack>
      </Stack>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 855, fontFamily: 'Outfit, sans-serif', color: job.jobType === 'FREELANCE' ? 'secondary.main' : 'primary.main' }}>
          {job.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Hiring Pipeline Kanban · Drag candidates to advance stages.
        </Typography>
      </Box>

      {/* Bulk Toolbar */}
      {bulkMode && selectedAppIds.length > 0 && (
        <Alert
          severity="info"
          action={
            <Stack direction="row" spacing={1.5}>
              <Button size="small" variant="contained" color="success" onClick={handleBulkAdvance}>Advance Selected</Button>
              <Button size="small" variant="contained" color="error" onClick={handleBulkReject}>Reject Selected</Button>
            </Stack>
          }
          sx={{ mb: 3, fontWeight: 700 }}
        >
          {selectedAppIds.length} candidate(s) selected
        </Alert>
      )}

      {/* Filter controls bar */}
      <Card sx={{ p: 4, mb: 4, borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              size="small"
              placeholder="Search by name, skill..."
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="action" fontSize="small" sx={{ mr: 1 }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3.5}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 80 }}>MIN MATCH</Typography>
              <Slider value={scoreThreshold} onChange={(_, val) => setScoreThreshold(val as number)} max={100} valueLabelDisplay="auto" />
            </Stack>
          </Grid>
          <Grid item xs={12} sm={2.5}>
            <TextField select size="small" label="Source" fullWidth value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as any)}>
              <MenuItem value="ALL">All Sources</MenuItem>
              <MenuItem value="DIRECT">Direct Application</MenuItem>
              <MenuItem value="INVITED">Proactively Invited</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControlLabel
              control={<Switch checked={staleOnly} onChange={(e) => setStaleOnly(e.target.checked)} />}
              label="Stale only ( > 7 days)"
            />
          </Grid>
        </Grid>
      </Card>

      {/* Kanban Board Container */}
      <Box sx={{ display: 'flex', gap: 3.5, overflowX: 'auto', pb: 3, minHeight: 600 }}>
        {stages
          .filter(st => !focusedStageFilter || st.id === focusedStageFilter)
          .map((stage) => {
            const stageApps = filteredApps.filter(a => a.currentStageId === stage.id);
            return (
              <Box
                key={stage.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
                sx={{
                  flex: '0 0 280px',
                  bgcolor: 'rgba(248, 250, 252, 0.75)',
                  borderRadius: 4.5,
                  border: '1.5px solid #f1f5f9',
                  p: 2.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}
              >
                {/* Column Header */}
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 850, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {stage.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {stageApps.length} Candidates
                    </Typography>
                  </Box>

                  <IconButton
                    size="small"
                    onClick={(e) => {
                      setColumnMenuAnchor(e.currentTarget);
                      setActiveColumnMenuStage(stage.id);
                    }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Stack>

                {/* Candidate Cards stack */}
                <Stack spacing={2} sx={{ flexGrow: 1, overflowY: 'auto' }}>
                  {stageApps.map((app) => {
                    const scoreVal = parseInt(app.snapshotAiScore || '0', 10);
                    // Mock days in stage
                    const days = app.candidateId === 'cand-2' ? 16 : app.candidateId === 'cand-3' ? 8 : 2;
                    const daysColor = getDaysInStageColor(days);
                    const isSelected = selectedAppIds.includes(app.id);
                    const isHired = app.status === 'HIRED';

                    return (
                      <Card
                        key={app.id}
                        draggable={!isHired}
                        onDragStart={(e) => !isHired && handleDragStart(e, app)}
                        onClick={() => !bulkMode && setDrawerAppId(app.id)}
                        sx={{
                          borderRadius: 3.5,
                          border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                          cursor: isHired ? 'pointer' : (bulkMode ? 'default' : 'grab'),
                          position: 'relative',
                          opacity: isHired ? 0.75 : 1,
                          '&:hover': { boxShadow: 2 }
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          {bulkMode && (
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleSelectApp(app.id)}
                              disabled={isHired}
                              size="small"
                              sx={{ position: 'absolute', top: 8, right: 8 }}
                            />
                          )}

                          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', color: 'primary.dark', fontSize: '0.8rem' }}>
                              {app.candidate?.user?.fullName?.[0] || '?'}
                            </Avatar>
                            <Box sx={{ pr: 3 }}>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <Typography variant="body2" sx={{ fontWeight: 800 }}>{app.candidate?.user?.fullName || 'Anonymous'}</Typography>
                                {app.source === 'INVITED' && (
                                  <Chip label="Invited" size="small" color="secondary" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 800, px: 0.5, color: '#fff' }} />
                                )}
                              </Stack>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Full Stack Engineer
                              </Typography>
                            </Box>
                          </Stack>

                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
                            <Chip label={`${scoreVal}% match`} size="small" color={scoreVal >= 80 ? 'success' : scoreVal >= 60 ? 'warning' : 'default'} sx={{ fontWeight: 700, fontSize: '0.7rem', height: 20 }} />
                            
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <AccessTimeIcon sx={{ fontSize: 13, color: daysColor }} />
                              <Typography variant="caption" sx={{ fontWeight: 700, color: daysColor }}>{days}d</Typography>
                            </Stack>
                          </Stack>

                          {/* Source indicator */}
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, fontSize: '0.65rem', textAlign: 'right' }}>
                            Source: {app.source === 'INVITED' ? 'INVITED' : 'DIRECT'}
                          </Typography>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {stageApps.length === 0 && (
                    <Box sx={{ border: '1px dashed #cbd5e1', borderRadius: 3, p: 3, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">No candidates in this stage</Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            );
          })}
      </Box>

      {/* Column Menu Header Actions */}
      <Menu
        anchorEl={columnMenuAnchor}
        open={Boolean(columnMenuAnchor)}
        onClose={() => { setColumnMenuAnchor(null); setActiveColumnMenuStage(null); }}
      >
        <MenuItem
          onClick={() => {
            setFocusedStageFilter(focusedStageFilter ? null : activeColumnMenuStage);
            setColumnMenuAnchor(null);
          }}
        >
          {focusedStageFilter ? 'Show All Stages' : 'View all in this stage'}
        </MenuItem>
        <MenuItem
          disabled={isResending}
          onClick={async () => {
            if (activeColumnMenuStage) {
              try {
                const res = await resendStageEmails({ jobId: id, stageId: activeColumnMenuStage }).unwrap();
                showToast(`Successfully resent automated instruction emails to ${res.count} candidates in this stage.`, 'success');
              } catch (err) {
                showToast('Failed to resend automated emails. Please try again.', 'error');
              }
            }
            setColumnMenuAnchor(null);
          }}
        >
          Resend stage email to all
        </MenuItem>
      </Menu>

      {/* Drag backward confirmation dialog */}
      <Dialog open={backwardConfirmOpen} onClose={() => setBackwardConfirmOpen(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>Move Candidate Backward?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You are moving this candidate back to an earlier stage. Any scheduled meetings or assessments will remain active, but automated emails will not re-send.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setBackwardConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleConfirmBackwardMove}>Confirm Move</Button>
        </DialogActions>
      </Dialog>

      {/* Right Drawer showing candidate application preview */}
      <Drawer
        anchor="right"
        open={Boolean(drawerAppId)}
        onClose={() => setDrawerAppId(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 3 } }}
        sx={{ zIndex: 1400 }}
      >
        {drawerApp && (
          <Stack spacing={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 900 }}>Application Overview</Typography>
              <IconButton onClick={() => setDrawerAppId(null)}><CloseIcon /></IconButton>
            </Stack>

            <Divider />

            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'secondary.light', color: 'secondary.dark', fontWeight: 800 }}>
                {drawerApp.candidate?.user?.fullName?.[0] || '?'}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{drawerApp.candidate?.user?.fullName || 'Anonymous'}</Typography>
                <Typography variant="body2" color="text.secondary">{drawerApp.candidate?.headline || 'Backend Architect'}</Typography>
                <Typography variant="caption" color="text.secondary">{drawerApp.candidate?.location || 'Remote'}</Typography>
              </Box>
            </Stack>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>AI MATCH SCORE</Typography>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
                <LinearProgress variant="determinate" value={parseInt(drawerApp.snapshotAiScore || '0', 10)} sx={{ flexGrow: 1, height: 8, borderRadius: 4 }} />
                <Typography variant="body2" sx={{ fontWeight: 800 }}>{drawerApp.snapshotAiScore}%</Typography>
              </Stack>
            </Box>

            <Stack direction="row" spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">NOTICE PERIOD</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{(drawerApp.candidate as any)?.noticePeriod || 'Immediate'}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">EXPERIENCE</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{drawerApp.candidate?.experienceYears || '3'} Years</Typography>
              </Box>
            </Stack>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>EMAIL ADDRESS</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{drawerApp.candidate?.user?.email || 'N/A'}</Typography>
            </Box>

            <Divider />

            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Stage Transition Log</Typography>
            <Stack spacing={1}>
              {drawerApp.movements?.map((mov, idx) => (
                <Box key={mov.id} sx={{ pl: 2, borderLeft: '2.5px solid #2563eb', py: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Advanced to {mov.toStage.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{new Date(mov.movedAt).toLocaleDateString()} by {mov.movedBy.fullName}</Typography>
                </Box>
              ))}
            </Stack>

            <Divider />

            {drawerApp.currentStage?.stageType === 'OFFER' && (
              <Button
                variant="contained"
                color="success"
                fullWidth
                disabled={drawerApp.status === 'HIRED'}
                onClick={() => {
                  setOfferModalAppId(drawerApp.id);
                  setOfferModalOpen(true);
                }}
                sx={{ py: 1.5, fontWeight: 700 }}
              >
                {drawerApp.status === 'HIRED'
                  ? 'Offer Accepted — Hired'
                  : (drawerApp.offer ? 'Extend Offer' : 'Send Offer Letter')}
              </Button>
            )}

            <Link href={`/recruiter/applications/${drawerApp.id}`} style={{ textDecoration: 'none', width: '100%' }}>
              <Button variant="outlined" fullWidth sx={{ py: 1.5, fontWeight: 700 }}>
                View Full Candidate Profile
              </Button>
            </Link>
          </Stack>
        )}
      </Drawer>

      {/* Offer Modal */}
      <Dialog open={offerModalOpen} onClose={() => setOfferModalOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>
          {offerModalAppId && applications.find(a => a.id === offerModalAppId)?.offer ? 'Extend Employment Offer' : 'Send Offer Letter'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1.5 }}>
            <TextField
              label="Annual Compensation package (₹)"
              type="number"
              value={compensation}
              onChange={(e) => setCompensation(e.target.value)}
              fullWidth
            />
            <TextField
              label="Proposed Joining Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              fullWidth
            />
            <TextField
              label="Offer Expiry Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={offerExpiry}
              onChange={(e) => setOfferExpiry(e.target.value)}
              fullWidth
            />
            <Box sx={{ mt: 1 }}>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={<CloudUploadIcon />}
                sx={{ height: 48, textTransform: 'none', fontWeight: 700 }}
              >
                {isUploadingOffer ? 'Uploading PDF...' : 'Upload Offer Letter PDF'}
                <input type="file" hidden accept="application/pdf" onChange={handleOfferFileUpload} disabled={isSaving} />
              </Button>
              {offerLetterFileName && (
                <Typography variant="caption" display="block" sx={{ mt: 1, fontWeight: 600, color: 'success.main' }}>
                  Uploaded: {offerLetterFileName}
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOfferModalOpen(false)} disabled={isSaving}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleExtendOffer} disabled={isSaving} startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null} sx={{ fontWeight: 700 }}>
            {isSaving ? 'Sending...' : 'Extend Offer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Notification */}
      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.severity} sx={{ width: '100%', fontWeight: 700 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
