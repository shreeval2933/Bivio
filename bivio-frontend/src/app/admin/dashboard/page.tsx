'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  IconButton,
  Divider,
  Tooltip,
  CircularProgress,
  Paper,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import VerifiedIcon from '@mui/icons-material/Verified';
import PeopleIcon from '@mui/icons-material/People';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LaunchIcon from '@mui/icons-material/Launch';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RateReviewIcon from '@mui/icons-material/RateReview';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { useGetDashboardStatsQuery } from '@/store/api/adminApi';

interface ActionItem {
  id: string;
  title: string;
  description: string;
  count: number;
  priority: 'Highest' | 'High' | 'Medium' | 'Low';
  link: string;
  icon: React.ReactNode;
}

interface StatTile {
  label: string;
  value: string;
  detail: string;
  color: string;
}

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: statsData, isLoading } = useGetDashboardStatsQuery(undefined, {
    skip: !mounted,
    refetchOnMountOrArgChange: true,
  });

  if (!mounted || isLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading admin overview dashboard...
          </Typography>
        </Stack>
      </Container>
    );
  }

  const actionCounts = statsData?.actionItems || {
    openDisputes: 0,
    staleDisputes: 0,
    pendingKyc: 0,
    failedPayouts: 0,
    reportedUsers: 0,
    reportedReviews: 0,
  };

  const actionItems: ActionItem[] = [
    {
      id: 'open-disputes',
      title: 'Open Disputes',
      description: 'Unassigned open dispute tickets. Escrow funds are locked.',
      count: actionCounts.openDisputes,
      priority: 'Highest',
      link: '/admin/disputes?status=OPEN',
      icon: <GavelIcon sx={{ color: '#ef4444' }} />,
    },
    {
      id: 'stale-disputes',
      title: 'Disputes Under Review (Stale)',
      description: 'Tickets under review for >48 hours requiring administrative resolution.',
      count: actionCounts.staleDisputes,
      priority: 'High',
      link: '/admin/disputes?status=UNDER_REVIEW',
      icon: <HourglassEmptyIcon sx={{ color: '#f97316' }} />,
    },
    {
      id: 'pending-kyc',
      title: 'Pending KYC Submissions',
      description: 'Awaiting verification. Recruiter transactions and high-value contracts are blocked.',
      count: actionCounts.pendingKyc,
      priority: 'High',
      link: '/admin/verifications?status=PENDING',
      icon: <VerifiedIcon sx={{ color: '#3b82f6' }} />,
    },
    {
      id: 'failed-payouts',
      title: 'Failed Payouts',
      description: 'Platform transactions failed. Needs manual retry or review.',
      count: actionCounts.failedPayouts,
      priority: 'High',
      link: '/admin/financials',
      icon: <ErrorOutlineIcon sx={{ color: '#ef4444' }} />,
    },
    {
      id: 'reported-users',
      title: 'Moderated / Warned Users',
      description: 'Accounts flagged via moderation reports or administrative sanctions.',
      count: actionCounts.reportedUsers,
      priority: 'Medium',
      link: '/admin/users',
      icon: <PeopleIcon sx={{ color: '#eab308' }} />,
    },
    {
      id: 'reported-reviews',
      title: 'Unpublished Reviews',
      description: 'Feedback reviews awaiting double-blind publish window expiration.',
      count: actionCounts.reportedReviews,
      priority: 'Low',
      link: '/admin/settings',
      icon: <RateReviewIcon sx={{ color: '#6b7280' }} />,
    },
  ];

  const totalUrgentCount = actionItems.reduce((sum, item) => sum + item.count, 0);

  const kpis = statsData?.kpis;
  const stats: StatTile[] = [
    {
      label: 'Active Users',
      value: (kpis?.activeUsers.total ?? 0).toLocaleString(),
      detail: `${(kpis?.activeUsers.candidates ?? 0).toLocaleString()} Candidates | ${(kpis?.activeUsers.recruiters ?? 0).toLocaleString()} Recruiters`,
      color: '#3b82f6',
    },
    {
      label: 'Open Jobs',
      value: (kpis?.openJobs.total ?? 0).toLocaleString(),
      detail: `${(kpis?.openJobs.fullTime ?? 0).toLocaleString()} Full-time | ${(kpis?.openJobs.freelance ?? 0).toLocaleString()} Freelance`,
      color: '#10b981',
    },
    {
      label: 'Active Contracts',
      value: (kpis?.activeContracts.total ?? 0).toLocaleString(),
      detail: `₹${(kpis?.activeContracts.escrowLockedInr ?? 0).toLocaleString('en-IN')} locked in Escrow`,
      color: '#8b5cf6',
    },
    {
      label: 'Revenue (This Month)',
      value: `₹${(kpis?.monthlyRevenue.amountInr ?? 0).toLocaleString('en-IN')}`,
      detail: 'From posting fees & commissions',
      color: '#0d9488',
    },
    {
      label: 'Open Disputes',
      value: (kpis?.openDisputes.total ?? 0).toLocaleString(),
      detail: `${kpis?.openDisputes.unassigned ?? 0} Unassigned | ${kpis?.openDisputes.underReview ?? 0} Under Review`,
      color: '#f59e0b',
    },
    {
      label: 'Avg Resolution Time',
      value: `${kpis?.avgResolutionHours ?? 0} Hours`,
      detail: 'Dispute close time health indicator',
      color: '#ec4899',
    },
  ];

  const activities = statsData?.recentActivities || [];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Highest':
        return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' };
      case 'High':
        return { bg: '#ffedd5', text: '#9a3412', border: '#fed7aa' };
      case 'Medium':
        return { bg: '#fef9c3', text: '#854d0e', border: '#fef08a' };
      case 'Low':
      default:
        return { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
    }
  };

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'dispute':
        return '#ef4444';
      case 'kyc':
        return '#3b82f6';
      case 'payout':
        return '#10b981';
      case 'user':
      default:
        return '#8b5cf6';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ pb: 6 }}>
      {/* Header */}
      <Card
        variant="outlined"
        sx={{
          mb: 4,
          borderRadius: 4,
          borderColor: '#e2e8f0',
          background: 'linear-gradient(to right, #ffffff, #f8fafc)',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
            Admin Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor live platform performance metrics, investigate disputes, audit KYC requests, and oversee financial operations.
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={4}>
        {/* Section 1 — Needs Your Action */}
        <Grid item xs={12}>
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
              <WarningAmberIcon sx={{ color: '#ef4444' }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Needs Your Action
              </Typography>
              {totalUrgentCount > 0 && (
                <Chip
                  label={`${totalUrgentCount} Urgent Items`}
                  size="small"
                  sx={{ bgcolor: '#fee2e2', color: '#ef4444', fontWeight: 800 }}
                />
              )}
            </Stack>

            {totalUrgentCount === 0 ? (
              <Card
                variant="outlined"
                sx={{
                  p: 5,
                  textAlign: 'center',
                  bgcolor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderStyle: 'dashed',
                  borderRadius: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 200,
                }}
              >
                <CheckCircleOutlineIcon sx={{ fontSize: 48, color: '#10b981', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
                  No pending admin actions
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Platform is running clean. All escrow funds are flowing and KYC checks are completed.
                </Typography>
              </Card>
            ) : (
              <Grid container spacing={3} alignItems="stretch">
                {actionItems.map((item) => {
                  const colors = getPriorityColor(item.priority);
                  return (
                    <Grid item xs={12} sm={6} md={4} key={item.id} sx={{ display: 'flex' }}>
                      <Card
                        variant="outlined"
                        sx={{
                          borderRadius: 4,
                          borderColor: '#e2e8f0',
                          transition: 'all 0.25s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          width: '100%',
                          '&:hover': {
                            transform: 'translateY(-3px)',
                            boxShadow: '0 10px 20px rgba(15, 23, 42, 0.05)',
                            borderColor: 'primary.light',
                          },
                        }}
                      >
                        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                            <Box sx={{ p: 1, bgcolor: '#f1f5f9', borderRadius: 2, display: 'flex', alignItems: 'center' }}>
                              {item.icon}
                            </Box>
                            <Chip
                              label={item.priority}
                              size="small"
                              sx={{
                                bgcolor: colors.bg,
                                color: colors.text,
                                border: `1px solid ${colors.border}`,
                                fontWeight: 800,
                                fontSize: '0.725rem',
                              }}
                            />
                          </Stack>

                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
                            {item.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, mb: 3, minHeight: 40 }}>
                            {item.description}
                          </Typography>

                          <Divider sx={{ my: 2 }} />

                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                                {item.count}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                pending items
                              </Typography>
                            </Box>
                            <Button
                              component={Link}
                              href={item.link}
                              variant="contained"
                              color="primary"
                              size="small"
                              endIcon={<LaunchIcon sx={{ fontSize: 14 }} />}
                              sx={{ borderRadius: 2, px: 2, py: 0.75, fontWeight: 700, textTransform: 'none' }}
                            >
                              Review
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        </Grid>

        {/* Section 2 — Platform Health */}
        <Grid item xs={12}>
          <Box sx={{ mt: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
              <AnalyticsIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Platform Health
              </Typography>
              <Tooltip title="Real-time live operations status markers and platform health indicators.">
                <IconButton size="small">
                  <HelpOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Stack>

            <Grid container spacing={3} alignItems="stretch">
              {stats.map((tile, idx) => (
                <Grid item xs={12} sm={6} md={4} key={idx} sx={{ display: 'flex' }}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 4,
                      borderColor: '#e2e8f0',
                      position: 'relative',
                      overflow: 'hidden',
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 5,
                        bgcolor: tile.color,
                      }}
                    />
                    <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between', pl: 3.5 }}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 850, fontSize: '0.775rem', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>
                          {tile.label}
                        </Typography>

                        <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', mb: 1, letterSpacing: '-0.5px' }}>
                          {tile.value}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        {tile.detail}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Grid>

        {/* Section 3 — Recent Activity Feed (Details Only - No Link) */}
        <Grid item xs={12}>
          <Box sx={{ mt: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
              <ListAltIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Recent Activity Feed
              </Typography>
            </Stack>

            {activities.length === 0 ? (
              <Card
                variant="outlined"
                sx={{
                  p: 5,
                  textAlign: 'center',
                  bgcolor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderStyle: 'dashed',
                  borderRadius: 4,
                  minHeight: 150,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No recent activities recorded on the platform yet.
                </Typography>
              </Card>
            ) : (
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 4,
                  borderColor: '#e2e8f0',
                  overflow: 'hidden',
                  bgcolor: '#ffffff',
                  boxShadow: 'none',
                }}
              >
                <Stack divider={<Divider />}>
                  {activities.map((act) => {
                    const dotColor = getActivityTypeColor(act.type);
                    const formattedDate = new Date(act.timestamp).toLocaleString();
                    return (
                      <Box
                        key={act.id}
                        sx={{
                          p: 2.25,
                          px: { xs: 2.5, sm: 3.5 },
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          bgcolor: '#ffffff',
                          transition: 'background-color 0.2s ease',
                          '&:hover': {
                            bgcolor: '#f8fafc',
                          },
                        }}
                      >
                        <Stack direction="row" spacing={2.5} alignItems="center" sx={{ pr: 2 }}>
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: 2.5,
                              bgcolor: `${dotColor}14`,
                              border: `1px solid ${dotColor}30`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: dotColor,
                                boxShadow: `0 0 0 2px ${dotColor}40`,
                              }}
                            />
                          </Box>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 750, color: '#0f172a', lineHeight: 1.4 }}>
                              {act.text}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, lineHeight: 1.3 }}>
                              {act.details}
                            </Typography>
                          </Box>
                        </Stack>
                        <Chip
                          label={formattedDate}
                          size="small"
                          sx={{
                            bgcolor: '#f8fafc',
                            color: 'text.secondary',
                            fontWeight: 600,
                            fontSize: '0.725rem',
                            border: '1px solid #e2e8f0',
                            flexShrink: 0,
                          }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              </Card>
            )}
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}
