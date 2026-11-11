'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Tabs,
  Tab,
  Avatar,
  Chip,
  Grid,
  Divider,
  CircularProgress
} from '@mui/material';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import type { Contract } from '@/types';
import { useGetContractsQuery } from '@/store/api/contractsApi';

export default function ContractsListPage() {
  const router = useRouter();
  const { data: dbContracts, isLoading } = useGetContractsQuery();
  const [activeTab, setActiveTab] = useState(0);

  const contracts = useMemo(() => {
    return dbContracts?.data || dbContracts || [];
  }, [dbContracts]);

  const filteredContracts = useMemo(() => {
    return (contracts as Contract[]).filter((c) => {
      const status = c.status;
      if (activeTab === 0) {
        return ['ACTIVE', 'PENDING_FUNDING', 'DISPUTED'].includes(status);
      }
      if (activeTab === 1) return status === 'COMPLETED';
      if (activeTab === 2) return status === 'CANCELLED';
      return true;
    });
  }, [contracts, activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'primary';
      case 'COMPLETED':
        return 'success';
      case 'DISPUTED':
        return 'error';
      case 'CANCELLED':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getActionRequired = (contract: Contract) => {
    if (contract.status === 'COMPLETED' || contract.status === 'CANCELLED') return null;

    if (contract.status === 'DISPUTED') {
      return { text: 'Dispute under review', color: 'error.main' };
    }

    if (contract.status === 'PENDING_FUNDING') {
      return { text: 'Awaiting client deposit', color: 'warning.main' };
    }

    const milestones = contract.milestones || [];
    const activeMilestone = milestones.find(m => m.status === 'FUNDED');
    if (activeMilestone) {
      return { text: 'Action Needed: Submit work', color: 'secondary.main' };
    }

    const revisionMilestone = milestones.find(m => m.status === 'REVISION_REQUESTED');
    if (revisionMilestone) {
      return { text: 'Action Needed: Resubmit deliverables', color: 'warning.main' };
    }

    const submittedMilestone = milestones.find(m => m.status === 'SUBMITTED');
    if (submittedMilestone) {
      return { text: 'Awaiting client review', color: 'info.main' };
    }

    return null;
  };

  if (isLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading your contracts...
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
          Your Contracts
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track escrow deposits, milestones, deliverables, and active communications.
        </Typography>
      </Box>

      {/* TABS CONTROL */}
      <Tabs
        value={activeTab}
        onChange={(_e, val) => setActiveTab(val)}
        sx={{
          mb: 4,
          borderBottom: '1px solid #e2e8f0',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.95rem',
            fontFamily: 'Outfit, sans-serif',
          },
        }}
      >
        <Tab label="Active Engagements" />
        <Tab label="Completed Contracts" />
        <Tab label="Cancelled" />
      </Tabs>

      {/* LIST OF CONTRACTS */}
      {filteredContracts.length > 0 ? (
        <Stack spacing={3.5}>
          {filteredContracts.map((contract) => {
            const totalBudget = parseFloat(contract.agreedAmount || '0');
            const feePercent = parseFloat(contract.platformFeePercent || '10');
            const netAmount = Math.round(totalBudget * (1 - feePercent / 100));
            const action = getActionRequired(contract);

            const totalMilestones = contract.milestones?.length || 0;
            const releasedMilestones = contract.milestones?.filter(m => m.status === 'PAID').length || 0;

            const ageDays = contract.startedAt
              ? Math.max(0, Math.floor((Date.now() - new Date(contract.startedAt).getTime()) / (1000 * 60 * 60 * 24)))
              : Math.max(0, Math.floor((Date.now() - new Date(contract.createdAt).getTime()) / (1000 * 60 * 60 * 24)));

            return (
              <Card
                key={contract.id}
                sx={{
                  border: '1px solid #f1f5f9',
                  borderRadius: 4,
                  transition: 'all 0.25s ease-in-out',
                  '&:hover': {
                    boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
                    borderColor: 'teal',
                  },
                }}
              >
                <CardContent sx={{ p: 3.5 }}>
                  <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={7}>
                      <Stack spacing={1.5}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={contract.status}
                            color={getStatusColor(contract.status)}
                            size="small"
                            sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                          />
                        </Stack>

                        <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: 'Outfit, sans-serif', lineHeight: 1.3 }}>
                          {contract.job?.title || 'Freelance Engagement'}
                        </Typography>

                        {/* Client details */}
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Avatar
                            src={contract.client?.user?.profileImage || undefined}
                            sx={{ width: 28, height: 28, bgcolor: 'teal', fontSize: '0.8rem' }}
                          >
                            {contract.client?.user?.fullName?.[0] || 'C'}
                          </Avatar>
                          <Typography variant="body2" color="text.secondary">
                            With <strong>{contract.client?.user?.fullName || 'Client'}</strong>
                          </Typography>
                        </Stack>
                      </Stack>
                    </Grid>

                    <Grid item xs={12} md={5}>
                      <Stack
                        spacing={2}
                        alignItems={{ xs: 'flex-start', md: 'flex-end' }}
                        sx={{ textAlign: { xs: 'left', md: 'right' } }}
                      >
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Payout
                          </Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                            ₹{totalBudget.toLocaleString('en-IN')} (Net: ₹{netAmount.toLocaleString('en-IN')})
                          </Typography>
                        </Box>

                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Progress Tracker
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            {releasedMilestones} of {totalMilestones} milestones released
                          </Typography>
                        </Box>

                        {action && (
                          <Chip
                            label={action.text}
                            sx={{
                              bgcolor: 'transparent',
                              border: '1px solid',
                              borderColor: action.color,
                              color: action.color,
                              fontWeight: 800,
                              fontSize: '0.75rem',
                            }}
                          />
                        )}
                      </Stack>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2.5 }} />

                  <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                    <Typography variant="caption" color="text.secondary">
                      {contract.status === 'COMPLETED' ? (
                        <>Completed on: <strong>{contract.endedAt ? new Date(contract.endedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</strong></>
                      ) : contract.status === 'CANCELLED' ? (
                        <>Reason: <strong>{contract.cancelledReason || 'Terminated'}</strong></>
                      ) : (
                        <>Started: <strong>{ageDays === 0 ? 'Today' : `${ageDays} days ago`}</strong></>
                      )}
                    </Typography>
                    
                    <Button
                      variant="contained"
                      color="secondary"
                      size="small"
                      onClick={() => router.push(`/contracts/${contract.id}`)}
                      sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
                    >
                      Open Workspace
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      ) : (
        /* EMPTY STATE DESIGN */
        <Card sx={{ border: '1px dashed #cbd5e1', borderRadius: 4, p: 4, textAlign: 'center', bgcolor: '#f8fafc' }}>
          <CardContent>
            <BusinessCenterIcon color="disabled" sx={{ fontSize: 48, mb: 2 }} />
            {activeTab === 0 && (
              <>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontFamily: 'Outfit, sans-serif' }}>
                  No active contracts
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mx: 'auto', mb: 3 }}>
                  Contracts start when a client accepts one of your proposals. Browse projects and submit bids to get started.
                </Typography>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => router.push('/freelance-jobs')}
                  sx={{ borderRadius: 3, fontWeight: 700 }}
                >
                  Browse Projects
                </Button>
              </>
            )}

            {activeTab === 1 && (
              <>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontFamily: 'Outfit, sans-serif' }}>
                  No completed contracts yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mx: 'auto', mb: 3 }}>
                  Once you deliver all milestones and the client approves the release of funds, your completed contracts will appear here.
                </Typography>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => setActiveTab(0)}
                  sx={{ borderRadius: 3, fontWeight: 700 }}
                >
                  View Active Contracts
                </Button>
              </>
            )}

            {activeTab === 2 && (
              <>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontFamily: 'Outfit, sans-serif' }}>
                  No cancelled contracts
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mx: 'auto', mb: 3 }}>
                  Any terminated or cancelled engagements will be recorded in this history log.
                </Typography>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => setActiveTab(0)}
                  sx={{ borderRadius: 3, fontWeight: 700 }}
                >
                  View Active Contracts
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  );
}
