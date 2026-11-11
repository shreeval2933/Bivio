'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Container,
  Box,
  Typography,
  Card,
  Tabs,
  Tab,
  Stack,
  Chip,
  Divider,
  Button,
  Grid,
  CardContent,
  CircularProgress,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { showNotification } from '@/store/slices/notificationSlice';
import { initializeState } from '@/mocks/recruiterState';

// Icons
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ClearIcon from '@mui/icons-material/Clear';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface Proposal {
  id: string;
  projectId: string;
  projectTitle: string;
  client: string;
  bidAmount: number;
  submittedDaysAgo: number;
  status: 'SUBMITTED' | 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  matchScore: number;
}

const MOCK_PROPOSALS: Proposal[] = [
  {
    id: 'prop-1',
    projectId: 'proj-2',
    projectTitle: 'React Native Mobile App Specialist',
    client: 'Hologram Inc.',
    bidAmount: 120000,
    submittedDaysAgo: 2,
    status: 'SUBMITTED',
    matchScore: 78,
  },
  {
    id: 'prop-2',
    projectId: 'proj-99',
    projectTitle: 'Payment Gateway Integration - Razorpay',
    client: 'FintechFlow Inc',
    bidAmount: 45000,
    submittedDaysAgo: 5,
    status: 'SHORTLISTED',
    matchScore: 84,
  },
  {
    id: 'prop-3',
    projectId: 'proj-1',
    projectTitle: 'Enterprise Next.js & MUI Dashboard Overhaul',
    client: 'Stripeflow Technologies',
    bidAmount: 430000,
    submittedDaysAgo: 8,
    status: 'ACCEPTED',
    matchScore: 92,
  },
  {
    id: 'prop-4',
    projectId: 'proj-100',
    projectTitle: 'Legacy Angular Refactor',
    client: 'AeroGroup Global',
    bidAmount: 180000,
    submittedDaysAgo: 14,
    status: 'REJECTED',
    matchScore: 54,
  },
];

import { useGetProposalsQuery, useWithdrawProposalMutation, useGetContractsQuery } from '@/store/api/contractsApi';
import { useGetInvitationsQuery, useRespondInvitationMutation } from '@/store/api/applicationsApi';

