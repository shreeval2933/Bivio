'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Stack,
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Avatar,
  CircularProgress,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useGetDisputesQuery } from '@/store/api/adminApi';

type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED';

export default function AdminDisputesPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<string>('OLDEST');

  // Real API integration
  const { data: dbDisputes = [], isLoading: listLoading } = useGetDisputesQuery(
    statusFilter !== 'ALL' ? { status: statusFilter } : undefined,
    { skip: !mounted }
  );

  // Format Helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) {
      return 'Just now';
    }
    if (diffHours < 24) {
      return `${diffHours} hours ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  // Status Colors
  const getStatusColor = (status: DisputeStatus | string) => {
    switch (status) {
      case 'OPEN':
        return { label: 'Open', color: 'error', bg: '#fee2e2', text: '#991b1b' };
      case 'UNDER_REVIEW':
        return { label: 'Under Review', color: 'warning', bg: '#ffedd5', text: '#9a3412' };
      case 'RESOLVED':
        return { label: 'Resolved', color: 'success', bg: '#d1fae5', text: '#065f46' };
      case 'ESCALATED':
        return { label: 'Escalated', color: 'secondary', bg: '#f3e8ff', text: '#6b21a8' };
      default:
        return { label: status, color: 'default', bg: '#f3f4f6', text: '#374151' };
    }
  };

  // Process Filters & Sorts
  const filteredAndSortedDisputes = useMemo(() => {
    let result = Array.isArray(dbDisputes) ? [...dbDisputes] : [];

    // Sorting
    result.sort((a: any, b: any) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      const aAmt = Number(a.milestone?.escrow?.amount || a.milestone?.amount || 0);
      const bAmt = Number(b.milestone?.escrow?.amount || b.milestone?.amount || 0);

      if (sortOrder === 'OLDEST') {
        return aTime - bTime;
      } else if (sortOrder === 'NEWEST') {
        return bTime - aTime;
      } else if (sortOrder === 'HIGHEST_ESCROW') {
        return bAmt - aAmt;
      }
      return 0;
    });

    return result;
  }, [dbDisputes, sortOrder]);

  if (!mounted) return null;

  if (listLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading disputes queue...
          </Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ pb: 6 }}>
      {/* Title section */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
            Dispute Resolution
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Escrow is frozen while a dispute is open. Manage claims and arbitrate milestone payments.
          </Typography>
        </Box>
      </Stack>

      {/* Filter Row */}
      <Card variant="outlined" sx={{ mb: 4, borderRadius: 3, borderColor: '#e2e8f0' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            {/* Status Filter */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="status-filter-label">Status</InputLabel>
                <Select
                  labelId="status-filter-label"
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="ALL">All Statuses</MenuItem>
                  <MenuItem value="OPEN">Open</MenuItem>
                  <MenuItem value="UNDER_REVIEW">Under Review</MenuItem>
                  <MenuItem value="RESOLVED">Resolved</MenuItem>
                  <MenuItem value="ESCALATED">Escalated</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Sort Order */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="sort-order-label">Sort</InputLabel>
                <Select
                  labelId="sort-order-label"
                  label="Sort"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="OLDEST">Oldest first</MenuItem>
                  <MenuItem value="NEWEST">Newest</MenuItem>
                  <MenuItem value="HIGHEST_ESCROW">Highest escrow value</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Disputes Queue */}
      {filteredAndSortedDisputes.length === 0 ? (
        <Card
          variant="outlined"
          sx={{
            p: 6,
            textAlign: 'center',
            bgcolor: '#ffffff',
            borderColor: '#e2e8f0',
            borderStyle: 'dashed',
            borderRadius: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 250,
          }}
        >
          <GavelIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
            No disputes found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {statusFilter !== 'ALL'
              ? `No disputes currently in "${statusFilter.replace('_', ' ')}" status.`
              : 'No disputes to resolve. Platform is running clean.'}
          </Typography>
        </Card>
      ) : (
        <Stack spacing={3}>
          {filteredAndSortedDisputes.map((dispute: any) => {
            const statusConfig = getStatusColor(dispute.status);
            const milestoneTitle = dispute.milestone?.title || 'Milestone Arbitration';
            const contractTitle = dispute.milestone?.contract?.job?.title || 'Freelance Contract';
            const escrowAmount = Number(dispute.milestone?.escrow?.amount || dispute.milestone?.amount || 0);
            const raisedByName = dispute.raisedBy?.fullName || 'User';
            const raisedByRole = dispute.raisedBy?.role ? dispute.raisedBy.role.toLowerCase() : 'user';
            const assignedAdminName = dispute.assignedAdmin?.user?.fullName || (dispute.assignedAdmin ? 'Assigned' : 'Unassigned');

            return (
              <Card
                key={dispute.id}
                variant="outlined"
                sx={{
                  borderRadius: 4,
                  borderColor: '#e2e8f0',
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
                    borderColor: 'primary.light',
                  },
                }}
              >
                <CardContent sx={{ p: 3.5 }}>
                  <Grid container spacing={3} alignItems="center">
                    {/* Main Details */}
                    <Grid item xs={12} md={7}>
                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                            {milestoneTitle}
                          </Typography>
                          <Chip
                            label={statusConfig.label}
                            size="small"
                            sx={{
                              bgcolor: statusConfig.bg,
                              color: statusConfig.text,
                              fontWeight: 800,
                              fontSize: '0.725rem',
                            }}
                          />
                        </Stack>

                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          {contractTitle}
                        </Typography>

                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Raised by {raisedByName} ({raisedByRole}) · {getTimeAgo(dispute.createdAt)}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mt: 2,
                            p: 2,
                            bgcolor: '#f8fafc',
                            borderRadius: 2.5,
                            borderLeft: '3px solid #cbd5e1',
                            fontStyle: 'italic',
                          }}
                        >
                          &quot;{dispute.reason}&quot;
                        </Typography>
                      </Stack>
                    </Grid>

                    {/* Escrow Status & Assignment Details */}
                    <Grid item xs={12} sm={6} md={3}>
                      <Stack spacing={2} sx={{ pl: { md: 2 } }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                            FROZEN ESCROW
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 900, color: '#ef4444' }}>
                            {formatCurrency(escrowAmount)}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                            ASSIGNED TO
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                            <Avatar sx={{ width: 22, height: 22, fontSize: '0.65rem', bgcolor: 'primary.light', color: 'primary.dark', fontWeight: 800 }}>
                              {assignedAdminName.slice(0, 2).toUpperCase()}
                            </Avatar>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                              {assignedAdminName}
                            </Typography>
                          </Stack>
                        </Box>
                      </Stack>
                    </Grid>

                    {/* Action Buttons */}
                    <Grid item xs={12} sm={6} md={2}>
                      <Stack spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'flex-end' }}>
                        <Button
                          component={Link}
                          href={`/admin/disputes/${dispute.id}`}
                          variant="contained"
                          color="primary"
                          size="small"
                          fullWidth
                          endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                          sx={{ borderRadius: 2, py: 0.75, fontWeight: 700, textTransform: 'none' }}
                        >
                          Review
                        </Button>
                      </Stack>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Container>
  );
}
