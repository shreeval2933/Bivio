'use client';

import React, { useState, useMemo, useEffect } from 'react';

import type { Job as ApiJob } from '@/types';
type Job = ApiJob & {
  aiScore?: number;
  aiBreakdown?: any;
  postedDaysAgo?: number;
  alreadyApplied?: boolean;
  remoteType?: string;
  isVerified?: boolean;
};
import useDebounce from '@/hooks/useDebounce';

import { useGetJobsQuery } from '@/store/api/jobsApi';
import { useGetApplicationsQuery } from '@/store/api/applicationsApi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  FormControlLabel,
  Checkbox,
  Stack,
  Chip,
  Divider,
  Slider,
  Popover,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Switch,
  Pagination,
  CircularProgress,
} from '@mui/material';

// ... (rest of file unchanged up to loading block)



// Icons
import SearchIcon from '@mui/icons-material/Search';
import VerifiedIcon from '@mui/icons-material/Verified';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ClearIcon from '@mui/icons-material/Clear';
import TuneIcon from '@mui/icons-material/Tune';
import { useDispatch } from 'react-redux';
import { showNotification } from '@/store/slices/notificationSlice';


const formatSalary = (minVal?: string | number | null, maxVal?: string | number | null) => {
  const min = Number(minVal ?? 0);
  const max = Number(maxVal ?? 0);

  if (min === 0 && max === 0) return 'Competitive';

  const formatSingle = (val: number) => {
    if (val >= 100000) {
      const lakhs = val / 100000;
      return lakhs % 1 === 0 ? `${lakhs}L` : `${lakhs.toFixed(1)}L`;
    }
    if (val >= 1000) {
      const thousands = val / 1000;
      return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(1)}K`;
    }
    return val.toString();
  };

  return `₹${formatSingle(min)} - ${formatSingle(max)}`;
};

export default function JobsPage() {
  const router = useRouter();
  const dispatch = useDispatch();

  // Demo completeness switcher
  const [profileCompleteness, setProfileCompleteness] = useState(85);

  // Pagination state
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 2;

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');

  const [sortOption, setSortOption] = useState('aiScore');
  const [minMatchFilter, setMinMatchFilter] = useState(false);
  const [remoteFlexibility, setRemoteFlexibility] = useState<'All' | 'Remote' | 'Hybrid' | 'On-site'>('All');
  const [clientVerified, setClientVerified] = useState(false);
  const [salaryMin, setSalaryMin] = useState(0);

  // Debounce search query to avoid excessive API calls
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch jobs from backend; we fetch without pagination for client‑side filtering
  const { data, isLoading, isError } = useGetJobsQuery({
    jobType: 'FULL_TIME',
    q: debouncedSearch || undefined,
  });

  const { data: appsData } = useGetApplicationsQuery();

  const apiJobs: Job[] = useMemo(() => {
    const rawJobs = data?.data ?? [];
    const applications = appsData?.data ?? [];

    return rawJobs.map((job: any) => {
      const application = applications.find((app: any) => app.jobId === job.id);
      const alreadyApplied = !!application;

      let aiScore = 75;
      if (job.id.includes('1') || job.title.toLowerCase().includes('senior') || job.title.toLowerCase().includes('react')) {
        aiScore = 92;
      } else if (job.id.includes('2') || job.title.toLowerCase().includes('full stack')) {
        aiScore = 78;
      } else {
        aiScore = 65;
      }

      const aiBreakdown = aiScore === 92 ? {
        skills: { score: 38, max: 40 },
        experience: { score: 27, max: 30 },
        education: { score: 13, max: 15 },
        projects: { score: 14, max: 15 }
      } : {
        skills: { score: 30, max: 40 },
        experience: { score: 22, max: 30 },
        education: { score: 12, max: 15 },
        projects: { score: 14, max: 15 }
      };

      const createdDate = new Date(job.createdAt);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - createdDate.getTime());
      const postedDaysAgo = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

      return {
        ...job,
        alreadyApplied,
        aiScore,
        aiBreakdown,
        postedDaysAgo,
      };
    });
  }, [data, appsData]);

  const handleViewDetails = (jobId: string) => {
    router.push(`/jobs/${jobId}`);
  };

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, minMatchFilter, remoteFlexibility, salaryMin, clientVerified]);

  // Popover breakdown state
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [activeBreakdown, setActiveBreakdown] = useState<Job['aiBreakdown'] | null>(null);

  const handleOpenBreakdown = (event: React.MouseEvent<HTMLElement>, breakdown: Job['aiBreakdown']) => {
    setAnchorEl(event.currentTarget);
    setActiveBreakdown(breakdown);
  };

  const handleCloseBreakdown = () => {
    setAnchorEl(null);
    setActiveBreakdown(null);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setRemoteFlexibility('All');
    setSalaryMin(0);
    setClientVerified(false);
    setMinMatchFilter(false);
  };

  // Filter & Sort Logic (client‑side for filters not supported by backend)
  const filteredJobs = useMemo(() => {
    // Apply client‑side filters on API data
    return apiJobs.filter((job) => {
      // remote flexibility filter (backend does not support this directly)
      if (remoteFlexibility !== 'All') {
        if (remoteFlexibility === 'Remote' && !job.isRemote) return false;
        // Additional remote flexibility cases can be added here
      }
      // salary minimum filter
      if (job.salaryMax && Number(job.salaryMax) < salaryMin) return false;
      // client verified filter
      if (clientVerified && !(job.company?.isVerified)) return false;
      // min match score filter
      if (minMatchFilter && (job.aiScore ?? 0) < 60) return false;
      return true;
    }).sort((a, b) => {
      if (sortOption === 'aiScore') return (b.aiScore ?? 0) - (a.aiScore ?? 0);
      return 0;
    });
  }, [apiJobs, remoteFlexibility, salaryMin, clientVerified, minMatchFilter, sortOption]);

  const paginatedJobs = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return filteredJobs.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredJobs, page]);
  const hasActiveFilters = Boolean(
    searchQuery.trim() !== '' ||
    minMatchFilter ||
    remoteFlexibility !== 'All' ||
    salaryMin > 0 ||
    clientVerified
  );

  if (isError) return (<Container maxWidth="lg" sx={{ py: 6 }}>
    <Alert severity="error">Failed to load jobs. Please try again later.</Alert>
  </Container>);
  if (isLoading) return (<Container sx={{ py: 15 }}>
    <Stack spacing={3} alignItems="center" justifyContent="center">
      <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
      <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
        Loading job details...
      </Typography>
    </Stack>
  </Container>);
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Header */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" sx={{ fontWeight: 850, fontFamily: 'Outfit, sans-serif', mb: 1, color: 'primary.main' }}>
          Explore Full-Time Opportunities
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Browse through open roles verified by Bivio. Apply directly and let AI highlight your profile to recruiters.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* LEFT COLUMN: FILTERS */}
        <Grid item xs={12} md={3.5}>
          <Card sx={{ border: '1px solid #f1f5f9', borderRadius: 4, position: 'sticky', top: 90 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TuneIcon fontSize="small" /> Filters
                </Typography>
                <Button size="small" startIcon={<ClearIcon />} onClick={clearAllFilters} color="primary">
                  Clear
                </Button>
              </Stack>
              <Divider sx={{ mb: 2.5 }} />

              <Stack spacing={3}>
                {/* Salary slider */}
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700, mb: 1 }}>
                    MINIMUM ANNUAL SALARY (INR)
                  </Typography>
                  <Slider
                    min={0}
                    max={5000000}
                    step={100000}
                    value={salaryMin}
                    onChange={(_e, val) => setSalaryMin(val as number)}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => `₹${(v / 100000).toFixed(0)}L`}
                    color="primary"
                  />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Above ₹{(salaryMin / 100000).toFixed(0)} Lakhs per annum
                  </Typography>
                </Box>

                <Divider />

                {/* Remote Flex toggler */}
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700, mb: 1.5 }}>
                    REMOTE FLEXIBILITY
                  </Typography>
                  <ToggleButtonGroup
                    value={remoteFlexibility}
                    exclusive
                    onChange={(_e, val) => val && setRemoteFlexibility(val)}
                    size="small"
                    color="primary"
                    fullWidth
                    sx={{
                      '& .MuiToggleButton-root': {
                        textTransform: 'none',
                        fontWeight: 700,
                        py: 0.8,
                      },
                    }}
                  >
                    <ToggleButton value="All">All</ToggleButton>
                    <ToggleButton value="Hybrid">Hybrid</ToggleButton>
                    <ToggleButton value="Remote">Remote</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                <Divider />

                {/* Client verified switch */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={clientVerified}
                      onChange={(e) => setClientVerified(e.target.checked)}
                      color="primary"
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
                      color="primary"
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

        {/* RIGHT COLUMN: RESULTS */}
        <Grid item xs={12} md={8.5}>
          <Stack spacing={2.5}>
            {paginatedJobs.map((job) => (
              <Card
                key={job.id}
                sx={{
                  border: '1.5px solid',
                  borderColor: job.alreadyApplied ? 'divider' : '#f1f5f9',
                  borderRadius: 4,
                  boxShadow: 'none',
                  bgcolor: job.alreadyApplied ? '#fafafa' : '#ffffff',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
                    borderColor: 'primary.light',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={8.5}>
                      {/* Job Info */}
                      <Stack spacing={1.5}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                            {job.title}
                          </Typography>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                              {job.company?.name}
                            </Typography>
                            {job.company?.isVerified && <VerifiedIcon color="primary" sx={{ fontSize: 16 }} />}
                          </Stack>
                        </Box>

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip label={job.location} size="small" variant="outlined" />
                          <Chip label={job.isRemote ? 'Remote' : (job.employmentType ?? '')} size="small" color="primary" variant="outlined" />
                          <Chip label={formatSalary(job.salaryMin, job.salaryMax)} size="small" sx={{ bgcolor: 'rgba(37, 99, 235, 0.04)', fontWeight: 600, color: 'primary.main' }} />
                          <Chip label={`Posted ${job.postedDaysAgo ?? 0}d ago`} size="small" variant="outlined" />
                        </Stack>

                        <Box sx={{ pt: 1 }}>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, fontWeight: 700 }}>
                            REQUIRED SKILLS
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {job.skills.map((s: any) => (
                              <Chip
                                key={s.skill.name}
                                label={s.skill.name}
                                size="small"
                                color={s.isMandatory ? 'primary' : 'default'}
                                variant={s.isMandatory ? 'filled' : 'outlined'}
                                sx={{
                                  fontWeight: s.isMandatory ? 700 : 500,
                                  border: s.isMandatory ? 'none' : '1px solid #e2e8f0',
                                }}
                              />
                            ))}
                          </Box>
                        </Box>

                        {job.alreadyApplied && (
                          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(37, 99, 235, 0.02)', border: '1px dashed rgba(37, 99, 235, 0.15)', borderRadius: 2.5, maxWidth: '500px' }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontWeight: 500 }}>
                              Match score at application: <strong>{(job.aiScore ?? 0) - 4}%</strong> (15 Jul)
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, display: 'block' }}>
                              Your current profile matches this job at {job.aiScore ?? 0}% — this doesn't affect this application.
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </Grid>

                    {/* AI Score Donut Circle & Action */}
                    <Grid item xs={12} sm={3.5} sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'flex-end' }, justifyContent: 'space-between' }}>
                      <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, mb: { xs: 2, sm: 0 } }}>
                        {profileCompleteness >= 40 ? (
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
                                borderColor: (job.aiScore ?? 0) >= 80 ? 'success.main' : (job.aiScore ?? 0) >= 60 ? 'warning.main' : 'error.main',
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                color: 'text.primary',
                              }}
                            >
                              {job.aiScore ?? 0}%
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Match Score
                              </Typography>
                              <Button
                                size="small"
                                startIcon={<HelpOutlineIcon sx={{ fontSize: 12 }} />}
                                onClick={(e) => handleOpenBreakdown(e, job.aiBreakdown)}
                                sx={{ p: 0, textTransform: 'none', minWidth: 'auto', fontSize: '0.75rem' }}
                              >
                                why?
                              </Button>
                            </Box>
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            Scores locked
                          </Typography>
                        )}
                      </Box>

                      {job.alreadyApplied ? (
                        <Stack
                          spacing={1.5}
                          alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
                          sx={{ width: '100%' }}
                        >
                          <Chip label="Applied" color="success" size="small" sx={{ fontWeight: 700, px: 2 }} />
                          <Link href="/applications" style={{ textDecoration: 'none' }}>
                            <Typography variant="caption" color="primary" sx={{ fontWeight: 700, '&:hover': { textDecoration: 'underline' } }}>
                              View Application →
                            </Typography>
                          </Link>
                        </Stack>
                      ) : (
                        <Button
                          variant="contained"
                          color="primary"
                          fullWidth
                          onClick={() => handleViewDetails(job.id)}
                          sx={{ borderRadius: 2.5, fontWeight: 700 }}
                        >
                          Apply Now
                        </Button>
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}

            {filteredJobs.length > PAGE_SIZE && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination

                  count={Math.ceil(filteredJobs.length / PAGE_SIZE)}
                  page={page}
                  onChange={(_e, value) => setPage(value)}
                  color="primary"
                  size="large"
                />
              </Box>
            )}

            {/* EMPTY STATE - NO JOBS */}
            {filteredJobs.length === 0 && (
              <Card sx={{ p: 6, textAlign: 'center', border: '1.5px dashed #e2e8f0', borderRadius: 4 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                    {hasActiveFilters
                      ? 'No matches for these filters'
                      : 'No open roles right now'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {hasActiveFilters
                      ? 'Try modifying search strings or clearing filters.'
                      : "Turn on match alerts and we'll email you when something fits."}
                  </Typography>
                  {hasActiveFilters ? (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={clearAllFilters}
                      sx={{ borderRadius: 2.5, px: 4, fontWeight: 700 }}
                    >
                      Clear Filters
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() =>
                        dispatch(
                          showNotification({
                            message: 'Match Alerts activated! We will email you new fits.',
                            severity: 'success',
                          })
                        )
                      }
                      sx={{ borderRadius: 2.5, px: 4, fontWeight: 700 }}
                    >
                      Turn on Match Alerts
                    </Button>
                  )}
                </CardContent>
              </Card>
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
              { label: 'Key Skills', value: activeBreakdown.skills },
              { label: 'Work Experience', value: activeBreakdown.experience },
              { label: 'Education Level', value: activeBreakdown.education },
              { label: 'Project Portfolio', value: activeBreakdown.projects },
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
                      bgcolor: 'primary.main',
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
