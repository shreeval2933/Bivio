'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Button,
  Chip,
  Avatar,
  Tooltip,
  Grid,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRowParams } from '@mui/x-data-grid';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import GetAppIcon from '@mui/icons-material/GetApp';
import FlagIcon from '@mui/icons-material/Flag';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

import { useGetPlatformUsersQuery, useModerateUserMutation } from '@/store/api/adminApi';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate, formatTimeAgo } from '@/lib/format';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { showNotification } from '@/store/slices/notificationSlice';

interface UserExtended {
  id: string;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'RECRUITER' | 'CANDIDATE';
  isVerified: boolean;
  accountStatus: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
  createdAt: string;
  lastActive: string;
  flagsCount: number;
  verificationTier: 'NONE' | 'PAYMENT_VERIFIED' | 'IDENTITY_VERIFIED';
}

export default function AdminUsersPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [mounted, setMounted] = useState(false);

  // Filter States
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [joinedFilter, setJoinedFilter] = useState('ALL');

  // Selected rows
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Live Query
  const { data: rawUsersData, isLoading, isFetching, refetch } = useGetPlatformUsersQuery();
  const [moderateUser] = useModerateUserMutation();

  useEffect(() => {
    setMounted(true);
    document.title = 'User Moderation — Bivio Admin';
  }, []);

  // Compute extended user fields from real database relations
  const users: UserExtended[] = useMemo(() => {
    if (!rawUsersData?.data) return [];

    return rawUsersData.data.map((usr) => {
      let tier: 'NONE' | 'PAYMENT_VERIFIED' | 'IDENTITY_VERIFIED' = 'NONE';
      
      // Dynamic verification tier for recruiters
      if (usr.role === 'RECRUITER') {
        const kycApproved =
          usr.recruiterProfile?.kycStatus === 'APPROVED' ||
          usr.recruiterProfile?.kycSubmissions?.[0]?.status === 'APPROVED';
        
        if (kycApproved) {
          tier = 'IDENTITY_VERIFIED';
        } else if (usr.recruiterProfile?.postingFeePaid) {
          tier = 'PAYMENT_VERIFIED';
        }
      }

      // Flags count from live moderations/violations
      const flagsCount = usr._count?.moderationsRecvd ?? 0;

      // Last active relative timestamp
      let lastActive = 'Never';
      if (usr.lastActiveAt) {
        lastActive = formatTimeAgo(usr.lastActiveAt);
      } else if (usr.createdAt) {
        lastActive = formatTimeAgo(usr.createdAt);
      }

      return {
        id: usr.id,
        fullName: usr.fullName || 'Unnamed User',
        email: usr.email,
        role: usr.role as 'ADMIN' | 'RECRUITER' | 'CANDIDATE',
        isVerified: Boolean(usr.isVerified),
        accountStatus: usr.accountStatus as any,
        createdAt: usr.createdAt || new Date().toISOString(),
        lastActive,
        flagsCount,
        verificationTier: tier,
      };
    });
  }, [rawUsersData]);

  // Apply filters client-side
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Search text
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = u.fullName.toLowerCase().includes(query);
        const matchesEmail = u.email.toLowerCase().includes(query);
        const matchesId = u.id.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesId) return false;
      }

      // 2. Role filter
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;

      // 3. Status filter
      if (statusFilter !== 'ALL' && u.accountStatus !== statusFilter) return false;

      // 4. Verification Tier (recruiter only check)
      if (tierFilter !== 'ALL') {
        if (u.role !== 'RECRUITER') return false;
        if (u.verificationTier !== tierFilter) return false;
      }

      // 5. Joined Date Filter Presets
      if (joinedFilter !== 'ALL') {
        const createdDate = new Date(u.createdAt);
        const diffTime = Math.abs(Date.now() - createdDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (joinedFilter === 'TODAY' && diffDays > 1) return false;
        if (joinedFilter === 'LAST_7_DAYS' && diffDays > 7) return false;
        if (joinedFilter === 'LAST_30_DAYS' && diffDays > 30) return false;
      }

      return true;
    });
  }, [users, search, roleFilter, statusFilter, tierFilter, joinedFilter]);

  // Bulk Actions
  const handleBulkSuspend = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkProcessing(true);

    try {
      for (const id of selectedIds) {
        await moderateUser({
          id,
          action: 'SUSPEND',
          reason: 'Bulk administrative moderation action.',
        }).unwrap();
      }

      dispatch(
        showNotification({
          message: `Successfully suspended ${selectedIds.length} user(s).`,
          severity: 'success',
        })
      );
      setSelectedIds([]);
      refetch();
    } catch (err: any) {
      dispatch(
        showNotification({
          message: err?.data?.message || 'Failed to complete bulk suspension.',
          severity: 'error',
        })
      );
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkExport = () => {
    const exportTargets =
      selectedIds.length > 0 ? filteredUsers.filter((u) => selectedIds.includes(u.id)) : filteredUsers;

    const headers = 'ID,Name,Email,Role,Status,Tier,Email Verified,Flags,Joined,Last Active\n';
    const rows = exportTargets
      .map(
        (u) =>
          `"${u.id}","${u.fullName}","${u.email}","${u.role}","${u.accountStatus}","${u.verificationTier}","${u.isVerified}","${u.flagsCount}","${u.createdAt}","${u.lastActive}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `bivio_users_export_${new Date().toISOString().slice(0, 10)}.csv`);
    a.click();
  };

  const resetFilters = () => {
    setSearch('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setTierFilter('ALL');
    setJoinedFilter('ALL');
  };

  // Columns definition
  const columns: GridColDef[] = [
    {
      field: 'fullName',
      headerName: 'Name',
      flex: 1.2,
      minWidth: 170,
      renderCell: (p) => (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ height: '100%' }}>
          <Avatar
            sx={{
              bgcolor: 'primary.light',
              color: 'primary.dark',
              width: 30,
              height: 30,
              fontSize: '0.75rem',
              fontWeight: 800,
            }}
          >
            {p.row.fullName
              .split(' ')
              .map((n: string) => n[0])
              .join('')}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
            {p.row.fullName}
          </Typography>
        </Stack>
      ),
    },
    { field: 'email', headerName: 'Email', flex: 1.4, minWidth: 200 },
    {
      field: 'role',
      headerName: 'Role',
      width: 120,
      renderCell: (p) => {
        const r = p.value as string;
        let color: 'primary' | 'secondary' | 'info' | 'default' = 'default';
        if (r === 'ADMIN') color = 'primary';
        else if (r === 'RECRUITER') color = 'secondary';
        else if (r === 'CANDIDATE') color = 'info';

        return (
          <Chip
            label={r}
            size="small"
            color={color}
            variant="outlined"
            sx={{ fontWeight: 800, fontSize: '0.65rem' }}
          />
        );
      },
    },
    {
      field: 'accountStatus',
      headerName: 'Status',
      width: 160,
      renderCell: (p) => <StatusBadge domain="account" status={String(p.value)} />,
    },
    {
      field: 'verificationTier',
      headerName: 'Tier',
      width: 150,
      renderCell: (p) => {
        const val = p.value as string;
        if (p.row.role !== 'RECRUITER')
          return (
            <Typography variant="caption" color="text.secondary">
              —
            </Typography>
          );
        if (val === 'IDENTITY_VERIFIED')
          return (
            <Chip
              label="Identity Verified"
              color="success"
              size="small"
              variant="filled"
              sx={{ fontWeight: 700, fontSize: '0.65rem' }}
            />
          );
        if (val === 'PAYMENT_VERIFIED')
          return (
            <Chip
              label="Payment Verified"
              color="primary"
              size="small"
              variant="filled"
              sx={{ fontWeight: 700, fontSize: '0.65rem' }}
            />
          );
        return <Chip label="None" size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />;
      },
    },
    {
      field: 'isVerified',
      headerName: 'Email Verified',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (p) =>
        p.value ? (
          <CheckCircleOutlineIcon color="success" fontSize="small" />
        ) : (
          <Typography variant="caption" color="text.secondary">
            —
          </Typography>
        ),
    },
    {
      field: 'flagsCount',
      headerName: 'Flags',
      width: 100,
      renderCell: (p) => {
        const count = p.value as number;
        if (count > 0) {
          return (
            <Tooltip title={`${count} active moderation notices/flags`}>
              <Chip
                icon={<FlagIcon sx={{ fontSize: '14px !important', color: 'error.main' }} />}
                label={String(count)}
                size="small"
                color="error"
                sx={{ fontWeight: 800 }}
              />
            </Tooltip>
          );
        }
        return (
          <Typography variant="caption" color="text.secondary">
            None
          </Typography>
        );
      },
    },
    {
      field: 'createdAt',
      headerName: 'Joined',
      width: 120,
      renderCell: (p) => formatDate(p.value as string),
    },
    {
      field: 'lastActive',
      headerName: 'Last Active',
      width: 120,
      renderCell: (p) => (
        <Typography variant="caption" color="text.secondary">
          {p.value as string}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 130,
      sortable: false,
      renderCell: (p) => (
        <Button
          size="small"
          variant="outlined"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/admin/users/${p.row.id}`);
          }}
          sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2 }}
        >
          View User
        </Button>
      ),
    },
  ];

  const handleRowClick = (params: GridRowParams) => {
    router.push(`/admin/users/${params.row.id}`);
  };

  if (!mounted) return null;

  if (isLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading platform users...
          </Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Page Header */}
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
            User Moderation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage roles, perform bulk status changes, and resolve policy or account violations.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Tooltip title="Refresh Users">
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

          {selectedIds.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              size="medium"
              startIcon={<BlockIcon />}
              onClick={handleBulkSuspend}
              disabled={isBulkProcessing}
              sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2.5 }}
            >
              {isBulkProcessing ? 'Suspending...' : `Suspend Selected (${selectedIds.length})`}
            </Button>
          )}

          <Button
            variant="contained"
            size="medium"
            startIcon={<GetAppIcon />}
            onClick={handleBulkExport}
            disabled={filteredUsers.length === 0}
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
            Export CSV ({selectedIds.length > 0 ? selectedIds.length : filteredUsers.length})
          </Button>
        </Stack>
      </Stack>

      {/* Advanced Filter Row */}
      <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4, mb: 4, boxShadow: 'none', bgcolor: '#ffffff' }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Search */}
            <Grid item xs={12} sm={6} md={3.5}>
              <TextField
                placeholder="Search by name, email, or user ID..."
                fullWidth
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearch('')}>
                        <ClearIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
            </Grid>

            {/* Role Filter */}
            <Grid item xs={12} sm={3} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select value={roleFilter} label="Role" onChange={(e) => setRoleFilter(e.target.value)}>
                  <MenuItem value="ALL">All Roles</MenuItem>
                  <MenuItem value="CANDIDATE">Candidate</MenuItem>
                  <MenuItem value="RECRUITER">Recruiter</MenuItem>
                  <MenuItem value="ADMIN">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Status Filter */}
            <Grid item xs={12} sm={3} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                  <MenuItem value="ALL">All Statuses</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="PENDING_VERIFICATION">Pending Verification</MenuItem>
                  <MenuItem value="SUSPENDED">Suspended</MenuItem>
                  <MenuItem value="BANNED">Banned</MenuItem>
                  <MenuItem value="DELETED">Deleted</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Verification Tier Filter (For Recruiters) */}
            <Grid item xs={12} sm={6} md={2.5}>
              <FormControl fullWidth size="small" disabled={roleFilter !== 'ALL' && roleFilter !== 'RECRUITER'}>
                <InputLabel>Verification Tier</InputLabel>
                <Select value={tierFilter} label="Verification Tier" onChange={(e) => setTierFilter(e.target.value)}>
                  <MenuItem value="ALL">All Tiers (Recruiters)</MenuItem>
                  <MenuItem value="IDENTITY_VERIFIED">Identity Verified</MenuItem>
                  <MenuItem value="PAYMENT_VERIFIED">Payment Verified</MenuItem>
                  <MenuItem value="NONE">None</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Date Joined Presets */}
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Date Joined</InputLabel>
                <Select value={joinedFilter} label="Date Joined" onChange={(e) => setJoinedFilter(e.target.value)}>
                  <MenuItem value="ALL">All Time</MenuItem>
                  <MenuItem value="TODAY">Joined Today</MenuItem>
                  <MenuItem value="LAST_7_DAYS">Last 7 Days</MenuItem>
                  <MenuItem value="LAST_30_DAYS">Last 30 Days</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* DataGrid Card */}
      <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4, overflow: 'hidden', boxShadow: 'none', bgcolor: '#ffffff' }}>
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={filteredUsers}
            columns={columns}
            loading={isLoading}
            checkboxSelection
            rowSelectionModel={selectedIds}
            onRowSelectionModelChange={(ids) => setSelectedIds(ids as string[])}
            onRowClick={handleRowClick}
            disableRowSelectionOnClick
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[10, 25, 50]}
            rowHeight={64}
            columnHeaderHeight={52}
            sx={{
              border: 'none',
              cursor: 'pointer',
              '& .MuiDataGrid-row:hover': {
                bgcolor: 'rgba(37, 99, 235, 0.03)',
              },
              '& .MuiDataGrid-cell:focus': {
                outline: 'none',
              },
              '& .MuiDataGrid-cell:focus-within': {
                outline: 'none',
              },
              '& .MuiDataGrid-columnHeader:focus': {
                outline: 'none',
              },
              '& .MuiDataGrid-columnHeader:focus-within': {
                outline: 'none',
              },
              '& .MuiDataGrid-columnHeaders': {
                bgcolor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 800,
                color: 'text.secondary',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              },
              '& .MuiDataGrid-cell': {
                borderColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
              },
              '& .MuiDataGrid-footerContainer': {
                borderTop: '1px solid #e2e8f0',
                bgcolor: '#f8fafc',
              },
            }}
            slots={{
              noRowsOverlay: () => (
                <Stack height="100%" alignItems="center" justifyContent="center" spacing={1.5}>
                  <PersonOutlineIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#475569' }}>
                    No users match these filters.
                  </Typography>
                  {(search || roleFilter !== 'ALL' || statusFilter !== 'ALL' || tierFilter !== 'ALL' || joinedFilter !== 'ALL') && (
                    <Button size="small" variant="outlined" onClick={resetFilters} sx={{ textTransform: 'none', fontWeight: 700, mt: 1 }}>
                      Reset Filters
                    </Button>
                  )}
                </Stack>
              ),
            }}
          />
        </Box>
      </Card>
    </Container>
  );
}