export default function ProposalsPage() {
  const router = useRouter();
  const dispatch = useDispatch();

  const [mounted, setMounted] = useState(false);

  // RTK Query endpoints
  const { data: dbProposals, isLoading: isProposalsLoading } = useGetProposalsQuery({ mine: true });
  const { data: dbInvitations, isLoading: isInvitationsLoading } = useGetInvitationsQuery();
  const { data: dbContracts } = useGetContractsQuery();
  
  const [respondInvitation] = useRespondInvitationMutation();
  const [withdrawProposal] = useWithdrawProposalMutation();

  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const proposals = useMemo(() => {
    const list = dbProposals?.data || [];
    const contractsList = dbContracts?.data || [];
    
    return list.map((p: any) => {
      let submittedDaysAgo = 0;
      if (p.createdAt) {
        const diffMs = Date.now() - new Date(p.createdAt).getTime();
        submittedDaysAgo = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      }
      
      const matchingContract = contractsList.find((c: any) => c.jobId === p.jobId);

      return {
        id: p.id,
        projectId: p.jobId,
        projectTitle: p.job?.title || 'Freelance Project',
        client: p.job?.company?.name || p.job?.recruiter?.user?.fullName || 'Acme Client',
        bidAmount: Number(p.bidAmount || 0),
        submittedDaysAgo,
        status: p.status,
        matchScore: p.matchScore ? (typeof p.matchScore === 'object' ? Number(p.matchScore.score) : Number(p.matchScore)) : 75,
        associatedContractId: matchingContract?.id || null
      };
    });
  }, [dbProposals, dbContracts]);

  const invitations = useMemo(() => {
    return (dbInvitations || []).filter((inv: any) => inv.status === 'SENT');
  }, [dbInvitations]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleDeclineInvitation = async (invId: string) => {
    try {
      await respondInvitation({ id: invId, accept: false }).unwrap();
      dispatch(
        showNotification({
          message: 'Invitation declined successfully.',
          severity: 'info',
        })
      );
    } catch (err: any) {
      dispatch(
        showNotification({
          message: err.data?.message || 'Failed to decline invitation.',
          severity: 'error',
        })
      );
    }
  };

  const handleWithdraw = async (proposalId: string) => {
    try {
      await withdrawProposal(proposalId).unwrap();
      dispatch(
        showNotification({
          message: 'Proposal withdrawn successfully.',
          severity: 'info',
        })
      );
    } catch (err: any) {
      dispatch(
        showNotification({
          message: err.data?.message || 'Failed to withdraw proposal.',
          severity: 'error',
        })
      );
    }
  };

  const getStatusColor = (status: Proposal['status']) => {
    if (status === 'ACCEPTED') return 'success';
    if (status === 'SHORTLISTED') return 'secondary';
    if (status === 'SUBMITTED') return 'primary';
    if (status === 'REJECTED') return 'error';
    return 'default';
  };

  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      if (activeTab === 0) return false; // Handled separately
      if (activeTab === 1) return p.status === 'SUBMITTED' || p.status === 'SHORTLISTED'; // Active Bids
      if (activeTab === 2) return p.status === 'ACCEPTED'; // Won Projects
      if (activeTab === 3) return p.status === 'REJECTED' || p.status === 'WITHDRAWN'; // Closed & Withdrawn
      return true;
    });
  }, [proposals, activeTab]);

  if (!mounted || isProposalsLoading || isInvitationsLoading) {
    if (!mounted) return null;
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading proposals...
          </Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* HEADER */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 850, fontFamily: 'Outfit, sans-serif', mb: 1, color: 'secondary.main' }}>
          Your Submitted Proposals
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track negotiations, bids status, and view won project contracts.
        </Typography>
      </Box>

      {/* TABS HEADER */}
      <Card sx={{ border: '1px solid #f1f5f9', borderRadius: 4, mb: 4, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="secondary"
          textColor="secondary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>Invitations</span>
                {invitations.length > 0 && <Chip label={invitations.length} size="small" color="secondary" sx={{ height: 20, fontSize: '0.75rem', fontWeight: 800, color: '#fff' }} />}
              </Stack>
            }
            sx={{ fontWeight: 700, px: 3, py: 2 }}
          />
          <Tab label="Active Bids" sx={{ fontWeight: 700, px: 3, py: 2 }} />
          <Tab label="Won Projects" sx={{ fontWeight: 700, px: 3, py: 2 }} />
          <Tab label="Closed &amp; Withdrawn" sx={{ fontWeight: 700, px: 3, py: 2 }} />
        </Tabs>
      </Card>

      {/* PROPOSALS LIST */}
      <Stack spacing={2.5}>
        {activeTab === 0 && (
          invitations.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center', bgcolor: '#fff', border: '1px solid #f1f5f9', borderRadius: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>No active invitations</Typography>
              <Typography variant="body2" color="text.secondary">
                Clients will invite you to bid here if your freelance portfolio matches their needs.
              </Typography>
            </Box>
          ) : (
            invitations.map((inv) => {
              const expDays = inv.expiresAt
                ? Math.ceil((new Date(inv.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : 7;
              const isClose = expDays <= 3;
              return (
                <Card key={inv.id} sx={{ border: '1px solid #e2e8f0', borderRadius: 4, boxShadow: 'none' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'secondary.main', display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          📨 Invited by {inv.job?.company?.name || 'Acme Corp'}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 950, mb: 1 }}>{inv.job?.title}</Typography>
                        {inv.message && (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', bgcolor: 'rgba(0,0,0,0.01)', p: 1.5, borderRadius: 2, mb: 1.5 }}>
                            "{inv.message}"
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700 }}>
                          Budget: ₹{parseInt((inv.job as any)?.budget || '3500').toLocaleString()}/hr · Est. {
                            (() => {
                              const estimate = (inv.job as any)?.projectLengthEstimate;
                              if (estimate === 'UNDER_1_WEEK') return 'Under 1 week';
                              if (estimate === 'W1_4') return '1–4 weeks';
                              if (estimate === 'M1_3') return '1–3 months';
                              if (estimate === 'M3_PLUS') return '3+ months';
                              return '1–4 weeks';
                            })()
                          }
                        </Typography>
                      </Box>
                      <Chip
                        label={expDays > 0 ? `Expires in ${expDays} days` : 'Expired'}
                        size="small"
                        color={isClose ? 'warning' : 'default'}
                        sx={{ fontWeight: 800, mt: { xs: 1, sm: 0 } }}
                      />
                    </Stack>
                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                      <Link href={`/freelance-jobs/${inv.jobId}`} style={{ textDecoration: 'none' }}>
                        <Button variant="contained" color="secondary" size="small" sx={{ fontWeight: 800, color: '#fff' }}>
                          View Project &amp; Submit Bid →
                        </Button>
                      </Link>
                      <Button variant="outlined" size="small" color="error" onClick={() => handleDeclineInvitation(inv.id)} sx={{ fontWeight: 800 }}>
                        Decline
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })
          )
        )}



        {activeTab !== 0 && filteredProposals.map((prop) => {
          const isClosed = prop.status === 'REJECTED' || prop.status === 'WITHDRAWN';
          const isActive = prop.status === 'SUBMITTED' || prop.status === 'SHORTLISTED';
          const isWon = prop.status === 'ACCEPTED';

          return (
            <Card
              key={prop.id}
              sx={{
                border: '1.5px solid #f1f5f9',
                borderRadius: 4,
                boxShadow: 'none',
                bgcolor: isClosed ? 'rgba(248, 250, 252, 0.6)' : '#ffffff',
                opacity: isClosed ? 0.75 : 1,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={3} alignItems="center">
                  
                  {/* Proposal & client details */}
                  <Grid item xs={12} md={5}>
                    <Stack spacing={1}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: isClosed ? 'text.disabled' : 'text.primary' }}>
                        {prop.projectTitle}
                      </Typography>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {prop.client}
                      </Typography>

                      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ pt: 0.5 }}>
                        <Chip label={`Bid: ₹${prop.bidAmount.toLocaleString()}`} size="small" variant="outlined" />
                        <Chip label={`Submitted ${prop.submittedDaysAgo}d ago`} size="small" variant="outlined" />
                        <Chip label={`Match at Bid: ${prop.matchScore}%`} size="small" color="secondary" variant="outlined" sx={{ fontWeight: 600 }} />
                      </Stack>
                    </Stack>
                  </Grid>

                  {/* Status column */}
                  <Grid item xs={12} sm={3.5} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Stack spacing={0.5}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                        PROPOSAL STATUS
                      </Typography>
                      <Chip
                        label={prop.status}
                        color={getStatusColor(prop.status)}
                        size="small"
                        sx={{ fontWeight: 800, width: 'fit-content' }}
                      />
                    </Stack>
                  </Grid>

                  {/* Actions column */}
                  <Grid item xs={12} sm={3.5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                    {isActive && (
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleWithdraw(prop.id)}
                        sx={{ borderRadius: 2.5, fontWeight: 700 }}
                      >
                        Withdraw Bid
                      </Button>
                    )}

                    {isWon && (
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => router.push(`/contracts/${prop.associatedContractId}`)}
                        disabled={!prop.associatedContractId}
                        sx={{ borderRadius: 2.5, fontWeight: 700 }}
                      >
                        View Contract
                      </Button>
                    )}

                    {isClosed && (
                      <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 700 }}>
                        No Actions Available
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          );
        })}

        {activeTab !== 0 && filteredProposals.length === 0 && (
          <Card sx={{ p: 6, textAlign: 'center', border: '1.5px dashed #e2e8f0', borderRadius: 4 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                No proposals in this category
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Submit bids on open freelance briefs from the Browse Projects tab.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
