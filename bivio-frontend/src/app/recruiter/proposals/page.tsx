'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Stack,
  Box,
  Button,
  Alert,
  Chip,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Grid,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Drawer,
  Divider,
  Popover,
  CircularProgress,
} from '@mui/material';

// Icons
import StarIcon from '@mui/icons-material/Star';
import CloseIcon from '@mui/icons-material/Close';

// Types
import type { Proposal, Contract, Job, CandidateProfile } from '@/types';

// Mock DB Initializer helper
import { initializeState } from '@/mocks/recruiterState';
import * as F from '@/mocks/fixtures';

import {
  useGetProposalsQuery,
  useGetContractsQuery,
  useShortlistProposalMutation,
  useRejectProposalMutation,
  useAcceptProposalMutation,
} from '@/store/api/contractsApi';
import { useGetRecruiterJobsQuery } from '@/store/api/jobsApi';
import { useGetPublicSettingsQuery } from '@/store/api/profilesApi';

function RecruiterProposalsPageInner() {
  const searchParams = useSearchParams();
  const queryJobId = searchParams.get('jobId');
  const queryStatus = searchParams.get('status');

  const [mounted, setMounted] = useState(false);

  // RTK Query endpoints
  const { data: dbProposals, isLoading: isProposalsLoading, refetch: refetchProposals } = useGetProposalsQuery();
  const { data: dbJobs } = useGetRecruiterJobsQuery();
  const { data: dbContracts, refetch: refetchContracts } = useGetContractsQuery();
  const { data: publicSettings } = useGetPublicSettingsQuery();
  const PLATFORM_FEE_PERCENT = publicSettings?.PLATFORM_FEE_PERCENT ?? 10;

  const [shortlistProposal] = useShortlistProposalMutation();
  const [rejectProposal] = useRejectProposalMutation();
  const [acceptProposal, { isLoading: isAccepting }] = useAcceptProposalMutation();

  // Core Mock States
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

  // Filter States
  const [activeTab, setActiveTab] = useState<number>(1); // Default to 'Submitted' (index 1)
  const [selectedJobId, setSelectedJobId] = useState<string>('ALL');
  const [matchThreshold, setMatchThreshold] = useState<number>(0);
  const [sortOrder, setSortOrder] = useState<string>('BEST_MATCH');

  // Drawer / Modal States
  const [drawerCandidate, setDrawerCandidate] = useState<CandidateProfile | null>(null);
  const [activeProposal, setActiveProposal] = useState<Proposal | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('Budget mismatch');
  const [rejectNote, setRejectNote] = useState<string>('');
  const [showAcceptModal, setShowAcceptModal] = useState<boolean>(false);
  const [successContractId, setSuccessContractId] = useState<string | null>(null);

  // Score Breakdown Popover State
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [activeBreakdownProposal, setActiveBreakdownProposal] = useState<Proposal | null>(null);

  // Expand Note States
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const loadLocalData = () => {
    if (typeof window !== 'undefined') {
      const apiProps = dbProposals?.data || [];
      setProposals(apiProps);

      const apiJobs = dbJobs?.data || [];
      setJobs(apiJobs.filter(j => j.jobType?.toUpperCase() === 'FREELANCE' && j.status === 'OPEN'));

      const apiContracts = dbContracts?.data || [];
      setContracts(apiContracts);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadLocalData();
    window.addEventListener('storage', loadLocalData);
    return () => window.removeEventListener('storage', loadLocalData);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadLocalData();
    }
  }, [dbProposals, dbJobs, dbContracts, mounted]);

  useEffect(() => {
    if (queryJobId) {
      setSelectedJobId(queryJobId);
    }
    if (queryStatus) {
      const statusMap: Record<string, number> = {
        'ALL': 0,
        'SUBMITTED': 1,
        'SHORTLISTED': 2,
        'ACCEPTED': 3,
        'REJECTED': 4,
        'WITHDRAWN': 4
      };
      const tabIndex = statusMap[queryStatus.toUpperCase()];
      if (tabIndex !== undefined) {
        setActiveTab(tabIndex);
      }
    }
  }, [queryJobId, queryStatus]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleToggleExpandNote = (propId: string) => {
    setExpandedNotes(prev => ({ ...prev, [propId]: !prev[propId] }));
  };

  // Score Popover handlers
  const handleOpenBreakdown = (event: React.MouseEvent<HTMLElement>, prop: Proposal) => {
    setPopoverAnchor(event.currentTarget);
    setActiveBreakdownProposal(prop);
  };

  const handleCloseBreakdown = () => {
    setPopoverAnchor(null);
    setActiveBreakdownProposal(null);
  };

  // Action: Shortlist Bid
  const handleShortlist = async (proposalId: string) => {
    try {
      await shortlistProposal(proposalId).unwrap();
      refetchProposals();
    } catch (err) {
      console.error('Failed to shortlist via API:', err);
    }
    if (typeof window !== 'undefined') {
      const updated = proposals.map(p => {
        if (p.id === proposalId) return { ...p, status: 'SHORTLISTED' as any };
        return p;
      });
      localStorage.setItem('bivio_recruiter_proposals', JSON.stringify(updated));
      setProposals(updated);
      window.dispatchEvent(new Event('storage'));
    }
  };

  // Action: Reject Bid Dialog
  const handleOpenReject = (prop: Proposal) => {
    setActiveProposal(prop);
    setRejectReason('Budget mismatch');
    setRejectNote('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (activeProposal) {
      try {
        await rejectProposal({ id: activeProposal.id, reason: rejectReason, note: rejectNote }).unwrap();
        refetchProposals();
      } catch (err) {
        console.error('Failed to reject via API:', err);
      }
      if (typeof window !== 'undefined') {
        const updated = proposals.map(p => {
          if (p.id === activeProposal.id) return { ...p, status: 'REJECTED' as any };
          return p;
        });
        localStorage.setItem('bivio_recruiter_proposals', JSON.stringify(updated));
        setProposals(updated);
        setShowRejectModal(false);
        setActiveProposal(null);
        window.dispatchEvent(new Event('storage'));
      }
    }
  };

  // Action: Accept Bid Dialog
  const handleOpenAccept = (prop: Proposal) => {
    setActiveProposal(prop);
    setShowAcceptModal(true);
  };

  const handleConfirmAccept = async () => {
    if (activeProposal) {
      const apiMilestones = (activeProposal as any).milestones?.map((m: any) => ({
        title: m.title,
        amount: Number(m.amount),
        sequence: m.sequence
      })) || [
        {
          title: 'Initial Deliverable',
          amount: Number(activeProposal.bidAmount),
          sequence: 1
        }
      ];

      let newContractId = `con-${Date.now()}`;
      try {
        const newContract = await acceptProposal({
          id: activeProposal.id
        }).unwrap();
        newContractId = newContract.id;
        setSuccessContractId(newContractId);
        refetchProposals();
        refetchContracts();
      } catch (err) {
        console.error('Failed to accept proposal via API:', err);
      }

      if (typeof window !== 'undefined') {
        const updatedProps = proposals.map(p => {
          if (p.id === activeProposal.id) return { ...p, status: 'ACCEPTED' as any, contractId: newContractId };
          return p;
        });
        localStorage.setItem('bivio_recruiter_proposals', JSON.stringify(updatedProps));

        // Create new contract record
        const clientProfile = F.RECRUITER_PROFILE;
        
        const newContract: Contract = {
          id: newContractId,
          jobId: activeProposal.jobId,
          proposalId: activeProposal.id,
          clientId: 'rec-1',
          freelancerId: activeProposal.candidateId,
          agreedAmount: activeProposal.bidAmount,
          currency: activeProposal.currency || 'INR',
          platformFeePercent: '10.00',
          status: 'PENDING_FUNDING',
          startedAt: new Date().toISOString(),
          endedAt: null,
          createdAt: new Date().toISOString(),
          job: { id: activeProposal.jobId, title: activeProposal.job?.title || 'Freelance Project' },
          client: clientProfile,
          freelancer: activeProposal.candidate || F.CANDIDATE_PROFILE,
          milestones: (activeProposal as any).milestones || [
            {
              id: `ms-${Date.now()}-1`,
              contractId: newContractId,
              title: 'Initial Deliverable',
              description: 'Core project structure and specifications config.',
              amount: activeProposal.bidAmount,
              sequence: 1,
              status: 'PENDING',
              submissions: []
            }
          ]
        };

        const updatedContracts = [...contracts, newContract];
        localStorage.setItem('bivio_recruiter_contracts', JSON.stringify(updatedContracts));
        setContracts(updatedContracts);
        setProposals(updatedProps);
        setShowAcceptModal(false);
        setActiveProposal(null);
        window.dispatchEvent(new Event('storage'));
      }
    }
  };

  // Filtered and Sorted proposals
  const processedProposals = useMemo(() => {
    let list = [...proposals];

    // Job Filter
    if (selectedJobId !== 'ALL') {
      list = list.filter(p => p.jobId === selectedJobId);
    }

    // Match Score filter
    if (matchThreshold > 0) {
      list = list.filter(p => parseFloat(p.matchScore || '0') >= matchThreshold);
    }

    // Status Tab filter
    if (activeTab === 0) {
      // All
    } else if (activeTab === 1) {
      list = list.filter(p => p.status === 'SUBMITTED');
    } else if (activeTab === 2) {
      list = list.filter(p => p.status === 'SHORTLISTED');
    } else if (activeTab === 3) {
      list = list.filter(p => p.status === 'ACCEPTED');
    } else if (activeTab === 4) {
      list = list.filter(p => p.status === 'REJECTED' || (p.status as string) === 'WITHDRAWN');
    }

    // Sorting
    list.sort((a, b) => {
      if (sortOrder === 'BEST_MATCH') {
        return parseFloat(b.matchScore || '0') - parseFloat(a.matchScore || '0');
      }
      if (sortOrder === 'NEWEST') {
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }
      if (sortOrder === 'LOWEST_BID') {
        return parseFloat(a.bidAmount) - parseFloat(b.bidAmount);
      }
      if (sortOrder === 'HIGHEST_BID') {
        return parseFloat(b.bidAmount) - parseFloat(a.bidAmount);
      }
      return 0;
    });

    return list;
  }, [proposals, activeTab, selectedJobId, matchThreshold, sortOrder]);

  if (!mounted || isProposalsLoading) {
    if (!mounted) return null;
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading proposals...
          </Typography>
        </Stack>
      </Container>
    );
  }

  // Selected job name for empty states
  const filterJobName = selectedJobId !== 'ALL' ? jobs.find(j => j.id === selectedJobId)?.title : '';

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      {/* Page Title */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 855, fontFamily: 'Outfit, sans-serif', mb: 1, color: 'secondary.main' }}>
          Freelance Proposals
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Answer: "who has bid on my projects, and which ones are worth pursuing" — a triage-and-decide surface.
        </Typography>
      </Box>

      {/* Success Banner */}
      {successContractId && (
        <Alert
          severity="success"
          sx={{ mb: 4, borderRadius: 3, fontWeight: 700 }}
          action={
            <Link href={`/recruiter/contracts/${successContractId}`} style={{ textDecoration: 'none' }}>
              <Button size="small" variant="contained" color="success" sx={{ fontWeight: 800 }}>
                View Contract
              </Button>
            </Link>
          }
        >
          Proposal accepted successfully! Contract created for this engagement.
        </Alert>
      )}

      {/* Filters and Search controls */}
      <Card sx={{ p: 3, mb: 4, borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <Grid container spacing={3} alignItems="center">
          {/* Job Dropdown */}
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="job-select-label">Filter by Posting</InputLabel>
              <Select
                labelId="job-select-label"
                value={selectedJobId}
                label="Filter by Posting"
                onChange={(e) => setSelectedJobId(e.target.value)}
                sx={{ fontWeight: 700 }}
              >
                <MenuItem value="ALL">All Postings</MenuItem>
                {jobs.filter(j => j.jobType?.toUpperCase() === 'FREELANCE' && j.status === 'OPEN').map((job) => (
                  <MenuItem key={job.id} value={job.id}>{job.title}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Sort Order */}
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="sort-select-label">Sort order</InputLabel>
              <Select
                labelId="sort-select-label"
                value={sortOrder}
                label="Sort order"
                onChange={(e) => setSortOrder(e.target.value)}
                sx={{ fontWeight: 700 }}
              >
                <MenuItem value="BEST_MATCH">Best Match</MenuItem>
                <MenuItem value="NEWEST">Newest Submissions</MenuItem>
                <MenuItem value="LOWEST_BID">Lowest Bid Amount</MenuItem>
                <MenuItem value="HIGHEST_BID">Highest Bid Amount</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Match Score Threshold Slider */}
          <Grid item xs={12} sm={4}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="caption" sx={{ fontWeight: 800, minWidth: 90 }}>
                MIN MATCH: {matchThreshold > 0 ? `${matchThreshold}%` : 'ALL'}
              </Typography>
              <Slider
                value={matchThreshold}
                onChange={(_, val) => setMatchThreshold(val as number)}
                min={0}
                max={90}
                step={10}
                valueLabelDisplay="auto"
              />
            </Stack>
          </Grid>
        </Grid>
      </Card>

      {/* Tabs list */}
      <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4, mb: 4, overflow: 'hidden', boxShadow: 'none' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="secondary"
          textColor="secondary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="All Bids" sx={{ fontWeight: 700, px: 3, py: 2 }} />
          <Tab label="Submitted" sx={{ fontWeight: 700, px: 3, py: 2 }} />
          <Tab label="Shortlisted" sx={{ fontWeight: 700, px: 3, py: 2 }} />
          <Tab label="Accepted" sx={{ fontWeight: 700, px: 3, py: 2 }} />
          <Tab label="Rejected / Withdrawn" sx={{ fontWeight: 700, px: 3, py: 2 }} />
        </Tabs>
      </Card>

      {/* Proposals list */}
      <Stack spacing={3}>
        {processedProposals.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center', bgcolor: '#fff', border: '1px dashed #cbd5e1', borderRadius: 4 }}>
            {selectedJobId !== 'ALL' && proposals.filter(p => p.jobId === selectedJobId).length === 0 ? (
              <>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
                  No proposals yet for {filterJobName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Freelancers have not submitted bids on this specific job posting yet.
                </Typography>
              </>
            ) : activeTab === 2 ? (
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>No shortlisted proposals.</Typography>
            ) : (
              <>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
                  No proposals received yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Proposals will appear here as freelancers bid on your projects.
                </Typography>
              </>
            )}
          </Box>
        ) : (
          processedProposals.map((p) => {
            const scoreVal = Math.round(parseFloat(p.matchScore || '70'));
            
            // Cover letter truncation
            const hasLongCover = p.coverLetter.length > 150;
            const isExpanded = expandedNotes[p.id] || false;
            const displayCover = isExpanded ? p.coverLetter : `${p.coverLetter.slice(0, 150)}${hasLongCover ? '...' : ''}`;

            // Budget Comparison
            const isHourly = (p.job as any)?.budgetType === 'HOURLY';
            const bid = isHourly ? (parseFloat(p.bidAmount) / (Number((p as any).estimatedHours) || 1)) : parseFloat(p.bidAmount);
            const budget = parseFloat(p.job?.budget || '0');
            const diffPct = budget > 0 ? Math.round(((bid - budget) / budget) * 100) : 0;

            // Rating & completed contracts
            const avgRating = p.candidate?.portfolio?.avgRating ?? '—';
            const totalContracts = p.candidate?.portfolio?.totalContracts ?? 0;

            return (
              <Card key={p.id} sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <CardContent sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    {/* Freelancer Avatar & Info */}
                    <Grid item xs={12} sm={8}>
                      <Stack direction="row" spacing={2.5} alignItems="flex-start">
                        <Avatar
                          sx={{ width: 50, height: 50, bgcolor: 'secondary.light', color: 'secondary.dark', fontWeight: 800, cursor: 'pointer' }}
                          onClick={() => setDrawerCandidate(p.candidate || F.CANDIDATE_PROFILE)}
                        >
                          {p.candidate?.user?.fullName?.[0] || 'A'}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: 850, cursor: 'pointer', '&:hover': { color: 'secondary.main' } }}
                              onClick={() => setDrawerCandidate(p.candidate || F.CANDIDATE_PROFILE)}
                            >
                              {p.candidate?.user?.fullName || 'Freelancer'}
                            </Typography>
                            
                            {/* Match score badge */}
                            <Chip
                              icon={<StarIcon sx={{ fontSize: 13, color: 'secondary.main' }} />}
                              label={`🎯 ${scoreVal}%`}
                              size="small"
                              onClick={(e) => handleOpenBreakdown(e, p)}
                              sx={{ fontWeight: 800, height: 22, bgcolor: scoreVal >= 80 ? 'success.light' : 'warning.light', color: '#0f172a', cursor: 'pointer' }}
                            />

                            {/* Trust Rating */}
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 1 }}>
                              <StarIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                              <Typography variant="caption" sx={{ fontWeight: 800 }}>
                                {avgRating} ({totalContracts} contracts)
                              </Typography>
                            </Stack>

                            {/* Invited badge */}
                            {p.source === 'INVITED' && (
                              <Chip label="Invited" size="small" color="secondary" sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem', color: '#fff' }} />
                            )}
                          </Stack>

                          {/* Headline */}
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, mb: 1 }}>
                            {p.candidate?.headline || 'Escrow & Payments Backend Architect'}
                          </Typography>

                          {/* Job link */}
                          <Link href={`/recruiter/jobs/${p.jobId}`} style={{ textDecoration: 'none' }}>
                            <Typography variant="caption" color="primary" sx={{ fontWeight: 800, display: 'block', mb: 2 }}>
                              Job Posting: {p.job?.title}
                            </Typography>
                          </Link>

                          {/* Bid statistics */}
                          <Stack direction="row" spacing={3} flexWrap="wrap" sx={{ mb: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2 }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>BID AMOUNT</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 900 }}>                               ₹{parseInt(p.bidAmount).toLocaleString()}
                               {isHourly && ` (₹${Math.round(parseInt(p.bidAmount) / (Number((p as any).estimatedHours) || 1)).toLocaleString()}/hr)`}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>DURATION</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 900 }}>{p.durationDays} Days</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>MILESTONES</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 900 }}>{(p.proposedMilestones as any)?.length ?? (p as any).milestones?.length ?? 0} phases</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>BUDGET MARGIN</Typography>
                              {diffPct > 0 ? (
                                <Typography variant="body2" sx={{ fontWeight: 800, color: 'warning.main' }}>
                                  {diffPct}% above budget
                                </Typography>
                              ) : diffPct < 0 ? (
                                <Typography variant="body2" sx={{ fontWeight: 800, color: 'success.main' }}>
                                  {Math.abs(diffPct)}% below budget
                                </Typography>
                              ) : (
                                <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.secondary' }}>On budget</Typography>
                              )}
                            </Box>
                          </Stack>

                          {/* Cover letter text */}
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, whiteSpace: 'pre-line' }}>
                            {displayCover}
                          </Typography>
                          {hasLongCover && (
                            <Button size="small" variant="text" onClick={() => handleToggleExpandNote(p.id)} sx={{ textTransform: 'none', p: 0, fontWeight: 700 }}>
                              {isExpanded ? 'Show less' : 'Read more'}
                            </Button>
                          )}
                        </Box>
                      </Stack>
                    </Grid>

                    {/* Action buttons */}
                    <Grid item xs={12} sm={4} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: { xs: 'flex-start', sm: 'flex-end' } }}>
                      <Stack spacing={1.5} sx={{ width: '100%', maxWidth: 200 }}>
                        <Button size="small" variant="outlined" color="primary" onClick={() => setDrawerCandidate(p.candidate || F.CANDIDATE_PROFILE)} sx={{ fontWeight: 700 }}>
                          View Profile
                        </Button>
                        {p.status === 'SUBMITTED' && (
                          <Button size="small" variant="contained" color="secondary" onClick={() => handleShortlist(p.id)} sx={{ fontWeight: 750 }}>
                            Shortlist
                          </Button>
                        )}
                        {(p.status === 'SUBMITTED' || p.status === 'SHORTLISTED') && (
                          <>
                            <Button size="small" variant="contained" color="success" onClick={() => handleOpenAccept(p)} sx={{ fontWeight: 750 }}>
                              Accept Bid
                            </Button>
                            <Button size="small" variant="text" color="error" onClick={() => handleOpenReject(p)} sx={{ fontWeight: 750 }}>
                              Reject Bid
                            </Button>
                          </>
                        )}
                        {p.status === 'ACCEPTED' && (
                          <Chip label="Accepted &amp; Active" color="success" sx={{ fontWeight: 800, py: 1 }} />
                        )}
                        {(p.status as string) === 'REJECTED' && (
                          <Chip label="Rejected" color="error" variant="outlined" sx={{ fontWeight: 800, py: 1 }} />
                        )}
                        {(p.status as string) === 'WITHDRAWN' && (
                          <Chip label="Withdrawn" variant="outlined" sx={{ fontWeight: 800, py: 1 }} />
                        )}
                      </Stack>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            );
          })
        )}
      </Stack>

      {/* MATCH BREAKDOWN POPOVER */}
      <Popover
        open={Boolean(popoverAnchor)}
        anchorEl={popoverAnchor}
        onClose={handleCloseBreakdown}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        PaperProps={{ sx: { p: 2.5, width: 280, borderRadius: 3, border: '1px solid #cbd5e1' } }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
          AI Match Breakdown
        </Typography>
        <Stack spacing={1.5}>
          {[
            { name: 'Skill Alignment', value: 38, max: 40 },
            { name: 'Portfolio Fit', value: 28, max: 30 },
            { name: 'Hourly / Fixed Rate match', value: 13, max: 15 },
            { name: 'Completed Track Record', value: 11, max: 15 },
          ].map((score) => (
            <Box key={score.name}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>{score.name}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 800 }}>{score.value}/{score.max}</Typography>
              </Stack>
              <Box sx={{ height: 6, bgcolor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ width: `${(score.value / score.max) * 100}%`, height: '100%', bgcolor: 'secondary.main', borderRadius: 3 }} />
              </Box>
            </Box>
          ))}
        </Stack>
      </Popover>

      {/* REJECT BID DIALOG MODAL */}
      <Dialog open={showRejectModal} onClose={() => setShowRejectModal(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 850 }}>Reject Freelance Bid</DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Please select the reason for rejecting this bid. You can add an optional feedback note.
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 3 }}>
            <InputLabel id="reject-reason-label">Reason</InputLabel>
            <Select
              labelId="reject-reason-label"
              value={rejectReason}
              label="Reason"
              onChange={(e) => setRejectReason(e.target.value)}
              sx={{ fontWeight: 700 }}
            >
              <MenuItem value="Budget mismatch">Budget mismatch</MenuItem>
              <MenuItem value="Skills mismatch">Skills mismatch</MenuItem>
              <MenuItem value="Chose another freelancer">Chose another freelancer</MenuItem>
              <MenuItem value="Timeline mismatch">Timeline mismatch</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Optional Note"
            placeholder="Type feedback here..."
            multiline
            rows={3}
            fullWidth
            size="small"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setShowRejectModal(false)} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmReject} sx={{ fontWeight: 800 }}>
            Reject Bid
          </Button>
        </DialogActions>
      </Dialog>

      {/* ACCEPT BID DIALOG MODAL */}
      <Dialog open={showAcceptModal} onClose={() => setShowAcceptModal(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Accept &amp; Create Contract</DialogTitle>
        <DialogContent>
          {activeProposal && (
            <Stack spacing={2.5} sx={{ py: 1.5 }}>
              <Alert severity="warning" sx={{ fontWeight: 700 }}>
                Accepting will create a contract for ₹{parseInt(activeProposal.bidAmount).toLocaleString()} across {(activeProposal.proposedMilestones as any)?.length ?? (activeProposal as any).milestones?.length ?? 0} milestones. This is final — the freelancer's exact bid terms will be locked in.
              </Alert>

              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Locked Bidding Terms</Typography>
              <Stack direction="row" spacing={3} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">FREELANCER</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>{activeProposal.candidate?.user?.fullName || 'Freelancer'}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">AGREED AMOUNT</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>₹{parseInt(activeProposal.bidAmount).toLocaleString()}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">PLATFORM FEE ({PLATFORM_FEE_PERCENT}%)</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>{PLATFORM_FEE_PERCENT}.00%</Typography>
                </Box>
              </Stack>

              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Milestones breakdown</Typography>
              <Stack spacing={1.5}>
                {((activeProposal.proposedMilestones as any) || (activeProposal as any).milestones || []).map((milestone: any) => (
                  <Box key={milestone.id || milestone.sequence} sx={{ p: 1.5, border: '1px solid #f1f5f9', borderRadius: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 750 }}>
                          {milestone.sequence}. {milestone.title}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 850 }}>
                        ₹{parseInt(milestone.amount).toLocaleString()}
                      </Typography>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setShowAcceptModal(false)} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleConfirmAccept} disabled={isAccepting} sx={{ fontWeight: 850 }}>
            Confirm &amp; Create Contract
          </Button>
        </DialogActions>
      </Dialog>

      {/* FREELANCER PROFILE VIEW DRAWER */}
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
              {drawerCandidate.skills?.map((cs) => (
                <Chip key={cs.id} label={`${cs.skill?.name || 'Skill'} · ${cs.proficiency}★`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
              ))}
            </Box>

            <Divider />

            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Completed Projects</Typography>
            <Stack spacing={2}>
              {drawerCandidate.portfolio?.projects?.map((proj) => (
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

// useSearchParams() requires a Suspense boundary for static prerendering in
// the App Router — this wrapper is the standard Next.js fix, not a
// restructure of the page's actual logic.
export default function RecruiterProposalsPage() {
  return (
    <Suspense fallback={null}>
      <RecruiterProposalsPageInner />
    </Suspense>
  );
}
