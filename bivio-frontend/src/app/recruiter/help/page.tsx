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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useGetMyTicketsQuery, useSubmitSupportTicketMutation } from '@/store/api/supportApi';

export default function RecruiterHelpSupportPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [issueType, setIssueType] = useState('Verification');
  const [issueDesc, setIssueDesc] = useState('');
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [submittedTicketNum, setSubmittedTicketNum] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: myTickets = [], isLoading: isLoadingTickets } = useGetMyTicketsQuery(undefined, {
    skip: !mounted,
  });
  const [submitSupportTicket, { isLoading: isSubmitting }] = useSubmitSupportTicketMutation();

  const handleSubmitTicket = async () => {
    if (!issueDesc.trim()) return;
    setSubmitError(null);
    try {
      const result = await submitSupportTicket({
        issueType,
        description: issueDesc.trim(),
      }).unwrap();

      setSubmittedTicketNum(result.ticketNumber);
      setTicketSubmitted(true);
      setIssueDesc('');
    } catch (err: any) {
      setSubmitError(err?.data?.message || 'Failed to submit support ticket.');
    }
  };

  const handleCloseModal = () => {
    setShowSupportModal(false);
    setTicketSubmitted(false);
    setSubmitError(null);
  };

  const faqs = [
    {
      q: 'How does milestone escrow funding work?',
      a: 'Before starting work on a freelance milestone, the client must fund the escrow amount. Once they deposit funds, the milestone shifts to "Funded". Freelancers should only submit deliverables after confirming the milestone is funded.',
    },
    {
      q: 'What is opaque 404 access control?',
      a: 'To protect platform privacy, direct links to contracts or proposals that you are not a party to return a standard "404 Page Not Found" screen, rather than a forbidden screen. This prevents probing for active contract identifiers.',
    },
    {
      q: 'How can I complete identity KYC verification?',
      a: 'Go to the Trust & Verification settings and upload a scan of your business or identity documents. Compliance reviews take up to 24 hours. Verification unlocks high-value hiring contracts.',
    },
    {
      q: 'What is double-blind review release?',
      a: 'When a contract completes, client and freelancer reviews are hidden initially. Both reviews are sealed until both parties have submitted feedback, or the 14-day review window passes.',
    },
  ];

  if (!mounted) return null;

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      {/* HEADER */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 855, fontFamily: 'Outfit, sans-serif', color: 'text.primary', mb: 0.5 }}>
            Recruiter Support Desk
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Find answers to frequently asked recruiter questions or submit assistance tickets.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<ContactSupportIcon />}
          onClick={() => setShowSupportModal(true)}
          sx={{ textTransform: 'none', borderRadius: 2.5, fontWeight: 700 }}
        >
          Submit Support Ticket
        </Button>
      </Box>

      {/* MY TICKETS HISTORY SECTION */}
      {myTickets.length > 0 && (
        <Box sx={{ mb: 5 }}>
          <Typography variant="h6" sx={{ fontWeight: 850, mb: 2, fontFamily: 'Outfit, sans-serif' }}>
            My Support Tickets ({myTickets.length})
          </Typography>
          <Stack spacing={2.5}>
            {myTickets.map((ticket) => (
              <Card key={ticket.id} variant="outlined" sx={{ borderRadius: 3.5, borderColor: '#e2e8f0' }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Chip
                        label={`#${ticket.ticketNumber}`}
                        size="small"
                        sx={{ fontWeight: 800, bgcolor: '#f1f5f9', color: '#334155' }}
                      />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {ticket.issueType}
                      </Typography>
                    </Stack>
                    <Chip
                      label={ticket.status === 'RESOLVED' ? 'Resolved' : 'Open / In Review'}
                      size="small"
                      color={ticket.status === 'RESOLVED' ? 'success' : 'warning'}
                      icon={ticket.status === 'RESOLVED' ? <CheckCircleOutlineIcon /> : <HourglassEmptyIcon />}
                      sx={{ fontWeight: 800 }}
                    />
                  </Stack>

                  <Typography variant="body2" sx={{ color: '#334155', mb: 2, bgcolor: '#f8fafc', p: 2, borderRadius: 2.5, borderLeft: '3px solid #cbd5e1' }}>
                    &quot;{ticket.description}&quot;
                  </Typography>

                  {/* Admin Reply Section */}
                  {ticket.adminReply ? (
                    <Box sx={{ mt: 2, p: 2.5, bgcolor: '#ecfdf5', borderRadius: 2.5, borderLeft: '4px solid #10b981' }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <AdminPanelSettingsIcon sx={{ fontSize: 18, color: '#065f46' }} />
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#065f46', textTransform: 'uppercase' }}>
                          Administrator Response ({ticket.repliedByAdmin?.fullName || 'Bivio Support'})
                        </Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ color: '#064e3b', fontWeight: 500, lineHeight: 1.6 }}>
                        {ticket.adminReply}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#059669' }}>
                        Answered on {ticket.repliedAt ? new Date(ticket.repliedAt).toLocaleString() : ''} · Sent to your registered email
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Submitted on {new Date(ticket.createdAt).toLocaleString()} · Awaiting administrative review
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      )}

      {/* FAQ SECTION */}
      <Typography variant="h6" sx={{ fontWeight: 850, mb: 2, fontFamily: 'Outfit, sans-serif' }}>
        Frequently Asked Questions
      </Typography>
      <Stack spacing={2} sx={{ mb: 4 }}>
        {faqs.map((faq, idx) => (
          <Accordion key={idx} sx={{ border: '1px solid #cbd5e1', borderRadius: '8px !important', boxShadow: 'none', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {faq.q}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ borderTop: '1px solid #cbd5e1', bgcolor: '#fafafa' }}>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                {faq.a}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>

      {/* CONTACT MODAL */}
      <Dialog open={showSupportModal} onClose={handleCloseModal} PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Submit Support Ticket</DialogTitle>
        <DialogContent>
          {ticketSubmitted ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                Support ticket submitted successfully! Ticket ID: #{submittedTicketNum}
              </Alert>
              <Typography variant="body2" color="text.secondary">
                Our operations team will review your ticket and reply. You will also receive an answer directly to your registered email address.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2.5} sx={{ mt: 1, minWidth: 320 }}>
              {submitError && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {submitError}
                </Alert>
              )}
              <Typography variant="body2" color="text.secondary">
                For contract disputes, please use the &quot;Raise Dispute&quot; button on the contract detail page. For other issues, use this form.
              </Typography>
              <TextField
                select
                label="Issue Concern"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                fullWidth
              >
                <MenuItem value="Verification">Verification Stuck</MenuItem>
                <MenuItem value="Payment">Payment Gateway Failures</MenuItem>
                <MenuItem value="Profile">Profile Completeness Checks</MenuItem>
                <MenuItem value="Moderation">Account Warning Audit</MenuItem>
                <MenuItem value="General">General Inquiry</MenuItem>
              </TextField>
              <TextField
                label="Explain your issue"
                placeholder="Describe what occurred, including transaction IDs if applicable..."
                fullWidth
                multiline
                rows={4}
                value={issueDesc}
                onChange={(e) => setIssueDesc(e.target.value)}
              />
            </Stack>
          )}
        </DialogContent>
        {!ticketSubmitted && (
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseModal}>Cancel</Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmitTicket}
              disabled={!issueDesc.trim() || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
            </Button>
          </DialogActions>
        )}
        {ticketSubmitted && (
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button variant="contained" onClick={handleCloseModal}>
              Close
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </Container>
  );
}
