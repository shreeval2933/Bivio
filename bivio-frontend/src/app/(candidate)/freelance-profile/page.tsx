'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Stack,
  Chip,
  Avatar,
  Divider,
  Switch,
  MenuItem,
  IconButton,
  Rating,
  CircularProgress,
  Autocomplete,
  Dialog,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { showNotification } from '@/store/slices/notificationSlice';
import { FullPageLoader } from '@/components/common/FullPageLoader';
import {
  useGetCandidateProfileQuery,
  useUpdateCandidateProfileMutation,
  useSavePortfolioMutation,
  useAddPortfolioProjectMutation,
  useUpdatePortfolioProjectMutation,
  useDeletePortfolioProjectMutation,
  useAddFreelanceServiceMutation,
  useUpdateFreelanceServiceMutation,
  useDeleteFreelanceServiceMutation,
  useGetPortfolioReviewsQuery,
  useGetSkillsQuery,
} from '@/store/api/profilesApi';

// Icons
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SecurityIcon from '@mui/icons-material/Security';
import StarIcon from '@mui/icons-material/Star';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';

// Interfaces
interface PortfolioProject {
  id: string; // database UUID or temporary mock/new id
  title: string;
  coverImage: string | null;
  role: string;
  description: string;
  skills: string[];
  liveUrl?: string;
  repoUrl?: string;
  clientName?: string;
  keepPrivate: boolean;
  timeframeStart: string;
  timeframeEnd: string;
  featured: boolean;
}

interface ServiceOffer {
  id: string;
  title: string;
  description: string;
  startingPrice: string;
  deliveryTime: string;
  skills: string[];
}

