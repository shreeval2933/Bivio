'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  TextField,
  Button,
  Stack,
  FormControlLabel,
  Switch,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  MenuItem,
  Alert,
  Snackbar,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import ShieldIcon from '@mui/icons-material/Shield';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

export default function SettingsHubPage() {
  const [mounted, setMounted] = useState(false);

  // Toast Snackbar States
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('success');

  const showToast = (msg: string, severity: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setToastMsg(msg);
    setToastSeverity(severity);
    setToastOpen(true);
  };
  useEffect(() => {
    setMounted(true);
  }, []);

  const [activeTab, setActiveTab] = useState(0);

  // Profile Settings States
  const [headline, setHeadline] = useState('Senior React Developer & UI Engineer');
  const [summary, setSummary] = useState('5+ years building performant Next.js dashboards.');
  const [skills, setSkills] = useState('React, Next.js, Material-UI, TypeScript');

  // Account Settings States
  const [email, setEmail] = useState('alex.morgan@bivio.dev');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpVal, setOtpVal] = useState('');
  const [tfaEnabled, setTfaEnabled] = useState(false);
  
  const [sessions, setSessions] = useState([
    { id: 's1', device: 'Windows 11 PC · Chrome', location: 'Mumbai, India', lastActive: 'Active now' },
    { id: 's2', device: 'iPhone 15 Pro · Safari', location: 'Delhi, India', lastActive: '12 hours ago' },
  ]);

  // Verification Settings States
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [kycStatus, setKycStatus] = useState<'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED'>('NOT_STARTED');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pv = localStorage.getItem('bivio_paymentMethodVerified') === 'true';
      const ks = (localStorage.getItem('bivio_kycStatus') as any) || 'NOT_STARTED';
      setPaymentVerified(pv);
      setKycStatus(ks);
    }
  }, []);

  const handleRevokeSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  // Preferences Toggles
  const [currency, setCurrency] = useState('INR');
  const [openFullTime, setOpenFullTime] = useState(true);
  const [openFreelance, setOpenFreelance] = useState(true);
  const [notifInApp, setNotifInApp] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);

  // Danger Zone States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleDeleteAccount = () => {
    if (deleteConfirmText === 'DELETE') {
      setShowDeleteModal(false);
      showToast('Account soft-deleted successfully. Personal fields anonymized.', 'warning');
      setTimeout(() => {
        if (typeof window !== 'undefined') window.location.href = '/login';
      }, 1500);
    }
  };

  if (!mounted) return null;

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* HEADER */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 850, fontFamily: 'Outfit, sans-serif', color: 'text.primary', mb: 0.5 }}>
          Profile &amp; Account Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure security credentials, notification channels, and details.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* LEFT COLUMN: TABS */}
        <Grid item xs={12} md={3.5}>
          <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4, position: 'sticky', top: 90 }}>
            <Box sx={{ p: 2 }}>
              <Tabs
                orientation="vertical"
                value={activeTab}
                onChange={(_e, val) => setActiveTab(val)}
                sx={{
                  borderRight: 0,
                  '& .MuiTab-root': {
                    alignItems: 'flex-start',
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 2.5,
                    mb: 0.5,
                    py: 1.5,
                    color: 'text.secondary',
                    '&.Mui-selected': {
                      bgcolor: 'rgba(37, 99, 235, 0.06)',
                      color: 'primary.main',
                    },
                  },
                  '& .MuiTabs-indicator': {
                    display: 'none',
                  },
                }}
              >
                <Tab label="Public Profile" />
                <Tab label="Account & Security" />
                <Tab label="Preferences" />
                <Tab label="Billing & Invoices" />
                <Tab label="Danger Zone" />
              </Tabs>
            </Box>
          </Card>
        </Grid>

        {/* RIGHT COLUMN: ACTIVE TAB PANEL */}
        <Grid item xs={12} md={8.5}>
          
          {/* TAB 0: PUBLIC PROFILE */}
          {activeTab === 0 && (
            <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 850, mb: 3, fontFamily: 'Outfit, sans-serif' }}>
                  Public Candidate Profile
                </Typography>
                <Stack spacing={3}>
                  <TextField
                    label="Headline"
                    fullWidth
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                  />
                  <TextField
                    label="Professional Summary"
                    fullWidth
                    multiline
                    rows={4}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                  />
                  <TextField
                    label="Core Skills"
                    fullWidth
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    helperText="Comma separated list"
                  />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Resume Attachment</Typography>
                    <Paper variant="outlined" sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>alex_morgan_resume_2026.pdf</Typography>
                      <Button size="small" variant="text" sx={{ fontWeight: 800 }}>Update File</Button>
                    </Paper>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Stack direction="row" justifyContent="flex-end">
                    <Button variant="contained" color="primary" sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700, px: 3 }}>
                      Save Profile Section
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* TAB 1: ACCOUNT & SECURITY */}
          {activeTab === 1 && (
            <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 850, mb: 3, fontFamily: 'Outfit, sans-serif' }}>
                  Security & Authentication Settings
                </Typography>
                <Stack spacing={3.5}>
                  
                  {/* Email & Phone */}
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Email Address"
                        fullWidth
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Phone Number"
                        fullWidth
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        InputProps={{
                          endAdornment: (
                            <Button size="small" onClick={() => setShowOtpModal(true)} sx={{ fontWeight: 800 }}>
                              Verify OTP
                            </Button>
                          ),
                        }}
                      />
                    </Grid>
                  </Grid>

                  <Divider />

                  {/* 2FA Toggle */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ShieldIcon color="primary" /> Two-Factor Authentication (2FA)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                      Secure your profile payouts and application credentials using authenticator codes.
                    </Typography>
                    <FormControlLabel
                      control={<Switch checked={tfaEnabled} onChange={(e) => setTfaEnabled(e.target.checked)} color="primary" />}
                      label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Enable OTP 2FA at Login</Typography>}
                    />
                  </Box>

                  <Divider />

                  {/* Active sessions */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>Active Login Sessions</Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Device / Browser</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Last Active</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sessions.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell>{s.device}</TableCell>
                              <TableCell>{s.location}</TableCell>
                              <TableCell>{s.lastActive}</TableCell>
                              <TableCell>
                                {s.lastActive !== 'Active now' && (
                                  <Button color="error" size="small" onClick={() => handleRevokeSession(s.id)} sx={{ textTransform: 'none', fontWeight: 800 }}>
                                    Revoke
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>

                </Stack>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: PREFERENCES */}
          {activeTab === 2 && (
            <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 850, mb: 3, fontFamily: 'Outfit, sans-serif' }}>
                  Platform Preferences
                </Typography>
                <Stack spacing={3.5}>
                  
                  {/* Currency */}
                  <TextField
                    select
                    label="Display Currency Preference"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    fullWidth
                  >
                    <MenuItem value="INR">INR (₹) - Indian Rupee</MenuItem>
                    <MenuItem value="USD">USD ($) - US Dollar</MenuItem>
                  </TextField>

                  <Divider />

                  {/* Openness toggles */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>Availability & Scope</Typography>
                    <Stack spacing={1.5}>
                      <FormControlLabel
                        control={<Switch checked={openFullTime} onChange={(e) => setOpenFullTime(e.target.checked)} color="primary" />}
                        label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Open to Full-Time Careers</Typography>}
                      />
                      <FormControlLabel
                        control={<Switch checked={openFreelance} onChange={(e) => setOpenFreelance(e.target.checked)} color="secondary" />}
                        label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Open to Freelance Projects</Typography>}
                      />
                    </Stack>
                  </Box>

                  <Divider />

                  {/* Notification Channels */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>Notification Preferences</Typography>
                    <Stack spacing={1.5}>
                      <FormControlLabel
                        control={<Switch checked={notifInApp} onChange={(e) => setNotifInApp(e.target.checked)} color="primary" />}
                        label={<Typography variant="body2" sx={{ fontWeight: 700 }}>In-App Header Alerts</Typography>}
                      />
                      <FormControlLabel
                        control={<Switch checked={notifEmail} onChange={(e) => setNotifEmail(e.target.checked)} color="primary" />}
                        label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Immediate Email Digests</Typography>}
                      />
                    </Stack>
                    <Alert severity="info" icon={false} sx={{ mt: 2, borderRadius: 2 }}>
                      Payment critical dispute notices cannot be disabled.
                    </Alert>
                  </Box>

                </Stack>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: BILLING & INVOICES */}
          {activeTab === 3 && (
            <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 850, mb: 3, fontFamily: 'Outfit, sans-serif' }}>
                  Billing & Fee History
                </Typography>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>Invoices & Receipts Ledger</Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Invoice ID</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell>#INV-9821</TableCell>
                            <TableCell>Profile Registration Verification Fee</TableCell>
                            <TableCell>₹1,200</TableCell>
                            <TableCell>14 Jul 2026</TableCell>
                            <TableCell>
                              <Chip label="Paid" color="success" size="small" sx={{ fontWeight: 800 }} />
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: DANGER ZONE */}
          {activeTab === 4 && (
            <Card sx={{ border: '2px solid #ef4444', borderRadius: 4, bgcolor: 'rgba(239, 68, 68, 0.02)' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 850, mb: 1, fontFamily: 'Outfit, sans-serif', color: 'error.main' }}>
                  Account Danger Zone
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Deactivating hides your profile from recruiters. Deleting is permanent and anonymizes account data.
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button variant="outlined" color="error" sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
                    Deactivate Account
                  </Button>
                  <Button variant="contained" color="error" startIcon={<DeleteForeverIcon />} onClick={() => setShowDeleteModal(true)} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
                    Delete Account Permanently
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}

        </Grid>
      </Grid>

      {/* OTP CHANGE MODAL */}
      <Dialog open={showOtpModal} onClose={() => setShowOtpModal(false)} PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Phone verification OTP</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 300 }}>
            <Typography variant="body2" color="text.secondary">
              Enter the 6-digit OTP code sent to your mobile.
            </Typography>
            <TextField
              label="OTP Code"
              placeholder="123456"
              fullWidth
              value={otpVal}
              onChange={(e) => setOtpVal(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowOtpModal(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={() => setShowOtpModal(false)} disabled={otpVal.length < 6}>
            Confirm OTP
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETION CONFIRMATION MODAL */}
      <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)} PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main' }}>Delete Account Permanently?</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 320 }}>
            <Typography variant="body2" color="text.secondary">
              Warning: This action is irreversible. All active job application tokens will be frozen.
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 1 }}>
              Type "DELETE" in the input below to confirm:
            </Typography>
            <TextField
              label="Confirm Text"
              placeholder="DELETE"
              fullWidth
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE'}>
            Confirm Deletion
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toastOpen} autoHideDuration={4000} onClose={() => setToastOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toastSeverity} sx={{ width: '100%', fontWeight: 700 }}>
          {toastMsg}
        </Alert>
      </Snackbar>
    </Container>
  );
}
