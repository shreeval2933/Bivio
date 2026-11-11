'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  AppBar, Toolbar, Typography, Button, Stack, Container,
  IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, Box,
  useMediaQuery, useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ForkRightIcon from '@mui/icons-material/ForkRight';

const NAV_LINKS: { label: string; href: string }[] = [];

export default function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e2e8f0',
        color: '#0f172a',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ py: 0.5 }}>
          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ForkRightIcon sx={{ color: '#1d4f8c', fontSize: 28 }} />
            <Typography
              variant="h5"
              sx={{ fontWeight: 800, color: '#1d4f8c', letterSpacing: '-0.5px', fontFamily: 'Outfit, sans-serif' }}
            >
              Bivio
            </Typography>
          </Link>

          <Box sx={{ flex: 1 }} />

          {/* Desktop Nav */}
          {!isMobile && (
            <Stack direction="row" spacing={1} alignItems="center">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button color="inherit" sx={{ fontWeight: 500 }}>{link.label}</Button>
                </Link>
              ))}
              <Link href="/login">
                <Button variant="outlined" color="primary" sx={{ ml: 1 }}>Log In</Button>
              </Link>
              <Link href="/register">
                <Button variant="contained" color="primary">Get Started</Button>
              </Link>
            </Stack>
          )}

          {/* Mobile Nav Toggle */}
          {isMobile && (
            <IconButton onClick={() => setMobileOpen(true)} color="inherit">
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </Container>

      {/* Mobile Drawer */}
      <Drawer anchor="right" open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <Box sx={{ width: 240, pt: 2 }}>
          <List>
            {NAV_LINKS.map((link) => (
              <ListItem key={link.href} disablePadding>
                <ListItemButton component={Link} href={link.href} onClick={() => setMobileOpen(false)}>
                  <ListItemText primary={link.label} />
                </ListItemButton>
              </ListItem>
            ))}
            <ListItem disablePadding>
              <ListItemButton component={Link} href="/login" onClick={() => setMobileOpen(false)}>
                <ListItemText primary="Log In" />
              </ListItemButton>
            </ListItem>
            <ListItem sx={{ pt: 2 }}>
              <Button component={Link} href="/register" variant="contained" fullWidth onClick={() => setMobileOpen(false)}>
                Get Started
              </Button>
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}
