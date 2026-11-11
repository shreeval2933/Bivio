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
  Chip,
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
  FormControlLabel,
  Switch,
  Alert,
  Pagination,
  CircularProgress,
} from '@mui/material';

// Icons
import StarIcon from '@mui/icons-material/Star';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Types
import type { CandidateProfile, Job } from '@/types';

// Mock DB Initializer
import { initializeState } from '@/mocks/recruiterState';
import * as F from '@/mocks/fixtures';

import { useGetRecruiterJobsQuery } from '@/store/api/jobsApi';
import { useSearchFreelancersQuery, useGetPublicSettingsQuery } from '@/store/api/profilesApi';
import { useSendInvitationMutation } from '@/store/api/applicationsApi';

function FreelancerDiscoveryPageInner() {
  const searchParams = useSearchParams();
  const querySkills = searchParams.get('skills');

  const [mounted, setMounted] = useState(false);

  // States
  const { data: publicSettings } = useGetPublicSettingsQuery();
  const searchEnabled = publicSettings?.FEATURE_FREELANCER_SEARCH ?? true;
  const [freelancers, setFreelancers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [minRate, setMinRate] = useState<number>(0);
  const [maxRate, setMaxRate] = useState<number>(8000);
  const [minRating, setMinRating] = useState<string>('any');
  const [availableOnly, setAvailableOnly] = useState<boolean>(false);
  const [selectedCapacity, setSelectedCapacity] = useState<string>('any');
  const [locationQuery, setLocationQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<string>('RATING');

  // Local inputs for debouncing
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [localLocationQuery, setLocalLocationQuery] = useState('');

  // Debouncing effects
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(localSearchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [localSearchQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setLocationQuery(localLocationQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [localLocationQuery]);

  const handleClearFilters = () => {
    setLocalSearchQuery('');
    setLocalLocationQuery('');
    setSearchQuery('');
    setLocationQuery('');
    setMinRate(0);
    setMaxRate(8000);
    setMinRating('any');
    setAvailableOnly(false);
    setSelectedCapacity('any');
    setSortOrder('RATING');
  };

  const searchParamsObject = useMemo(() => {
    return {
      q: searchQuery || undefined,
      minRate: minRate !== 0 ? minRate : undefined,
      maxRate: maxRate !== 8000 ? maxRate : undefined,
      minRating: minRating !== 'any' ? minRating : undefined,
      availableOnly: availableOnly ? 'true' : undefined,
      capacity: selectedCapacity !== 'any' ? selectedCapacity : undefined,
      location: locationQuery || undefined,
      sort: sortOrder,
    };
  }, [searchQuery, minRate, maxRate, minRating, availableOnly, selectedCapacity, locationQuery, sortOrder]);

  // RTK Query endpoints
  const { data: apiFreelancers, isLoading: isFreelancersLoading } = useSearchFreelancersQuery(searchParamsObject, { skip: !mounted });
  const { data: dbJobs } = useGetRecruiterJobsQuery(undefined, { skip: !mounted });
  const [sendInvitation] = useSendInvitationMutation();

  useEffect(() => {
    setPage(1);
  }, [searchQuery, minRate, maxRate, minRating, availableOnly, selectedCapacity, locationQuery, sortOrder]);

  useEffect(() => {
    if (querySkills) {
      setLocalSearchQuery(querySkills.split(',')[0]);
    }
  }, [querySkills]);

  // Modal / Drawer States
  const [drawerCandidate, setDrawerCandidate] = useState<CandidateProfile | null>(null);
  const [activeInviteCandidate, setActiveInviteCandidate] = useState<any | null>(null);
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [inviteJobId, setInviteJobId] = useState<string>('');
  const [inviteMessage, setInviteMessage] = useState<string>('');

  const loadLocalData = () => {
    if (typeof window !== 'undefined') {
      initializeState();

      // Load and seed jobs
      const storedJobs = localStorage.getItem('bivio_recruiter_jobs');
      const allJobs: Job[] = storedJobs ? JSON.parse(storedJobs) : F.JOBS;
      const apiJobs = dbJobs?.data || [];
      const combinedJobs = [...apiJobs, ...allJobs.filter(mj => !apiJobs.some(dj => dj.id === mj.id))];
      setJobs(combinedJobs.filter(j => j.jobType?.toUpperCase() === 'FREELANCE' && j.status === 'OPEN'));

      // Combine API freelancers (Mock data completely removed)
      const apiCandidateList = apiFreelancers || [];
      const enrichedApiCandidates = apiCandidateList.map((cand: any) => {
        const skillsList = cand.skills?.map((cs: any) => cs.skill?.name) || [];
        const hourlyRateVal = cand.portfolio?.hourlyRate ? parseFloat(cand.portfolio.hourlyRate) : 2500;
        const ratingVal = cand.portfolio?.avgRating ? parseFloat(cand.portfolio.avgRating) : 5.0;
        const totalContractsVal = cand.portfolio?.totalContracts || 0;
        const isAvailableVal = cand.portfolio?.isAvailable !== undefined ? cand.portfolio.isAvailable : true;
        const capacityMapReverse: any = {
          'UNDER_10': 'Under 10',
          'H10_20': '10–20',
          'H20_40': '20–40',
          'FULL_TIME': 'Full-time',
        };
        const capacityVal = capacityMapReverse[cand.portfolio?.weeklyCapacity] || '20–40';
        const featuredProject = cand.portfolio?.projects?.[0] || null;

        return {
          ...cand,
          skillsList,
          hourlyRate: hourlyRateVal,
          avgRating: ratingVal,
          totalContracts: totalContractsVal,
          isAvailable: isAvailableVal,
          capacity: capacityVal,
          featuredProject,
        };
      });

      setFreelancers(enrichedApiCandidates);
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
  }, [apiFreelancers, dbJobs, mounted]);

  // Update invite message template when job or candidate changes
  useEffect(() => {
    if (activeInviteCandidate) {
      const jobTitle = inviteJobId ? jobs.find(j => j.id === inviteJobId)?.title : '[Project Title]';
      const mainSkill = activeInviteCandidate.skillsList?.[0] || 'software development';
      setInviteMessage(
        `Hi ${activeInviteCandidate.user?.fullName},\n\nYour background in ${mainSkill} looks like a strong fit for our project: ${jobTitle}. I would love to invite you to submit a proposal.`
      );
    }
  }, [inviteJobId, activeInviteCandidate, jobs]);

  // Open Invitation dialog
  const handleOpenInvite = (candidate: any) => {
    setActiveInviteCandidate(candidate);
    setErrorMsg(null);
    setInviteJobId(jobs[0]?.id || '');
    setShowInviteModal(true);
  };

  const handleConfirmInvite = async () => {
    if (!inviteJobId || !activeInviteCandidate) return;

    try {
      setErrorMsg(null);
      await sendInvitation({
        jobId: inviteJobId,
        candidateId: activeInviteCandidate.id,
        message: inviteMessage,
      }).unwrap();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Failed to send invitation. Candidate may already have an active invite.');
      return;
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('bivio_recruiter_invitations');
      const invites = stored ? JSON.parse(stored) : [];
      const selectedJob = jobs.find(j => j.id === inviteJobId);

      const newInvite = {
        id: `inv-${Date.now()}`,
        jobId: inviteJobId,
        candidateId: activeInviteCandidate.id,
        status: 'SENT',
        message: inviteMessage,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days expiry
        job: { id: inviteJobId, title: selectedJob?.title || 'Freelance Project' }
      };

      localStorage.setItem('bivio_recruiter_invitations', JSON.stringify([...invites, newInvite]));
      setShowInviteModal(false);
      setSuccessToast(`Successfully sent project invitation to ${activeInviteCandidate.user?.fullName}!`);
      setTimeout(() => setSuccessToast(null), 5000);
      window.dispatchEvent(new Event('storage'));
    }
  };

  // Processed filtered/sorted freelancers list
  const filteredFreelancers = useMemo(() => {
    let list = [...freelancers];

    // Search Query (name/headline/skills)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f =>
        (f.user?.fullName || '').toLowerCase().includes(q) ||
        (f.headline || '').toLowerCase().includes(q) ||
        f.skillsList.some((s: string) => s.toLowerCase().includes(q))
      );
    }

    // Hourly Rate range
    list = list.filter(f => f.hourlyRate >= minRate && f.hourlyRate <= maxRate);

    // Rating Threshold
    if (minRating !== 'any') {
      const rThreshold = parseFloat(minRating);
      list = list.filter(f => f.avgRating >= rThreshold);
    }

    // Availability Toggle
    if (availableOnly) {
      list = list.filter(f => f.isAvailable);
    }

    // Capacity dropdown
    if (selectedCapacity !== 'any') {
      list = list.filter(f => f.capacity.toLowerCase() === selectedCapacity.toLowerCase());
    }

    // Location query
    if (locationQuery.trim()) {
      const loc = locationQuery.toLowerCase();
      list = list.filter(f => (f.location || '').toLowerCase().includes(loc));
    }

    // Sort order
    list.sort((a, b) => {
      if (sortOrder === 'RATING') return b.avgRating - a.avgRating;
      if (sortOrder === 'CONTRACTS') return b.totalContracts - a.totalContracts;
      if (sortOrder === 'LOW_RATE') return a.hourlyRate - b.hourlyRate;
      if (sortOrder === 'ACTIVE') return b.totalContracts - a.totalContracts; // mock recently active
      return 0;
    });

    return list;
  }, [freelancers, searchQuery, minRate, maxRate, minRating, availableOnly, selectedCapacity, locationQuery, sortOrder]);

  const pageSize = 2;
  const totalPages = Math.ceil(filteredFreelancers.length / pageSize);

  const paginatedFreelancers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredFreelancers.slice(start, start + pageSize);
  }, [filteredFreelancers, page]);

  if (!mounted || isFreelancersLoading) {
    if (!mounted) return null;
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Searching freelancers...
          </Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      {/* Title */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 850, fontFamily: 'Outfit, sans-serif', mb: 1, color: 'secondary.main' }}>
          Freelancer Discovery
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Find and invite top freelance talent directly to your active project boards.
        </Typography>
      </Box>

      {/* Feature Flag Alert */}
      {!searchEnabled && (
        <Alert severity="warning" sx={{ mb: 4, borderRadius: 3, fontWeight: 700 }}>
          Freelancer discovery is currently disabled by platform administration.
        </Alert>
      )}

      {/* Success Notification */}
      {successToast && (
        <Alert severity="success" sx={{ mb: 4, borderRadius: 3, fontWeight: 700 }}>
          {successToast}
        </Alert>
      )}

      {/* Filter Controls Bar */}
      <Card sx={{ p: 3, mb: 4, borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <Grid container spacing={3}>
          {/* Keyword Search */}
          <Grid item xs={12} sm={4}>
            <TextField
              size="small"
              placeholder="Search skills, names, or headline..."
              fullWidth
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="action" fontSize="small" sx={{ mr: 1 }} />
              }}
            />
          </Grid>

          {/* Rating */}
          <Grid item xs={12} sm={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel id="min-rating-label">Min Rating</InputLabel>
              <Select
                labelId="min-rating-label"
                value={minRating}
                label="Min Rating"
                onChange={(e) => setMinRating(e.target.value)}
                sx={{ fontWeight: 700 }}
              >
                <MenuItem value="any">Any Rating</MenuItem>
                <MenuItem value="4.0">≥ 4.0 Stars</MenuItem>
                <MenuItem value="4.5">≥ 4.5 Stars</MenuItem>
                <MenuItem value="4.8">≥ 4.8 Stars</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Capacity */}
          <Grid item xs={12} sm={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel id="capacity-label">Weekly Capacity</InputLabel>
              <Select
                labelId="capacity-label"
                value={selectedCapacity}
                label="Weekly Capacity"
                onChange={(e) => setSelectedCapacity(e.target.value)}
                sx={{ fontWeight: 700 }}
              >
                <MenuItem value="any">Any Capacity</MenuItem>
                <MenuItem value="Under 10">Under 10 hrs</MenuItem>
                <MenuItem value="10–20">10–20 hrs</MenuItem>
                <MenuItem value="20–40">20–40 hrs</MenuItem>
                <MenuItem value="Full-time">Full-time availability</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Sort order */}
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="sort-order-label">Sort by</InputLabel>
              <Select
                labelId="sort-order-label"
                value={sortOrder}
                label="Sort by"
                onChange={(e) => setSortOrder(e.target.value)}
                sx={{ fontWeight: 700 }}
              >
                <MenuItem value="RATING">Highest Rated</MenuItem>
                <MenuItem value="CONTRACTS">Most Completed Contracts</MenuItem>
                <MenuItem value="LOW_RATE">Lowest Hourly Rate</MenuItem>
                <MenuItem value="ACTIVE">Recently Active</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Hourly Rate Slider */}
          <Grid item xs={12} sm={4}>
            <Stack spacing={0.5}>
              <Typography variant="caption" sx={{ fontWeight: 800 }}>
                HOURLY RATE: ₹{minRate.toLocaleString()} - ₹{maxRate.toLocaleString()}/hr
              </Typography>
              <Slider
                value={[minRate, maxRate]}
                onChange={(_, val) => {
                  const arr = val as number[];
                  setMinRate(arr[0]);
                  setMaxRate(arr[1]);
                }}
                min={0}
                max={10000}
                step={500}
                valueLabelDisplay="auto"
              />
            </Stack>
          </Grid>

          {/* Location Query */}
          <Grid item xs={12} sm={4}>
            <TextField
              size="small"
              placeholder="Filter by location (e.g. Pune, Remote)..."
              fullWidth
              value={localLocationQuery}
              onChange={(e) => setLocalLocationQuery(e.target.value)}
            />
          </Grid>

          {/* Availability Toggle */}
          <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={<Switch checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} />}
              label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Show currently available only</Typography>}
            />
          </Grid>

          {/* Clear Filters Button */}
          <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              variant="outlined"
              color="error"
              onClick={handleClearFilters}
              sx={{ fontWeight: 700 }}
              size="small"
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Grid List */}
      {filteredFreelancers.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center', bgcolor: '#fff', border: '1px dashed #cbd5e1', borderRadius: 4 }}>
          {freelancers.length === 0 ? (
            <>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
                No freelancers available yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Check back as more join the platform.
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
                No freelancers match these filters
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try widening your search or clearing a filter.
              </Typography>
            </>
          )}
        </Box>
      ) : (
        <>
          <Grid container spacing={3.5}>
            {paginatedFreelancers.map((f) => {
              const hasProject = !!f.featuredProject;
              return (
                <Grid item xs={12} sm={6} key={f.id}>
                  <Card sx={{ height: '100%', borderRadius: 4, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: 'none' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                        <Avatar
                          sx={{ width: 46, height: 46, bgcolor: 'secondary.light', color: 'secondary.dark', fontWeight: 800, cursor: 'pointer' }}
                          onClick={() => setDrawerCandidate(f)}
                        >
                          {f.user?.fullName?.[0]}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: 850, cursor: 'pointer', '&:hover': { color: 'secondary.main' } }}
                              onClick={() => setDrawerCandidate(f)}
                            >
                              {f.user?.fullName}
                            </Typography>

                            {/* Rating chip */}
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <StarIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                              <Typography variant="caption" sx={{ fontWeight: 800 }}>
                                {f.avgRating} ({f.totalContracts} contracts)
                              </Typography>
                            </Stack>
                          </Stack>

                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700 }}>
                            {f.headline}
                          </Typography>
                        </Box>
                      </Stack>

                      {/* Bio */}
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: 40 }}>
                        {f.summary || 'Freelance platform work, Green field SaaS dashboard UI alignments.'}
                      </Typography>

                      {/* Meta stats */}
                      <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
                        <Chip label={`₹${f.hourlyRate.toLocaleString()}/hr`} size="small" sx={{ fontWeight: 800, bgcolor: 'rgba(0,0,0,0.03)' }} />
                        <Chip
                          label={f.isAvailable ? 'Available now' : 'Busy'}
                          size="small"
                          color={f.isAvailable ? 'success' : 'default'}
                          variant={f.isAvailable ? 'filled' : 'outlined'}
                          sx={{ fontWeight: 800 }}
                        />
                        {f.location && <Chip label={f.location} size="small" variant="outlined" sx={{ fontWeight: 700 }} />}
                      </Stack>

                      {/* Featured project preview */}
                      {hasProject && (
                        <Box sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 3, mb: 2 }}>
                          <Typography variant="caption" color="secondary" sx={{ display: 'block', fontWeight: 800, mb: 0.5 }}>
                            FEATURED PORTFOLIO PROJECT
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.8rem' }}>
                            {f.featuredProject.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem' }}>
                            {f.featuredProject.description}
                          </Typography>
                        </Box>
                      )}

                      {/* Skills list */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                        {f.skillsList.map((skill: string) => (
                          <Chip key={skill} label={skill} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18, fontWeight: 700 }} />
                        ))}
                      </Box>
                    </CardContent>

                    {/* Actions buttons */}
                    <Box sx={{ p: 2, bgcolor: '#fafafa', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 1.5 }}>
                      <Button size="small" variant="outlined" color="primary" fullWidth onClick={() => setDrawerCandidate(f)} sx={{ fontWeight: 700 }}>
                        View Profile
                      </Button>
                      <Button size="small" variant="contained" color="secondary" fullWidth onClick={() => handleOpenInvite(f)} sx={{ fontWeight: 750 }}>
                        Invite to a Project
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="secondary"
                size="large"
              />
            </Box>
          )}
        </>
      )}

      {/* INVITE TO A PROJECT MODAL */}
      <Dialog open={showInviteModal} onClose={() => setShowInviteModal(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 900 }}>Invite to Freelance Project</DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2, fontWeight: 700 }}>
              {errorMsg}
            </Alert>
          )}
          {jobs.length === 0 ? (
            <Typography variant="body2" color="error" sx={{ my: 2, fontWeight: 700 }}>
              You do not have any active freelance postings to invite talent to. Please publish a freelance project first.
            </Typography>
          ) : (
            <Stack spacing={3} sx={{ pt: 1.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="invite-job-select-label">Select Active Posting</InputLabel>
                <Select
                  labelId="invite-job-select-label"
                  value={inviteJobId}
                  label="Select Active Posting"
                  onChange={(e) => setInviteJobId(e.target.value)}
                  sx={{ fontWeight: 700 }}
                >
                  {jobs.map((job) => (
                    <MenuItem key={job.id} value={job.id}>{job.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Invitation Message"
                multiline
                rows={4}
                fullWidth
                size="small"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setShowInviteModal(false)} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            disabled={jobs.length === 0 || !inviteJobId}
            onClick={handleConfirmInvite}
            sx={{ fontWeight: 800 }}
          >
            Send Invitation
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
                {drawerCandidate.summary || 'Expert engineering support with focus on core web stacks.'}
              </Typography>
            </Box>

            <Stack direction="row" spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">HOURLY RATE</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>₹{parseInt(drawerCandidate.portfolio?.hourlyRate || '3000').toLocaleString()}/hr</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">AVAILABILITY</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {drawerCandidate.portfolio?.isAvailable ? 'Available now' : 'Busy'}
                </Typography>
              </Box>
            </Stack>

            <Divider />

            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Skills &amp; Proficiencies</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {(drawerCandidate.skills || F.CANDIDATE_PROFILE.skills)?.map((cs) => (
                <Chip key={cs.id} label={`${cs.skill?.name || 'Skill'} · ${cs.proficiency}★`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
              ))}
            </Box>

            <Divider />

            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Completed Projects</Typography>
            <Stack spacing={2}>
              {(drawerCandidate.portfolio?.projects || F.CANDIDATE_PROFILE.portfolio?.projects)?.map((proj) => (
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
export default function FreelancerDiscoveryPage() {
  return (
    <Suspense fallback={null}>
      <FreelancerDiscoveryPageInner />
    </Suspense>
  );
}
