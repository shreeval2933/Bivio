'use client';

import React, { useState } from 'react';
import { RoleGuard } from '@/components/common/RoleGuard';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  AppBar,
  Toolbar,
  Avatar,
  Stack,
  IconButton,
  useMediaQuery,
  useTheme,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import PeopleIcon from '@mui/icons-material/People';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import MenuIcon from '@mui/icons-material/Menu';
import VerifiedIcon from '@mui/icons-material/Verified';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { useLogoutMutation } from '@/store/api/authApi';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { logout } from '@/store/slices/authSlice';

const DRAWER_WIDTH = 280;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dispatch = useAppDispatch();
  const [logoutApi] = useLogoutMutation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: <DashboardIcon /> },
    { label: 'Support Tickets', href: '/admin/support', icon: <SupportAgentIcon /> },
    { label: 'Dispute Resolution', href: '/admin/disputes', icon: <GavelIcon /> },
    { label: 'User Moderation', href: '/admin/users', icon: <PeopleIcon /> },
    { label: 'Platform Financials', href: '/admin/financials', icon: <AccountBalanceIcon /> },
    { label: 'Client Verifications', href: '/admin/verifications', icon: <VerifiedIcon /> },
    { label: 'Platform Settings', href: '/admin/settings', icon: <SettingsIcon /> },
  ];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
        {/* <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, px: 2, display: 'block', mb: 2, letterSpacing: '0.05em' }}>
          ADMINISTRATION & GOVERNANCE
        </Typography> */}
        <List>
          {menuItems.map((item) => {
            const active = isActive(item.href);
            return (
              <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
                <Link href={item.href} style={{ width: '100%', textDecoration: 'none' }}>
                  <ListItemButton
                    selected={active}
                    onClick={() => isMobile && setMobileOpen(false)}
                    sx={{
                      borderRadius: 3,
                      mx: 1,
                      mb: 0.5,
                      color: active ? 'primary.main' : 'text.secondary',
                      fontWeight: active ? 700 : 500,
                      position: 'relative',
                      border: '1.5px solid transparent',
                      transition: 'all 0.2s ease-in-out',
                      '&.Mui-selected': {
                        bgcolor: 'rgba(37, 99, 235, 0.05)',
                        borderColor: 'rgba(37, 99, 235, 0.15)',
                        boxShadow: '0 2px 8px -1px rgba(37, 99, 235, 0.06)',
                        color: 'primary.main',
                        '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.1)' },
                        '& .MuiListItemIcon-root': { color: 'primary.main' },
                      },
                      '&:hover': {
                        bgcolor: 'rgba(15, 23, 42, 0.04)',
                        transform: 'translateX(4px)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: active ? 'primary.main' : 'text.secondary', minWidth: 40 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: active ? 700 : 500,
                      }}
                    />
                  </ListItemButton>
                </Link>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Box sx={{ mt: 'auto', pt: 1 }}>
        <Divider sx={{ mb: 2 }} />
        {/* Logout Button */}
        <ListItemButton
          onClick={() => setShowLogoutModal(true)}
          sx={{
            borderRadius: 3,
            mx: 1,
            mb: 0.5,
            color: 'error.main',
            fontWeight: 700,
            '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.05)' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 'inherit' }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <Box sx={{ display: 'flex', bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Top Bar synced with Candidate/Recruiter look */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isMobile && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 1, color: 'text.primary' }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}>
                Bivio
                <Typography
                  component="span"
                  variant="caption"
                  sx={{
                    bgcolor: 'rgba(37, 99, 235, 0.1)',
                    color: 'primary.main',
                    px: 1,
                    py: 0.25,
                    borderRadius: 1.5,
                    fontWeight: 700,
                  }}
                >
                  Admin Panel
                </Typography>
              </Typography>
            </Link>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>
              System Admin
            </Typography>
            <Avatar sx={{ bgcolor: 'secondary.main', width: 30, height: 30, fontSize: '0.8rem', fontWeight: 700 }}>AD</Avatar>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Sidebar Navigation */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            [`& .MuiDrawer-paper`]: {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              pt: 2,
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            width: DRAWER_WIDTH,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              bgcolor: '#ffffff',
              borderRight: '1px solid #e2e8f0',
              pt: 10,
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main View Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          pt: { xs: 10, sm: 11, md: 12 },
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        {children}
      </Box>

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Confirm Logout</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to log out of Bivio Admin Console?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLogoutModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              setShowLogoutModal(false);
              try {
                await logoutApi().unwrap();
              } catch (err) {
                console.warn('Logout API failed:', err);
              }
              dispatch(logout());
              if (typeof window !== 'undefined') window.location.href = '/login';
            }}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
          >
            Log Out
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </RoleGuard>
  );
}
