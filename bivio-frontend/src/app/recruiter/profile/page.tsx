'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Stack,
  Box,
  Button,
  Grid,
  TextField,
  MenuItem,
  Divider,
  Avatar,
  FormControlLabel,
  Switch,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  CircularProgress,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { showNotification } from '@/store/slices/notificationSlice';
import { FullPageLoader } from '@/components/common/FullPageLoader';

// Icons
import VerifiedIcon from '@mui/icons-material/Verified';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import CloseIcon from '@mui/icons-material/Close';

import {
  useGetRecruiterProfileQuery,
  useUpdateRecruiterProfileMutation,
  useUpdateCompanyMutation,
} from '@/store/api/profilesApi';

export default function RecruiterProfilePage() {
  const dispatch = useDispatch();
  const [mounted, setMounted] = useState(false);

  // --- API HOOKS ---
  const { data: profile, isLoading: isProfileLoading } = useGetRecruiterProfileQuery();
  const [updateRecruiterProfile, { isLoading: isSavingPersonal }] = useUpdateRecruiterProfileMutation();
  const [updateCompany, { isLoading: isSavingCompany }] = useUpdateCompanyMutation();

  // Core Personal Identity State
  const [fullName, setFullName] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Core Company State
  const [isSolo, setIsSolo] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('Software');
  const [description, setDescription] = useState('');

  // computed read-only stats
  const [jobsCount, setJobsCount] = useState(0);
  const [hiresCount, setHiresCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [memberSince, setMemberSince] = useState('October 2025');

  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Sync loaded database state
  useEffect(() => {
    if (profile) {
      setFullName(profile.user?.fullName || '');
      setDesignation(profile.designation || '');
      setPhone(profile.user?.phone || '');
      setProfileImage(profile.user?.profileImage || null);
      setIsSolo(profile.isSolo ?? false);
      setCompanyName(profile.company?.name || '');
      setWebsite(profile.company?.website || '');
      setIndustry(profile.company?.industry || 'Software');
      setDescription(profile.company?.description || '');

      setJobsCount(profile.jobsPostedCount || 0);
      setHiresCount(profile.hiresCount || 0);
      setAvgRating(profile.avgRating ? Number(profile.avgRating) : 0);
      
      if (profile.createdAt) {
        const dateObj = new Date(profile.createdAt);
        const formatted = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        setMemberSince(formatted);
      }
    }
  }, [profile]);

  useEffect(() => {
    setMounted(true);
    document.title = "Recruiter Profile — Bivio";
  }, []);

  if (!mounted) return null;
  if (isProfileLoading) {
    return <FullPageLoader message="Loading recruiter profile..." />;
  }

  // Live Verification States
  const idVerified = profile?.idVerified ?? false;
  const paymentVerified = profile?.paymentMethodVerified ?? false;
  const isCompanyIncomplete = !isSolo && (!companyName.trim() || !description.trim());

  const handleSavePersonal = async () => {
    if (!fullName.trim()) {
      dispatch(showNotification({ message: 'Full Name is required.', severity: 'error' }));
      return;
    }

    try {
      await updateRecruiterProfile({
        fullName: fullName.trim(),
        designation: designation.trim() || null,
        phone: phone.trim() || null,
        profileImage,
      }).unwrap();
      dispatch(showNotification({ message: 'Personal details saved successfully.', severity: 'success' }));
    } catch (err: any) {
      dispatch(showNotification({ message: err.data?.message || 'Failed to save personal details.', severity: 'error' }));
    }
  };

  const handleSaveCompany = async () => {
    if (!isSolo) {
      if (!companyName.trim()) {
        dispatch(showNotification({ message: 'Company Name is required.', severity: 'error' }));
        return;
      }
      if (!description.trim()) {
        dispatch(showNotification({ message: 'Company Description is required.', severity: 'error' }));
        return;
      }
      if (website && website.trim()) {
        try {
          new URL(website.trim());
        } catch {
          dispatch(showNotification({ message: 'Please enter a valid website URL.', severity: 'error' }));
          return;
        }
      }
    }

    try {
      // First save the isSolo toggle state on the recruiter profile
      await updateRecruiterProfile({ isSolo }).unwrap();

      // If they are not solo, save/upsert the company profile
      if (!isSolo) {
        await updateCompany({
          name: companyName.trim(),
          website: website.trim() || null,
          industry: industry || null,
          description: description.trim() || null,
        }).unwrap();
      }

      dispatch(showNotification({ message: 'Company profile saved successfully.', severity: 'success' }));
    } catch (err: any) {
      dispatch(showNotification({ message: err.data?.message || 'Failed to save company profile.', severity: 'error' }));
    }
  };

  const isSaving = isSavingPersonal || isSavingCompany;

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 855, fontFamily: 'Outfit, sans-serif', color: 'text.primary', mb: 0.5 }}>
            My Profile
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your personal recruiter profile and company identity details.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => setShowPreviewModal(true)}
          sx={{ fontWeight: 750 }}
        >
          Preview as seen by candidates
        </Button>
      </Stack>

      {/* Onboarding Incomplete Banner */}
      {isCompanyIncomplete && (
        <Alert severity="warning" sx={{ mb: 4, borderRadius: 3, fontWeight: 700 }}>
          Add your company details so candidates and freelancers know who they're working with.
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Left Column: Personal and Company Identity edit forms */}
        <Grid item xs={12} md={7.5}>
          <Stack spacing={4}>
            
            {/* Section 1: Personal Identity */}
            <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 3 }}>
                  Personal Identity
                </Typography>

                <Grid container spacing={3} alignItems="flex-start">
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 1 }}>
                    <Avatar src={profileImage || undefined} sx={{ width: 80, height: 80, bgcolor: 'primary.light', color: 'primary.dark', mb: 1 }}>
                      {!profileImage && <PersonIcon sx={{ fontSize: 40 }} />}
                    </Avatar>
                    <Button size="small" variant="text" component="label" sx={{ textTransform: 'none', fontWeight: 700 }}>
                      Change Photo
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setProfileImage(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </Button>
                  </Grid>

                  <Grid item xs={12} sm={9}>
                    <Grid container spacing={2.5}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Full Name"
                          fullWidth
                          size="small"
                          value={fullName || ''}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Designation"
                          fullWidth
                          size="small"
                          value={designation || ''}
                          onChange={(e) => setDesignation(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Email Address"
                          fullWidth
                          size="small"
                          value={profile?.user?.email || ''}
                          disabled
                          helperText="Registered account email (Read-only)"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Phone Number"
                          fullWidth
                          size="small"
                          value={phone || ''}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Stack direction="row" justifyContent="flex-end" alignItems="center">
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={isSaving}
                    onClick={handleSavePersonal}
                    startIcon={isSavingPersonal ? <CircularProgress size={20} color="inherit" /> : null}
                    sx={{ fontWeight: 800 }}
                  >
                    {isSavingPersonal ? 'Saving...' : 'Save Personal Details'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* Section 2: Company */}
            <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ p: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    Company Profile
                  </Typography>
                  <FormControlLabel
                    control={<Switch checked={isSolo} onChange={(e) => setIsSolo(e.target.checked)} />}
                    label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Solo Recruiter (No company)</Typography>}
                  />
                </Stack>

                {isSolo ? (
                  <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                    Individual Recruiter: Trust badges and job postings will be listed directly under your personal recruiter identity: <strong>{fullName || 'Priya Menon'}</strong>.
                  </Alert>
                ) : (
                  <Grid container spacing={2.5}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Company Name"
                        required
                        fullWidth
                        size="small"
                        value={companyName || ''}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Website"
                        fullWidth
                        size="small"
                        value={website || ''}
                        onChange={(e) => setWebsite(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        label="Industry"
                        fullWidth
                        size="small"
                        value={industry || 'Software'}
                        onChange={(e) => setIndustry(e.target.value)}
                        sx={{ fontWeight: 700 }}
                      >
                        <MenuItem value="Software">Software &amp; Tech</MenuItem>
                        <MenuItem value="Finance">Finance &amp; Banking</MenuItem>
                        <MenuItem value="AI/ML">Artificial Intelligence</MenuItem>
                        <MenuItem value="Healthcare">Healthcare</MenuItem>
                        <MenuItem value="Education">Education</MenuItem>
                        <MenuItem value="Other">Other</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center', height: '40px', mt: 0.5 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                          TRUST BADGE:
                        </Typography>
                        {idVerified ? (
                          <Chip icon={<VerifiedIcon />} label="Identity Verified" color="success" size="small" sx={{ fontWeight: 800 }} />
                        ) : paymentVerified ? (
                          <Chip icon={<VerifiedIcon />} label="Payment Verified" color="primary" size="small" sx={{ fontWeight: 800 }} />
                        ) : (
                          <Chip label="Unverified" variant="outlined" size="small" sx={{ fontWeight: 800 }} />
                        )}
                      </Stack>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Company Description"
                        required
                        multiline
                        rows={4}
                        fullWidth
                        value={description || ''}
                        onChange={(e) => setDescription(e.target.value)}
                        helperText="This overview description is shown to candidates looking at your jobs."
                      />
                    </Grid>
                  </Grid>
                )}

                <Divider sx={{ my: 3 }} />

                <Stack direction="row" justifyContent="flex-end" alignItems="center">
                  <Button
                    variant="contained"
                    color="secondary"
                    disabled={isSaving}
                    onClick={handleSaveCompany}
                    startIcon={isSavingCompany ? <CircularProgress size={20} color="inherit" /> : null}
                    sx={{ fontWeight: 800 }}
                  >
                    {isSavingCompany ? 'Saving...' : 'Save Company Details'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>

          </Stack>
        </Grid>

        {/* Right Column: Hiring Stats Panel */}
        <Grid item xs={12} md={4.5}>
          <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 3 }}>
                Hiring Statistics
              </Typography>

              <Stack spacing={2.5}>
                {/* Total jobs */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>TOTAL JOBS POSTED</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5 }}>{jobsCount} jobs</Typography>
                </Box>

                <Divider />

                {/* Hires made */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>TOTAL HIRES MADE</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5 }}>{hiresCount} hires</Typography>
                </Box>

                <Divider />

                {/* Rating */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>AVERAGE CANDIDATE RATING GIVEN</Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                    <StarIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{avgRating} Stars</Typography>
                  </Stack>
                </Box>

                <Divider />

                {/* Member since */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>MEMBER SINCE</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.5 }}>{memberSince}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* PREVIEW AS CANDIDATE DIALOG */}
      <Dialog open={showPreviewModal} onClose={() => setShowPreviewModal(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Candidate Perspective Preview
          <IconButton onClick={() => setShowPreviewModal(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 3 }}>
          <Stack spacing={3}>
            {/* Header info */}
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar src={(isSolo ? profileImage : profile?.company?.logoUrl) || undefined} sx={{ bgcolor: 'secondary.light', color: 'secondary.dark', width: 52, height: 52, fontWeight: 800 }}>
                {isSolo ? (fullName?.[0]?.toUpperCase() || 'R') : (companyName?.[0]?.toUpperCase() || 'C')}
              </Avatar>
              <Box>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {isSolo ? fullName : companyName}
                  </Typography>
                  {idVerified ? (
                    <VerifiedIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                  ) : paymentVerified ? (
                    <VerifiedIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
                  ) : null}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {isSolo ? `${designation || 'Recruiter'} · Individual` : `${industry || 'Software'} Industry · ${website || ''}`}
                </Typography>
              </Box>
            </Stack>

            <Divider />

            {/* Description */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 1 }}>
                ABOUT THE COMPANY / RECRUITER
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                {isSolo 
                  ? `${fullName} is an active individual talent coordinator specializing in recruitment support.`
                  : description
                }
              </Typography>
            </Box>

            <Divider />

            {/* Public Stats */}
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">HIRES MADE</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>{hiresCount} hires</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">AVG RATING GIVEN</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>{avgRating} Stars</Typography>
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowPreviewModal(false)} variant="contained" sx={{ fontWeight: 800 }}>
            Close Preview
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
