'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Stack,
  Chip,
  Divider,
  MenuItem,
  Slider,
  Popover,
  ToggleButtonGroup,
  ToggleButton,
  Switch,
  Pagination,
  CircularProgress,
} from '@mui/material';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import VerifiedIcon from '@mui/icons-material/Verified';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ClearIcon from '@mui/icons-material/Clear';
import TuneIcon from '@mui/icons-material/Tune';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GavelIcon from '@mui/icons-material/Gavel';

interface Project {
  id: string;
  title: string;
  client: string;
  isClientVerified: boolean;
  engagementType: 'Fixed' | 'Hourly';
  budgetFixed?: number;
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  projectLength: 'Under 1 week' | '1-4 weeks' | '1-3 months' | '3+ months';
  postedHoursAgo: number;
  skills: { name: string; isMandatory: boolean }[];
  aiScore: number;
  aiBreakdown: {
    skills: { score: number; max: number };
    experience: { score: number; max: number };
    portfolio: { score: number; max: number };
  };
  bidsCount: number;
  hasBid: boolean;
  kycStatus?: string;
  paymentMethodVerified?: boolean;
}



import { useGetJobsQuery } from '@/store/api/jobsApi';
import { useGetProposalsQuery } from '@/store/api/contractsApi';

export default function FreelanceJobsPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  // RTK Query endpoints
  const { data: dbJobs, isLoading: isJobsLoading } = useGetJobsQuery({ jobType: 'FREELANCE' });
  const { data: dbProposals } = useGetProposalsQuery({ mine: true });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Search & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('aiScore');

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 2;

  // Live client verification states from Recruiter Desk
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [kycStatus, setKycStatus] = useState<'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED'>('NOT_STARTED');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pv = localStorage.getItem('bivio_paymentMethodVerified') === 'true';
      const ks = (localStorage.getItem('bivio_kycStatus') as any) || 'NOT_STARTED';
      setPaymentVerified(pv);
      setKycStatus(ks);
    }
  }, []);



  // Filters
  const [engagementType, setEngagementType] = useState<'All' | 'Fixed' | 'Hourly'>('All');
  const [fixedBudgetMin, setFixedBudgetMin] = useState(0);
  const [hourlyRateMin, setHourlyRateMin] = useState(0);
  const [projectLength, setProjectLength] = useState('All');
  const [clientVerified, setClientVerified] = useState(false);
  const [minMatchFilter, setMinMatchFilter] = useState(false);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, engagementType, fixedBudgetMin, hourlyRateMin, projectLength, clientVerified, minMatchFilter]);

  // Popover breakdown state
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [activeBreakdown, setActiveBreakdown] = useState<Project['aiBreakdown'] | null>(null);

  const handleOpenBreakdown = (event: React.MouseEvent<HTMLElement>, breakdown: Project['aiBreakdown']) => {
    setAnchorEl(event.currentTarget);
    setActiveBreakdown(breakdown);
  };

  const handleCloseBreakdown = () => {
    setAnchorEl(null);
    setActiveBreakdown(null);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setEngagementType('All');
    setFixedBudgetMin(0);
    setHourlyRateMin(0);
    setProjectLength('All');
    setClientVerified(false);
    setMinMatchFilter(false);
  };

  const projectsList = useMemo(() => {
    const apiJobs = dbJobs?.data || [];
    const proposalsData = dbProposals?.data || [];

    const mappedApi = apiJobs.map((job: any) => {
      const matchingProposal = proposalsData.find((p: any) => p.jobId === job.id && p.status !== 'WITHDRAWN' && p.status !== 'REJECTED');
      
      const engagementType = job.budgetType === 'HOURLY' ? 'Hourly' : 'Fixed';
      const budgetFixed = job.budgetType === 'FIXED' ? Number(job.budget || 0) : undefined;
      const hourlyRateMin = job.budgetType === 'HOURLY' ? Number(job.budget || 0) : undefined;
      const hourlyRateMax = job.budgetType === 'HOURLY' ? Number(job.budget || 0) : undefined;

      const projectLengthMap: any = {
        'UNDER_1_WEEK': 'Under 1 week',
        'W1_4': '1-4 weeks',
        'M1_3': '1-3 months',
        'M3_PLUS': '3+ months',
      };
      const projectLength = projectLengthMap[job.projectLengthEstimate] || '1-4 weeks';

      let postedHoursAgo = 2;
      if (job.publishedAt) {
        const diffMs = Date.now() - new Date(job.publishedAt).getTime();
        postedHoursAgo = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
      }

      const skills = job.skills?.map((js: any) => ({
        name: js.skill?.name || '',
        isMandatory: js.isMandatory || false
      })) || [];

      const aiScore = 75;
      const aiBreakdown = {
        skills: { score: 30, max: 40 },
        experience: { score: 25, max: 30 },
        portfolio: { score: 20, max: 30 },
      };

      const isClientVerified = job.recruiter?.paymentMethodVerified || job.recruiter?.kycStatus === 'APPROVED';

      return {
        id: job.id,
        title: job.title,
        client: job.company?.name || job.recruiter?.user?.fullName || 'Acme Client',
        isClientVerified,
        kycStatus: job.recruiter?.kycStatus || 'NOT_STARTED',
        paymentMethodVerified: job.recruiter?.paymentMethodVerified || false,
        engagementType,
        budgetFixed,
        hourlyRateMin,
        hourlyRateMax,
        projectLength,
        postedHoursAgo,
        skills,
        aiScore,
        aiBreakdown,
        bidsCount: job.proposalCount || 0,
        hasBid: !!matchingProposal,
      };
    });

    return mappedApi;
  }, [dbJobs, dbProposals]);

  // Filter & Sort Logic
  const filteredProjects = useMemo(() => {
    return projectsList.filter((proj) => {
      // Search Box
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          proj.title.toLowerCase().includes(query) ||
          proj.client.toLowerCase().includes(query) ||
          proj.skills.some((s : any) => s.name.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }

      // Engagement type
      if (engagementType !== 'All' && proj.engagementType !== engagementType) return false;

      // Budget limits
      if (proj.engagementType === 'Fixed' && proj.budgetFixed && fixedBudgetMin > 0 && proj.budgetFixed < fixedBudgetMin) return false;
      if (proj.engagementType === 'Hourly' && proj.hourlyRateMax && hourlyRateMin > 0 && proj.hourlyRateMax < hourlyRateMin) return false;

      // Project Length
      if (projectLength !== 'All' && proj.projectLength !== projectLength) return false;

      // Client verified
      if (clientVerified && !proj.isClientVerified) return false;

      // Match threshold (>= 60%)
      if (minMatchFilter && proj.aiScore < 60) return false;

      return true;
    }).sort((a, b) => {
      if (sortOption === 'aiScore') return b.aiScore - a.aiScore;
      if (sortOption === 'newest') return a.postedHoursAgo - b.postedHoursAgo;
      if (sortOption === 'budget') {
        const aVal = a.engagementType === 'Fixed' ? (a.budgetFixed ?? 0) : (a.hourlyRateMax ?? 0) * 40;
        const bVal = b.engagementType === 'Fixed' ? (b.budgetFixed ?? 0) : (b.hourlyRateMax ?? 0) * 40;
        return bVal - aVal;
      }
      if (sortOption === 'fewestBids') return a.bidsCount - b.bidsCount;
      return 0;
    });
  }, [projectsList, searchQuery, engagementType, fixedBudgetMin, hourlyRateMin, projectLength, clientVerified, minMatchFilter, sortOption]);

  const paginatedProjects = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return filteredProjects.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredProjects, page]);

  if (!mounted || isJobsLoading) {
    if (!mounted) return null;
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading freelance projects...
          </Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* HEADER SECTION */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 850, fontFamily: 'Outfit, sans-serif', mb: 1, color: 'secondary.main' }}>
          Explore Freelance Projects
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Find client briefs matching your capacity and submit milestone-based proposals.
        </Typography>
      </Box>

      {/* SEARCH AND VIEW TOGGLE BAR */}
      <Card sx={{ border: '1px solid #f1f5f9', borderRadius: 4, mb: 4 }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                placeholder="Search projects, clients, or skills..."
                fullWidth
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <ToggleButtonGroup
                value={engagementType}
                exclusive
                size="small"
                fullWidth
                onChange={(_e, val) => val && setEngagementType(val)}
                color="secondary"
                sx={{
                  bgcolor: '#f1f5f9',
                  p: 0.5,
                  borderRadius: 2.5,
                  border: 'none',
                  '& .MuiToggleButton-root': {
                    border: 'none',
                    borderRadius: 2,
                    py: 0.75,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'none',
                    '&.Mui-selected': {
                      bgcolor: '#ffffff',
                      color: 'secondary.main',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    },
                  },
                }}
              >
                <ToggleButton value="All">All Projects</ToggleButton>
                <ToggleButton value="Fixed">Fixed Price</ToggleButton>
                <ToggleButton value="Hourly">Hourly</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Sort By"
                size="small"
                fullWidth
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <MenuItem value="aiScore">Best Matches</MenuItem>
                <MenuItem value="newest">Newest Projects</MenuItem>
                <MenuItem value="budget">Highest Budget</MenuItem>
                <MenuItem value="fewestBids">Fewest Bids</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={4}>
        {/* LEFT COLUMN: FILTERS */}
        <Grid item xs={12} md={3.5}>
          <Card sx={{ border: '1px solid #f1f5f9', borderRadius: 4, position: 'sticky', top: 90 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TuneIcon fontSize="small" /> Filters
                </Typography>
                <Button size="small" startIcon={<ClearIcon />} onClick={clearAllFilters} color="secondary">
                  Clear
                </Button>
              </Stack>
              <Divider sx={{ mb: 2.5 }} />

              <Stack spacing={3}>
                {/* Budget Sliders based on Selection */}
                {engagementType !== 'Hourly' && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700, mb: 1 }}>
                      MIN FIXED BUDGET (INR)
                    </Typography>
                    <Slider
                      min={10000}
                      max={500000}
                      step={10000}
                      value={fixedBudgetMin || 10000}
                      onChange={(_e, val) => setFixedBudgetMin(val as number)}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(v) => `₹${v.toLocaleString()}`}
                      color="secondary"
                    />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {fixedBudgetMin > 0 ? `Above ₹${fixedBudgetMin.toLocaleString()}` : 'Any budget'}
                    </Typography>
                  </Box>
                )}

                {engagementType !== 'Fixed' && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700, mb: 1 }}>
                      MIN HOURLY RATE (INR)
                    </Typography>
                    <Slider
                      min={500}
                      max={5000}
                      step={250}
                      value={hourlyRateMin || 500}
                      onChange={(_e, val) => setHourlyRateMin(val as number)}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(v) => `₹${v}/hr`}
                      color="secondary"
                    />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {hourlyRateMin > 0 ? `Above ₹${hourlyRateMin}/hr` : 'Any hourly rate'}
                    </Typography>
                  </Box>
                )}

                {/* Project Length */}
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700, mb: 1 }}>
                    PROJECT TIMELINE
                  </Typography>
                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={projectLength}
                    onChange={(e) => setProjectLength(e.target.value)}
                  >
                    <MenuItem value="All">Any Duration</MenuItem>
                    <MenuItem value="Under 1 week">Under 1 week</MenuItem>
                    <MenuItem value="1-4 weeks">1-4 weeks</MenuItem>
                    <MenuItem value="1-3 months">1-3 months</MenuItem>
                    <MenuItem value="3+ months">3+ months</MenuItem>
                  </TextField>
                </Box>

                {/* Client verified switch */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={clientVerified}
                      onChange={(e) => setClientVerified(e.target.checked)}
                      color="secondary"
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Verified clients only
                    </Typography>
                  }
                />

                <Divider />

                {/* Match threshold toggle */}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={minMatchFilter}
                      onChange={(e) => setMinMatchFilter(e.target.checked)}
                      color="secondary"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Match score ≥ 60% only
                    </Typography>
                  }
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* RIGHT COLUMN: PROJECTS LIST */}
        <Grid item xs={12} md={8.5}>
          <Stack spacing={2.5}>
            {paginatedProjects.map((proj) => (
              <Card
                key={proj.id}
                sx={{
                  border: '1.5px solid',
                  borderColor: proj.hasBid ? 'divider' : '#f1f5f9',
                  borderRadius: 4,
                  boxShadow: 'none',
                  bgcolor: proj.hasBid ? '#fafafa' : '#ffffff',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(13, 148, 136, 0.04)',
                    borderColor: 'secondary.light',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={8.5}>
                      {/* Project Meta */}
                      <Stack spacing={1.5}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                            {proj.title}
                          </Typography>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                              {proj.client}
                            </Typography>
                            {(() => {
                              const isIdVerified = proj.kycStatus === 'APPROVED';
                              const isPayVerified = proj.paymentMethodVerified;
                              
                              if (isIdVerified) {
                                return (
                                  <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <VerifiedIcon color="primary" sx={{ fontSize: 16 }} />
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                      (Identity verified)
                                    </Typography>
                                  </Stack>
                                );
                              } else if (isPayVerified) {
                                return (
                                  <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <VerifiedIcon color="action" sx={{ fontSize: 16 }} />
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                      (Payment verified)
                                    </Typography>
                                  </Stack>
                                );
                              } else {
                                return (
                                  <Chip label="New client" size="small" variant="outlined" sx={{ height: 16, fontSize: '0.65rem', px: 0.5 }} />
                                );
                              }
                            })()}
                          </Stack>
                        </Box>

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip
                            label={
                              proj.engagementType === 'Fixed'
                                ? `Fixed: ₹${proj.budgetFixed?.toLocaleString()}`
                                : proj.hourlyRateMin === proj.hourlyRateMax
                                  ? `Hourly: ₹${proj.hourlyRateMin}/hr`
                                  : `Hourly: ₹${proj.hourlyRateMin} - ₹${proj.hourlyRateMax}/hr`
                            }
                            size="small"
                            sx={{
                              bgcolor: 'rgba(13, 148, 136, 0.04)',
                              fontWeight: 700,
                              color: 'secondary.main',
                            }}
                          />
                          <Chip
                            icon={<AccessTimeIcon sx={{ fontSize: '0.8rem !important' }} />}
                            label={proj.projectLength}
                            size="small"
                            variant="outlined"
                          />
                          <Chip label={`Bids: ${proj.bidsCount}`} size="small" variant="outlined" />
                           <Chip
                            label={
                              proj.postedHoursAgo >= 24
                                ? `Posted ${Math.round(proj.postedHoursAgo / 24)}d ago`
                                : `Posted ${proj.postedHoursAgo}h ago`
                            }
                            size="small"
                            variant="outlined"
                          />
                        </Stack>

                        <Box sx={{ pt: 1 }}>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, fontWeight: 700 }}>
                            REQUIRED SKILLS
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {proj.skills.map((s:any) => (
                              <Chip
                                key={s.name}
                                label={s.name}
                                size="small"
                                color={s.isMandatory ? 'secondary' : 'default'}
                                variant={s.isMandatory ? 'filled' : 'outlined'}
                                sx={{
                                  fontWeight: s.isMandatory ? 700 : 500,
                                  border: s.isMandatory ? 'none' : '1px solid #e2e8f0',
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                      </Stack>
                    </Grid>

                    {/* AI Score Circular Meter & Proposal CTA */}
                    <Grid item xs={12} sm={3.5} sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'flex-end' }, justifyContent: 'space-between' }}>
                      <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, mb: { xs: 2, sm: 0 } }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                          <Box
                            sx={{
                              width: 50,
                              height: 50,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '4px solid',
                              borderColor: proj.aiScore >= 80 ? 'success.main' : proj.aiScore >= 60 ? 'warning.main' : 'error.main',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              color: 'text.primary',
                            }}
                          >
                            {proj.aiScore}%
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Match Score
                            </Typography>
                            <Button
                              size="small"
                              startIcon={<HelpOutlineIcon sx={{ fontSize: 12 }} />}
                              onClick={(e) => handleOpenBreakdown(e, proj.aiBreakdown)}
                              sx={{ p: 0, textTransform: 'none', minWidth: 'auto', fontSize: '0.75rem', color: 'secondary.main' }}
                            >
                              why?
                            </Button>
                          </Box>
                        </Stack>
                      </Box>

                      {proj.hasBid ? (
                        <Stack spacing={1} sx={{ width: '100%', alignItems: { xs: 'flex-start', sm: 'flex-end' } }}>
                          <Chip label="Bid Submitted" color="success" size="small" sx={{ fontWeight: 700, px: 2 }} />
                          <Link href="/proposals" style={{ textDecoration: 'none' }}>
                            <Typography variant="caption" color="secondary" sx={{ fontWeight: 700, '&:hover': { textDecoration: 'underline' } }}>
                              View Proposal →
                            </Typography>
                          </Link>
                        </Stack>
                      ) : (
                        <Button
                          variant="contained"
                          color="secondary"
                          fullWidth
                          onClick={() => router.push(`/freelance-jobs/${proj.id}`)}
                          sx={{ borderRadius: 2.5, fontWeight: 700 }}
                        >
                          Submit Proposal
                        </Button>
                      )}
                    </Grid>
                  </Grid>

                  {/* Bid Snapshot Alert for already bid cards */}
                  {proj.hasBid && (
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(13, 148, 136, 0.02)', border: '1px dashed rgba(13, 148, 136, 0.15)', borderRadius: 2.5, maxWidth: '500px' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontWeight: 500 }}>
                        Bid amount submitted: <strong>₹2,800/hr</strong> (15 Jul)
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'secondary.main', fontWeight: 700, display: 'block' }}>
                        Your current profile matches this job at {proj.aiScore}% — this doesn't affect this proposal bid.
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* EMPTY STATE */}
            {filteredProjects.length === 0 && (
              <Card sx={{ p: 6, textAlign: 'center', border: '1.5px dashed #e2e8f0', borderRadius: 4 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                    No matching projects found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Try adjusting filters or checking back later for fresh briefs.
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={clearAllFilters}
                    sx={{ borderRadius: 2.5, px: 4, fontWeight: 700 }}
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            )}
            {filteredProjects.length > PAGE_SIZE && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                  count={Math.ceil(filteredProjects.length / PAGE_SIZE)}
                  page={page}
                  onChange={(_e, value) => setPage(value)}
                  color="secondary"
                  size="large"
                />
              </Box>
            )}
          </Stack>
        </Grid>
      </Grid>

      {/* Match Breakdown Popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleCloseBreakdown}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { p: 2.5, borderRadius: 3, border: '1px solid #f1f5f9', width: 280 },
        }}
      >
        {activeBreakdown && (
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, borderBottom: '1px solid #f1f5f9', pb: 1 }}>
              Match Score breakdown
            </Typography>

            {[
              { label: 'Skills Alignment', value: activeBreakdown.skills },
              { label: 'Experience History', value: activeBreakdown.experience },
              { label: 'Portfolio Projects', value: activeBreakdown.portfolio },
            ].map((item) => (
              <Box key={item.label}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {item.label}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {item.value.score} / {item.value.max}
                  </Typography>
                </Stack>
                <Box sx={{ width: '100%', height: 6, bgcolor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                  <Box
                    sx={{
                      width: `${(item.value.score / item.value.max) * 100}%`,
                      height: '100%',
                      bgcolor: 'secondary.main',
                      borderRadius: 3,
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Popover>
    </Container>
  );
}
