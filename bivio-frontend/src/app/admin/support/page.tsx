'use client';

import React, { useState, useEffect } from 'react';
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
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Avatar,
  CircularProgress,
  Divider,
  Paper,
  InputAdornment,
} from '@mui/material';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SendIcon from '@mui/icons-material/Send';
import SearchIcon from '@mui/icons-material/Search';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useGetAdminTicketsQuery, useReplySupportTicketMutation } from '@/store/api/adminApi';

export default function AdminSupportDeskPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Reply modal state
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const { data: tickets = [], isLoading, refetch } = useGetAdminTicketsQuery(
    statusFilter !== 'ALL' ? { status: statusFilter } : undefined,
    { skip: !mounted, refetchOnMountOrArgChange: true }
  );

  const [replySupportTicket, { isLoading: isReplying }] = useReplySupportTicketMutation();

  const handleOpenReplyModal = (ticket: any) => {
    setActiveTicket(ticket);
    setReplyText(ticket.adminReply || '');
    setActionError(null);
  };

  const handleCloseReplyModal = () => {
    setActiveTicket(null);
    setReplyText('');
    setActionError(null);
  };

  const handleSendReply = async () => {
    if (!activeTicket || !replyText.trim()) return;
    setActionError(null);
    try {
      await replySupportTicket({
        id: activeTicket.id,
        reply: replyText.trim(),
        status: 'RESOLVED',
      }).unwrap();

      setSuccessToast(`Reply sent to ${activeTicket.user?.email || 'user'} and ticket marked as Resolved.`);
      handleCloseReplyModal();
      refetch();
    } catch (err: any) {
      setActionError(err?.data?.message || 'Failed to submit reply.');
    }
  };

  // Filter tickets
  const filteredTickets = tickets.filter((t) => {
    if (issueTypeFilter !== 'ALL' && t.issueType !== issueTypeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = t.ticketNumber?.toLowerCase().includes(q);
      const matchUser = t.user?.fullName?.toLowerCase().includes(q) || t.user?.email?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchNumber && !matchUser && !matchDesc) return false;
    }
    return true;
  });

  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED').length;

  if (!mounted || isLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading support ticket queue...
          </Typography>
        </Stack>
      </Container>
    );
  }

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
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ p: 1.5, bgcolor: 'primary.main', color: '#ffffff', borderRadius: 3 }}>
              <SupportAgentIcon sx={{ fontSize: 32 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
                Support Tickets Desk
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review user inquiries, troubleshoot account/verification issues, and send answers directly to user emails.
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Success alert banner */}
      {successToast && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 3, fontWeight: 700 }} onClose={() => setSuccessToast(null)}>
          {successToast}
        </Alert>
      )}

      {/* Statistics summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined" sx={{ borderRadius: 3.5, borderColor: '#e2e8f0', p: 2.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
              Total Inquiries
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', mt: 0.5 }}>
              {tickets.length}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined" sx={{ borderRadius: 3.5, borderColor: '#e2e8f0', p: 2.5, borderLeft: '4px solid #f59e0b' }}>
            <Typography variant="caption" color="warning.main" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
              Open / Awaiting Answer
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#d97706', mt: 0.5 }}>
              {openCount}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined" sx={{ borderRadius: 3.5, borderColor: '#e2e8f0', p: 2.5, borderLeft: '4px solid #10b981' }}>
            <Typography variant="caption" color="success.main" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
              Resolved Inquiries
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#059669', mt: 0.5 }}>
              {resolvedCount}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Toolbar */}
      <Card variant="outlined" sx={{ mb: 4, borderRadius: 3.5, borderColor: '#e2e8f0', p: 2.5 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              size="small"
              placeholder="Search by ticket #, user, email, keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              select
              size="small"
              label="Status Filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
            >
              <MenuItem value="ALL">All Statuses</MenuItem>
              <MenuItem value="OPEN">Open Only</MenuItem>
              <MenuItem value="RESOLVED">Resolved Only</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              select
              size="small"
              label="Issue Concern"
              value={issueTypeFilter}
              onChange={(e) => setIssueTypeFilter(e.target.value)}
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
            >
              <MenuItem value="ALL">All Concerns</MenuItem>
              <MenuItem value="Verification">Verification Stuck</MenuItem>
              <MenuItem value="Payment">Payment Gateway Failures</MenuItem>
              <MenuItem value="Profile">Profile Completeness</MenuItem>
              <MenuItem value="Moderation">Account Warning Audit</MenuItem>
              <MenuItem value="General">General Inquiry</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Card>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <Card variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 4, borderColor: '#e2e8f0' }}>
          <SupportAgentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
            No Support Tickets Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No tickets match your active filter criteria.
          </Typography>
        </Card>
      ) : (
        <Stack spacing={3}>
          {filteredTickets.map((ticket) => {
            const isResolved = ticket.status === 'RESOLVED';
            const userRole = ticket.user?.role || 'USER';
            return (
              <Card
                key={ticket.id}
                variant="outlined"
                sx={{
                  borderRadius: 4,
                  borderColor: isResolved ? '#e2e8f0' : '#fed7aa',
                  boxShadow: isResolved ? 'none' : '0 4px 16px rgba(245, 158, 11, 0.08)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                  },
                }}
              >
                <CardContent sx={{ p: 3.5 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 2.5 }}>
                    {/* User and Ticket Meta */}
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ bgcolor: userRole === 'RECRUITER' ? 'primary.main' : 'secondary.main', fontWeight: 800 }}>
                        {ticket.user?.fullName?.slice(0, 2).toUpperCase() || <PersonIcon />}
                      </Avatar>
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                            {ticket.user?.fullName || 'Platform User'}
                          </Typography>
                          <Chip
                            label={userRole}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              bgcolor: userRole === 'RECRUITER' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                              color: userRole === 'RECRUITER' ? 'primary.main' : 'success.main',
                            }}
                          />
                        </Stack>
                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.25 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <EmailIcon sx={{ fontSize: 13 }} /> {ticket.user?.email || 'No email'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">·</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Submitted: {new Date(ticket.createdAt).toLocaleString()}
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>

                    {/* Badge and Status */}
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Chip
                        label={`#${ticket.ticketNumber}`}
                        size="small"
                        sx={{ fontWeight: 800, bgcolor: '#f1f5f9', color: '#1e293b' }}
                      />
                      <Chip
                        label={ticket.issueType}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                      <Chip
                        label={isResolved ? 'Resolved' : 'Open'}
                        size="small"
                        color={isResolved ? 'success' : 'warning'}
                        icon={isResolved ? <CheckCircleOutlineIcon /> : <HourglassEmptyIcon />}
                        sx={{ fontWeight: 800 }}
                      />
                    </Stack>
                  </Stack>

                  {/* Problem Description */}
                  <Box sx={{ mb: 2.5, p: 2.5, bgcolor: '#f8fafc', borderRadius: 3, borderLeft: '4px solid #3b82f6' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 0.5, textTransform: 'uppercase' }}>
                      User Inquiry / Problem Description
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#1e293b', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                      {ticket.description}
                    </Typography>
                  </Box>

                  {/* Admin Resolution Box if answered */}
                  {ticket.adminReply && (
                    <Box sx={{ p: 2.5, bgcolor: '#ecfdf5', borderRadius: 3, borderLeft: '4px solid #10b981', mb: 2.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <AdminPanelSettingsIcon sx={{ fontSize: 18, color: '#065f46' }} />
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#065f46', textTransform: 'uppercase' }}>
                          Administrator Answer ({ticket.repliedByAdmin?.fullName || 'Admin'})
                        </Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ color: '#064e3b', fontWeight: 500, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                        {ticket.adminReply}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#059669' }}>
                        Answered on {ticket.repliedAt ? new Date(ticket.repliedAt).toLocaleString() : ''} · Dispatched to {ticket.user?.email}
                      </Typography>
                    </Box>
                  )}

                  {/* Actions */}
                  <Stack direction="row" justifyContent="flex-end" spacing={2}>
                    <Button
                      variant={isResolved ? 'outlined' : 'contained'}
                      color="primary"
                      startIcon={<SendIcon />}
                      onClick={() => handleOpenReplyModal(ticket)}
                      sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none', px: 3 }}
                    >
                      {isResolved ? 'Update Answer' : 'Reply & Resolve'}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Admin Reply Modal */}
      <Dialog
        open={Boolean(activeTicket)}
        onClose={handleCloseReplyModal}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 850 }}>
          Respond to Ticket #{activeTicket?.ticketNumber}
        </DialogTitle>
        <DialogContent>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2.5 }}>
              {actionError}
            </Alert>
          )}

          {activeTicket && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              {/* User overview */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc' }}>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>USER</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{activeTicket.user?.fullName}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>EMAIL ADDRESS</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{activeTicket.user?.email}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={2.5}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>ROLE</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{activeTicket.user?.role}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={2.5}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>CONCERN</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{activeTicket.issueType}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Original Question */}
              <Box sx={{ p: 2, bgcolor: '#f1f5f9', borderRadius: 2.5, borderLeft: '4px solid #3b82f6' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                  User Inquiry
                </Typography>
                <Typography variant="body2" sx={{ color: '#334155' }}>
                  {activeTicket.description}
                </Typography>
              </Box>

              {/* Admin Answer Box */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>
                  YOUR OFFICIAL RESPONSE (WILL BE SENT DIRECTLY TO USER&apos;S EMAIL)
                </Typography>
                <TextField
                  label="Administrator Answer / Solution"
                  multiline
                  rows={5}
                  placeholder="Explain the resolution, troubleshooting steps, or confirmation details..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  fullWidth
                  required
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                />
              </Box>

              <Alert severity="info" sx={{ borderRadius: 2.5 }}>
                Submitting this answer will immediately email <strong>{activeTicket.user?.email}</strong> with your response and update the ticket status to <strong>RESOLVED</strong>.
              </Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseReplyModal}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SendIcon />}
            onClick={handleSendReply}
            disabled={!replyText.trim() || isReplying}
            sx={{ borderRadius: 2.5, px: 3, fontWeight: 700, textTransform: 'none' }}
          >
            {isReplying ? 'Sending...' : 'Send Email & Resolve'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
