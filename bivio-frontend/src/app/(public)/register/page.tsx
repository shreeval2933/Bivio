'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Container, Card, CardContent, Typography, TextField, Button,
  Stack, Alert, ToggleButton, ToggleButtonGroup, Box,
  Divider, Grid,
} from '@mui/material';
import ForkRightIcon from '@mui/icons-material/ForkRight';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import { useRegisterMutation, useGoogleLoginMutation } from '@/store/api/authApi';
import { useGetPublicSettingsQuery } from '@/store/api/profilesApi';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setCredentials } from '@/store/slices/authSlice';
import { GoogleMockPopup } from '@/components/common/GoogleMockPopup';

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data: publicSettings } = useGetPublicSettingsQuery();
  const registrationsOpen = publicSettings?.FEATURE_REGISTRATIONS_OPEN ?? true;
  const [register, { isLoading, isError }] = useRegisterMutation();
  const [googleLogin, { isLoading: isGoogleLoading }] = useGoogleLoginMutation();

  const [role, setRole] = useState<'CANDIDATE' | 'RECRUITER'>('CANDIDATE');
  const [fullName, setFullName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [googleOpen, setGoogleOpen] = useState(false);

  const handleGoogleSelect = async (credential: string) => {
    try {
      const result = await googleLogin({ credential, role }).unwrap();
      dispatch(setCredentials(result));
      const HOME_BY_ROLE = {
        CANDIDATE: '/dashboard',
        RECRUITER: '/recruiter/dashboard',
        ADMIN: '/admin/dashboard',
      };
      router.push(HOME_BY_ROLE[result.user.role]);
    } catch (err: any) {
      console.warn('Google login failed:', err);
    }
  };

  // Recruiter fields
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    try {
      const finalName = role === 'CANDIDATE' ? `${firstName} ${lastName}`.trim() : fullName;
      const result = await register({
        fullName: finalName,
        email,
        password,
        role,
        ...(role === 'RECRUITER' ? { jobTitle, companyName, contactNumber } : {}),
      }).unwrap();
      dispatch(setCredentials(result));
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      // Handled by API state
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 8, md: 10 } }}>
      <Card>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <ForkRightIcon sx={{ color: 'primary.main', fontSize: 32 }} />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Create your account
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            One profile, two roads — apply for full-time roles or bid on freelance projects.
          </Typography>

          {!registrationsOpen && (
            <Alert severity="warning" sx={{ mb: 2, fontWeight: 700 }}>
              New account registrations are temporarily closed by platform administration.
            </Alert>
          )}

          {(isError || validationError) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {validationError || 'Registration failed. Please try again.'}
            </Alert>
          )}

          <Stack component="form" spacing={2} onSubmit={submit}>
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={role}
              onChange={(_e, v) => {
                if (v) {
                  setRole(v);
                  setValidationError('');
                }
              }}
            >
              <ToggleButton value="CANDIDATE">
                <PersonSearchIcon sx={{ mr: 1 }} fontSize="small" />
                I&apos;m looking for work
              </ToggleButton>
              <ToggleButton value="RECRUITER">
                <BusinessCenterIcon sx={{ mr: 1 }} fontSize="small" />
                I&apos;m hiring
              </ToggleButton>
            </ToggleButtonGroup>

            {role === 'CANDIDATE' ? (
              <>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    fullWidth
                    required
                  />
                </Stack>
                <TextField
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  helperText="At least 8 characters"
                  fullWidth
                  required
                />
                <TextField
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  fullWidth
                  required
                />
              </>
            ) : (
              <>
                <TextField
                  label="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label="Corporate Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label="Job Title / Role"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label="Company Name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label="Contact Number"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  helperText="At least 8 characters"
                  fullWidth
                  required
                />
                <TextField
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  fullWidth
                  required
                />
              </>
            )}

            <Button type="submit" variant="contained" size="large" disabled={isLoading || !registrationsOpen}>
              {isLoading ? 'Creating account…' : 'Get Started'}
            </Button>
          </Stack>

          {role === 'CANDIDATE' && (
            <>
              <Divider sx={{ my: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  or continue with
                </Typography>
              </Divider>
              <Button
                variant="outlined"
                color="inherit"
                fullWidth
                onClick={() => setGoogleOpen(true)}
                disabled={isGoogleLoading || !registrationsOpen}
                startIcon={
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
                    <path d="M9 18C11.43 18 13.4673 17.1941 14.9577 15.8195L12.0491 13.5614C11.2418 14.1027 10.2109 14.4273 9 14.4273C6.65591 14.4273 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
                    <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                    <path d="M9 3.57273C10.3214 3.57273 11.5077 4.02955 12.4405 4.92136L15.0218 2.34C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57273 9 3.57273Z" fill="#EA4335"/>
                  </svg>
                }
                sx={{
                  borderColor: 'divider',
                  fontWeight: 600,
                  py: 1.25,
                  '&:hover': {
                    bgcolor: '#f8fafc',
                    borderColor: 'text.secondary',
                  },
                }}
              >
                {isGoogleLoading ? 'Connecting…' : 'Sign up with Google'}
              </Button>
            </>
          )}

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link href="/login" style={{ fontWeight: 700 }}>
                Log in
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
      <GoogleMockPopup
        open={googleOpen}
        onClose={() => setGoogleOpen(false)}
        onSelect={handleGoogleSelect}
      />
    </Container>
  );
}
