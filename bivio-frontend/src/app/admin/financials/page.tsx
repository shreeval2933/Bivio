'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
  Box,
  LinearProgress,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Pagination,
  Divider,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';

// Icons
import GetAppIcon from '@mui/icons-material/GetApp';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

import { formatCurrency } from '@/lib/format';
import { useGetFinancialsQuery } from '@/store/api/adminApi';
import EmptyState from '@/components/ui/EmptyState';
import { PlatformFeeTransaction } from '@/types';

export default function AdminFinancialsPage() {
  const [mounted, setMounted] = useState(false);

  // Filters
  const [dateRange, setDateRange] = useState('ALL');
  const [feeTypeFilter, setFeeTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination & Sorting for Transaction Log
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Breakdown sorting
  const [breakdownSortField, setBreakdownSortField] = useState<'total' | 'count'>('total');
  const [breakdownSortOrder, setBreakdownSortOrder] = useState<'asc' | 'desc'>('desc');

  // Live Query
  const { data: financials, isLoading, isFetching, refetch } = useGetFinancialsQuery();

  useEffect(() => {
    setMounted(true);
    document.title = 'Platform Financials — Bivio Admin';
  }, []);

  // Live transactions from database
  const liveTransactions: PlatformFeeTransaction[] = useMemo(() => {
    return financials?.transactions || [];
  }, [financials]);

  // Filtered transactions based on date, type, and search query
  const filteredTransactions = useMemo(() => {
    return liveTransactions.filter((tx) => {
      // 1. Fee Type Filter
      if (feeTypeFilter !== 'ALL' && tx.feeType !== feeTypeFilter) return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesEntity = tx.relatedEntity?.toLowerCase().includes(q);
        const matchesPayer = tx.payerName?.toLowerCase().includes(q);
        const matchesId = tx.id?.toLowerCase().includes(q);
        if (!matchesEntity && !matchesPayer && !matchesId) return false;
      }

      // 3. Date Range Filter
      if (dateRange !== 'ALL') {
        const txDate = new Date(tx.date);
        const diffTime = Math.abs(Date.now() - txDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (dateRange === '30_DAYS' && diffDays > 30) return false;
        if (dateRange === 'QUARTER' && diffDays > 90) return false;
        if (dateRange === '6_MONTHS' && diffDays > 180) return false;
        if (dateRange === 'YEAR' && diffDays > 365) return false;
      }

      return true;
    });
  }, [liveTransactions, feeTypeFilter, dateRange, searchQuery]);

  // Sorted transactions
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      if (sortField === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else {
        const amtA = Number(a.amount);
        const amtB = Number(b.amount);
        return sortOrder === 'asc' ? amtA - amtB : amtB - amtA;
      }
    });
  }, [filteredTransactions, sortField, sortOrder]);

  // Paginated transactions
  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return sortedTransactions.slice(start, start + itemsPerPage);
  }, [sortedTransactions, page]);

  // Calculate totals dynamically from filtered transactions
  const totals = useMemo(() => {
    let total = 0;
    let jobPostingTotal = 0;
    let commissionTotal = 0;
    let registrationTotal = 0;

    let jobPostingCount = 0;
    let commissionCount = 0;
    let registrationCount = 0;

    filteredTransactions.forEach((tx) => {
      const amt = Number(tx.amount);
      total += amt;
      if (tx.feeType === 'JOB_POSTING') {
        jobPostingTotal += amt;
        jobPostingCount++;
      } else if (tx.feeType === 'FREELANCE_COMMISSION') {
        commissionTotal += amt;
        commissionCount++;
      } else if (tx.feeType === 'CANDIDATE_REGISTRATION') {
        registrationTotal += amt;
        registrationCount++;
      }
    });

    return {
      total,
      jobPosting: { total: jobPostingTotal, count: jobPostingCount },
      commission: { total: commissionTotal, count: commissionCount },
      registration: { total: registrationTotal, count: registrationCount },
    };
  }, [filteredTransactions]);

  // Sorted Breakdown statistics for Unit Economics table
  const breakdownStats = useMemo(() => {
    const stats = [
      {
        type: 'Freelance Commission',
        key: 'FREELANCE_COMMISSION',
        total: totals.commission.total,
        count: totals.commission.count,
        avg: totals.commission.count > 0 ? Math.round(totals.commission.total / totals.commission.count) : 0,
        pct: totals.total > 0 ? Math.round((totals.commission.total / totals.total) * 100) : 0,
      },
      {
        type: 'Job Posting Fees',
        key: 'JOB_POSTING',
        total: totals.jobPosting.total,
        count: totals.jobPosting.count,
        avg: totals.jobPosting.count > 0 ? Math.round(totals.jobPosting.total / totals.jobPosting.count) : 0,
        pct: totals.total > 0 ? Math.round((totals.jobPosting.total / totals.total) * 100) : 0,
      },
      {
        type: 'Candidate Registration',
        key: 'CANDIDATE_REGISTRATION',
        total: totals.registration.total,
        count: totals.registration.count,
        avg: totals.registration.count > 0 ? Math.round(totals.registration.total / totals.registration.count) : 0,
        pct: totals.total > 0 ? Math.round((totals.registration.total / totals.total) * 100) : 0,
      },
    ];

    return stats.sort((a, b) => {
      if (breakdownSortField === 'total') {
        return breakdownSortOrder === 'asc' ? a.total - b.total : b.total - a.total;
      } else {
        return breakdownSortOrder === 'asc' ? a.count - b.count : b.count - a.count;
      }
    });
  }, [totals, breakdownSortField, breakdownSortOrder]);

  // Generate 6 consecutive calendar months (including empty $0 months)
  const fullMonthlyList = useMemo(() => {
    const monthlyMap = new Map<string, number>();
    (financials?.monthly || []).forEach((m) => {
      monthlyMap.set(m.month, Number(m.amount));
    });

    const result = [];
    const now = new Date();
    // 6-month window: 5 months ago through current month
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      result.push({
        month: monthKey,
        amount: monthlyMap.get(monthKey) ?? 0,
      });
    }

    return result;
  }, [financials?.monthly]);

  const currency = financials?.currency || 'INR';
  const maxMonthlyValue = Math.max(...fullMonthlyList.map((m) => Number(m.amount)), 1);

  const handleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleBreakdownSort = (field: 'total' | 'count') => {
    if (breakdownSortField === field) {
      setBreakdownSortOrder(breakdownSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setBreakdownSortField(field);
      setBreakdownSortOrder('desc');
    }
  };

  // CSV Export utility
  const handleExportCSV = () => {
    const headers = 'ID,Date,Fee Type,Amount (INR),Related Entity,Payer\n';
    const csvContent = sortedTransactions
      .map(
        (tx) =>
          `"${tx.id}","${tx.date}","${String(tx.feeType).replace(/_/g, ' ')}",${tx.amount},"${tx.relatedEntity || ''}","${tx.payerName || ''}"`
      )
      .join('\n');

    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bivio_financial_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
  };

  const getFeeChipColor = (type: string) => {
    switch (type) {
      case 'FREELANCE_COMMISSION':
        return 'success';
      case 'JOB_POSTING':
        return 'primary';
      case 'CANDIDATE_REGISTRATION':
        return 'warning';
      default:
        return 'default';
    }
  };

  const resetFilters = () => {
    setDateRange('ALL');
    setFeeTypeFilter('ALL');
    setSearchQuery('');
    setPage(1);
  };

  if (!mounted) return null;

  if (isLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading platform financials...
          </Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{ mb: 4 }}
        gap={2}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 900, fontFamily: 'Outfit, sans-serif', color: '#0f172a', mb: 0.5 }}
          >
            Platform Financials
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Live profit &amp; loss ledger — transaction fees, commission trends, and unit economics.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tooltip title="Refresh Financials">
            <IconButton
              onClick={() => refetch()}
              disabled={isFetching}
              sx={{
                bgcolor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                '&:hover': { bgcolor: '#e2e8f0' },
              }}
            >
              <RefreshIcon sx={{ color: '#475569' }} />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={<GetAppIcon />}
            onClick={handleExportCSV}
            disabled={sortedTransactions.length === 0}
            sx={{
              textTransform: 'none',
              fontWeight: 800,
              borderRadius: 2.5,
              px: 2.5,
              py: 1,
              boxShadow: 'none',
              '&:hover': { boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)' },
            }}
          >
            Export CSV Ledger
          </Button>
        </Stack>
      </Stack>

      {/* Advanced Filter Card */}
      <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4, mb: 4, boxShadow: 'none', bgcolor: '#ffffff' }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Search */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by entity, payer, or txn ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery('')}>
                        <ClearIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
            </Grid>

            {/* Date Range */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={dateRange}
                  label="Date Range"
                  onChange={(e) => {
                    setDateRange(e.target.value);
                    setPage(1);
                  }}
                >
                  <MenuItem value="ALL">All Time</MenuItem>
                  <MenuItem value="30_DAYS">Last 30 Days</MenuItem>
                  <MenuItem value="QUARTER">Last 90 Days (Quarter)</MenuItem>
                  <MenuItem value="6_MONTHS">Last 6 Months</MenuItem>
                  <MenuItem value="YEAR">Last 1 Year</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Fee Type */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Fee Type</InputLabel>
                <Select
                  value={feeTypeFilter}
                  label="Fee Type"
                  onChange={(e) => {
                    setFeeTypeFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <MenuItem value="ALL">All Fee Types</MenuItem>
                  <MenuItem value="FREELANCE_COMMISSION">Freelance Commission</MenuItem>
                  <MenuItem value="JOB_POSTING">Job Posting Fees</MenuItem>
                  <MenuItem value="CANDIDATE_REGISTRATION">Candidate Profile Unlock</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Reset Action */}
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={resetFilters}
                disabled={dateRange === 'ALL' && feeTypeFilter === 'ALL' && !searchQuery}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  py: 0.9,
                }}
              >
                Reset Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Stack spacing={4}>
        {/* Financial Summaries & Chart Row */}
        <Grid container spacing={3} alignItems="stretch">
          {/* Total Revenue Card */}
          <Grid item xs={12} lg={4}>
            <Card
              sx={{
                border: '1px solid #e2e8f0',
                borderRadius: 4,
                height: '100%',
                boxShadow: 'none',
                bgcolor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <CardContent sx={{ p: 3.5, display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                  >
                    TOTAL PLATFORM REVENUE
                  </Typography>
                  <Chip
                    label={`${filteredTransactions.length} records`}
                    size="small"
                    sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: '#f1f5f9' }}
                  />
                </Stack>

                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 900,
                    fontFamily: 'Outfit, sans-serif',
                    color: '#0f172a',
                    my: 1.5,
                  }}
                >
                  {formatCurrency(totals.total, currency)}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={2.5} sx={{ mt: 'auto' }}>
                  {/* Freelance Commission */}
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                        Freelance Commission
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        {formatCurrency(totals.commission.total, currency)}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      color="success"
                      value={totals.total > 0 ? (totals.commission.total / totals.total) * 100 : 0}
                      sx={{ height: 8, borderRadius: 4, bgcolor: '#f1f5f9' }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {totals.commission.count} transactions (
                      {totals.total > 0 ? Math.round((totals.commission.total / totals.total) * 100) : 0}%)
                    </Typography>
                  </Box>

                  {/* Job Posting */}
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                        Job Posting Fees
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        {formatCurrency(totals.jobPosting.total, currency)}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      color="primary"
                      value={totals.total > 0 ? (totals.jobPosting.total / totals.total) * 100 : 0}
                      sx={{ height: 8, borderRadius: 4, bgcolor: '#f1f5f9' }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {totals.jobPosting.count} transactions (
                      {totals.total > 0 ? Math.round((totals.jobPosting.total / totals.total) * 100) : 0}%)
                    </Typography>
                  </Box>

                  {/* Candidate Registration */}
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                        Candidate Registration
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        {formatCurrency(totals.registration.total, currency)}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      color="warning"
                      value={totals.total > 0 ? (totals.registration.total / totals.total) * 100 : 0}
                      sx={{ height: 8, borderRadius: 4, bgcolor: '#f1f5f9' }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {totals.registration.count} transactions (
                      {totals.total > 0 ? Math.round((totals.registration.total / totals.total) * 100) : 0}%)
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Monthly Revenue Trend Chart Card */}
          <Grid item xs={12} lg={8}>
            <Card
              sx={{
                border: '1px solid #e2e8f0',
                borderRadius: 4,
                height: '100%',
                boxShadow: 'none',
                bgcolor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <CardContent sx={{ p: 3.5, display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>
                      Monthly Revenue Trend
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Trailing 6-month revenue performance across all settlement categories.
                    </Typography>
                  </Box>
                  <Chip
                    label="Last 6 Months Timeline"
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                  />
                </Stack>

                <Box
                  sx={{
                    mt: 'auto',
                    pt: 3,
                    pb: 1.5,
                    px: 2,
                    bgcolor: '#f8fafc',
                    borderRadius: 3,
                    border: '1px solid #f1f5f9',
                    height: 280,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={{ xs: 2, sm: 3.5, md: 5 }}
                    alignItems="flex-end"
                    justifyContent="space-around"
                    sx={{ height: '100%', width: '100%', maxWidth: 700, px: 1 }}
                  >
                    {fullMonthlyList.map((m) => {
                      const amt = Number(m.amount);
                      const hasRevenue = amt > 0;
                      const heightPercent = hasRevenue && maxMonthlyValue > 0 ? (amt / maxMonthlyValue) * 100 : 0;

                      return (
                        <Stack
                          key={m.month}
                          alignItems="center"
                          justifyContent="flex-end"
                          sx={{ height: '100%', flex: 1, maxWidth: 64 }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: hasRevenue ? 800 : 600,
                              fontSize: '0.68rem',
                              color: hasRevenue ? '#0f172a' : '#94a3b8',
                              mb: 1,
                              textAlign: 'center',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {hasRevenue ? formatCurrency(amt, currency) : '₹0'}
                          </Typography>

                          <Tooltip
                            arrow
                            title={
                              <Box sx={{ p: 0.5 }}>
                                <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>
                                  {m.month} Revenue
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 900 }}>
                                  {formatCurrency(amt, currency)}
                                </Typography>
                              </Box>
                            }
                          >
                            <Box
                              sx={{
                                width: { xs: 28, sm: 36, md: 44 },
                                height: hasRevenue ? `${Math.max(heightPercent * 0.75, 10)}%` : '6px',
                                background: hasRevenue
                                  ? 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)'
                                  : '#cbd5e1',
                                borderRadius: hasRevenue ? '6px 6px 0 0' : '3px',
                                cursor: 'pointer',
                                boxShadow: hasRevenue ? '0 4px 10px rgba(37, 99, 235, 0.25)' : 'none',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': {
                                  background: hasRevenue
                                    ? 'linear-gradient(180deg, #3b82f6 0%, #1e40af 100%)'
                                    : '#94a3b8',
                                  transform: hasRevenue ? 'scaleY(1.05)' : 'none',
                                  boxShadow: hasRevenue ? '0 6px 14px rgba(37, 99, 235, 0.35)' : 'none',
                                },
                              }}
                            />
                          </Tooltip>

                          <Typography
                            variant="caption"
                            sx={{
                              mt: 1.5,
                              fontWeight: hasRevenue ? 800 : 600,
                              fontSize: '0.72rem',
                              color: hasRevenue ? '#334155' : '#94a3b8',
                            }}
                          >
                            {m.month}
                          </Typography>
                        </Stack>
                      );
                    })}
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Unit Economics Breakdown Table */}
        <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4, boxShadow: 'none', bgcolor: '#ffffff' }}>
          <CardContent sx={{ p: 3.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 2.5, fontFamily: 'Outfit, sans-serif' }}>
              Unit Economics Breakdown
            </Typography>

            <TableContainer sx={{ borderRadius: 2.5, border: '1px solid #f1f5f9' }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Fee Type</TableCell>

                    <TableCell sx={{ fontWeight: 800, color: '#475569' }}>
                      <TableSortLabel
                        active={breakdownSortField === 'total'}
                        direction={breakdownSortField === 'total' ? breakdownSortOrder : 'desc'}
                        onClick={() => handleBreakdownSort('total')}
                      >
                        Total Revenue
                      </TableSortLabel>
                    </TableCell>

                    <TableCell sx={{ fontWeight: 800, color: '#475569' }}>
                      <TableSortLabel
                        active={breakdownSortField === 'count'}
                        direction={breakdownSortField === 'count' ? breakdownSortOrder : 'desc'}
                        onClick={() => handleBreakdownSort('count')}
                      >
                        Transaction Count
                      </TableSortLabel>
                    </TableCell>

                    <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Avg per Transaction</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569' }}>% of Revenue</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {breakdownStats.map((row) => (
                    <TableRow key={row.key} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                      <TableCell sx={{ fontWeight: 700 }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Chip
                            label={row.type}
                            size="small"
                            color={getFeeChipColor(row.key)}
                            variant="outlined"
                            sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{formatCurrency(row.total, currency)}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{row.count}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{formatCurrency(row.avg, currency)}</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'primary.main' }}>{row.pct}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Transaction Ledger Logs */}
        <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4, boxShadow: 'none', bgcolor: '#ffffff' }}>
          <CardContent sx={{ p: 3.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }} flexWrap="wrap" gap={1.5}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>
                  Transaction Ledger Logs
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Real-time database records of fee settlements and collections.
                </Typography>
              </Box>
              <Chip
                label={`${filteredTransactions.length} settled transactions`}
                size="small"
                sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: '#f1f5f9' }}
              />
            </Stack>

            {filteredTransactions.length === 0 ? (
              <EmptyState
                icon={<AccountBalanceWalletIcon fontSize="inherit" />}
                title="No transactions found"
                description={
                  searchQuery || dateRange !== 'ALL' || feeTypeFilter !== 'ALL'
                    ? 'No records match your active search filters. Try resetting the filters.'
                    : 'No platform fee transactions have occurred yet. Records will populate here automatically as fees are charged.'
                }
                action={
                  searchQuery || dateRange !== 'ALL' || feeTypeFilter !== 'ALL' ? (
                    <Button variant="outlined" size="small" onClick={resetFilters} sx={{ textTransform: 'none', fontWeight: 700 }}>
                      Reset Filters
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <TableContainer sx={{ borderRadius: 2.5, border: '1px solid #f1f5f9' }}>
                  <Table>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, color: '#475569' }}>
                          <TableSortLabel
                            active={sortField === 'date'}
                            direction={sortField === 'date' ? sortOrder : 'desc'}
                            onClick={() => handleSort('date')}
                          >
                            Date
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Fee Type</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569' }}>
                          <TableSortLabel
                            active={sortField === 'amount'}
                            direction={sortField === 'amount' ? sortOrder : 'desc'}
                            onClick={() => handleSort('amount')}
                          >
                            Amount
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Related Entity</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Payer</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedTransactions.map((tx) => (
                        <TableRow key={tx.id} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                          <TableCell sx={{ fontWeight: 600, color: '#475569' }}>{tx.date}</TableCell>
                          <TableCell>
                            <Chip
                              label={String(tx.feeType).replace(/_/g, ' ')}
                              size="small"
                              color={getFeeChipColor(String(tx.feeType))}
                              variant="outlined"
                              sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#0f172a' }}>
                            {formatCurrency(Number(tx.amount), currency)}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {tx.relatedEntity}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#334155' }}>{tx.payerName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                {sortedTransactions.length > itemsPerPage && (
                  <Stack direction="row" justifyContent="center" sx={{ mt: 3.5 }}>
                    <Pagination
                      count={Math.ceil(sortedTransactions.length / itemsPerPage)}
                      page={page}
                      onChange={(_, value) => setPage(value)}
                      color="primary"
                    />
                  </Stack>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
