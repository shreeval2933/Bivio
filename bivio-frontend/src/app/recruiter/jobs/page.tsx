'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Tabs,
  Tab,
  Box,
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
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  InputAdornment,
  Pagination,
  Alert,
  Divider
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import InfoIcon from '@mui/icons-material/Info';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DescriptionIcon from '@mui/icons-material/Description';
import WorkIcon from '@mui/icons-material/Work';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import {
  useGetRecruiterJobsQuery,
  useCloseJobMutation,
  useCancelJobMutation,
  useDuplicateJobMutation,
} from '@/store/api/jobsApi';
import type { Job, JobStatus, JobType } from '@/types';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatCurrency, formatTimeAgo } from '@/lib/format';

export default function RecruiterJobsPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useGetRecruiterJobsQuery();
  const jobs = data?.data ?? [];

  const [closeJob] = useCloseJobMutation();
  const [cancelJob] = useCancelJobMutation();
  const [duplicateJob] = useDuplicateJobMutation();

  const [activeTab, setActiveTab] = useState<string>('OPEN'); // Default landing tab: Open
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'FULL_TIME' | 'FREELANCE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('NEWEST');

  // Selection/Modals
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [confirmAction, setConfirmAction] = useState<'CLOSE' | 'CANCEL' | 'DUPLICATE' | null>(null);
  const [postChooserOpen, setPostChooserOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const cardsPerPage = 2;

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
    setPage(1);
  };

  const handleConfirmClose = async () => {
    if (!selectedJob) return;
    setActionError(null);

    try {
      if (confirmAction === 'CLOSE') {
        await closeJob(selectedJob.id).unwrap();
      } else if (confirmAction === 'CANCEL') {
        // Auto-reject of in-progress full-time applications, and the
        // soft-close-instead-of-cancel behavior for freelance jobs with an
        // active contract, both happen server-side (jobs.service.ts's cancel()).
        await cancelJob({ id: selectedJob.id }).unwrap();
      } else if (confirmAction === 'DUPLICATE') {
        const newJob = await duplicateJob(selectedJob.id).unwrap();
        setConfirmAction(null);
        setSelectedJob(null);
        router.push(`/recruiter/jobs/new?id=${newJob.id}`);
        return;
      }
    } catch (err: any) {
      setActionError(err?.data?.message ?? 'Something went wrong. Please try again.');
      return;
    }

    setConfirmAction(null);
    setSelectedJob(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'success';
      case 'DRAFT': return 'info';
      case 'PENDING_PAYMENT': return 'warning';
      case 'CONFIGURING': return 'secondary';
      case 'CLOSED': return 'default';
      case 'CANCELLED': return 'error';
      default: return 'default';
    }
  };

  // Filter & Sort
  const getProcessedJobs = () => {
    let list = [...jobs];

    // Status Tab filter
    if (activeTab !== 'ALL') {
      list = list.filter(j => j.status === activeTab);
    }

    // Type filter
    if (typeFilter !== 'ALL') {
      list = list.filter(j => j.jobType === typeFilter);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(j => {
        const titleMatch = j.title.toLowerCase().includes(q);
        const deptMatch = j.department?.toLowerCase().includes(q);
        const skillsMatch = j.skills?.some(s => s.skill.name.toLowerCase().includes(q));
        return titleMatch || deptMatch || skillsMatch;
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'NEWEST') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'OLDEST') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'MOST_APPLICANTS') {
        const countA = a.jobType === 'FULL_TIME' ? (a.applicantCount ?? 0) : (a.proposalCount ?? 0);
        const countB = b.jobType === 'FULL_TIME' ? (b.applicantCount ?? 0) : (b.proposalCount ?? 0);
        return countB - countA;
      }
      if (sortBy === 'DEADLINE_SOONEST') {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      return 0;
    });

    return list;
  };

  const filteredJobs = getProcessedJobs();
  const paginatedJobs = filteredJobs.slice((page - 1) * cardsPerPage, page * cardsPerPage);
  const totalPages = Math.ceil(filteredJobs.length / cardsPerPage);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 855, mb: 1, fontFamily: 'Outfit, sans-serif', color: 'text.primary' }}>
            Your Job Postings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your recruitment campaigns, monitor applications, and track freelance contracts.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setPostChooserOpen(true)}
          sx={{ borderRadius: 3, fontWeight: 700, px: 3, py: 1 }}
        >
          Post a Job
        </Button>
      </Stack>

      {/* Filter and Control Bar */}
      <Card sx={{ borderRadius: 4, mb: 4, p: 2, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <Grid container spacing={2} alignItems="center" sx={{ display: 'flex', flexWrap: 'wrap' }}>
          <Grid item xs={12} sm={4}>
            <Stack direction="row" spacing={1} sx={{ display : 'flex' , flexWrap : 'wrap', gap : 1}}>
              <Chip
                label="All Types"
                color={typeFilter === 'ALL' ? 'primary' : 'default'}
                onClick={() => { setTypeFilter('ALL'); setPage(1); }}
                sx={{ fontWeight: 600, cursor: 'pointer' }}
              />
              <Chip
                label="Full-time"
                color={typeFilter === 'FULL_TIME' ? 'primary' : 'default'}
                onClick={() => { setTypeFilter('FULL_TIME'); setPage(1); }}
                sx={{ fontWeight: 600, cursor: 'pointer' }}
              />
              <Chip
                label="Freelance"
                color={typeFilter === 'FREELANCE' ? 'primary' : 'default'}
                onClick={() => { setTypeFilter('FREELANCE'); setPage(1); }}
                sx={{ fontWeight: 600, cursor: 'pointer' }}
              />
            </Stack>
          </Grid>
          
          <Grid item xs={12} sm={5}>
            <TextField
              size="small"
              placeholder="Search by title, department, skill..."
              fullWidth
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField
              select
              size="small"
              label="Sort By"
              fullWidth
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            >
              <MenuItem value="NEWEST">Newest Created</MenuItem>
              <MenuItem value="OLDEST">Oldest Created</MenuItem>
              <MenuItem value="MOST_APPLICANTS">Most Applicants / Bids</MenuItem>
              <MenuItem value="DEADLINE_SOONEST">Deadline Soonest</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Card>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 4,
          borderBottom: '1px solid #e2e8f0',
          '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minWidth: 100 }
        }}
      >
        <Tab label="All" value="ALL" />
        <Tab label="Open" value="OPEN" />
        <Tab label="Draft" value="DRAFT" />
        <Tab label="Configuring" value="CONFIGURING" />
        <Tab label="Closed" value="CLOSED" />
        <Tab label="Cancelled" value="CANCELLED" />
      </Tabs>

      {/* Loading / error states */}
      {isLoading ? (
        <Stack spacing={2} sx={{ mb: 4 }}>
          {[1, 2].map((i) => (
            <Card key={i} sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none', p: 3 }}>
              <Box sx={{ height: 100, bgcolor: '#f1f5f9', borderRadius: 2 }} />
            </Card>
          ))}
        </Stack>
      ) : isError ? (
        <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>
          Could not load your job postings. Please try again.
        </Alert>
      ) : jobs.length === 0 ? (
        // First-time Recruiter state
        <Card sx={{ textAlign: 'center', py: 8, px: 3, borderRadius: 4, border: '1.5px dashed #cbd5e1', boxShadow: 'none' }}>
          <WorkIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
            Post your first job
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
            Whether you're hiring full-time or looking for freelance talent, get started in a few steps.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setPostChooserOpen(true)}
            sx={{ borderRadius: 3, fontWeight: 700, px: 4, py: 1.25 }}
          >
            Post a Job
          </Button>
        </Card>
      ) : filteredJobs.length === 0 ? (
        // Tab / Filter has no results
        <Card sx={{ textAlign: 'center', py: 8, px: 3, borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          {typeFilter === 'FREELANCE' && jobs.filter(j => j.jobType === 'FREELANCE').length === 0 ? (
            // Type-filtered empty state
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                You haven't posted any freelance projects yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Find immediate contract talent and pay securely through milestone escrows.
              </Typography>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<AddIcon />}
                onClick={() => router.push('/recruiter/jobs/new?type=freelance')}
              >
                Post a Freelance Project
              </Button>
            </Box>
          ) : (
            // Plain tab empty state
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                {activeTab === 'CANCELLED' && 'No cancelled postings.'}
                {activeTab === 'DRAFT' && 'No draft postings.'}
                {activeTab === 'CONFIGURING' && 'No postings in configuring state.'}
                {activeTab === 'CLOSED' && 'No closed postings.'}
                {activeTab === 'OPEN' && 'No live active postings.'}
                {activeTab === 'ALL' && 'No matching postings found.'}
              </Typography>
            </Box>
          )}
        </Card>
      ) : (
        // Job Listings Cards List
        <Stack spacing={3} sx={{ mb: 4 }}>
          {paginatedJobs.map((job) => {
            const isFullTime = job.jobType === 'FULL_TIME';
            const isConfiguring = (job.status as string) === 'CONFIGURING';
            const isDraft = job.status === 'DRAFT';
            const isOpen = job.status === 'OPEN';

            // Metrics — applicantCount/proposalCount are computed server-side
            // (jobs.service.ts's listForRecruiter maps Prisma's _count onto
            // these flat fields), so no per-card fetch loop is needed.
            const applicantsCount = job.jobType === 'FULL_TIME' ? (job.applicantCount ?? 0) : (job.proposalCount ?? 0);
            // TODO: offers aren't job-scoped in the backend yet (Offer links to
            // Application, not Job directly) — the hiring module's offers
            // endpoint needs a per-job aggregate before this can be real.
            const offersCount = 0;

            // Pipeline stage snapshot — needs the pipeline module's per-stage
            // counts endpoint; left at a generic placeholder until that's built.
            const pipelineStages = '';

            // TODO: freelance contract summary needs GET /contracts?jobId= from
            // the freelance module, not yet implemented — see backend README.
            const isFreelanceContractActive = false;
            const contractDetails = null as { status: string; released: string } | null;

            return (
              <Card
                key={job.id}
                sx={{
                  borderRadius: 4,
                  border: '1px solid #e2e8f0',
                  boxShadow: 'none',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: isFullTime ? 'primary.light' : 'secondary.light',
                    boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.08)'
                  }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
                    <Box>
                      {/* Badges row */}
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                        <Chip
                          label={isFullTime ? 'Full-Time' : 'Freelance'}
                          color={isFullTime ? 'primary' : 'secondary'}
                          size="small"
                          sx={{ fontWeight: 700, borderRadius: 2 }}
                        />
                        <StatusBadge domain="job" status={job.status} />
                        {job.deadline ? (
                          <Chip
                            label={isFullTime 
                              ? `Apply by ${new Date(job.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                              : `Accepting proposals until ${new Date(job.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                            }
                            size="small"
                            variant="outlined"
                          />
                        ) : (
                          <Chip label={isFullTime ? "No deadline" : "No proposal deadline"} size="small" variant="outlined" sx={{ color: 'text.secondary' }} />
                        )}
                      </Stack>

                      {/* Job Title */}
                      <Link
                        href={isDraft || isConfiguring ? `/recruiter/jobs/new?id=${job.id}` : `/recruiter/jobs/${job.id}`}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 800, '&:hover': { color: isFullTime ? 'primary.main' : 'secondary.main' } }}>
                          {job.title}
                        </Typography>
                      </Link>

                      {/* Location & Department */}
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
                        {isFullTime ? (
                          `${job.department || 'Engineering'} · ${job.location} ${job.isRemote ? '· Remote' : ''}`
                        ) : (
                          `${job.location || 'Remote'} · Freelance Project`
                        )}
                      </Typography>

                      {/* Salary / Budget */}
                      <Typography variant="body2" sx={{ mt: 1, fontWeight: 700, color: 'text.primary' }}>
                        {isFullTime ? (
                          job.salaryVisible ? (
                            `${job.currency || 'INR'} ${parseInt(job.salaryMin || '0').toLocaleString()} – ${parseInt(job.salaryMax || '0').toLocaleString()} /yr`
                          ) : (
                            'Competitive Salary'
                          )
                        ) : (
                          job.budget ? (
                            job.budgetType === 'HOURLY' ? (
                              // NOTE: the wizard's freelance step collects a
                              // separate hourlyMin/hourlyMax range, but the
                              // real Job schema only has a single `budget`
                              // field for hourly rate — there's no min/max
                              // range column. Displaying job.budget as a
                              // single rate here until that product
                              // decision (single rate vs. a range) is made
                              // and, if a range is wanted, the schema is
                              // extended to support it.
                              `${job.currency || 'INR'} ${parseInt(job.budget || '0').toLocaleString()} /hr`
                            ) : (
                              `${job.currency || 'INR'} ${parseInt(job.budget || '0').toLocaleString()} budget`
                            )
                          ) : (
                            'Project Budget Under Review'
                          )
                        )}
                      </Typography>
                    </Box>

                    {/* Right side stats metrics */}
                    {!isConfiguring && !isDraft && (
                      <Stack direction="row" spacing={3} alignItems="center" sx={{ alignSelf: 'flex-start' }}>
                        <Box sx={{ textAlign: 'center', minWidth: 80 }}>
                          <Typography variant="h5" sx={{ fontWeight: 800 }}>
                            {isFullTime ? applicantsCount : applicantsCount}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                            {isFullTime ? 'APPLICANTS' : 'PROPOSALS'}
                          </Typography>
                        </Box>

                        {isFullTime ? (
                          <>
                            {offersCount > 0 && (
                              <Box sx={{ textAlign: 'center', minWidth: 80 }}>
                                <Typography variant="h5" sx={{ fontWeight: 800, color: 'success.main' }}>
                                  {offersCount}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                  OFFERS
                                </Typography>
                              </Box>
                            )}
                          </>
                        ) : (
                          <>
                            <Box sx={{ textAlign: 'center', minWidth: 80 }}>
                              <Typography variant="h5" sx={{ fontWeight: 800, color: isFreelanceContractActive ? 'success.main' : 'text.disabled' }}>
                                {isFreelanceContractActive ? '1' : '0'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                CONTRACTS
                              </Typography>
                            </Box>
                          </>
                        )}
                      </Stack>
                    )}
                  </Stack>

                  {/* Complete Setup Banners */}
                  {isConfiguring && (
                    <Alert
                      severity="warning"
                      icon={<PlayArrowIcon />}
                      action={
                        <Link href={`/recruiter/jobs/new?id=${job.id}&step=2`} style={{ textDecoration: 'none' }}>
                          <Button size="small" variant="contained" color="warning" sx={{ fontWeight: 700 }}>
                            Continue Setup
                          </Button>
                        </Link>
                      }
                      sx={{ mb: 2, borderRadius: 2 }}
                    >
                      {isFullTime ? 'Complete stage setup to publish' : 'Complete AI weightage to publish'}
                    </Alert>
                  )}

                  {/* Proposals & Contracts Counts Sub-row */}
                  {!isConfiguring && !isDraft && !isFullTime && (
                    <Stack direction="row" spacing={2.5} sx={{ mb: 1.5 }} color="text.secondary">
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700, fontSize: '0.85rem' }}>
                        📨 {applicantsCount} proposals
                      </Typography>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700, fontSize: '0.85rem' }}>
                        💼 {isFreelanceContractActive ? '1 contract active' : '0 contracts active'}
                      </Typography>
                    </Stack>
                  )}

                  {/* Full time pipeline snap or Freelance active contract details */}
                  {isOpen && isFullTime && pipelineStages && (
                    <Box sx={{ bgcolor: 'rgba(37, 99, 235, 0.02)', p: 1.5, borderRadius: 2, border: '1px solid rgba(37, 99, 235, 0.08)', mb: 2 }}>
                      <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700 }}>
                        Pipeline Snapshot: {pipelineStages}
                      </Typography>
                    </Box>
                  )}

                  {contractDetails && (
                    <Box sx={{ bgcolor: 'rgba(13, 148, 136, 0.02)', p: 1.5, borderRadius: 2, border: '1px solid rgba(13, 148, 136, 0.08)', mb: 2 }}>
                      <Typography variant="caption" color="secondary.main" sx={{ fontWeight: 800 }}>
                        Contract: {contractDetails.status} · {contractDetails.released} released
                      </Typography>
                    </Box>
                  )}

                  {/* Actions Row */}
                  <Divider sx={{ my: 1.5 }} />
                  <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      Posted {formatTimeAgo(job.createdAt)}
                    </Typography>

                    <Stack direction="row" spacing={1}>
                      {/* Continue Draft Setup */}
                      {isDraft && (
                        <Link href={`/recruiter/jobs/new?id=${job.id}`} style={{ textDecoration: 'none' }}>
                          <Button size="small" variant="outlined" startIcon={<PlayArrowIcon />}>
                            Continue Draft
                          </Button>
                        </Link>
                      )}

                      {/* Primary Actions based on type */}
                      {isOpen && (
                        isFullTime ? (
                          <Link href={`/recruiter/jobs/${job.id}/pipeline`} style={{ textDecoration: 'none' }}>
                            <Button size="small" variant="contained" startIcon={<ViewColumnIcon />} sx={{ fontWeight: 700 }}>
                              View Pipeline
                            </Button>
                          </Link>
                        ) : (
                          <Stack direction="row" spacing={1}>
                            <Link href={`/recruiter/jobs/${job.id}/candidates`} style={{ textDecoration: 'none' }}>
                              <Button size="small" variant="contained" color="secondary" sx={{ fontWeight: 700 }}>
                                View Proposals
                              </Button>
                            </Link>
                            {isFreelanceContractActive && (
                              <Link href="/recruiter/contracts/con-1" style={{ textDecoration: 'none' }}>
                                <Button size="small" variant="outlined" color="secondary" startIcon={<OpenInNewIcon />} sx={{ fontWeight: 700 }}>
                                  View Contract
                                </Button>
                              </Link>
                            )}
                          </Stack>
                        )
                      )}

                      {/* View Job Details */}
                      {!isDraft && !isConfiguring && (
                        <Link href={`/recruiter/jobs/${job.id}`} style={{ textDecoration: 'none' }}>
                          <Button size="small" variant="text" sx={{ fontWeight: 700 }}>
                            View Job
                          </Button>
                        </Link>
                      )}

                      {/* Edit */}
                      {(isOpen || isDraft || isConfiguring) && (
                        !isFullTime && isFreelanceContractActive ? (
                          <Tooltip title="Cannot edit project once a contract exists.">
                            <span style={{ cursor: 'not-allowed', display: 'inline-block' }}>
                              <Button size="small" variant="text" startIcon={<EditIcon />} disabled sx={{ pointerEvents: 'none' }}>
                                Edit
                              </Button>
                            </span>
                          </Tooltip>
                        ) : isOpen ? (
                          <Link href={`/recruiter/jobs/${job.id}`} style={{ textDecoration: 'none' }}>
                            <Button size="small" variant="text" startIcon={<EditIcon />} sx={{ fontWeight: 700 }}>
                              Edit
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/recruiter/jobs/new?id=${job.id}&type=${job.jobType.toLowerCase()}`} style={{ textDecoration: 'none' }}>
                            <Button size="small" variant="text" startIcon={<EditIcon />} sx={{ fontWeight: 700 }}>
                              Edit
                            </Button>
                          </Link>
                        )
                      )}

                      {/* Duplicate */}
                      <Button size="small" variant="text" startIcon={<ContentCopyIcon />} onClick={() => { setSelectedJob(job); setConfirmAction('DUPLICATE'); }}>
                        Duplicate
                      </Button>

                      {/* Close */}
                      {isOpen && (
                        <Button size="small" variant="text" color="warning" startIcon={<CloseIcon />} onClick={() => { setSelectedJob(job); setConfirmAction('CLOSE'); }}>
                          Close
                        </Button>
                      )}

                      {/* Cancel */}
                      {(isOpen || isDraft || isConfiguring) && (
                        isFullTime ? (
                          <Button size="small" variant="text" color="error" startIcon={<DeleteIcon />} onClick={() => { setSelectedJob(job); setConfirmAction('CANCEL'); }}>
                            Cancel
                          </Button>
                        ) : (
                          <Tooltip title={isFreelanceContractActive ? 'Cannot cancel posting with active contracts.' : 'Cancel freelance project'}>
                            <span>
                              <Button
                                size="small"
                                variant="text"
                                color="error"
                                disabled={isFreelanceContractActive}
                                startIcon={<DeleteIcon />}
                                onClick={() => { setSelectedJob(job); setConfirmAction('CANCEL'); }}
                              >
                                Cancel
                              </Button>
                            </span>
                          </Tooltip>
                        )
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Pagination controls */}
      {totalPages >= 1 && (
        <Stack direction="row" justifyContent="center" sx={{ mt: 4 }}>
          <Pagination count={totalPages} page={page} onChange={(_, val) => setPage(val)} color="primary" />
        </Stack>
      )}

      {/* Post a Job Chooser Modal */}
      <Dialog open={postChooserOpen} onClose={() => setPostChooserOpen(false)} PaperProps={{ sx: { borderRadius: 4, p: 2 } }}>
        <DialogTitle sx={{ fontWeight: 800, textAlign: 'center' }}>What are you hiring for?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ textAlign: 'center', mb: 3 }}>
            Choose the workspace classification workflow for this posting.
          </DialogContentText>
          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              color="primary"
              onClick={() => {
                setPostChooserOpen(false);
                router.push('/recruiter/jobs/new?type=full_time');
              }}
              sx={{ py: 2, fontWeight: 700, borderRadius: 3 }}
            >
              Full-time Role
            </Button>
            <Typography variant="caption" align="center" color="text.secondary">
              Permanent hire, structured multi-stage stages pipeline
            </Typography>

            <Button
              variant="contained"
              size="large"
              color="secondary"
              onClick={() => {
                setPostChooserOpen(false);
                router.push('/recruiter/jobs/new?type=freelance');
              }}
              sx={{ py: 2, fontWeight: 700, borderRadius: 3 }}
            >
              Freelance Project
            </Button>
            <Typography variant="caption" align="center" color="text.secondary">
              Milestone-based contracting, escrow-protected release flow
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPostChooserOpen(false)} fullWidth>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Actions Dialogs */}
      <Dialog open={confirmAction !== null} onClose={() => setConfirmAction(null)}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {confirmAction === 'CLOSE' && 'Close Job Posting'}
          {confirmAction === 'CANCEL' && 'Cancel Job Posting'}
          {confirmAction === 'DUPLICATE' && 'Duplicate Job Posting'}
        </DialogTitle>
        <DialogContent>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {actionError}
            </Alert>
          )}
          <DialogContentText>
            {confirmAction === 'CLOSE' && 'Are you sure you want to CLOSE this posting? New applications / proposals will be blocked. Existing status remains active.'}
            {confirmAction === 'CANCEL' && 'WARNING: Canceling this posting will stop all recruitment processes. For Full-Time jobs, all in-progress applications are automatically rejected. This action cannot be undone.'}
            {confirmAction === 'DUPLICATE' && 'This will copy all specification details and parameters into a new Draft posting.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setConfirmAction(null)} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button
            variant="contained"
            color={confirmAction === 'CANCEL' ? 'error' : confirmAction === 'CLOSE' ? 'warning' : 'primary'}
            onClick={handleConfirmClose}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {confirmAction === 'CLOSE' && 'Close'}
            {confirmAction === 'CANCEL' && 'Cancel'}
            {confirmAction === 'DUPLICATE' && 'Duplicate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
