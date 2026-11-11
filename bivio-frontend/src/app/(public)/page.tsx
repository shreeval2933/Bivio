'use client';

import Link from 'next/link';
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Avatar,
  Divider,
  LinearProgress,
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import GavelIcon from '@mui/icons-material/Gavel';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import GroupIcon from '@mui/icons-material/Group';
import SecurityIcon from '@mui/icons-material/Security';
import StarIcon from '@mui/icons-material/Star';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function LandingPage() {
  const stats = [
    { label: 'Verified Talent', value: '14,200+' },
    { label: 'Escrow Volume', value: '₹8.4 Cr+' },
    { label: 'AI Match Accuracy', value: '98.4%' },
    { label: 'Disputes Resolved', value: '100%' },
  ];

  const steps = [
    { number: '01', title: 'Single Profile Creation', desc: 'Create a rich candidate profile once. Add skills, upload resumes, and showcase projects.', icon: <PersonAddIcon sx={{ fontSize: 24, color: 'primary.main' }} /> },
    { number: '02', title: 'Fork Your Road', desc: 'Apply for permanent full-time careers or bid on freelance milestone projects directly.', icon: <CallSplitIcon sx={{ fontSize: 24, color: 'secondary.main' }} /> },
    { number: '03', title: 'Secure Operations', desc: 'Recruiters manage interviews via pipelines; clients fund locked milestones in escrow.', icon: <LockIcon sx={{ fontSize: 24, color: 'primary.main' }} /> },
    { number: '04', title: 'Automated Closures', desc: 'Get hired directly, or claim milestone payouts automatically with dispute arbitration.', icon: <CheckCircleIcon sx={{ fontSize: 24, color: 'secondary.main' }} /> },
  ];

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pb: 10, overflowX: 'hidden', position: 'relative' }}>
      {/* Decorative Background Accent Blurs */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: '10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '30%',
          right: '5%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(13, 148, 136, 0.06) 0%, rgba(255, 255, 255, 0) 70%)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ pt: { xs: 8, md: 12 }, pb: { xs: 6, md: 8 }, position: 'relative', zIndex: 1 }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={7} sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Chip
              icon={<AutoAwesomeIcon fontSize="small" sx={{ color: 'secondary.main !important' }} />}
              label="AI-Powered Dual-Mode Platform"
              variant="outlined"
              color="secondary"
              sx={{
                mb: 3,
                fontWeight: 700,
                borderWidth: 2,
                px: 1.5,
                py: 2,
                borderRadius: 3,
                bgcolor: 'rgba(13, 148, 136, 0.04)',
              }}
            />
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
                lineHeight: 1.1,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                mb: 3,
              }}
            >
              One Candidate Profile.<br />
              <Box component="span" sx={{
                background: 'linear-gradient(to right, #2563eb, #0d9488)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                The Road Forks Here.
              </Box>
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: 'text.secondary',
                mb: 5,
                fontWeight: 400,
                fontSize: { xs: '1rem', md: '1.1rem' },
                lineHeight: 1.6,
              }}
            >
              Bivio connects top talent with high-impact opportunities. Choose permanent full-time ATS hiring matching your skills automatically, or opt for freelance contracts protected by milestone-locked escrow accounts.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent={{ xs: 'center', md: 'start' }} alignItems="center">
              <Button
                component={Link}
                href="/register"
                variant="contained"
                size="large"
                sx={{ px: 4, py: 1.75, fontSize: '1.05rem', borderRadius: 3, width: { xs: '100%', sm: 'auto' } }}
              >
                Get Started Now
              </Button>
              <Button
                component={Link}
                href="/login"
                variant="outlined"
                color="primary"
                size="large"
                endIcon={<KeyboardArrowRightIcon />}
                sx={{ px: 4, py: 1.75, fontSize: '1.05rem', borderRadius: 3, width: { xs: '100%', sm: 'auto' } }}
              >
                Browse Open Roles
              </Button>
            </Stack>
          </Grid>

          <Grid item xs={12} md={5} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Box sx={{ width: '100%', height: 'auto', p: 1 }}>
              <svg width="100%" height="100%" viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Glowing central node representing Bivio */}
                <circle cx="80" cy="200" r="30" fill="url(#bivioGlow)" filter="url(#dropShadow)" />
                <text x="80" y="205" fill="#ffffff" fontSize="16" fontWeight="900" textAnchor="middle">B</text>

                {/* Dual roads starting from Bivio */}
                <path d="M110 200 C200 200, 200 100, 320 100" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 6" />
                <path d="M110 200 C200 200, 200 300, 320 300" stroke="#0d9488" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 6" />

                {/* Animated pulsing dots representing candidates moving down the roads */}
                <circle r="6" fill="#2563eb">
                  <animateMotion dur="4s" repeatCount="indefinite" path="M110 200 C200 200, 200 100, 320 100" />
                </circle>
                <circle r="6" fill="#0d9488">
                  <animateMotion dur="4.5s" repeatCount="indefinite" path="M110 200 C200 200, 200 300, 320 300" />
                </circle>

                {/* Right Side Terminal Cards */}
                <g transform="translate(320, 50)" filter="url(#cardShadow)">
                  <rect width="160" height="90" rx="12" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
                  <rect x="15" y="15" width="40" height="60" rx="4" fill="rgba(37, 99, 235, 0.08)" />
                  <rect x="65" y="20" width="80" height="10" rx="3" fill="#64748b" />
                  <rect x="65" y="38" width="60" height="8" rx="3" fill="#cbd5e1" />
                  <rect x="65" y="55" width="55" height="18" rx="9" fill="rgba(37, 99, 235, 0.1)" />
                  <text x="92" y="67" fill="#2563eb" fontSize="10" fontWeight="700" textAnchor="middle">Career</text>
                </g>

                <g transform="translate(320, 250)" filter="url(#cardShadow)">
                  <rect width="160" height="90" rx="12" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
                  <rect x="15" y="15" width="40" height="60" rx="4" fill="rgba(13, 148, 136, 0.08)" />
                  <circle cx="35" cy="45" r="12" fill="#0d9488" />
                  <path d="M31 43 H39 V49 H31 Z M33 43 V40 A2 2 0 0 1 37 40 V43" stroke="#ffffff" strokeWidth="1.5" fill="none" />
                  <rect x="65" y="25" width="80" height="10" rx="3" fill="#64748b" />
                  <rect x="65" y="42" width="50" height="8" rx="3" fill="#cbd5e1" />
                  <text x="65" y="67" fill="#0f172a" fontSize="11" fontWeight="800">₹45,000</text>
                  <text x="118" y="66" fill="#64748b" fontSize="9" fontWeight="600">Escrow</text>
                </g>

                {/* Gradients & Shadows Definition */}
                <defs>
                  <linearGradient id="bivioGlow" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#0d9488" />
                  </linearGradient>
                  <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#2563eb" floodOpacity="0.3" />
                  </filter>
                  <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.05" />
                  </filter>
                </defs>
              </svg>
            </Box>
          </Grid>
        </Grid>

        {/* Stats Grid */}
        <Grid container spacing={3} sx={{ mt: 2, mb: 8 }}>
          {stats.map((s, idx) => (
            <Grid item xs={12} sm={6} md={3} key={idx}>
              <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(8px)', textAlign: 'center' }}>
                <CardContent sx={{ py: 3 }}>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.5 }}>
                    {s.value}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Feature Grid Branch Section */}
      <Container maxWidth="lg" sx={{ mb: 10, position: 'relative', zIndex: 1 }}>
        <Typography variant="h3" sx={{ textAlign: 'center', fontWeight: 800, mb: 1 }}>
          Choose Your Path
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 6, maxWidth: 600, mx: 'auto' }}>
          Explore the two distinct operational branches built directly into Bivio.
        </Typography>

        <Grid container spacing={4}>
          {/* Full-Time Hiring */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', borderTop: '6px solid #2563eb', bgcolor: '#ffffff' }}>
              <CardContent sx={{ p: 4 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                  <Avatar sx={{ bgcolor: 'rgba(37, 99, 235, 0.1)', width: 56, height: 56 }}>
                    <BusinessCenterIcon color="primary" sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      Full-Time ATS Desk
                    </Typography>
                    <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>
                      FOR EMPLOYERS & JOB SEEKERS
                    </Typography>
                  </Box>
                </Stack>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, minHeight: 70 }}>
                  Build custom stage-based pipelines, track candidates using interactive Kanban boards, and short-list talent instantly with per-job weighted matching scores.
                </Typography>
                <Stack spacing={2} sx={{ mb: 4 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <AutoAwesomeIcon color="primary" sx={{ fontSize: 18 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Dynamic Custom AI Match Scorecards</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <GroupIcon color="primary" sx={{ fontSize: 18 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Drag-and-Drop Candidate Board</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <SecurityIcon color="primary" sx={{ fontSize: 18 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Verified Candidate Profiles & Resumes</Typography>
                  </Stack>
                </Stack>
                <Button component={Link} href="/login" variant="contained" color="primary" fullWidth sx={{ py: 1.25, borderRadius: 2.5 }}>
                  Apply for Full-Time Careers
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Freelance & Escrow */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', borderTop: '6px solid #0d9488', bgcolor: '#ffffff' }}>
              <CardContent sx={{ p: 4 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                  <Avatar sx={{ bgcolor: 'rgba(13, 148, 136, 0.1)', width: 56, height: 56 }}>
                    <AccountBalanceWalletIcon color="secondary" sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      Freelance & Escrow Hub
                    </Typography>
                    <Typography variant="caption" color="secondary" sx={{ fontWeight: 700 }}>
                      FOR CLIENTS & FREELANCERS
                    </Typography>
                  </Box>
                </Stack>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, minHeight: 70 }}>
                  Fund milestone contracts into secure double-entry platform wallets. Lock and release funds safely with robust arbitrator dispute resolution hooks.
                </Typography>
                <Stack spacing={2} sx={{ mb: 4 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <SecurityIcon color="secondary" sx={{ fontSize: 18 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Row-Locked Escrow & Wallets</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <GavelIcon color="secondary" sx={{ fontSize: 18 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Independent Dispute Arbitration Desk</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <StarIcon color="secondary" sx={{ fontSize: 18 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Milestone-based Delivery Tracking</Typography>
                  </Stack>
                </Stack>
                <Button component={Link} href="/login" variant="contained" color="secondary" fullWidth sx={{ py: 1.25, borderRadius: 2.5 }}>
                  Bid on Freelance Projects
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* AI matching preview card */}
      <Container maxWidth="lg" sx={{ mb: 10 }}>
        <Card sx={{ bgcolor: '#ffffff', p: { xs: 2, md: 4 } }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={5}>
              <Chip icon={<AutoAwesomeIcon fontSize="small" />} label="AI Match Matcher" color="primary" sx={{ mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
                Configure, Weigh, and Shortlist Instantly
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Recruiters can set custom weightage variables for skills, experience, education, and projects. Bivio automatically ranks all incoming resumes and formats details into a beautiful dashboard.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 3 }}>
                "The customized weighting system allowed us to filter out over 80% of unqualified applicants in minutes."
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: 'secondary.main' }}>S</Avatar>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Sophia Patel</Typography>
                  <Typography variant="caption" color="text.secondary">Lead Recruiter, NexaGlobal</Typography>
                </Box>
              </Stack>
            </Grid>
            <Grid item xs={12} md={7}>
              <Box sx={{ p: 3, border: '1px solid #f1f5f9', borderRadius: 4, bgcolor: '#f8fafc' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                  AI Matching Score Breakdown
                </Typography>
                <Stack spacing={2.5}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Technical Skills Matching</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>94%</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={94} sx={{ height: 8, borderRadius: 4 }} />
                  </Box>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Domain Experience</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>88%</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={88} sx={{ height: 8, borderRadius: 4 }} />
                  </Box>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Project Portfolio Quality</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>92%</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={92} sx={{ height: 8, borderRadius: 4 }} />
                  </Box>
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Card>
      </Container>

      {/* How it works */}
      <Container maxWidth="lg" sx={{ mb: 10 }}>
        <Typography variant="h3" sx={{ textAlign: 'center', fontWeight: 800, mb: 1 }}>
          How Bivio Works
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 6 }}>
          A frictionless journey from sign up to secure payout.
        </Typography>

        <Grid container spacing={4}>
          {steps.map((st, idx) => (
            <Grid item xs={12} sm={6} md={3} key={idx}>
              <Card
                sx={{
                  height: '100%',
                  bgcolor: '#ffffff',
                  p: 1,
                  borderRadius: 4,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.3s ease-in-out',
                  position: 'relative',
                  border: '1px solid #f1f5f9',
                  overflow: 'visible',
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: '0 12px 30px rgba(37, 99, 235, 0.08)',
                    borderColor: idx % 2 === 0 ? 'primary.light' : 'secondary.light',
                  },
                }}
              >
                {/* Floating Timeline Index Indicator */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: -20,
                    left: 24,
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    bgcolor: idx % 2 === 0 ? 'primary.main' : 'secondary.main',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem',
                    boxShadow: idx % 2 === 0 ? '0 4px 14px rgba(37, 99, 235, 0.3)' : '0 4px 14px rgba(13, 148, 136, 0.3)',
                  }}
                >
                  {st.number}
                </Box>
                <CardContent sx={{ pt: 4 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: idx % 2 === 0 ? 'rgba(37, 99, 235, 0.06)' : 'rgba(13, 148, 136, 0.06)',
                        width: 44,
                        height: 44,
                        border: '1.5px solid',
                        borderColor: idx % 2 === 0 ? 'rgba(37, 99, 235, 0.15)' : 'rgba(13, 148, 136, 0.15)',
                      }}
                    >
                      {st.icon}
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.25 }}>
                      {st.title}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {st.desc}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Footer */}
      <Container maxWidth="lg">
        <Divider sx={{ mb: 6 }} />
        <Grid container spacing={4} sx={{ color: 'text.secondary' }}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 2 }}>
              Bivio
            </Typography>
            <Typography variant="body2" sx={{ maxWidth: 360, mb: 3 }}>
              Dual-mode talent platform enabling direct full-time ATS pipelines and milestone-escrow freelance contracts.
            </Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>
              &copy; {new Date().getFullYear()} Bivio. All rights reserved.
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 2 }}>Platform</Typography>
            <Stack spacing={1}>
              <Link href="/jobs" style={{ textDecoration: 'none' }}><Typography variant="body2">Find Work</Typography></Link>
              <Link href="/register" style={{ textDecoration: 'none' }}><Typography variant="body2">Sign Up</Typography></Link>
              <Link href="/login" style={{ textDecoration: 'none' }}><Typography variant="body2">Log In</Typography></Link>
            </Stack>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 2 }}>Arbitration</Typography>
            <Stack spacing={1}>
              <Link href="/admin/disputes" style={{ textDecoration: 'none' }}><Typography variant="body2">Dispute Resolution Desk</Typography></Link>
              <Link href="/admin/users" style={{ textDecoration: 'none' }}><Typography variant="body2">User Moderation Settings</Typography></Link>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