export default function FreelanceProfilePage() {
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = "Freelance Profile — Bivio";
  }, []);

  // --- API HOOKS ---
  const { data: profile, isLoading: isProfileLoading } = useGetCandidateProfileQuery();
  const [updateCandidateProfile, { isLoading: isUpdatingProfile }] = useUpdateCandidateProfileMutation();
  const [savePortfolio, { isLoading: isSavingPortfolio }] = useSavePortfolioMutation();
  
  const [addProject] = useAddPortfolioProjectMutation();
  const [updateProject] = useUpdatePortfolioProjectMutation();
  const [deleteProject] = useDeletePortfolioProjectMutation();

  const [addService] = useAddFreelanceServiceMutation();
  const [updateService] = useUpdateFreelanceServiceMutation();
  const [deleteService] = useDeleteFreelanceServiceMutation();

  const { data: dbReviews } = useGetPortfolioReviewsQuery();

  const [skillSearch, setSkillSearch] = useState('');
  const [skillMap, setSkillMap] = useState<Record<string, string>>({});
  const { data: skillsSuggestions, isLoading: isSkillsLoading } = useGetSkillsQuery(skillSearch, {
    skip: skillSearch.length < 2,
  });

  // --- GATING STATE ---
  const openToFreelance = profile?.openToFreelance ?? false;

  // --- LOCAL STATES ---
  const [freelanceBio, setFreelanceBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('0');
  const [currency, setCurrency] = useState('INR');
  const [engagement, setEngagement] = useState({
    fixed: true,
    hourly: true,
    retainer: false,
  });
  const [availableFrom, setAvailableFrom] = useState('');
  const [capacity, setCapacity] = useState('20–40 hrs/week');
  const [currentlyAvailable, setCurrentlyAvailable] = useState(true);
  const [hideEarnings, setHideEarnings] = useState(false);

  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [services, setServices] = useState<ServiceOffer[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Sync loaded database state
  useEffect(() => {
    if (profile?.portfolio) {
      const port = profile.portfolio;
      setFreelanceBio(port.bio || '');
      setHourlyRate(port.hourlyRate?.toString() || '0');
      setCurrency(port.currency || 'INR');

      const fixed = port.preferredEngagement?.includes('FIXED') ?? false;
      const hourly = port.preferredEngagement?.includes('HOURLY') ?? false;
      const retainer = port.preferredEngagement?.includes('RETAINER') ?? false;
      setEngagement({ fixed, hourly, retainer });

      setAvailableFrom(port.availableFrom ? port.availableFrom.substring(0, 10) : '');

      const capacityMap: Record<string, string> = {
        UNDER_10: 'Under 10 hrs/week',
        H10_20: '10–20 hrs/week',
        H20_40: '20–40 hrs/week',
        FULL_TIME: 'Full-time (>40 hrs/week)'
      };
      setCapacity(capacityMap[port.weeklyCapacity || ''] || '20–40 hrs/week');
      setCurrentlyAvailable(port.isAvailable ?? true);
      setHideEarnings(port.hideEarnings ?? false);

      // Populate existing skill name -> skillId mappings
      const initialMap: Record<string, string> = {};
      if (port.projects) {
        port.projects.forEach((proj: any) => {
          proj.skills?.forEach((ps: any) => {
            if (ps.skill) {
              initialMap[ps.skill.name] = ps.skillId;
            }
          });
        });
        setProjects(port.projects.map((p: any) => ({
          id: p.id,
          title: p.title,
          coverImage: p.coverImageUrl || null,
          role: p.role || '',
          description: p.description || '',
          skills: p.skills?.map((ps: any) => ps.skill?.name) || [],
          liveUrl: p.liveUrl || '',
          repoUrl: p.repositoryUrl || '',
          clientName: p.clientName || '',
          keepPrivate: p.clientNamePrivate || false,
          timeframeStart: p.startedOn ? p.startedOn.substring(0, 7) : '',
          timeframeEnd: p.completedOn ? p.completedOn.substring(0, 7) : '',
          featured: p.isFeatured || false,
        })));
      }

      if (port.services) {
        port.services.forEach((serv: any) => {
          serv.skills?.forEach((ss: any) => {
            if (ss.skill) {
              initialMap[ss.skill.name] = ss.skillId;
            }
          });
        });
        setServices(port.services.map((s: any) => ({
          id: s.id,
          title: s.title,
          description: s.description || '',
          startingPrice: s.startingPrice?.toString() || '',
          deliveryTime: s.deliveryTime || '',
          skills: s.skills?.map((ss: any) => ss.skill?.name) || [],
        })));
      }
      setSkillMap(prev => ({ ...prev, ...initialMap }));
    }
  }, [profile]);

  const isSaving = isUpdatingProfile || isSavingPortfolio;

  const handleActivateFreelance = async () => {
    try {
      await updateCandidateProfile({ openToFreelance: true }).unwrap();
      dispatch(
        showNotification({
          message: 'Freelance portal activated successfully!',
          severity: 'success',
        })
      );
    } catch (err: any) {
      dispatch(
        showNotification({
          message: err.data?.message || 'Failed to activate freelance portal.',
          severity: 'error',
        })
      );
    }
  };

  // --- ACTIONS ---
  const handleAddProject = () => {
    const newProj: PortfolioProject = {
      id: `new-${Date.now()}`,
      title: '',
      coverImage: null,
      role: '',
      description: '',
      skills: [],
      clientName: '',
      keepPrivate: false,
      timeframeStart: '',
      timeframeEnd: '',
      featured: false,
    };
    setProjects([...projects, newProj]);
  };

  const handleUpdateProject = (id: string, field: keyof PortfolioProject, value: any) => {
    setProjects(
      projects.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleAddProjectSkill = (projId: string, skillName: string) => {
    if (skillName.trim()) {
      setProjects(
        projects.map((p) => {
          if (p.id === projId && !p.skills.includes(skillName)) {
            return { ...p, skills: [...p.skills, skillName] };
          }
          return p;
        })
      );
    }
  };

  const handleAddService = () => {
    setServices([
      ...services,
      {
        id: `new-${Date.now()}`,
        title: '',
        description: '',
        startingPrice: '',
        deliveryTime: '',
        skills: [],
      },
    ]);
  };

  const handleUpdateService = (id: string, field: keyof ServiceOffer, value: any) => {
    setServices(
      services.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleAddServiceSkill = (serviceId: string, skillName: string) => {
    if (skillName.trim()) {
      setServices(
        services.map((s) => {
          if (s.id === serviceId && !s.skills.includes(skillName)) {
            return { ...s, skills: [...s.skills, skillName] };
          }
          return s;
        })
      );
    }
  };

  const moveProject = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= projects.length) return;

    const updated = [...projects];
    const temp = updated[index];
    updated[index] = updated[nextIndex];
    updated[nextIndex] = temp;
    setProjects(updated);
  };

  const getSkillId = (name: string): string | null => {
    const found = profile?.skills?.find((s: any) => s.skill?.name === name);
    if (found) return found.skillId;
    return skillMap[name] || null;
  };

  // --- SAVE ---
  const handleSave = async () => {
    // 1. Validation
    if (!freelanceBio.trim()) {
      dispatch(showNotification({ message: 'Bio / Summary is required.', severity: 'error' }));
      return;
    }
    if (Number(hourlyRate) <= 0 || isNaN(Number(hourlyRate))) {
      dispatch(showNotification({ message: 'Hourly Rate must be a positive number.', severity: 'error' }));
      return;
    }
    const preferredEngagement: string[] = [];
    if (engagement.fixed) preferredEngagement.push('FIXED');
    if (engagement.hourly) preferredEngagement.push('HOURLY');
    if (engagement.retainer) preferredEngagement.push('RETAINER');

    if (preferredEngagement.length === 0) {
      dispatch(showNotification({ message: 'Please select at least one preferred engagement model.', severity: 'error' }));
      return;
    }

    // Verify Projects
    for (const p of projects) {
      if (!p.title.trim()) {
        dispatch(showNotification({ message: 'All projects must have a title.', severity: 'error' }));
        return;
      }
      if (!p.description.trim() || p.description.trim().length < 30) {
        dispatch(showNotification({ message: `Project description for "${p.title}" must be at least 30 characters.`, severity: 'error' }));
        return;
      }
      if (!p.timeframeStart || !p.timeframeEnd) {
        dispatch(showNotification({ message: `Start and End dates are required for project "${p.title}".`, severity: 'error' }));
        return;
      }
      if (p.liveUrl && p.liveUrl.trim()) {
        try { new URL(p.liveUrl.trim()); } catch {
          dispatch(showNotification({ message: `Invalid Live App URL for "${p.title}".`, severity: 'error' }));
          return;
        }
      }
      if (p.repoUrl && p.repoUrl.trim()) {
        try { new URL(p.repoUrl.trim()); } catch {
          dispatch(showNotification({ message: `Invalid Repository URL for "${p.title}".`, severity: 'error' }));
          return;
        }
      }
      if (new Date(p.timeframeStart) > new Date(p.timeframeEnd)) {
        dispatch(showNotification({ message: `End Date cannot be before Start Date for "${p.title}".`, severity: 'error' }));
        return;
      }
      if (p.skills.length === 0) {
        dispatch(showNotification({ message: `Please tag at least one skill for project "${p.title}".`, severity: 'error' }));
        return;
      }
    }

    // Verify Services
    for (const s of services) {
      if (!s.title.trim()) {
        dispatch(showNotification({ message: 'All services must have a title.', severity: 'error' }));
        return;
      }
      if (!s.deliveryTime.trim()) {
        dispatch(showNotification({ message: `Delivery time is required for service "${s.title}".`, severity: 'error' }));
        return;
      }
      if (!s.description.trim() || s.description.trim().length < 30) {
        dispatch(showNotification({ message: `Service description for "${s.title}" must be at least 30 characters.`, severity: 'error' }));
        return;
      }
      if (Number(s.startingPrice) <= 0 || isNaN(Number(s.startingPrice))) {
        dispatch(showNotification({ message: `Starting price for "${s.title}" must be a positive number.`, severity: 'error' }));
        return;
      }
      if (s.skills.length === 0) {
        dispatch(showNotification({ message: `Please tag at least one skill for service "${s.title}".`, severity: 'error' }));
        return;
      }
    }

    const capacityMap: Record<string, string> = {
      'Under 10 hrs/week': 'UNDER_10',
      '10–20 hrs/week': 'H10_20',
      '20–40 hrs/week': 'H20_40',
      'Full-time (>40 hrs/week)': 'FULL_TIME'
    };

    try {
      // 1. Save Core Portfolio Settings
      await savePortfolio({
        bio: freelanceBio,
        hourlyRate: Number(hourlyRate),
        currency,
        preferredEngagement,
        availableFrom: availableFrom ? new Date(availableFrom).toISOString() : undefined,
        weeklyCapacity: capacityMap[capacity] || 'H20_40',
        isAvailable: currentlyAvailable,
        hideEarnings,
      }).unwrap();

      // 2. Sync Projects
      const dbProjects = profile?.portfolio?.projects || [];
      const projectIdsToKeep = new Set(projects.map(p => p.id).filter(id => !id.startsWith('new-')));
      
      // Delete old projects
      for (const dbProj of dbProjects) {
        if (!projectIdsToKeep.has(dbProj.id)) {
          await deleteProject(dbProj.id).unwrap();
        }
      }

      // Add & Update projects
      for (let idx = 0; idx < projects.length; idx++) {
        const p = projects[idx];
        const skillIds = p.skills.map(name => getSkillId(name)).filter(Boolean) as string[];
        const payload = {
          title: p.title,
          coverImageUrl: p.coverImage || null,
          role: p.role || undefined,
          description: p.description || undefined,
          repositoryUrl: p.repoUrl || null,
          liveUrl: p.liveUrl || null,
          clientName: p.clientName || undefined,
          clientNamePrivate: p.keepPrivate,
          startedOn: p.timeframeStart ? new Date(p.timeframeStart + '-02').toISOString() : null,
          completedOn: p.timeframeEnd ? new Date(p.timeframeEnd + '-02').toISOString() : null,
          isFeatured: p.featured,
          displayOrder: idx,
          skillIds,
        };

        if (p.id.startsWith('new-')) {
          await addProject(payload).unwrap();
        } else {
          await updateProject({ id: p.id, body: payload }).unwrap();
        }
      }

      // 3. Sync Services
      const dbServices = profile?.portfolio?.services || [];
      const serviceIdsToKeep = new Set(services.map(s => s.id).filter(id => !id.startsWith('new-')));

      // Delete old services
      for (const dbServ of dbServices) {
        if (!serviceIdsToKeep.has(dbServ.id)) {
          await deleteService(dbServ.id).unwrap();
        }
      }

      // Add & Update services
      for (const s of services) {
        const skillIds = s.skills.map(name => getSkillId(name)).filter(Boolean) as string[];
        const payload = {
          title: s.title,
          description: s.description || '',
          startingPrice: Number(s.startingPrice),
          deliveryTime: s.deliveryTime,
          skillIds,
        };

        if (s.id.startsWith('new-')) {
          await addService(payload).unwrap();
        } else {
          await updateService({ id: s.id, body: payload }).unwrap();
        }
      }

      dispatch(
        showNotification({
          message: 'Freelance Profile saved successfully! Buyer portals synchronized.',
          severity: 'success',
        })
      );
    } catch (err: any) {
      dispatch(
        showNotification({
          message: err.data?.message || 'Error updating freelance profile details.',
          severity: 'error',
        })
      );
    }
  };

  // --- GATING CONTAINER RENDER ---
  if (isProfileLoading) {
    return <FullPageLoader message="Loading profile data..." />;
  }

  if (!openToFreelance) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Card
          sx={{
            textAlign: 'center',
            p: 6,
            border: '1.5px solid',
            borderColor: 'divider',
            borderRadius: 4,
            boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
          }}
        >
          <Box sx={{ color: 'secondary.main', mb: 3 }}>
            <SecurityIcon sx={{ fontSize: 64 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, fontFamily: 'Outfit, sans-serif' }}>
            Freelance Profile is Gated
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
            Your freelance profile is currently hidden from search indexes because "Open to freelance projects" is turned off. Toggle it back on below to setup your commercial terms and portfolio.
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={handleActivateFreelance}
            disabled={isUpdatingProfile}
            sx={{ px: 4, py: 1.5, borderRadius: 2.5, fontWeight: 700 }}
          >
            {isUpdatingProfile ? 'Activating...' : 'Activate Freelance Profile Portal'}
          </Button>
        </Card>
      </Container>
    );
  }

  // TESTIMONIALS MOCK
  const ratingsStats = {
    rating: 4.9,
    contractsCount: 18,
    totalEarned: '12,50,000',
    responseTime: '1.5 hours',
    testimonials: [
      { id: 't1', client: 'Sarah Jenkins (Tech Lead, NexaCorp)', review: "Alex delivered the design system audit ahead of schedule. Excellent code quality and attention to component detail.", rating: 5 },
      { id: 't2', client: 'Vikram Mehta (CTO, SpeedyRun)', review: "Extremely reliable integration of real-time maps. Communicates clearly and resolves complex WebSocket edge cases efficiently.", rating: 5 },
    ],
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 850, fontFamily: 'Outfit, sans-serif', mb: 1, color: 'secondary.main' }}>
            Setup Freelance Desk
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure your commercial terms, Fiverr-style services, and sort your portfolio projects.
          </Typography>
        </Box>

        {/* Portal Activation status switch */}
        <Card sx={{ border: '1px solid #f1f5f9', borderRadius: 3, boxShadow: 'none', px: 2, py: 0.5 }}>
          <FormControlLabel
            control={
              <Switch
                checked={openToFreelance}
                disabled={isUpdatingProfile}
                onChange={async (e) => {
                  try {
                    await updateCandidateProfile({ openToFreelance: e.target.checked }).unwrap();
                    dispatch(
                      showNotification({
                        message: e.target.checked ? 'Freelance portal activated!' : 'Freelance portal deactivated!',
                        severity: 'success',
                      })
                    );
                  } catch (err: any) {
                    dispatch(
                      showNotification({
                        message: err.data?.message || 'Failed to update freelance status.',
                        severity: 'error',
                      })
                    );
                  }
                }}
                color="secondary"
              />
            }
            label={
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                Profile Visible in Search
              </Typography>
            }
          />
        </Card>
      </Box>

      <Grid container spacing={4}>
        {/* LEFT COLUMN: Sections navigation + Stats */}
        <Grid item xs={12} md={3.5}>
          <Stack spacing={3} sx={{ position: 'sticky', top: 90 }}>
            <Card sx={{ border: '1px solid #f1f5f9', borderRadius: 4, boxShadow: 'none' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" sx={{ px: 2, mb: 1, fontWeight: 800, color: 'text.secondary' }}>
                  Quick Nav & Stats
                </Typography>
                <Stack spacing={1} sx={{ mb: 3 }}>
                  <Button variant="text" color="inherit" fullWidth sx={{ justifyContent: 'flex-start', textAlign: 'left', fontWeight: 600 }} href="#commercial">
                    1. Commercial Terms
                  </Button>
                  <Button variant="text" color="inherit" fullWidth sx={{ justifyContent: 'flex-start', textAlign: 'left', fontWeight: 600 }} href="#portfolio">
                    2. Portfolio Projects ({projects.length})
                  </Button>
                  <Button variant="text" color="inherit" fullWidth sx={{ justifyContent: 'flex-start', textAlign: 'left', fontWeight: 600 }} href="#services">
                    3. Service Packages ({services.length})
                  </Button>
                </Stack>
                <Divider sx={{ mb: 2 }} />

                {/* Gigs & Ratings Summary */}
                <Typography variant="subtitle2" sx={{ px: 2, mb: 1.5, fontWeight: 800 }}>
                  Freelance Health
                </Typography>
                <Stack spacing={1.5} sx={{ px: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Avg. Rating</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <StarIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {profile?.portfolio?.avgRating ? Number(profile.portfolio.avgRating).toFixed(1) : '0.0'}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Completed Contracts</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {profile?.portfolio?.totalContracts || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Total Earnings</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      ₹{profile?.portfolio?.totalEarned ? Number(profile.portfolio.totalEarned).toLocaleString() : '0'}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* RIGHT COLUMN: Setup Forms */}
        <Grid item xs={12} md={8.5}>
          <Stack spacing={4}>
            {/* SECTION 1: COMMERCIAL TERMS */}
            <Card id="commercial" sx={{ scrollMarginTop: '100px' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, fontFamily: 'Outfit, sans-serif' }}>
                  Section 1 — Commercial Terms
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Define your billing currency, rates, weekly bandwidth, and search availability settings.
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      label="Freelance Pitch / Bio"
                      multiline
                      required
                      rows={3}
                      fullWidth
                      inputProps={{ maxLength: 1500 }}
                      helperText="State your technical focus, delivery commitments, and past client successes. (Max 1500 chars)"
                      value={freelanceBio}
                      onChange={(e) => setFreelanceBio(e.target.value)}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Hourly Rate"
                      type="number"
                      required
                      fullWidth
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Currency"
                      select
                      fullWidth
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      <MenuItem value="INR">INR (₹)</MenuItem>
                      <MenuItem value="USD">USD ($)</MenuItem>
                      <MenuItem value="EUR">EUR (€)</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Weekly Bandwidth"
                      select
                      fullWidth
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                    >
                      <MenuItem value="Under 10 hrs/week">Under 10 hrs/week</MenuItem>
                      <MenuItem value="10–20 hrs/week">10–20 hrs/week</MenuItem>
                      <MenuItem value="20–40 hrs/week">20–40 hrs/week</MenuItem>
                      <MenuItem value="Full-time (>40 hrs/week)">Full-time (&gt;40 hrs/week)</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Earliest Availability Date"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={availableFrom}
                      onChange={(e) => setAvailableFrom(e.target.value)}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 3 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={currentlyAvailable}
                            onChange={(e) => setCurrentlyAvailable(e.target.checked)}
                            color="secondary"
                          />
                        }
                        label={
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            Currently Available (Accepting Offers)
                          </Typography>
                        }
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <InfoIcon fontSize="inherit" /> Will automatically toggle off when an active contract is in progress.
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: 3 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                        Preferred Engagement Models
                      </Typography>
                      <Stack direction="row" spacing={3}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={engagement.fixed}
                              onChange={(e) => setEngagement({ ...engagement, fixed: e.target.checked })}
                              color="secondary"
                            />
                          }
                          label="Fixed Price Milestones"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={engagement.hourly}
                              onChange={(e) => setEngagement({ ...engagement, hourly: e.target.checked })}
                              color="secondary"
                            />
                          }
                          label="Hourly Logged Hours"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={engagement.retainer}
                              onChange={(e) => setEngagement({ ...engagement, retainer: e.target.checked })}
                              color="secondary"
                            />
                          }
                          label="Monthly Retainer"
                        />
                      </Stack>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* SECTION 2: PORTFOLIO PROJECTS */}
            <Card id="portfolio" sx={{ scrollMarginTop: '100px' }}>
              <CardContent sx={{ p: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
                    Section 2 — Portfolio Projects
                  </Typography>
                  <Button variant="outlined" color="secondary" startIcon={<AddIcon />} onClick={handleAddProject} size="small">
                    Add Project
                  </Button>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Proof of past work. Cover images and private client options are fully supported.
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Stack spacing={3}>
                  {projects.map((p, index) => (
                    <Box
                      key={p.id}
                      sx={{
                        p: 3,
                        borderRadius: 3.5,
                        border: '1.5px solid',
                        borderColor: p.featured ? 'secondary.light' : 'divider',
                        bgcolor: p.featured ? 'rgba(13, 148, 136, 0.01)' : 'transparent',
                        position: 'relative',
                      }}
                    >
                      {/* Entry Header: Reordering + Remove button */}
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                            Project Entry #{index + 1}
                          </Typography>
                          <IconButton size="small" onClick={() => moveProject(index, 'up')} disabled={index === 0}>
                            <ArrowUpwardIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => moveProject(index, 'down')} disabled={index === projects.length - 1}>
                            <ArrowDownwardIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                        <Button
                          onClick={() => setProjects(projects.filter((x) => x.id !== p.id))}
                          color="error"
                          size="small"
                          startIcon={<DeleteIcon />}
                          sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                          Remove
                        </Button>
                      </Stack>

                      <Grid container spacing={2.5}>
                        <Grid item xs={12} sm={8}>
                          <Stack spacing={2}>
                            <TextField
                              label="Project Title"
                              required
                              size="small"
                              fullWidth
                              value={p.title || ''}
                              onChange={(e) => handleUpdateProject(p.id, 'title', e.target.value)}
                            />
                            <TextField
                              label="Your Role"
                              placeholder="e.g. Lead Frontend Engineer"
                              size="small"
                              fullWidth
                              value={p.role || ''}
                              onChange={(e) => handleUpdateProject(p.id, 'role', e.target.value)}
                            />
                          </Stack>
                        </Grid>
                        {/* Cover Image Upload */}
                        <Grid item xs={12} sm={4} sx={{ display: 'flex' }}>
                          <Box
                            sx={{
                              p: 1.5,
                              borderRadius: 3,
                              border: '1.5px dashed',
                              borderColor: p.coverImage ? 'secondary.main' : '#e2e8f0',
                              textAlign: 'center',
                              bgcolor: 'background.default',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minHeight: 110,
                              width: '100%',
                              height: '100%',
                              position: 'relative',
                              overflow: 'hidden',
                              background: p.coverImage ? `linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)), url(${p.coverImage})` : 'none',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          >
                            {!p.coverImage ? (
                              <>
                                <CloudUploadIcon color="secondary" sx={{ mb: 0.5 }} />
                                <Button size="small" component="label">
                                  Upload Cover
                                  <input
                                    type="file"
                                    hidden
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                          handleUpdateProject(p.id, 'coverImage', reader.result as string);
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                </Button>
                                <Typography variant="caption" color="text.secondary">
                                  Optional
                                </Typography>
                              </>
                            ) : (
                              <>
                                <Stack direction="column" spacing={0.75} sx={{ zIndex: 1, width: '85%' }}>
                                  <Button
                                    size="small"
                                    onClick={() => setLightboxImage(p.coverImage)}
                                    startIcon={<VisibilityIcon />}
                                    sx={{ bgcolor: 'rgba(255,255,255,0.95)', '&:hover': { bgcolor: '#fff' }, backdropFilter: 'blur(2px)', color: 'text.primary', textTransform: 'none', fontWeight: 700, width: '100%', fontSize: '0.75rem', py: 0.5 }}
                                  >
                                    Preview
                                  </Button>
                                  <Button
                                    size="small"
                                    component="label"
                                    sx={{ bgcolor: 'rgba(255,255,255,0.95)', '&:hover': { bgcolor: '#fff' }, backdropFilter: 'blur(2px)', color: 'text.primary', textTransform: 'none', fontWeight: 700, width: '100%', fontSize: '0.75rem', py: 0.5 }}
                                  >
                                    Change
                                    <input
                                      type="file"
                                      hidden
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            handleUpdateProject(p.id, 'coverImage', reader.result as string);
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                  </Button>
                                  <Button
                                    size="small"
                                    color="error"
                                    onClick={() => handleUpdateProject(p.id, 'coverImage', null)}
                                    startIcon={<DeleteIcon />}
                                    sx={{ bgcolor: 'rgba(254,226,226,0.95)', '&:hover': { bgcolor: 'rgb(254,202,202)' }, backdropFilter: 'blur(2px)', textTransform: 'none', fontWeight: 700, width: '100%', fontSize: '0.75rem', py: 0.5 }}
                                  >
                                    Remove
                                  </Button>
                                </Stack>
                              </>
                            )}
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            label="Project Description"
                            multiline
                            rows={4}
                            fullWidth
                            inputProps={{ maxLength: 1500 }}
                            helperText="Describe the Problem → Approach → Outcome (Max 1500 chars)"
                            value={p.description || ''}
                            onChange={(e) => handleUpdateProject(p.id, 'description', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Live App URL"
                            size="small"
                            fullWidth
                            value={p.liveUrl || ''}
                            onChange={(e) => handleUpdateProject(p.id, 'liveUrl', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Repository URL"
                            size="small"
                            fullWidth
                            value={p.repoUrl || ''}
                            onChange={(e) => handleUpdateProject(p.id, 'repoUrl', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Client Name"
                            size="small"
                            fullWidth
                            value={p.clientName || ''}
                            onChange={(e) => handleUpdateProject(p.id, 'clientName', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={p.keepPrivate}
                                  onChange={(e) => handleUpdateProject(p.id, 'keepPrivate', e.target.checked)}
                                  color="secondary"
                                />
                              }
                              label={<Typography variant="body2">Keep Client Private (NDA)</Typography>}
                            />
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={p.featured}
                                  onChange={(e) => handleUpdateProject(p.id, 'featured', e.target.checked)}
                                  color="secondary"
                                />
                              }
                              label={<Typography variant="body2">Featured Project</Typography>}
                            />
                          </Stack>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Start Date"
                            type="month"
                            size="small"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={p.timeframeStart || ''}
                            onChange={(e) => handleUpdateProject(p.id, 'timeframeStart', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="End Date"
                            type="month"
                            size="small"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={p.timeframeEnd || ''}
                            onChange={(e) => handleUpdateProject(p.id, 'timeframeEnd', e.target.value)}
                          />
                        </Grid>

                        {/* Skill Selection Dropdown */}
                        <Grid item xs={12}>
                          <Box sx={{ border: '1px solid #f1f5f9', p: 2, borderRadius: 3 }}>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                              Skills Used in this Project (Select from your Profile Skills)
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                              {p.skills.map((s) => (
                                <Chip
                                  key={s}
                                  label={s}
                                  onDelete={() =>
                                    handleUpdateProject(
                                      p.id,
                                      'skills',
                                      p.skills.filter((k) => k !== s)
                                    )
                                  }
                                  size="small"
                                  color="secondary"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                            <Autocomplete
                              options={skillsSuggestions || []}
                              getOptionLabel={(option: any) => option.name || ''}
                              loading={isSkillsLoading}
                              onInputChange={(e, val) => setSkillSearch(val)}
                              onChange={(e, val: any) => {
                                if (val) {
                                  handleAddProjectSkill(p.id, val.name);
                                  setSkillMap(prev => ({ ...prev, [val.name]: val.id }));
                                }
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Search Skill to Add"
                                  size="small"
                                  placeholder="e.g. React"
                                  sx={{ minWidth: 250 }}
                                  InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                      <>
                                        {isSkillsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                      </>
                                    ),
                                  }}
                                />
                              )}
                            />
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                  {projects.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No projects added yet. Click "Add Project" to display your past works.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* SECTION 3: SERVICES OFFERED */}
            <Card id="services" sx={{ scrollMarginTop: '100px' }}>
              <CardContent sx={{ p: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
                    Section 3 — Services Offered
                  </Typography>
                  <Button variant="outlined" color="secondary" startIcon={<AddIcon />} onClick={handleAddService} size="small">
                    Add Service
                  </Button>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Package your freelance deliverables into discrete productized offerings.
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Stack spacing={3}>
                  {services.map((s, idx) => (
                    <Box
                      key={s.id}
                      sx={{
                        p: 3,
                        borderRadius: 3.5,
                        border: '1.5px solid',
                        borderColor: 'divider',
                        position: 'relative',
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          Service Offer Entry #{idx + 1}
                        </Typography>
                        <Button
                          onClick={() => setServices(services.filter((x) => x.id !== s.id))}
                          color="error"
                          size="small"
                          startIcon={<DeleteIcon />}
                          sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                          Remove
                        </Button>
                      </Stack>

                      <Grid container spacing={2.5}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Service Title"
                            placeholder="e.g. Design system audit and MUI implementation"
                            size="small"
                            required
                            fullWidth
                            value={s.title}
                            onChange={(e) => handleUpdateService(s.id, 'title', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12} sm={3}>
                          <TextField
                            label="Starting Price (₹)"
                            placeholder="From 80,000"
                            size="small"
                            required
                            fullWidth
                            value={s.startingPrice}
                            onChange={(e) => handleUpdateService(s.id, 'startingPrice', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12} sm={3}>
                          <TextField
                            label="Delivery Time"
                            placeholder="e.g. 2–3 weeks"
                            size="small"
                            required
                            fullWidth
                            value={s.deliveryTime}
                            onChange={(e) => handleUpdateService(s.id, 'deliveryTime', e.target.value)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            label="Service Description"
                            multiline
                            required
                            rows={3}
                            fullWidth
                            value={s.description}
                            onChange={(e) => handleUpdateService(s.id, 'description', e.target.value)}
                          />
                        </Grid>

                        {/* Skill Selection for Services */}
                        <Grid item xs={12}>
                          <Box sx={{ border: '1px solid #f1f5f9', p: 2, borderRadius: 3 }}>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                              Skills Associated with this Service Offer (Select from your Profile Skills)
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                              {s.skills.map((skillName) => (
                                <Chip
                                  key={skillName}
                                  label={skillName}
                                  onDelete={() =>
                                    handleUpdateService(
                                      s.id,
                                      'skills',
                                      s.skills.filter((k) => k !== skillName)
                                    )
                                  }
                                  size="small"
                                  color="secondary"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                            <Autocomplete
                              options={skillsSuggestions || []}
                              getOptionLabel={(option: any) => option.name || ''}
                              loading={isSkillsLoading}
                              onInputChange={(e, val) => setSkillSearch(val)}
                              onChange={(e, val: any) => {
                                if (val) {
                                  handleAddServiceSkill(s.id, val.name);
                                  setSkillMap(prev => ({ ...prev, [val.name]: val.id }));
                                }
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Search Skill to Add"
                                  size="small"
                                  placeholder="e.g. React"
                                  sx={{ minWidth: 250 }}
                                  InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                      <>
                                        {isSkillsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                      </>
                                    ),
                                  }}
                                />
                              )}
                            />
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                  {services.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No services package listed yet. Click "Add Service" to define your package offerings.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* CLIENT TESTIMONIALS */}
            <Card sx={{ border: '1px solid #f1f5f9' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, fontFamily: 'Outfit, sans-serif' }}>
                  Client Testimonials (Reviews)
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Read-only reviews linked directly to completed escrow contracts.
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Stack spacing={3}>
                  {dbReviews && dbReviews.length > 0 ? (
                    dbReviews.map((r: any) => (
                      <Box key={r.id} sx={{ p: 2.5, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar src={r.reviewer?.profileImage || undefined} sx={{ width: 32, height: 32 }}>
                              {r.reviewer?.fullName?.[0]?.toUpperCase() || 'R'}
                            </Avatar>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                              {r.reviewer?.fullName || 'Anonymous Client'}
                            </Typography>
                          </Stack>
                          <Rating value={r.rating} readOnly size="small" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          "{r.comment}"
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 2 }}>
                      No completed contract reviews yet. Testimonials are automatically published here once your contract milestones are completed and rated by clients.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* SAVE BUTTON BAR */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                disabled={isSaving}
                startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                sx={{
                  px: 6,
                  py: 1.75,
                  borderRadius: 3,
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  boxShadow: '0 8px 24px rgba(13, 148, 136, 0.15)',
                }}
              >
                {isSaving ? 'Saving Profile...' : 'Save Freelance Profile'}
              </Button>
            </Box>
          </Stack>
        </Grid>
      </Grid>

      {/* Lightbox Dialog for Cover Image Preview */}
      <Dialog
        open={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'transparent',
            boxShadow: 'none',
            overflow: 'hidden',
          }
        }}
      >
        <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
          <IconButton
            onClick={() => setLightboxImage(null)}
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              bgcolor: 'rgba(0,0,0,0.5)',
              color: '#fff',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
              zIndex: 100,
            }}
          >
            <CloseIcon />
          </IconButton>
          {lightboxImage && (
            <Box
              component="img"
              src={lightboxImage}
              alt="Project Cover Preview"
              sx={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: 2.5,
                boxShadow: '0 24px 38px 3px rgba(0,0,0,0.2), 0 9px 46px 8px rgba(0,0,0,0.15)',
              }}
            />
          )}
        </Box>
      </Dialog>
    </Container>
  );
}
