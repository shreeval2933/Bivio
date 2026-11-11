'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Stack,
  Box,
  Button,
  Tabs,
  Tab,
  Avatar,
  Chip,
  Grid,
  TextField,
  MenuItem,
  LinearProgress,
  InputAdornment,
  Paper,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import type { Contract } from '@/types';
import { useGetContractsQuery } from '@/store/api/contractsApi';
import { useGetJobsQuery } from '@/store/api/jobsApi';

export default function RecruiterContractsPage() {
  const { data: dbContracts, isLoading: isContractsLoading } = useGetContractsQuery();
  const { data: dbJobs, isLoading: isJobsLoading } = useGetJobsQuery();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);

  // Search & Filter & Sort States
  const [activeTab, setActiveTab] = useState<number>(0); // 0: Active, 1: Completed, 2: Cancelled
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('ALL');
  const [sortBy, setSortBy] = useState<'RECENT' | 'NEWEST' | 'OLDEST' | 'HIGHEST_VALUE'>('RECENT');

  useEffect(() => {
    if (dbContracts?.data) {
      setContracts(dbContracts.data);
    }
  }, [dbContracts]);

  useEffect(() => {
    if (dbJobs?.data) {
      setJobs(dbJobs.data.filter((j: any) => j.jobType === 'FREELANCE'));
    }
  }, [dbJobs]);



  // Filtered List
  const filteredContracts = useMemo(() => {
    return contracts
      .filter((c) => {
        // Tab check
        const status = c.status;
        if (activeTab === 0) {
          // Active
          if (!['ACTIVE', 'PENDING_FUNDING', 'DISPUTED'].includes(status)) return false;
        } else if (activeTab === 1) {
          // Completed
          if (status !== 'COMPLETED') return false;
        } else if (activeTab === 2) {
          // Cancelled
          if (status !== 'CANCELLED') return false;
        }

        // Job filter
        if (selectedJobId !== 'ALL' && c.jobId !== selectedJobId) return false;

        // Search freelancer
        const name = c.freelancer?.user.fullName || '';
        const proj = c.job?.title || '';
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          if (!name.toLowerCase().includes(q) && !proj.toLowerCase().includes(q)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const valA = parseFloat(a.agreedAmount || '0');
        const valB = parseFloat(b.agreedAmount || '0');

        if (sortBy === 'HIGHEST_VALUE') return valB - valA;
        if (sortBy === 'NEWEST') return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
        if (sortBy === 'OLDEST') return new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime();
        return new Date(b.startedAt || b.createdAt || '').getTime() - new Date(a.startedAt || a.createdAt || '').getTime(); // RECENT default
      });
  }, [contracts, activeTab, searchQuery, selectedJobId, sortBy]);

  if (isContractsLoading || isJobsLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading contracts...
          </Typography>
        </Stack>
      </Container>
    );
  }

  // Action required helper
  const getActionRequired = (c: Contract) => {
    if (c.status === 'PENDING_FUNDING') {
      return 'Awaiting first payment';
    }
    if (c.status === 'DISPUTED') {
      return 'Under admin review';
    }

    // Inspect milestone states
    const milestones = c.milestones || [];
    const submitted = milestones.find(m => m.status === 'SUBMITTED');
    if (submitted) {
      return 'Milestone submitted — review needed';
    }

    const pending = milestones.find(m => m.status === 'PENDING');
    if (pending) {
      return 'Fund escrow to begin';
    }

    return null;
  };

  // Helper for progress calculations
  const getProgressStats = (c: Contract) => {
    const milestones = c.milestones || [];
    const total = milestones.length;
    const released = milestones.filter(m => m.status === 'APPROVED' || m.status === 'PAID').length;
    const releasedAmount = milestones
      .filter(m => m.status === 'APPROVED' || m.status === 'PAID')
      .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);
    const percent = total > 0 ? (released / total) * 100 : 0;
    
    return {
      text: released === total ? `All ${total} milestones released` : `Milestone ${released + 1} of ${total}`,
      amountReleased: releasedAmount,
      percent,
      totalCount: total,
      releasedCount: released
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'primary';
      case 'PENDING_FUNDING': return 'warning';
      case 'DISPUTED': return 'error';
      case 'COMPLETED': return 'success';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Title */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 850, fontFamily: 'Outfit, sans-serif', color: 'secondary.main' }}>
          Contracts
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track and release escrow milestones for active freelance projects
        </Typography>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        sx={{ borderBottom: '1px solid #e2e8f0', mb: 3 }}
      >
        <Tab label="Active" sx={{ fontWeight: 700 }} />
        <Tab label="Completed" sx={{ fontWeight: 700 }} />
        <Tab label="Cancelled" sx={{ fontWeight: 700 }} />
      </Tabs>

      {/* Filters & Sorting */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <TextField
            placeholder="Search freelancer or project..."
            size="small"
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              )
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            label="Filter by Project"
            size="small"
            fullWidth
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
          >
            <MenuItem value="ALL">All Projects</MenuItem>
            {jobs.map((job) => (
              <MenuItem key={job.id} value={job.id}>{job.title}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            label="Sort Options"
            size="small"
            fullWidth
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <MenuItem value="RECENT">Most Recently Updated</MenuItem>
            <MenuItem value="NEWEST">Newest Contracts</MenuItem>
            <MenuItem value="OLDEST">Oldest Contracts</MenuItem>
            <MenuItem value="HIGHEST_VALUE">Highest Value</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      {/* Contracts List */}
      <Stack spacing={3}>
        {filteredContracts.length === 0 ? (
          <Card sx={{ p: 6, textAlign: 'center', border: '1.5px dashed #e2e8f0', borderRadius: 4, boxShadow: 'none' }}>
            <CardContent>
              {activeTab === 0 && (
                <>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>No active contracts</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Contracts are created when you accept a freelancer&apos;s proposal.
                  </Typography>
                  <Link href="/recruiter/proposals" style={{ textDecoration: 'none' }}>
                    <Button variant="contained" color="secondary" sx={{ fontWeight: 700, borderRadius: 2 }}>
                      Review Proposals
                    </Button>
                  </Link>
                </>
              )}
              {activeTab === 1 && (
                <>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>No completed contracts yet</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    When all milestones are completed and approved, the contract is finalized.
                  </Typography>
                  <Button variant="outlined" color="secondary" onClick={() => setActiveTab(0)} sx={{ fontWeight: 700, borderRadius: 2 }}>
                    View Active Contracts
                  </Button>
                </>
              )}
              {activeTab === 2 && (
                <>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>No cancelled contracts</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Any terminated contracts will be logged in this section.
                  </Typography>
                  <Link href="/recruiter/freelancers" style={{ textDecoration: 'none' }}>
                    <Button variant="outlined" color="secondary" sx={{ fontWeight: 700, borderRadius: 2 }}>
                      Browse Freelancers
                    </Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredContracts.map((c) => {
            const actionReq = getActionRequired(c);
            const progress = getProgressStats(c);

            return (
              <Card
                key={c.id}
                sx={{
                  borderRadius: 4,
                  border: '1px solid #e2e8f0',
                  boxShadow: 'none',
                  transition: 'border 0.2s',
                  '&:hover': { borderColor: 'secondary.main' }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent="space-between">
                    {/* Left: Avatar, Contractor & Job link */}
                    <Stack direction="row" spacing={2} sx={{ flex: 1 }}>
                      <Link href={`/recruiter/jobs/${c.jobId}/candidates`} style={{ textDecoration: 'none' }}>
                        <Avatar
                          src={c.freelancer?.user?.profileImage || undefined}
                          sx={{ width: 48, height: 48, bgcolor: 'secondary.light', color: 'secondary.dark', fontWeight: 800, cursor: 'pointer' }}
                        >
                          {c.freelancer?.user?.fullName?.[0] || 'F'}
                        </Avatar>
                      </Link>
                      <Box sx={{ width: '100%' }}>
                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
                          <Link href={`/recruiter/jobs/${c.jobId}/candidates`} style={{ textDecoration: 'none' }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', '&:hover': { color: 'secondary.main', textDecoration: 'underline' } }}>
                              {c.freelancer?.user?.fullName || 'Freelancer'}
                            </Typography>
                          </Link>
                          <Chip
                            label={c.status}
                            size="small"
                            color={getStatusColor(c.status)}
                            sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }}
                          />
                        </Stack>
                        <Link href={`/recruiter/jobs/${c.jobId}`} style={{ textDecoration: 'none' }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: 'primary.main',
                              '&:hover': { textDecoration: 'underline' }
                            }}
                          >
                            {c.job?.title}
                          </Typography>
                        </Link>

                        {/* Agreed Amount & Milestone tracker */}
                        <Stack direction="row" spacing={2} sx={{ mt: 1.5, mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            ₹{parseInt(c.agreedAmount || '0').toLocaleString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {progress.text}
                          </Typography>
                        </Stack>

                        {/* Released progress bar */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, maxWidth: 350 }}>
                          <Box sx={{ width: '100%' }}>
                            <LinearProgress
                              variant="determinate"
                              value={progress.percent}
                              color="secondary"
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                            ₹{progress.amountReleased.toLocaleString()} released
                          </Typography>
                        </Box>
                      </Box>
                    </Stack>

                    {/* Right: Actions, Warnings & Chat alerts */}
                    <Stack spacing={2} alignItems={{ xs: 'flex-start', md: 'flex-end' }} justifyContent="space-between" sx={{ minWidth: 240 }}>
                      {/* Action Indicators */}
                      <Box>
                        {actionReq && (
                          <Chip
                            icon={<WarningAmberIcon />}
                            label={actionReq}
                            color="warning"
                            variant="outlined"
                            sx={{ fontWeight: 750 }}
                          />
                        )}
                      </Box>

                      <Stack direction="row" spacing={2} alignItems="center">
                        <Link href={`/recruiter/contracts/${c.id}`} style={{ textDecoration: 'none' }}>
                          <Button variant="outlined" color="secondary" endIcon={<ArrowForwardIcon />} sx={{ fontWeight: 750 }}>
                            View Contract
                          </Button>
                        </Link>
                      </Stack>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })
        )}
      </Stack>
    </Container>
  );
}
