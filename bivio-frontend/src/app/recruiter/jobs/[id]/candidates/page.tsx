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
  Popover,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  IconButton,
  Snackbar,
  Alert,
  MenuItem,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Pagination,
  Drawer,
  CircularProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckIcon from '@mui/icons-material/Check';
import StarIcon from '@mui/icons-material/Star';
import CloseIcon from '@mui/icons-material/Close';

import { getCandidatesPool, getApplications, getInvitations, saveInvitation } from '@/mocks/recruiterState';
import { useGetJobByIdQuery, useGetShortlistQuery } from '@/store/api/jobsApi';
import type { Job, CandidateProfile } from '@/types';

export default function AIShortlistPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const { data: job, isLoading: isJobLoading, isError: isJobError } = useGetJobByIdQuery(id);
  const { data: shortlist, isLoading: isShortlistLoading, isError: isShortlistError } = useGetShortlistQuery(id);

  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);

  // Drawer States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCandidate, setDrawerCandidate] = useState<CandidateProfile | null>(null);

  // Pagination States
  const [page, setPage] = useState(1);
  const itemsPerPage = 2;

  // Toast Snackbar States
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastOpen(true);
  };

  // Shared Filter States
  const [scoreThreshold, setScoreThreshold] = useState<number>(50);
  const [appStatusFilter, setAppStatusFilter] = useState<'ALL' | 'NOT_APPLIED' | 'APPLIED'>('ALL');
  const [sortBy, setSortBy] = useState<'BEST_MATCH' | 'MOST_EXP' | 'RECENT' | 'ALPHA'>('BEST_MATCH');

  // Full-time specific Filters
  const [locationFilter, setLocationFilter] = useState('');
  const [expRange, setExpRange] = useState<number[]>([0, 15]);
  const [noticeFilter, setNoticeFilter] = useState<'ANY' | 'IMMEDIATE' | '30'>('ANY');

  // Freelance specific Filters
  const [freelanceRateRange, setFreelanceRateRange] = useState<number[]>([0, 5000]);
  const [freelanceAvailabilityOnly, setFreelanceAvailabilityOnly] = useState(false);
  const [freelanceMinRating, setFreelanceMinRating] = useState<number>(1);

  // Invite Modal States
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteExpiry, setInviteExpiry] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Popover State for Breakdown
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [activeBreakdown, setActiveBreakdown] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    if (shortlist && shortlist.length > 0) {
      setCandidates(shortlist.map((s: any) => s.candidate));
    } else {
      setCandidates(getCandidatesPool());
    }
    setApps(getApplications().filter(a => a.jobId === id));
    setInvites(getInvitations().filter(i => i.jobId === id));
  }, [id, shortlist]);

  const handleOpenBreakdown = (event: React.MouseEvent<HTMLElement>, breakdown: Record<string, number>) => {
    setAnchorEl(event.currentTarget);
    setActiveBreakdown(breakdown);
  };

  const handleCloseBreakdown = () => {
    setAnchorEl(null);
    setActiveBreakdown(null);
  };

  const getCandidateScore = (c: CandidateProfile) => {
    const dbMatch = (shortlist || []).find((s: any) => s.candidateId === c.id);
    if (dbMatch) {
      const parsedScore = Number(dbMatch.score);
      if (dbMatch.breakdown) {
        const bd: any = {};
        Object.keys(dbMatch.breakdown as any).forEach(k => {
          bd[k] = (dbMatch.breakdown as any)[k].score;
        });
        return { total: parsedScore, ...bd };
      }
      if (job?.jobType === 'FREELANCE') {
        return { total: parsedScore, skill: Math.round(parsedScore * 0.35), portfolio: Math.round(parsedScore * 0.30), rate: Math.round(parsedScore * 0.15), trackRecord: Math.round(parsedScore * 0.15), availability: Math.round(parsedScore * 0.05) };
      } else {
        return { total: parsedScore, skills: Math.round(parsedScore * 0.35), exp: Math.round(parsedScore * 0.22), edu: Math.round(parsedScore * 0.13), domain: Math.round(parsedScore * 0.12), practical: Math.round(parsedScore * 0.08) };
      }
    }

    if (job?.jobType === 'FREELANCE') {
      if (c.id === 'cand-1') {
        return { total: 90, skill: 31, portfolio: 26, rate: 13, trackRecord: 12, availability: 4 };
      }
      if (c.id === 'cand-3') {
        return { total: 80, skill: 28, portfolio: 24, rate: 12, trackRecord: 11, availability: 5 };
      }
      return { total: 60, skill: 20, portfolio: 18, rate: 10, trackRecord: 9, availability: 3 };
    } else {
      if (c.id === 'cand-1') {
        return { total: 94, skills: 32, exp: 22, edu: 13, domain: 12, practical: 8 };
      }
      if (c.id === 'cand-2') {
        return { total: 87, skills: 30, exp: 20, edu: 12, domain: 11, practical: 9 };
      }
      if (c.id === 'cand-3') {
        return { total: 72, skills: 25, exp: 18, edu: 10, domain: 10, practical: 7 };
      }
      return { total: 55, skills: 18, exp: 15, edu: 8, domain: 8, practical: 6 };
    }
  };

  const handleSendInvite = () => {
    if (!selectedCandidate) return;

    if (!inviteMsg.trim()) {
      setInviteError('Invitation message is required.');
      return;
    }

    if (inviteExpiry) {
      const selectedDate = new Date(inviteExpiry);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        setInviteError('Expiry date must be in the future.');
        return;
      }
    }

    setInviteError('');

    const newInvite = {
      id: `inv-${Date.now()}`,
      jobId: id,
      candidateId: selectedCandidate.id,
      status: 'SENT' as any,
      message: inviteMsg.trim(),
      expiresAt: inviteExpiry || new Date(Date.now() + 86400000 * 7).toISOString(),
      createdAt: new Date().toISOString()
    };

    saveInvitation(newInvite);
    setInviteModal(false);
    setSelectedCandidate(null);
    setInviteMsg('');
    setInvites(getInvitations().filter(i => i.jobId === id));

    showToast(`Invitation sent successfully to ${selectedCandidate.user.fullName}!`);
  };

  const getApplicationStatus = (candidateId: string) => {
    return apps.find(a => a.candidateId === candidateId);
  };

  const getInviteStatus = (candidateId: string) => {
    return invites.find(i => i.candidateId === candidateId);
  };

  // Filter & Sort Logic
  const filteredCandidates = candidates
    .filter(c => {
      const score = getCandidateScore(c);
      const exp = parseFloat(c.experienceYears || '0');
      const app = getApplicationStatus(c.id);

      // 1. Scoped Population check
      if (job?.jobType === 'FREELANCE') {
        if (!c.openToFreelance) return false;
      } else {
        if (!c.openToFullTime) return false;
      }

      // 2. Score Threshold Filter
      if (score.total < scoreThreshold) return false;

      // 3. App Status Filter
      if (appStatusFilter === 'NOT_APPLIED' && app) return false;
      if (appStatusFilter === 'APPLIED' && !app) return false;

      // 4. JobType Specific Filters
      if (job?.jobType === 'FREELANCE') {
        const rate = parseFloat(c.portfolio?.hourlyRate || '2500');
        if (rate < freelanceRateRange[0] || rate > freelanceRateRange[1]) return false;

        if (freelanceAvailabilityOnly && !c.portfolio?.isAvailable) return false;

        const rating = parseFloat(c.portfolio?.avgRating || '4.0');
        if (rating < freelanceMinRating) return false;
      } else {
        // Location Filter
        if (locationFilter.trim() && !(c.location || '').toLowerCase().includes(locationFilter.toLowerCase())) return false;

        // Experience Range Filter
        if (exp < expRange[0] || exp > expRange[1]) return false;

        // Notice Period Filter
        if (noticeFilter === 'IMMEDIATE' && (c as any).noticePeriod !== 'Immediate') return false;
        if (noticeFilter === '30' && (c as any).noticePeriod !== 'Immediate' && (c as any).noticePeriod !== '15' && (c as any).noticePeriod !== '30') return false;
      }

      return true;
    })
    .sort((a, b) => {
      const scoreA = getCandidateScore(a).total;
      const scoreB = getCandidateScore(b).total;
      const expA = parseFloat(a.experienceYears || '0');
      const expB = parseFloat(b.experienceYears || '0');

      if (sortBy === 'BEST_MATCH') return scoreB - scoreA;
      if (sortBy === 'MOST_EXP') return expB - expA;
      if (sortBy === 'ALPHA') return a.user.fullName.localeCompare(b.user.fullName);
      return 0; // RECENT default mocks
    });

  const paginatedCandidates = filteredCandidates.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);

  if (isJobLoading || isShortlistLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading shortlist candidates...
          </Typography>
        </Stack>
      </Container>
    );
  }

  if (isJobError || isShortlistError || !job) {
    return (
      <Container sx={{ py: 10 }}>
        <Alert severity="error" sx={{ borderRadius: 3, fontWeight: 700 }}>
          Could not find or load the job candidate details. Please try again.
        </Alert>
      </Container>
    );
  }

  const isFreelanceFlow = job.jobType === 'FREELANCE';

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
        <Link href={`/recruiter/jobs/${id}`} style={{ textDecoration: 'none' }}>
          <IconButton sx={{ border: '1px solid #cbd5e1' }}><ArrowBackIcon /></IconButton>
        </Link>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 850, fontFamily: 'Outfit, sans-serif', color: isFreelanceFlow ? 'secondary.main' : 'primary.main' }}>
            {isFreelanceFlow ? 'AI-Ranked Freelancers' : 'AI-Ranked Candidates'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isFreelanceFlow ? 'Shortlist matching freelancers for ' : 'Shortlist matched candidates for '} <strong>{job.title}</strong>
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={4}>
        {/* Left Column: Filter Sidebar */}
        <Grid item xs={12} md={3.8}>
          <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none', position: 'sticky', top: 90 }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Filters &amp; Sorting</Typography>

              {/* Match Threshold */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                  MIN MATCH SCORE ({scoreThreshold}%)
                </Typography>
                <Slider value={scoreThreshold} onChange={(_, val) => { setScoreThreshold(val as number); setPage(1); }} min={40} max={100} valueLabelDisplay="auto" />
              </Box>

              {/* Application Status */}
              <FormControl>
                <FormLabel sx={{ fontWeight: 700, fontSize: '0.75rem', mb: 1 }}>APPLICATION STATUS</FormLabel>
                <RadioGroup value={appStatusFilter} onChange={(e) => { setAppStatusFilter(e.target.value as any); setPage(1); }}>
                  <FormControlLabel value="ALL" control={<Radio size="small" />} label="All Candidates" />
                  <FormControlLabel value="NOT_APPLIED" control={<Radio size="small" />} label="Not Invited Yet" />
                  <FormControlLabel value="APPLIED" control={<Radio size="small" />} label="Already Invited / Bid" />
                </RadioGroup>
              </FormControl>

              {/* Sort Options */}
              <TextField select label="Sort By" size="small" value={sortBy} onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }} fullWidth>
                <MenuItem value="BEST_MATCH">Best AI Match</MenuItem>
                <MenuItem value="MOST_EXP">Most Experienced</MenuItem>
                <MenuItem value="ALPHA">Alphabetical Name</MenuItem>
              </TextField>

              {/* Conditional Filters */}
              {!isFreelanceFlow ? (
                <>
                  {/* Location Input */}
                  <TextField label="Location Match" placeholder="e.g. Bengaluru" size="small" value={locationFilter} onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }} fullWidth />

                  {/* Experience Range */}
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                      EXPERIENCE RANGE ({expRange[0]} - {expRange[1]} Years)
                    </Typography>
                    <Slider value={expRange} onChange={(_, val) => { setExpRange(val as number[]); setPage(1); }} min={0} max={15} valueLabelDisplay="auto" />
                  </Box>

                  {/* Notice Period */}
                  <TextField select label="Notice Period" size="small" value={noticeFilter} onChange={(e) => { setNoticeFilter(e.target.value as any); setPage(1); }} fullWidth>
                    <MenuItem value="ANY">Any notice period</MenuItem>
                    <MenuItem value="IMMEDIATE">Immediate joiner</MenuItem>
                    <MenuItem value="30">Within 30 days</MenuItem>
                  </TextField>
                </>
              ) : (
                <>
                  {/* Hourly Rate Range */}
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                      HOURLY RATE (₹{freelanceRateRange[0]} - ₹{freelanceRateRange[1]}/hr)
                    </Typography>
                    <Slider value={freelanceRateRange} onChange={(_, val) => { setFreelanceRateRange(val as number[]); setPage(1); }} min={0} max={5000} valueLabelDisplay="auto" />
                  </Box>

                  {/* Minimum Star Rating */}
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                      MIN STAR RATING ({freelanceMinRating} ★)
                    </Typography>
                    <Slider value={freelanceMinRating} onChange={(_, val) => { setFreelanceMinRating(val as number); setPage(1); }} min={1} max={5} step={0.5} valueLabelDisplay="auto" />
                  </Box>

                  {/* Currently Available Toggle */}
                  <FormControlLabel
                    control={<Radio checked={freelanceAvailabilityOnly} onClick={() => { setFreelanceAvailabilityOnly(!freelanceAvailabilityOnly); setPage(1); }} size="small" />}
                    label="Only show available now"
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.85rem', fontWeight: 600 } }}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Candidates Lists */}
        <Grid item xs={12} md={8.2}>
          {filteredCandidates.length === 0 ? (
            <Card sx={{ textAlign: 'center', py: 8, border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>No matching candidates found</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mx: 'auto', px: 2 }}>
                Try relaxing your filter parameters or lower the Match Score threshold.
              </Typography>
            </Card>
          ) : (
            <Stack spacing={2.5}>
              {paginatedCandidates.map((c) => {
                const score = getCandidateScore(c);
                const app = getApplicationStatus(c.id);
                const invite = getInviteStatus(c.id);
                const exp = parseFloat(c.experienceYears || '0');

                return (
                  <Card
                    key={c.id}
                    onClick={() => {
                      if (app) {
                        if (isFreelanceFlow) {
                          router.push(`/recruiter/proposals?jobId=${id}`);
                        } else {
                          router.push(`/recruiter/applications/${app.id}`);
                        }
                      } else {
                        setDrawerCandidate(c);
                        setDrawerOpen(true);
                      }
                    }}
                    sx={{
                      borderRadius: 4,
                      border: '1px solid #e2e8f0',
                      boxShadow: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: isFreelanceFlow ? 'secondary.main' : 'primary.main',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                        {/* Identity */}
                        <Stack direction="row" spacing={2}>
                          <Avatar sx={{ width: 48, height: 48, bgcolor: isFreelanceFlow ? 'secondary.light' : 'primary.light', color: isFreelanceFlow ? 'secondary.dark' : 'primary.dark', fontWeight: 800 }}>
                            {c.user.fullName[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 800 }}>{c.user.fullName}</Typography>
                            {isFreelanceFlow ? (
                              <>
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                  Freelance Full Stack · ₹{parseInt(c.portfolio?.hourlyRate || '2500').toLocaleString()}/hr
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, fontWeight: 700 }}>
                                  <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                                  {c.portfolio?.avgRating || '4.8'} ({c.portfolio?.totalContracts || '7'} contracts) · {c.portfolio?.isAvailable ? 'Available now' : 'Unavailable'}
                                </Typography>
                              </>
                            ) : (
                              <>
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                  {c.headline || 'Full Stack Engineer'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                  {c.location || 'Bengaluru'} · {exp} yrs exp · Notice: {(c as any).noticePeriod || '30 days'}
                                </Typography>
                              </>
                            )}
                          </Box>
                        </Stack>

                        {/* Match Score Indicator */}
                        <Box
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenBreakdown(e, score as any);
                          }}
                          sx={{
                            cursor: 'pointer',
                            p: 2,
                            borderRadius: 4,
                            border: '1px solid #e2e8f0',
                            bgcolor: isFreelanceFlow ? 'rgba(13, 148, 136, 0.02)' : 'rgba(37, 99, 235, 0.02)',
                            minWidth: 150,
                            '&:hover': { bgcolor: isFreelanceFlow ? 'rgba(13, 148, 136, 0.06)' : 'rgba(37, 99, 235, 0.06)' }
                          }}
                        >
                          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="h5" sx={{ fontWeight: 900, color: score.total >= 80 ? 'success.main' : score.total >= 60 ? 'warning.main' : 'text.secondary' }}>
                              {score.total}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, fontSize: '0.65rem' }}>
                              MATCH
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={score.total}
                            color={score.total >= 80 ? 'success' : score.total >= 60 ? 'warning' : 'inherit'}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      </Stack>

                      {/* Matching Skills Overlaps */}
                      <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {job.skills?.slice(0, 4).map((sk) => (
                          <Chip
                            key={sk.id}
                            label={sk.skill.name}
                            icon={<CheckIcon fontSize="small" />}
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ fontWeight: 700 }}
                          />
                        ))}
                      </Box>

                      {/* Featured Project (Freelance specific) */}
                      {isFreelanceFlow && c.portfolio?.projects?.[0] && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.01)', border: '1px solid #cbd5e1', borderRadius: 2.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750, display: 'block', mb: 0.5 }}>
                            FEATURED PORTFOLIO PROJECT
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            {c.portfolio.projects[0].title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {c.portfolio.projects[0].description}
                          </Typography>
                        </Box>
                      )}

                      {/* Actions Footer */}
                      <Divider sx={{ my: 2 }} />
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box onClick={(e) => e.stopPropagation()}>
                          {app ? (
                            <Chip label={`Already Proposed — Status: Shortlisted`} color="secondary" size="small" sx={{ fontWeight: 800 }} />
                          ) : invite ? (
                            <Chip label="Invited — awaiting proposal response" variant="outlined" color="secondary" size="small" sx={{ fontWeight: 700 }} />
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              {isFreelanceFlow ? 'Invite this freelancer to submit a proposal' : 'Proactively invite this candidate to apply'}
                            </Typography>
                          )}
                        </Box>

                        {!app && !invite && (
                          <Button
                            variant="contained"
                            size="small"
                            color={isFreelanceFlow ? 'secondary' : 'primary'}
                            startIcon={<MailOutlineIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCandidate(c);
                              setInviteModal(true);
                            }}
                            sx={{ fontWeight: 700, borderRadius: 2 }}
                          >
                            {isFreelanceFlow ? 'Invite to Project' : 'Send Invite'}
                          </Button>
                        )}
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
        </Grid>
      </Grid>

      {/* Popover Match Score Breakdown */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleCloseBreakdown}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        PaperProps={{ sx: { p: 3, width: 320, borderRadius: 3 } }}
      >
        {activeBreakdown && (
          <Stack spacing={2}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>AI Match Score Breakdown</Typography>

            {!isFreelanceFlow ? (
              <>
                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Skills Fit</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{activeBreakdown.skills}/35</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={(activeBreakdown.skills / 35) * 100} />
                </Box>

                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Experience Level</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{activeBreakdown.exp}/25</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={(activeBreakdown.exp / 25) * 100} />
                </Box>

                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Education Match</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{activeBreakdown.edu}/15</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={(activeBreakdown.edu / 15) * 100} />
                </Box>

                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Domain Relevance</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{activeBreakdown.domain}/15</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={(activeBreakdown.domain / 15) * 100} />
                </Box>

                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Practical Fit</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{activeBreakdown.practical}/10</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={(activeBreakdown.practical / 10) * 100} />
                </Box>
              </>
            ) : (
              <>
                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Skill Match</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{activeBreakdown.skill}/35</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={(activeBreakdown.skill / 35) * 100} color="secondary" />
                </Box>

                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Portfolio Match</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{activeBreakdown.portfolio}/30</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={(activeBreakdown.portfolio / 30) * 100} color="secondary" />
                </Box>

                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Rate Fit</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{activeBreakdown.rate}/15</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={(activeBreakdown.rate / 15) * 100} color="secondary" />
                </Box>

                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Track Record</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{activeBreakdown.trackRecord}/15</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={(activeBreakdown.trackRecord / 15) * 100} color="secondary" />
                </Box>

                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Availability Fit</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{activeBreakdown.availability}/5</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={(activeBreakdown.availability / 5) * 100} color="secondary" />
                </Box>
              </>
            )}
          </Stack>
        )}
      </Popover>

      {/* Invite Modal */}
      <Dialog open={inviteModal} onClose={() => { setInviteModal(false); setSelectedCandidate(null); setInviteError(''); }} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>
          {isFreelanceFlow ? 'Invite Freelancer to Project' : 'Send Recruitment Invitation'}
        </DialogTitle>
        <DialogContent>
          {inviteError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontWeight: 700 }}>
              {inviteError}
            </Alert>
          )}
          {selectedCandidate && (
            <Stack spacing={3} sx={{ mt: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                {isFreelanceFlow ? (
                  <span>
                    Invite <strong>{selectedCandidate.user.fullName}</strong> to submit a proposal for <strong>{job.title}</strong>. This outreach invites them to bid on the project and define milestones.
                  </span>
                ) : (
                  <span>
                    Invite <strong>{selectedCandidate.user.fullName}</strong> to apply for the position <strong>{job.title}</strong>.
                  </span>
                )}
              </Typography>
              <TextField
                label="Invitation Message"
                multiline
                rows={4}
                required
                fullWidth
                value={inviteMsg}
                onChange={(e) => setInviteMsg(e.target.value)}
                placeholder="Write a custom outreach message here..."
              />
              <TextField
                label="Link Expiry Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                fullWidth
                value={inviteExpiry}
                onChange={(e) => setInviteExpiry(e.target.value)}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => { setInviteModal(false); setSelectedCandidate(null); setInviteError(''); }}>Cancel</Button>
          <Button variant="contained" color={isFreelanceFlow ? 'secondary' : 'primary'} onClick={handleSendInvite} sx={{ fontWeight: 700 }}>
            {isFreelanceFlow ? 'Invite to Project' : 'Send Invitation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Profile Detail Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setDrawerCandidate(null); }}
        sx={{ zIndex: 1600 }}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 460 }, p: 3, boxSizing: 'border-box' }
        }}
      >
        {drawerCandidate && (() => {
          const c = drawerCandidate;
          const score = getCandidateScore(c);
          return (
            <Stack spacing={3.5} sx={{ height: '100%', position: 'relative' }}>
              {/* Close Icon */}
              <Box>
                <IconButton
                  onClick={() => { setDrawerOpen(false); setDrawerCandidate(null); }}
                  sx={{ position: 'absolute', top: 12, right: 12, border: '1px solid #cbd5e1' }}
                  size="small"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>

              {/* Avatar & Headline */}
              <Stack direction="row" spacing={2} sx={{ mt: 3 }} alignItems="center">
                <Avatar sx={{ width: 56, height: 56, bgcolor: isFreelanceFlow ? 'secondary.light' : 'primary.light', color: isFreelanceFlow ? 'secondary.dark' : 'primary.dark', fontWeight: 800 }}>
                  {c.user.fullName[0]}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{c.user.fullName}</Typography>
                  {isFreelanceFlow ? (
                    <>
                      <Typography variant="body2" color="secondary.main" sx={{ fontWeight: 700 }}>
                        Freelance Full Stack · ₹{parseInt(c.portfolio?.hourlyRate || '2500').toLocaleString()}/hr
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, fontWeight: 700 }}>
                        <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                        {c.portfolio?.avgRating || '4.8'} ({c.portfolio?.totalContracts || '7'} contracts) · {c.portfolio?.isAvailable ? 'Available now' : 'Unavailable'}
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 650 }}>
                        {c.headline || 'Full Stack Engineer'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {c.location || 'Bengaluru'} · Notice: {(c as any).noticePeriod || '30 days'}
                      </Typography>
                    </>
                  )}
                </Box>
              </Stack>

              {/* Match Score */}
              <Box
                onClick={(e) => handleOpenBreakdown(e, score as any)}
                sx={{
                  cursor: 'pointer',
                  p: 2,
                  borderRadius: 4,
                  border: '1px solid #e2e8f0',
                  bgcolor: isFreelanceFlow ? 'rgba(13, 148, 136, 0.02)' : 'rgba(37, 99, 235, 0.02)',
                  '&:hover': { bgcolor: isFreelanceFlow ? 'rgba(13, 148, 136, 0.06)' : 'rgba(37, 99, 235, 0.06)' }
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: score.total >= 80 ? 'success.main' : score.total >= 60 ? 'warning.main' : 'text.secondary' }}>
                    {score.total}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, fontSize: '0.65rem' }}>
                    MATCH SCORE (View Breakdown)
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={score.total}
                  color={score.total >= 80 ? 'success' : score.total >= 60 ? 'warning' : 'inherit'}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>

              <Divider />

              {/* Middle Dynamic Content: Full-Time vs Freelance */}
              <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                {!isFreelanceFlow ? (
                  <Stack spacing={3}>
                    {/* Summary */}
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Summary</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        {c.summary || 'Six years building product-facing web applications. Comfortable owning a feature from schema design through to shipped UI.'}
                      </Typography>
                    </Box>

                    {/* Experience */}
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>Experience</Typography>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Senior Engineer @ Acme Corp</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>2022 – present · Lead frontend architectural updates</Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Engineer @ Widgets Co</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>2019 – 2022 · Shipped dashboard products</Typography>
                        </Box>
                      </Stack>
                    </Box>

                    {/* Education */}
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Education</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{c.highestEducation || 'B.Tech Computer Science'}</Typography>
                      <Typography variant="caption" color="text.secondary">XYZ University</Typography>
                    </Box>

                    {/* Skills with Proficiency */}
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>Skills</Typography>
                      <Stack spacing={1.5}>
                        {c.skills?.map((sk) => (
                          <Box key={sk.id}>
                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>{sk.skill.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {(sk.proficiency ?? 0)}/5 ({sk.yearsOfExperience || 0} yrs)
                              </Typography>
                            </Stack>
                            <LinearProgress variant="determinate" value={(sk.proficiency ?? 0) * 20} sx={{ height: 4 }} />
                          </Box>
                        ))}
                      </Stack>
                    </Box>

                    {/* Resume */}
                    {c.resumes && c.resumes.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Primary Resume</Typography>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.5, border: '1px solid #cbd5e1', borderRadius: 2 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>{c.resumes[0].fileName}</Typography>
                          <Stack direction="row" spacing={1}>
                            <Button size="small" variant="text">View</Button>
                            <Button size="small" variant="text">Download</Button>
                          </Stack>
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                ) : (
                  <Stack spacing={3}>
                    {/* Bio */}
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Bio</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        {c.portfolio?.bio || 'Freelance work, mostly greenfield SaaS dashboards.'}
                      </Typography>
                    </Box>

                    {/* Featured Portfolio Projects */}
                    {c.portfolio?.projects && c.portfolio.projects.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>Featured Portfolio Projects</Typography>
                        <Stack spacing={2}>
                          {c.portfolio.projects.map((proj) => (
                            <Box key={proj.id} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: 'rgba(0,0,0,0.01)' }}>
                              <Typography variant="body2" sx={{ fontWeight: 800 }}>{proj.title}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                {proj.role} · {proj.liveUrl ? 'Live project' : 'Internal repo'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
                                {proj.description}
                              </Typography>
                              <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {proj.skills?.map((sk) => (
                                  <Chip key={sk.id} label={sk.name} size="small" variant="outlined" />
                                ))}
                              </Box>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {/* Skills Check list */}
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>Skills &amp; Technologies</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {c.skills?.map((sk) => (
                          <Chip
                            key={sk.id}
                            label={sk.skill.name}
                            icon={<CheckIcon fontSize="small" />}
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        ))}
                      </Box>
                    </Box>

                    {/* Reviews */}
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>Client Reviews</Typography>
                      <Box sx={{ p: 2, border: '1px dashed #cbd5e1', borderRadius: 2.5, bgcolor: 'rgba(0, 0, 0, 0.01)' }}>
                        <Stack direction="row" spacing={0.5} sx={{ mb: 1, color: 'warning.main' }}>
                          <StarIcon sx={{ fontSize: 16 }} />
                          <StarIcon sx={{ fontSize: 16 }} />
                          <StarIcon sx={{ fontSize: 16 }} />
                          <StarIcon sx={{ fontSize: 16 }} />
                          <StarIcon sx={{ fontSize: 16 }} />
                        </Stack>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1, color: 'text.secondary' }}>
                          "Delivered ahead of schedule. Exceptional communication and highly clean React/TypeScript codebase."
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', textAlign: 'right' }}>
                          — Client X (FinTech Platform)
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>
                )}
              </Box>

              {/* Action Button */}
              <Box sx={{ pt: 2, borderTop: '1px solid #e2e8f0' }}>
                <Button
                  variant="contained"
                  fullWidth
                  color={isFreelanceFlow ? 'secondary' : 'primary'}
                  startIcon={<MailOutlineIcon />}
                  onClick={() => {
                    setDrawerOpen(false);
                    setSelectedCandidate(c);
                    setInviteModal(true);
                  }}
                  sx={{ fontWeight: 800, py: 1.2, borderRadius: 2.5 }}
                >
                  {isFreelanceFlow ? 'Invite to Project' : 'Send Invite'}
                </Button>
              </Box>
            </Stack>
          );
        })()}
      </Drawer>

      {/* Toast Notification */}
      <Snackbar open={toastOpen} autoHideDuration={4000} onClose={() => setToastOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" sx={{ width: '100%', fontWeight: 700 }}>
          {toastMsg}
        </Alert>
      </Snackbar>
    </Container>
  );
}
