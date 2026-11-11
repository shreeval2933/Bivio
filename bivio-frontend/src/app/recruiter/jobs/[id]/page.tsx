'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Avatar,
  Paper,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  FormControlLabel,
  Switch,
  CircularProgress
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EventIcon from '@mui/icons-material/Event';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LockIcon from '@mui/icons-material/Lock';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { getApplications, getCandidatesPool, saveApplication } from '@/mocks/recruiterState';
import {
  useGetJobByIdQuery,
  useUpdateJobBasicsMutation,
  useUpdateJobRequirementsMutation,
  useUpdateJobCompensationMutation,
  useUpdateJobBenefitsMutation,
  useCloseJobMutation,
  useCancelJobMutation,
  useReopenJobMutation,
  useDuplicateJobMutation,
  useExtendJobDeadlineMutation,
  useGetShortlistQuery,
} from '@/store/api/jobsApi';
import { useGetApplicationsQuery } from '@/store/api/applicationsApi';
import { useGetContractsQuery, useGetProposalsQuery } from '@/store/api/contractsApi';
import type { Job, JobStatus, CandidateProfile, HiringStage } from '@/types';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatCurrency, formatTimeAgo } from '@/lib/format';

export default function SingleJobPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: job, isLoading, isError } = useGetJobByIdQuery(id);
  const { data: shortlist } = useGetShortlistQuery(id);
  const { data: dbApplications } = useGetApplicationsQuery({ jobId: id }, { skip: !id });
  const { data: dbContracts } = useGetContractsQuery(undefined, { skip: !id });
  
  const isFreelanceJob = job?.jobType === 'FREELANCE';
  const { data: dbProposals } = useGetProposalsQuery({ jobId: id }, { skip: !id || !isFreelanceJob });
  
  const [updateJobBasics, { isLoading: isUpdatingBasics }] = useUpdateJobBasicsMutation();
  const [updateJobRequirements] = useUpdateJobRequirementsMutation();
  const [updateJobCompensation] = useUpdateJobCompensationMutation();
  const [updateJobBenefits] = useUpdateJobBenefitsMutation();
  const [closeJob] = useCloseJobMutation();
  const [cancelJob] = useCancelJobMutation();
  const [reopenJob] = useReopenJobMutation();
  const [duplicateJob] = useDuplicateJobMutation();
  const [extendJobDeadline, { isLoading: isExtending }] = useExtendJobDeadlineMutation();

  const [apps, setApps] = useState<any[]>([]);
  const [associatedContract, setAssociatedContract] = useState<any>(null);
  
  // Modals & Menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [extendModal, setExtendModal] = useState(false);
  const [newDeadline, setNewDeadline] = useState('');
  const [confirmAction, setConfirmAction] = useState<'CLOSE' | 'CANCEL' | 'DUPLICATE' | null>(null);

  // Edit Mode Toggles (per section)
  const [editTitleDesc, setEditTitleDesc] = useState(false);
  const [editRequirements, setEditRequirements] = useState(false);
  const [editCompensation, setEditCompensation] = useState(false);
  const [editPerks, setEditPerks] = useState(false);

  // Local Section States (Preloaded from job)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  
  const [minExp, setMinExp] = useState('2');
  const [maxExp, setMaxExp] = useState('8');
  const [minEdu, setMinEdu] = useState('Bachelor');
  const [notice, setNotice] = useState('Any');

  const [salaryMin, setSalaryMin] = useState('500000');
  const [salaryMax, setSalaryMax] = useState('1500000');
  const [currency, setCurrency] = useState('INR');
  const [salaryVis, setSalaryVis] = useState(true);
  const [vacancies, setVacancies] = useState(1);
  const [internalCode, setInternalCode] = useState('');

  const [benefitsList, setBenefitsList] = useState<string[]>([]);
  const [newBenefit, setNewBenefit] = useState('');

  // Toast notifications
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('success');

  const showToast = (msg: string, severity: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setToastMsg(msg);
    setToastSeverity(severity);
    setToastOpen(true);
  };

  // Seed edit states when job data is received
  useEffect(() => {
    if (job) {
      setNewDeadline(job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : '');
      setTitle(job.title);
      setDescription(job.description);
      const anyJob = job as any;
      setResponsibilities(anyJob.responsibilities || '');
      setMinExp(anyJob.minExperienceYears ? String(anyJob.minExperienceYears) : '2');
      setMaxExp(anyJob.maxExperienceYears ? String(anyJob.maxExperienceYears) : '8');
      setMinEdu(anyJob.minEducationLevel || 'Bachelor');
      setNotice(anyJob.noticePeriodPreference || 'Any');
      setSalaryMin(job.salaryMin || '500000');
      setSalaryMax(job.salaryMax || '1500000');
      setCurrency(job.currency || 'INR');
      setSalaryVis(anyJob.salaryVisible !== undefined ? anyJob.salaryVisible : true);
      setVacancies(job.vacancies || 1);
      setInternalCode(anyJob.internalJobCode || '');
      setBenefitsList(anyJob.benefits || []);
    }
  }, [job]);

  useEffect(() => {
    if (job?.jobType === 'FREELANCE') {
      const apiProps = dbProposals?.data || [];
      setApps(apiProps);
    } else {
      const apiApps = dbApplications?.data || [];
      setApps(apiApps);
    }

    const apiContract = dbContracts?.data?.find((c: any) => c.jobId === id) || null;
    setAssociatedContract(apiContract);
  }, [id, job, dbApplications, dbProposals, dbContracts]);

  if (isLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading job details...
          </Typography>
        </Stack>
      </Container>
    );
  }

  if (isError || !job) {
    return (
      <Container sx={{ py: 10 }}>
        <Alert severity="error" sx={{ borderRadius: 3, fontWeight: 700 }}>
          Could not find or load the job details. Please try again.
        </Alert>
      </Container>
    );
  }

  const isDraftOrConfiguring = job.status === 'DRAFT' || (job.status as string) === 'CONFIGURING';
  const isOpen = job.status === 'OPEN';
  const isClosed = job.status === 'CLOSED';
  
  const isFreelance = job.jobType === 'FREELANCE';
  const hasActiveContract = isFreelance && associatedContract !== null;
  const canEdit = (isOpen || isDraftOrConfiguring) && !hasActiveContract;

  // Stats Calculations
  const hiredCount = apps.filter(a => a.status === 'HIRED' || a.status === 'ACCEPTED').length;
  const conversionRate = apps.length > 0 ? ((hiredCount / apps.length) * 100).toFixed(0) : 0;
  
  // Freelance proposal counts
  const submittedCount = apps.filter(a => a.status === 'SUBMITTED' || a.status === 'APPLIED').length;
  const shortlistedCount = apps.filter(a => a.status === 'SHORTLISTED' || a.status === 'IN_PROGRESS').length;
  const acceptedCount = apps.filter(a => a.status === 'ACCEPTED' || a.status === 'HIRED').length;

  const totalFreelanceApps = apps.length || 1;
  const submittedRatio = apps.length > 0 ? Math.round((submittedCount / totalFreelanceApps) * 100) : 0;
  const shortlistedRatio = apps.length > 0 ? Math.round((shortlistedCount / totalFreelanceApps) * 100) : 0;
  const acceptedRatio = apps.length > 0 ? Math.round((acceptedCount / totalFreelanceApps) * 100) : 0;

  // Average Bid calculations
  const bidAmounts = apps.map(a => Number(a.bidAmount || 0)).filter(b => b > 0);
  const avgBid = bidAmounts.length > 0 ? Math.round(bidAmounts.reduce((sum, b) => sum + b, 0) / bidAmounts.length) : 0;
  const budgetVal = Number(job.budget || 0);
  const bidRatio = (budgetVal > 0 && avgBid > 0) ? Math.min(100, Math.round((avgBid / budgetVal) * 100)) : 0;
  const viewCount = job.viewCount ?? 0;

  // Time to first calculation
  const sortedAppsByDate = [...apps].sort((a, b) => new Date(a.createdAt || a.appliedAt || 0).getTime() - new Date(b.createdAt || b.appliedAt || 0).getTime());
  const earliestApp = sortedAppsByDate[0];
  let timeToFirst = '—';
  if (earliestApp && job.publishedAt) {
    const diffMs = new Date(earliestApp.createdAt || earliestApp.appliedAt).getTime() - new Date(job.publishedAt).getTime();
    if (diffMs > 0) {
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      if (diffHours < 24) {
        timeToFirst = `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
      } else {
        const diffDays = Math.round(diffHours / 24);
        timeToFirst = `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
      }
    } else {
      timeToFirst = 'Immediate';
    }
  }

  // Active contract calculations
  const totalMilestones = associatedContract?.milestones?.length || 0;
  const paidMilestones = associatedContract?.milestones?.filter((m: any) => m.status === 'PAID' || m.status === 'APPROVED').length || 0;
  const releasedAmount = associatedContract?.milestones?.filter((m: any) => m.status === 'PAID' || m.status === 'APPROVED').reduce((sum: number, m: any) => sum + Number(m.amount), 0) || 0;
  const milestoneProgressRatio = totalMilestones > 0 ? (paidMilestones / totalMilestones) * 100 : 0;

  // Funnel Counts per Stage
  const getStageCount = (stageName: string) => {
    return apps.filter(a => a.currentStage?.name?.toLowerCase() === stageName.toLowerCase()).length;
  };



  // Menu Handlers
  const handleMenuOpen = (e: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleAction = async () => {
    if (!job) return;
    try {
      if (confirmAction === 'CLOSE') {
        await closeJob(job.id).unwrap();
        showToast('Job posting closed successfully.', 'info');
      } else if (confirmAction === 'CANCEL') {
        await cancelJob({ id: job.id }).unwrap();
        showToast('Job posting cancelled. In-progress applications have been auto-rejected.', 'error');
      } else if (confirmAction === 'DUPLICATE') {
        const newJob = await duplicateJob(job.id).unwrap();
        showToast('Job posting duplicated. Redirecting to draft...', 'success');
        router.push(`/recruiter/jobs/new?id=${newJob.id}&type=${newJob.jobType.toLowerCase()}`);
        return;
      }
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to perform action.', 'error');
    }
    setConfirmAction(null);
  };

  const handleExtendDeadline = async () => {
    if (!newDeadline) return;
    try {
      await extendJobDeadline({ id: job.id, deadline: new Date(newDeadline).toISOString() }).unwrap();
      setExtendModal(false);
      showToast('Application deadline extended successfully.');
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to extend deadline.', 'error');
    }
  };

  // Reopen Job (Closed within 30 days)
  const handleReopen = async () => {
    try {
      await reopenJob(job.id).unwrap();
      showToast('Job posting reopened successfully!');
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to reopen job.', 'error');
    }
  };

  // Section Save Handlers
  const handleSaveTitleDesc = async () => {
    if (!title.trim() || !description.trim()) {
      showToast('Title and Description are required.', 'error');
      return;
    }
    try {
      await updateJobBasics({
        id: job.id,
        title: title.trim(),
        description: description.trim(),
        responsibilities: responsibilities.trim() || undefined
      }).unwrap();
      setEditTitleDesc(false);
      showToast('Title and Description updated.');
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to update title & description.', 'error');
    }
  };

  const handleSaveRequirements = async () => {
    if (maxExp && Number(minExp) > Number(maxExp)) {
      showToast('Minimum experience cannot exceed maximum experience.', 'error');
      return;
    }
    try {
      await updateJobRequirements({
        id: job.id,
        minExperienceYears: Number(minExp),
        maxExperienceYears: maxExp ? Number(maxExp) : undefined,
        minEducationLevel: (minEdu || undefined) as any,
        noticePeriodPreference: (notice || undefined) as any
      }).unwrap();
      setEditRequirements(false);
      showToast('Candidate requirements updated.');
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to update candidate requirements.', 'error');
    }
  };

  const handleSaveCompensation = async () => {
    try {
      await updateJobCompensation({
        id: job.id,
        salaryMin: salaryMin ? Number(salaryMin) : undefined,
        salaryMax: salaryMax ? Number(salaryMax) : undefined,
        currency: currency || undefined,
        salaryVisible: salaryVis,
        vacancies: Number(vacancies),
        internalJobCode: internalCode || undefined
      }).unwrap();
      setEditCompensation(false);
      showToast('Compensation & vacancy settings updated.');
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to update compensation details.', 'error');
    }
  };

  const handleAddBenefit = async () => {
    if (!newBenefit.trim()) return;
    const cleaned = newBenefit.trim();
    if (!benefitsList.includes(cleaned)) {
      const updatedList = [...benefitsList, cleaned];
      try {
        await updateJobBenefits({ id: job.id, benefits: updatedList }).unwrap();
        setBenefitsList(updatedList);
        showToast(`Benefit "${cleaned}" added.`);
      } catch (err: any) {
        showToast(err.data?.message || 'Failed to add benefit.', 'error');
      }
    }
    setNewBenefit('');
  };

  const handleRemoveBenefit = async (bName: string) => {
    const updatedList = benefitsList.filter(b => b !== bName);
    try {
      await updateJobBenefits({ id: job.id, benefits: updatedList }).unwrap();
      setBenefitsList(updatedList);
      showToast(`Benefit "${bName}" removed.`);
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to remove benefit.', 'error');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Configuration Banner */}
      {(job.status as string) === 'CONFIGURING' && (
        <Alert
          severity="warning"
          icon={<AutoAwesomeIcon />}
          action={
            <Link href={`/recruiter/jobs/new?id=${id}&step=2`} style={{ textDecoration: 'none' }}>
              <Button color="warning" size="small" variant="contained" sx={{ fontWeight: 700 }}>
                Continue Setup →
              </Button>
            </Link>
          }
          sx={{ mb: 3, borderRadius: 3 }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Finish setup to publish this project</Typography>
          <Typography variant="body2">AI weightage not yet configured.</Typography>
        </Alert>
      )}

      <Link href="/recruiter/jobs" style={{ textDecoration: 'none' }}>
        <Button startIcon={<ArrowBackIcon />} sx={{ mb: 3 }}>
          Back to Jobs
        </Button>
      </Link>

      {/* TOP HEADER STATUS ROW */}
      <Card sx={{ borderRadius: 4, mb: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <CardContent sx={{ p: 4 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="flex-start" spacing={3}>
            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                <Chip label={job.jobType === 'FULL_TIME' ? 'Full-Time' : 'Freelance'} color="primary" size="small" sx={{ fontWeight: 700 }} />
                <StatusBadge domain="job" status={job.status} />
                {job.deadline && (
                  <Chip label={`Deadline: ${new Date(job.deadline).toLocaleDateString()}`} size="small" variant="outlined" />
                )}
              </Stack>

              {/* Title Edit Trigger */}
              {editTitleDesc ? (
                <Stack spacing={2} sx={{ mt: 1, minWidth: { md: 400 } }}>
                  <TextField label="Job Title" value={title} onChange={(e) => setTitle(e.target.value)} size="small" fullWidth />
                  <TextField label="Key Responsibilities" value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} size="small" multiline rows={3} fullWidth />
                  <TextField label="Job Description" value={description} onChange={(e) => setDescription(e.target.value)} size="small" multiline rows={3} fullWidth />
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="contained" onClick={handleSaveTitleDesc} disabled={isUpdatingBasics}>
                      {isUpdatingBasics ? 'Saving...' : 'Save'}
                    </Button>
                    <Button size="small" onClick={() => setEditTitleDesc(false)} disabled={isUpdatingBasics}>Cancel</Button>
                  </Stack>
                </Stack>
              ) : (
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 850, fontFamily: 'Outfit, sans-serif', color: job.jobType === 'FREELANCE' ? 'secondary.main' : 'primary.main' }}>
                    {job.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontWeight: 500 }}>
                    {job.jobType === 'FREELANCE' ? (
                      `${job.isRemote ? 'Remote' : job.location} · ${
                        job.budgetType === 'HOURLY' 
                          ? `Hourly ₹${parseInt(job.budget || '1500').toLocaleString()}/hr`
                          : `Fixed price ₹${parseInt(job.budget || '450000').toLocaleString()}`
                      }`
                    ) : (
                      `${(job as any).department || 'Engineering'} · ${job.location} ${job.isRemote ? '· Remote' : ''}`
                    )}
                  </Typography>
                </Box>
              )}
            </Box>

            <Stack direction="row" spacing={1} sx={{ alignSelf: { sm: 'center' }, alignItems: 'center' }}>
              {isDraftOrConfiguring && (
                <Link href={`/recruiter/jobs/new?id=${job.id}`} style={{ textDecoration: 'none' }}>
                  <Button variant="contained" color="secondary" startIcon={<PlayArrowIcon />} sx={{ fontWeight: 700 }}>
                    Continue Setup
                  </Button>
                </Link>
              )}
              {isOpen && job.jobType === 'FULL_TIME' && (
                <Link href={`/recruiter/jobs/${job.id}/pipeline`} style={{ textDecoration: 'none' }}>
                  <Button variant="contained" startIcon={<ViewColumnIcon />} sx={{ fontWeight: 700 }}>
                    Go to Pipeline Board
                  </Button>
                </Link>
              )}
              {isOpen && job.jobType === 'FREELANCE' && (
                <Link href={`/recruiter/proposals?jobId=${job.id}`} style={{ textDecoration: 'none' }}>
                  <Button variant="contained" color="secondary" startIcon={<ViewColumnIcon />} sx={{ fontWeight: 700 }}>
                    View Received Proposals
                  </Button>
                </Link>
              )}
              {isClosed && (
                <Button variant="outlined" color="primary" onClick={handleReopen} sx={{ fontWeight: 700 }}>
                  Reopen Job
                </Button>
              )}

              {/* Edit button */}
              {isDraftOrConfiguring && (
                <Link href={`/recruiter/jobs/new?id=${job.id}&type=${job.jobType.toLowerCase()}`} style={{ textDecoration: 'none' }}>
                  <Button variant="outlined" startIcon={<EditIcon />} sx={{ fontWeight: 700 }}>
                    Edit
                  </Button>
                </Link>
              )}

              <IconButton onClick={handleMenuOpen} sx={{ border: '1px solid #cbd5e1' }}>
                <MoreVertIcon />
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                {isOpen && <MenuItem onClick={() => { handleMenuClose(); setConfirmAction('CLOSE'); }}>Close Posting</MenuItem>}
                <MenuItem onClick={() => { handleMenuClose(); setConfirmAction('DUPLICATE'); }}>Duplicate Draft</MenuItem>
                {isOpen && <MenuItem onClick={() => { handleMenuClose(); setExtendModal(true); }}>Extend Deadline</MenuItem>}
                {!isClosed && job.status !== 'CANCELLED' && (
                  <MenuItem onClick={() => { handleMenuClose(); setConfirmAction('CANCEL'); }} sx={{ color: 'error.main' }}>
                    Cancel Posting
                  </MenuItem>
                )}
              </Menu>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* TWO COLUMN CONTENT LAYOUT */}
      <Grid container spacing={4}>
        {/* Left Column: Specifications / Config */}
        <Grid item xs={12} md={7.5}>
          <Stack spacing={4}>
            {/* Section 1: Overview & Responsibilities */}
            <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>Job Overview &amp; Duties</Typography>
                  {canEdit && !editTitleDesc && (
                    <IconButton size="small" onClick={() => setEditTitleDesc(true)} sx={{ border: '1px solid #cbd5e1' }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, mb: 3 }}>
                  {job.description}
                </Typography>
                
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Key Responsibilities</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {responsibilities || 'No specific responsibilities detailed.'}
                </Typography>
              </CardContent>
            </Card>

            {/* Full-Time Only: Requirements, Compensation, Benefits */}
            {job.jobType === 'FULL_TIME' ? (
              <>
                {/* Section 2: Requirements */}
                <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>Candidate Requirements</Typography>
                      {canEdit && !editRequirements && (
                        <IconButton size="small" onClick={() => setEditRequirements(true)} sx={{ border: '1px solid #cbd5e1' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>

                    {editRequirements ? (
                      <Stack spacing={3}>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <TextField label="Min Experience" value={minExp} onChange={(e) => setMinExp(e.target.value)} size="small" fullWidth />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField label="Max Experience" value={maxExp} onChange={(e) => setMaxExp(e.target.value)} size="small" fullWidth />
                          </Grid>
                        </Grid>
                        <TextField label="Education Level" value={minEdu} onChange={(e) => setMinEdu(e.target.value)} size="small" fullWidth />
                        <TextField label="Notice Period" value={notice} onChange={(e) => setNotice(e.target.value)} size="small" fullWidth />
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="contained" onClick={handleSaveRequirements}>Save Requirements</Button>
                          <Button size="small" onClick={() => setEditRequirements(false)}>Cancel</Button>
                        </Stack>
                      </Stack>
                    ) : (
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">EXPERIENCE REQUIRED</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{minExp} – {maxExp} years</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">MINIMUM EDUCATION</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{minEdu}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">NOTICE PERIOD</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{notice}</Typography>
                        </Grid>
                      </Grid>
                    )}
                  </CardContent>
                </Card>

                {/* Section 3: Compensation & Vacancy */}
                <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>Compensation &amp; Scope</Typography>
                      {canEdit && !editCompensation && (
                        <IconButton size="small" onClick={() => setEditCompensation(true)} sx={{ border: '1px solid #cbd5e1' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>

                    {editCompensation ? (
                      <Stack spacing={3}>
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <TextField label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} size="small" fullWidth />
                          </Grid>
                          <Grid item xs={4}>
                            <TextField label="Min Salary" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} size="small" fullWidth />
                          </Grid>
                          <Grid item xs={4}>
                            <TextField label="Max Salary" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} size="small" fullWidth />
                          </Grid>
                        </Grid>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <TextField label="Vacancies" type="number" value={vacancies} onChange={(e) => setVacancies(parseInt(e.target.value) || 1)} size="small" fullWidth />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField label="Internal Job Code" value={internalCode} onChange={(e) => setInternalCode(e.target.value)} size="small" fullWidth />
                          </Grid>
                        </Grid>
                        <FormControlLabel
                          control={<Switch checked={salaryVis} onChange={(e) => setSalaryVis(e.target.checked)} />}
                          label="Show salary range to candidates"
                        />
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="contained" onClick={handleSaveCompensation}>Save Compensation</Button>
                          <Button size="small" onClick={() => setEditCompensation(false)}>Cancel</Button>
                        </Stack>
                      </Stack>
                    ) : (
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">SALARY PACKAGE</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {salaryVis ? `${currency} ${parseInt(salaryMin).toLocaleString()} – ${parseInt(salaryMax).toLocaleString()} /yr` : 'Competitive'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">VACANCIES</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{vacancies} open slots</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">INTERNAL JOB CODE</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{internalCode || 'N/A'}</Typography>
                        </Grid>
                      </Grid>
                    )}
                  </CardContent>
                </Card>

                {/* Section 4: Benefits & Perks */}
                <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Job Benefits &amp; Perks</Typography>
                    
                    <Stack direction="row" spacing={1} sx={{ mb: 2.5 }}>
                      <TextField
                        size="small"
                        placeholder="Add custom perk (e.g. Free lunch)"
                        value={newBenefit}
                        onChange={(e) => setNewBenefit(e.target.value)}
                        fullWidth
                      />
                      <Button variant="outlined" onClick={handleAddBenefit}>Add</Button>
                    </Stack>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {benefitsList.map((benefit) => (
                        <Chip key={benefit} label={benefit} onDelete={() => handleRemoveBenefit(benefit)} />
                      ))}
                      {benefitsList.length === 0 && (
                        <Typography variant="caption" color="text.secondary">No benefits listed yet.</Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                {/* Required Skills Card */}
                <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Required Skills</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {job.skills?.map((sk) => (
                        <Chip
                          key={sk.id}
                          label={`${sk.skill.name} ${sk.isMandatory ? '· Required' : '· Optional'}`}
                          variant={sk.isMandatory ? 'filled' : 'outlined'}
                          color={sk.isMandatory ? 'secondary' : 'default'}
                        />
                      ))}
                      {(!job.skills || job.skills.length === 0) && (
                        <Typography variant="caption" color="text.secondary">No specific skills listed.</Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>

                {/* Budget & Timeline Estimates Card */}
                <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 2.5 }}>Budget &amp; Timeline Estimates</Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>BUDGET TYPE</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.5 }}>
                          {(job as any).budgetType === 'HOURLY' ? 'Hourly rate range' : 'Fixed project amount'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>BUDGET AMOUNT</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.5 }}>
                          {job.budgetType === 'HOURLY' 
                            ? `₹${parseInt(job.budget || '1500').toLocaleString()} /hr`
                            : `₹${parseInt(job.budget || '450000').toLocaleString()}`
                          }
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>PROJECT LENGTH</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.5 }}>
                          {(job as any).projectLength || '1–4 weeks'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>EXPERIENCE LEVEL</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.5 }}>
                          {(job as any).experienceLevelNeeded || 'Intermediate'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>PROPOSAL DEADLINE</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.main' }}>
                          {job.deadline 
                            ? new Date(job.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                            : 'No proposal deadline set (Open indefinitely)'
                          }
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Section 5: Hiring Stages Sequence OR Project Deliverables */}
            {job.jobType === 'FULL_TIME' ? (
              <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>Hiring Stage Sequence</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Stages are locked once the job is open to ensure candidate pipelines remain stable.
                  </Typography>

                  <List sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 0, overflow: 'hidden' }}>
                    {job.hiringStages?.map((stage, idx) => (
                      <ListItem key={stage.id} divider={idx < (job.hiringStages?.length || 0) - 1}>
                        <ListItemIcon sx={{ minWidth: 36, fontWeight: 800, color: 'primary.main' }}>
                          {idx + 1}
                        </ListItemIcon>
                        <ListItemText
                          primary={stage.name}
                          primaryTypographyProps={{ fontWeight: 700 }}
                          secondary={idx === 0 ? 'Fixed Entry' : idx === (job.hiringStages?.length || 0) - 1 ? 'Fixed Terminal' : 'Custom evaluation'}
                        />
                        <Chip label={(stage as any).stageType || 'Custom'} size="small" variant="outlined" />
                      </ListItem>
                    ))}
                  </List>

                  {!isDraftOrConfiguring && (
                    <Alert severity="info" sx={{ mt: 2, fontWeight: 600 }}>
                      To modify hiring stages, contact support or clone this posting as a new Draft.
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Project Deliverables</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Discrete items freelancers scope their bid against.
                  </Typography>

                  <List sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 0, overflow: 'hidden' }}>
                    {((job as any).deliverables || ['Setup Escrow Core API', 'Schema design documentation', 'Integrate payment gateways', 'Conducted integration testing']).map((item: string, idx: number) => (
                      <ListItem key={idx} divider={idx < 3}>
                        <ListItemIcon sx={{ minWidth: 36, fontWeight: 800, color: 'secondary.main' }}>
                          {idx + 1}
                        </ListItemIcon>
                        <ListItemText
                          primary={item}
                          primaryTypographyProps={{ fontWeight: 700, fontSize: '0.85rem' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            )}

            {job.jobType === 'FREELANCE' && (
              <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>AI Weightage Settings</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Read-only weights used by the scoring agent to match freelancers.
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Skill Match</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 850 }}>{job.weightage?.skillWeight ?? 35}%</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Portfolio Match</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 850 }}>{job.weightage?.portfolioWeight ?? 30}%</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Rate Fit</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 850 }}>{job.weightage?.rateFitWeight ?? 15}%</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Track Record</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 850 }}>{job.weightage?.trackRecordWeight ?? 15}%</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Availability Fit</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 850 }}>{job.weightage?.availabilityWeight ?? 5}%</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>

        {/* Right Column: Funnel & AI shortlist */}
        <Grid item xs={12} md={4.5}>
          <Stack spacing={4}>
            {/* Associated Contract Widget */}
            {associatedContract && (
              <Card sx={{ borderRadius: 4, border: '1.5px solid #0d9488', boxShadow: 'none' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="caption" color="secondary.main" sx={{ fontWeight: 800, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                    Active Engagement
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 850, mb: 1 }}>Contract Summary</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Engagement with <strong>{associatedContract.freelancer?.user?.fullName || 'Freelancer'}</strong> is currently <strong>{associatedContract.status}</strong>.
                  </Typography>
                  <Link href={`/recruiter/contracts/${associatedContract.id}`} style={{ textDecoration: 'none' }}>
                    <Button variant="contained" color="secondary" fullWidth sx={{ fontWeight: 750, color: '#fff' }}>
                      View Contract
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Funnel: Applicant Funnel (Full-Time) OR Proposal Funnel (Freelance) */}
            <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                  {job.jobType === 'FULL_TIME' ? 'Applicant Funnel' : 'Proposal Funnel'}
                </Typography>
                
                {job.jobType === 'FULL_TIME' ? (
                  <Stack spacing={2.5}>
                    <Box>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>Applied</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{apps.length}</Typography>
                      </Stack>
                      <Paper sx={{ height: 10, bgcolor: 'rgba(37, 99, 235, 0.1)', borderRadius: 5, overflow: 'hidden', boxShadow: 'none' }}>
                        <Box sx={{ width: apps.length > 0 ? '100%' : '0%', height: '100%', bgcolor: 'primary.main' }} />
                      </Paper>
                    </Box>

                    <Box>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>Screening</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{getStageCount('Screening')}</Typography>
                      </Stack>
                      <Paper sx={{ height: 10, bgcolor: 'rgba(37, 99, 235, 0.1)', borderRadius: 5, overflow: 'hidden', boxShadow: 'none' }}>
                        <Box sx={{ width: apps.length > 0 ? `${(getStageCount('Screening') / apps.length) * 100}%` : '0%', height: '100%', bgcolor: 'primary.main' }} />
                      </Paper>
                    </Box>

                    <Box>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>Technical Rounds</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{getStageCount('Technical')}</Typography>
                      </Stack>
                      <Paper sx={{ height: 10, bgcolor: 'rgba(37, 99, 235, 0.1)', borderRadius: 5, overflow: 'hidden', boxShadow: 'none' }}>
                        <Box sx={{ width: apps.length > 0 ? `${(getStageCount('Technical') / apps.length) * 100}%` : '0%', height: '100%', bgcolor: 'primary.main' }} />
                      </Paper>
                    </Box>

                    <Box>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>Offer Stage</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{getStageCount('Offer')}</Typography>
                      </Stack>
                      <Paper sx={{ height: 10, bgcolor: 'rgba(37, 99, 235, 0.1)', borderRadius: 5, overflow: 'hidden', boxShadow: 'none' }}>
                        <Box sx={{ width: apps.length > 0 ? `${(getStageCount('Offer') / apps.length) * 100}%` : '0%', height: '100%', bgcolor: 'success.main' }} />
                      </Paper>
                    </Box>
                  </Stack>
                ) : (
                  <Stack spacing={2.5}>
                    <Link href={`/recruiter/proposals?jobId=${job.id}&status=submitted`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <Box sx={{ cursor: 'pointer', '&:hover': { opacity: 0.85 } }}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, textDecoration: 'underline' }}>Submitted Proposals</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>{submittedCount}</Typography>
                        </Stack>
                        <Paper sx={{ height: 10, bgcolor: 'rgba(13, 148, 136, 0.1)', borderRadius: 5, overflow: 'hidden', boxShadow: 'none' }}>
                          <Box sx={{ width: `${submittedRatio}%`, height: '100%', bgcolor: 'secondary.main' }} />
                        </Paper>
                      </Box>
                    </Link>

                    <Link href={`/recruiter/proposals?jobId=${job.id}&status=shortlisted`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <Box sx={{ cursor: 'pointer', '&:hover': { opacity: 0.85 } }}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, textDecoration: 'underline' }}>Shortlisted Bids</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>{shortlistedCount}</Typography>
                        </Stack>
                        <Paper sx={{ height: 10, bgcolor: 'rgba(13, 148, 136, 0.1)', borderRadius: 5, overflow: 'hidden', boxShadow: 'none' }}>
                          <Box sx={{ width: `${shortlistedRatio}%`, height: '100%', bgcolor: 'secondary.main' }} />
                        </Paper>
                      </Box>
                    </Link>

                    <Link href={`/recruiter/proposals?jobId=${job.id}&status=accepted`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <Box sx={{ cursor: 'pointer', '&:hover': { opacity: 0.85 } }}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, textDecoration: 'underline' }}>Accepted Hires</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>{acceptedCount}</Typography>
                        </Stack>
                        <Paper sx={{ height: 10, bgcolor: 'rgba(13, 148, 136, 0.1)', borderRadius: 5, overflow: 'hidden', boxShadow: 'none' }}>
                          <Box sx={{ width: `${acceptedRatio}%`, height: '100%', bgcolor: 'success.main' }} />
                        </Paper>
                      </Box>
                    </Link>

                    <Box sx={{ mt: 1, pt: 1.5, borderTop: '1px dashed #e2e8f0', textAlign: 'center' }}>
                      <Link href={`/recruiter/freelancers?skills=${job.skills?.map((s: any) => s.skill?.name).filter(Boolean).join(',')}`} style={{ textDecoration: 'none' }}>
                        <Button color="secondary" size="small" sx={{ fontWeight: 700, textTransform: 'none' }}>
                          Not enough bids? Invite freelancers directly →
                        </Button>
                      </Link>
                    </Box>
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Freelance Active Contract Summary (if accepted) */}
            {job.jobType === 'FREELANCE' && associatedContract && (
              <Card sx={{ borderRadius: 4, borderLeft: '5px solid #0d9488', borderTop: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 850, color: 'secondary.main', mb: 1 }}>ACTIVE CONTRACT</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Freelancer: {associatedContract.freelancer?.user?.fullName || 'Freelancer'}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Status: <strong>{totalMilestones > 0 ? `Milestone ${Math.min(totalMilestones, paidMilestones + 1)} of ${totalMilestones}` : 'No Milestones'}</strong> · ₹{releasedAmount.toLocaleString()} released so far
                  </Typography>
                  <Paper sx={{ height: 8, bgcolor: 'rgba(13, 148, 136, 0.1)', borderRadius: 4, overflow: 'hidden', mb: 2, boxShadow: 'none' }}>
                    <Box sx={{ width: `${milestoneProgressRatio}%`, height: '100%', bgcolor: 'secondary.main' }} />
                  </Paper>
                  <Link href={`/recruiter/contracts/${associatedContract.id}`} style={{ textDecoration: 'none' }}>
                    <Button size="small" variant="outlined" color="secondary" fullWidth>
                      View Contract Workspace
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* AI Shortlist Preview */}
            <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>AI Shortlist Preview</Typography>
                  <Link href={`/recruiter/jobs/${id}/candidates`} style={{ textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700, color: '#2563eb' }}>
                    View Full
                  </Link>
                </Stack>

                 <Stack spacing={1.5}>
                  {(shortlist || []).slice(0, 5).map(({ candidate, score }: any) => (
                    <Stack key={candidate.id} direction="row" alignItems="center" spacing={1.5} sx={{ p: 1, borderRadius: 2, '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
                      <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark', width: 32, height: 32, fontSize: '0.85rem' }}>
                        {candidate.user?.fullName?.[0] || '?'}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{candidate.user?.fullName || 'Anonymous'}</Typography>
                        <Typography variant="caption" color="text.secondary">{candidate.location}</Typography>
                      </Box>
                      <Chip label={`${score}%`} color={Number(score) >= 80 ? 'success' : Number(score) >= 60 ? 'warning' : 'default'} size="small" sx={{ fontWeight: 700 }} />
                    </Stack>
                  ))}
                  {(!shortlist || shortlist.length === 0) && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 2 }}>
                      No matches scored yet.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Performance Stats */}
            <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Performance Metrics</Typography>

                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Views (last 7 days)</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{viewCount}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      {job.jobType === 'FREELANCE' ? 'Proposals Received' : 'Applications Received'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{apps.length}</Typography>
                  </Stack>
                  {job.jobType === 'FREELANCE' ? (
                    <>
                      <Box sx={{ mt: 1 }}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">Average Bid vs Budget</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: 'success.main' }}>
                            {avgBid > 0 ? `₹${avgBid.toLocaleString()} avg` : '—'}
                          </Typography>
                        </Stack>
                        {avgBid > 0 && (
                          <>
                            <Paper sx={{ height: 6, bgcolor: 'rgba(15, 23, 42, 0.06)', borderRadius: 3, overflow: 'hidden', boxShadow: 'none', position: 'relative', my: 1 }}>
                              {/* Posted Budget capacity block */}
                              <Box sx={{ width: '100%', height: '100%', bgcolor: 'rgba(13, 148, 136, 0.12)' }} />
                              {/* Avg Bid filling bar */}
                              <Box sx={{ width: `${bidRatio}%`, height: '100%', bgcolor: 'secondary.main', position: 'absolute', top: 0, left: 0 }} />
                            </Paper>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                Avg Bid: ₹{avgBid.toLocaleString()}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                Budget: ₹{budgetVal.toLocaleString()}
                              </Typography>
                            </Stack>
                          </>
                        )}
                      </Box>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Time to First Proposal</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{timeToFirst}</Typography>
                      </Stack>
                    </>
                  ) : (
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Conversion Rate</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{conversionRate}%</Typography>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Quick Actions</Typography>
                <Stack spacing={1}>
                  {job.jobType === 'FULL_TIME' ? (
                    <>
                      <Link href={`/recruiter/jobs/${id}/pipeline`} style={{ textDecoration: 'none', width: '100%' }}>
                        <Button variant="outlined" fullWidth sx={{ justifyContent: 'flex-start', py: 1, fontWeight: 700 }}>
                          Go to Kanban Pipeline
                        </Button>
                      </Link>
                      <Link href="/recruiter/interviews" style={{ textDecoration: 'none', width: '100%' }}>
                        <Button variant="outlined" fullWidth sx={{ justifyContent: 'flex-start', py: 1, fontWeight: 700 }}>
                          View Interviews Desk
                        </Button>
                      </Link>
                      <Link href="/recruiter/offers" style={{ textDecoration: 'none', width: '100%' }}>
                        <Button variant="outlined" fullWidth sx={{ justifyContent: 'flex-start', py: 1, fontWeight: 700 }}>
                          View Active Offers
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link href={`/recruiter/proposals?jobId=${id}`} style={{ textDecoration: 'none', width: '100%' }}>
                        <Button variant="outlined" color="secondary" fullWidth sx={{ justifyContent: 'flex-start', py: 1, fontWeight: 700 }}>
                          View All Proposals
                        </Button>
                      </Link>
                      {associatedContract && (
                        <Link href={`/recruiter/contracts/${associatedContract.id}`} style={{ textDecoration: 'none', width: '100%' }}>
                          <Button variant="outlined" color="secondary" fullWidth sx={{ justifyContent: 'flex-start', py: 1, fontWeight: 700 }}>
                            Go to Contract Workspace
                          </Button>
                        </Link>
                      )}
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* MODALS */}
      {/* Extend Deadline Modal */}
      <Dialog open={extendModal} onClose={() => setExtendModal(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>Extend Application Deadline</DialogTitle>
        <DialogContent>
          <TextField
            type="date"
            InputLabelProps={{ shrink: true }}
            fullWidth
            value={newDeadline}
            onChange={(e) => setNewDeadline(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setExtendModal(false)} disabled={isExtending}>Cancel</Button>
          <Button variant="contained" onClick={handleExtendDeadline} disabled={isExtending}>
            {isExtending ? 'Saving...' : 'Save Deadline'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Actions Modal */}
      <Dialog open={confirmAction !== null} onClose={() => setConfirmAction(null)}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {confirmAction === 'CLOSE' && 'Close Job Posting'}
          {confirmAction === 'CANCEL' && (job.jobType === 'FREELANCE' ? 'Cancel Project Posting' : 'Cancel Job Posting')}
          {confirmAction === 'DUPLICATE' && 'Duplicate Job Posting'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.primary' }}>
            {confirmAction === 'CLOSE' && 'Are you sure you want to CLOSE this job posting? Candidates will no longer be able to apply.'}
            {confirmAction === 'DUPLICATE' && 'This will copy the job details into a new Draft posting.'}
            {confirmAction === 'CANCEL' && (
              job.jobType === 'FREELANCE' ? (
                (id === 'job-3' || job.title.includes('Escrow')) ? (
                  <span>
                    This project has an active contract.
                    <br /><br />
                    Cancelling the posting will not affect the ongoing contract with <strong>Aarav Sharma</strong> — that engagement continues independently. This will only stop the posting from accepting further proposals and mark it as Cancelled.
                  </span>
                ) : (
                  'Cancelling this project will withdraw it and notify all pending applicants that the project was cancelled.'
                )
              ) : (
                'WARNING: Canceling this job will automatically reject all in-progress applications with the reason "Job was cancelled by recruiter". This action cannot be undone.'
              )
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          {confirmAction === 'CANCEL' && job.jobType === 'FREELANCE' ? (
            (id === 'job-3' || job.title.includes('Escrow')) ? (
              <>
                <Button onClick={() => setConfirmAction(null)} sx={{ fontWeight: 700 }}>Keep Posting Open</Button>
                <Button variant="contained" color="error" onClick={handleAction} sx={{ fontWeight: 700 }}>
                  Cancel Posting Anyway
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => setConfirmAction(null)} sx={{ fontWeight: 700 }}>Go Back</Button>
                <Button variant="contained" color="error" onClick={handleAction} sx={{ fontWeight: 700 }}>
                  Cancel Project
                </Button>
              </>
            )
          ) : (
            <>
              <Button onClick={() => setConfirmAction(null)} sx={{ fontWeight: 700 }}>Cancel</Button>
              <Button
                variant="contained"
                color={confirmAction === 'CANCEL' ? 'error' : confirmAction === 'CLOSE' ? 'warning' : 'primary'}
                onClick={handleAction}
                sx={{ fontWeight: 700 }}
              >
                {confirmAction === 'CLOSE' && 'Close'}
                {confirmAction === 'CANCEL' && 'Cancel'}
                {confirmAction === 'DUPLICATE' && 'Duplicate'}
              </Button>
            </>
          )}
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
