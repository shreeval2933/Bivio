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
  Collapse,
  useMediaQuery,
  useTheme,
  Divider,
  Popover,
  Badge,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DescriptionIcon from '@mui/icons-material/Description';
import GavelIcon from '@mui/icons-material/Gavel';
import WorkIcon from '@mui/icons-material/Work';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import PortraitIcon from '@mui/icons-material/Portrait';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import MessageIcon from '@mui/icons-material/Message';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpIcon from '@mui/icons-material/Help';
import LogoutIcon from '@mui/icons-material/Logout';
import { useLogoutMutation } from '@/store/api/authApi';
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllReadMutation,
} from '@/store/api/notificationsApi';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { logout } from '@/store/slices/authSlice';

const DRAWER_WIDTH = 280;

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [logoutApi] = useLogoutMutation();

  const candidateInitials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'AM';

  // States for collapsible groups
  const [freelanceOpen, setFreelanceOpen] = useState(true);
  const [fullTimeOpen, setFullTimeOpen] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleFreelanceToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFreelanceOpen(!freelanceOpen);
  };

  const handleFullTimeToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFullTimeOpen(!fullTimeOpen);
  };

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  // Notifications Integration
  const { data: dbNotifications = [] } = useGetNotificationsQuery(undefined, {
    pollingInterval: 5000, // Poll every 5s for real-time notifications
  });

  const [markNotificationRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllReadMutation();

  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const unreadCount = dbNotifications.filter(n => !n.isRead).length;

  const handleNotifOpen = (e: React.MouseEvent<HTMLElement>) => setNotifAnchor(e.currentTarget);
  const handleNotifClose = () => setNotifAnchor(null);

  const handleMarkAllRead = async () => {
    try {
      await markAllRead().unwrap();
    } catch (err) {
      console.warn('Failed to mark all read:', err);
    }
  };

  const handleNotificationClick = async (id: string) => {
    try {
      await markNotificationRead(id).unwrap();
    } catch (err) {
      console.warn('Failed to mark read:', err);
    }
  };

  // Helper for relative time in dropdown
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return `${diffDays}d ago`;
  };

  const isLinkActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname?.startsWith(href);
  };

  const drawerContent = (
    <Box sx={{ overflow: 'auto', p: 2 }}>
      <List>
        {/* Main Dashboard */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <Link href="/dashboard" style={{ width: '100%', textDecoration: 'none' }}>
            <ListItemButton
              selected={isLinkActive('/dashboard')}
              onClick={() => isMobile && setMobileOpen(false)}
              sx={{
                borderRadius: 3,
                mx: 1,
                color: isLinkActive('/dashboard') ? 'primary.main' : 'text.secondary',
                fontWeight: isLinkActive('/dashboard') ? 700 : 500,
                position: 'relative',
                border: '1.5px solid transparent',
                '&.Mui-selected': {
                  bgcolor: 'rgba(37, 99, 235, 0.05)',
                  borderColor: 'rgba(37, 99, 235, 0.15)',
                  boxShadow: '0 2px 8px -1px rgba(37, 99, 235, 0.06)',
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.1)' },
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                },
                '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.04)', transform: 'translateX(4px)' },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="Dashboard" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 'inherit' }} />
            </ListItemButton>
          </Link>
        </ListItem>

        {/* My Profile */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <Link href="/profile" style={{ width: '100%', textDecoration: 'none' }}>
            <ListItemButton
              selected={isLinkActive('/profile')}
              onClick={() => isMobile && setMobileOpen(false)}
              sx={{
                borderRadius: 3,
                mx: 1,
                color: isLinkActive('/profile') ? 'primary.main' : 'text.secondary',
                fontWeight: isLinkActive('/profile') ? 700 : 500,
                position: 'relative',
                border: '2px solid transparent',
                '&.Mui-selected': {
                  bgcolor: 'rgba(37, 99, 235, 0.05)',
                  borderColor: 'rgba(37, 99, 235, 0.3)',
                  boxShadow: '0 2px 8px -1px rgba(37, 99, 235, 0.06)',
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.1)' },
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                },
                '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.04)', transform: 'translateX(4px)' },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                <PersonIcon />
              </ListItemIcon>
              <ListItemText primary="My Profile" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 'inherit' }} />
            </ListItemButton>
          </Link>
        </ListItem>

        {/* Messages */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <Link href="/messages" style={{ width: '100%', textDecoration: 'none' }}>
            <ListItemButton
              selected={isLinkActive('/messages')}
              onClick={() => isMobile && setMobileOpen(false)}
              sx={{
                borderRadius: 3,
                mx: 1,
                color: isLinkActive('/messages') ? 'primary.main' : 'text.secondary',
                fontWeight: isLinkActive('/messages') ? 700 : 500,
                position: 'relative',
                border: '1.5px solid transparent',
                '&.Mui-selected': {
                  bgcolor: 'rgba(37, 99, 235, 0.05)',
                  borderColor: 'rgba(37, 99, 235, 0.15)',
                  boxShadow: '0 2px 8px -1px rgba(37, 99, 235, 0.06)',
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.1)' },
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                },
                '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.04)', transform: 'translateX(4px)' },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                <MessageIcon />
              </ListItemIcon>
              <ListItemText primary="Messages" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 'inherit' }} />
            </ListItemButton>
          </Link>
        </ListItem>

        {/* Notifications */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <Link href="/notifications" style={{ width: '100%', textDecoration: 'none' }}>
            <ListItemButton
              selected={isLinkActive('/notifications')}
              onClick={() => isMobile && setMobileOpen(false)}
              sx={{
                borderRadius: 3,
                mx: 1,
                color: isLinkActive('/notifications') ? 'primary.main' : 'text.secondary',
                fontWeight: isLinkActive('/notifications') ? 700 : 500,
                position: 'relative',
                border: '1.5px solid transparent',
                '&.Mui-selected': {
                  bgcolor: 'rgba(37, 99, 235, 0.05)',
                  borderColor: 'rgba(37, 99, 235, 0.15)',
                  boxShadow: '0 2px 8px -1px rgba(37, 99, 235, 0.06)',
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.1)' },
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                },
                '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.04)', transform: 'translateX(4px)' },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                <NotificationsIcon />
              </ListItemIcon>
              <ListItemText primary="Notifications" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 'inherit' }} />
            </ListItemButton>
          </Link>
        </ListItem>

        <Divider sx={{ my: 2, mx: 2 }} />

        {/* FREELANCE FLOW GROUP */}
        <ListItem disablePadding sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <ListItemButton
            onClick={handleFreelanceToggle}
            sx={{
              borderRadius: 3,
              mx: 1,
              mb: 0.5,
              color: 'secondary.main',
              fontWeight: 700,
              '&:hover': { bgcolor: 'rgba(13, 148, 136, 0.04)' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'secondary.main' }}>
              <CallSplitIcon />
            </ListItemIcon>
            <ListItemText primary="Freelance Mode" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 700 }} />
            {freelanceOpen ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
          </ListItemButton>

          <Collapse in={freelanceOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 2 }}>
              {/* Freelance Profile */}
              <Link href="/freelance-profile" style={{ width: '100%', textDecoration: 'none' }}>
                <ListItemButton
                  selected={isLinkActive('/freelance-profile')}
                  onClick={() => isMobile && setMobileOpen(false)}
                  sx={{
                    borderRadius: 2.5,
                    mx: 1,
                    mb: 0.5,
                    color: isLinkActive('/freelance-profile') ? 'secondary.main' : 'text.secondary',
                    position: 'relative',
                    border: '2px solid transparent',
                    '&.Mui-selected': {
                      bgcolor: 'rgba(13, 148, 136, 0.05)',
                      borderColor: 'rgba(13, 148, 136, 0.3)',
                      boxShadow: '0 2px 8px -1px rgba(13, 148, 136, 0.06)',
                      color: 'secondary.main',
                      fontWeight: 700,
                      '&:hover': { bgcolor: 'rgba(13, 148, 136, 0.08)' },
                      '& .MuiListItemIcon-root': { color: 'secondary.main' },
                    },
                    '&:hover': { bgcolor: 'rgba(13, 148, 136, 0.03)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                    <PortraitIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Freelance Profile" primaryTypographyProps={{ fontSize: '0.825rem' }} />
                </ListItemButton>
              </Link>

              {/* Browse Projects */}
              <Link href="/freelance-jobs" style={{ width: '100%', textDecoration: 'none' }}>
                <ListItemButton
                  selected={isLinkActive('/freelance-jobs')}
                  onClick={() => isMobile && setMobileOpen(false)}
                  sx={{
                    borderRadius: 2.5,
                    mx: 1,
                    mb: 0.5,
                    color: isLinkActive('/freelance-jobs') ? 'secondary.main' : 'text.secondary',
                    position: 'relative',
                    border: '2px solid transparent',
                    '&.Mui-selected': {
                      bgcolor: 'rgba(13, 148, 136, 0.05)',
                      borderColor: 'rgba(13, 148, 136, 0.3)',
                      boxShadow: '0 2px 8px -1px rgba(13, 148, 136, 0.06)',
                      color: 'secondary.main',
                      fontWeight: 700,
                      '&:hover': { bgcolor: 'rgba(13, 148, 136, 0.08)' },
                      '& .MuiListItemIcon-root': { color: 'secondary.main' },
                    },
                    '&:hover': { bgcolor: 'rgba(13, 148, 136, 0.03)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                    <SearchIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Browse Projects" primaryTypographyProps={{ fontSize: '0.825rem' }} />
                </ListItemButton>
              </Link>

              {/* Proposals (Bids) */}
              <Link href="/proposals" style={{ width: '100%', textDecoration: 'none' }}>
                <ListItemButton
                  selected={isLinkActive('/proposals')}
                  onClick={() => isMobile && setMobileOpen(false)}
                  sx={{
                    borderRadius: 2.5,
                    mx: 1,
                    mb: 0.5,
                    color: isLinkActive('/proposals') ? 'secondary.main' : 'text.secondary',
                    position: 'relative',
                    border: '2px solid transparent',
                    '&.Mui-selected': {
                      bgcolor: 'rgba(13, 148, 136, 0.05)',
                      borderColor: 'rgba(13, 148, 136, 0.3)',
                      boxShadow: '0 2px 8px -1px rgba(13, 148, 136, 0.06)',
                      color: 'secondary.main',
                      fontWeight: 700,
                      '&:hover': { bgcolor: 'rgba(13, 148, 136, 0.08)' },
                      '& .MuiListItemIcon-root': { color: 'secondary.main' },
                    },
                    '&:hover': { bgcolor: 'rgba(13, 148, 136, 0.03)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                    <DescriptionIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="My Proposals" primaryTypographyProps={{ fontSize: '0.825rem' }} />
                </ListItemButton>
              </Link>

              {/* Active Contracts */}
              <Link href="/contracts" style={{ width: '100%', textDecoration: 'none' }}>
                <ListItemButton
                  selected={isLinkActive('/contracts')}
                  onClick={() => isMobile && setMobileOpen(false)}
                  sx={{
                    borderRadius: 2.5,
                    mx: 1,
                    mb: 0.5,
                    color: isLinkActive('/contracts') ? 'secondary.main' : 'text.secondary',
                    position: 'relative',
                    border: '2px solid transparent',
                    '&.Mui-selected': {
                      bgcolor: 'rgba(13, 148, 136, 0.05)',
                      borderColor: 'rgba(13, 148, 136, 0.3)',
                      boxShadow: '0 2px 8px -1px rgba(13, 148, 136, 0.06)',
                      color: 'secondary.main',
                      fontWeight: 700,
                      '&:hover': { bgcolor: 'rgba(13, 148, 136, 0.08)' },
                      '& .MuiListItemIcon-root': { color: 'secondary.main' },
                    },
                    '&:hover': { bgcolor: 'rgba(13, 148, 136, 0.03)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                    <GavelIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Contracts & Escrow" primaryTypographyProps={{ fontSize: '0.825rem' }} />
                </ListItemButton>
              </Link>

              {/* My Wallet */}
              <Link href="/wallet" style={{ width: '100%', textDecoration: 'none' }}>
                <ListItemButton
                  selected={isLinkActive('/wallet')}
                  onClick={() => isMobile && setMobileOpen(false)}
                  sx={{
                    borderRadius: 2.5,
                    mx: 1,
                    mb: 0.5,
                    color: isLinkActive('/wallet') ? 'secondary.main' : 'text.secondary',
                    position: 'relative',
                    border: '2px solid transparent',
                    '&.Mui-selected': {
                      bgcolor: 'rgba(13, 148, 136, 0.05)',
                      borderColor: 'rgba(13, 148, 136, 0.3)',
                      boxShadow: '0 2px 8px -1px rgba(13, 148, 136, 0.06)',
                      color: 'secondary.main',
                      fontWeight: 700,
                      '&:hover': { bgcolor: 'rgba(13, 148, 136, 0.08)' },
                      '& .MuiListItemIcon-root': { color: 'secondary.main' },
                    },
                    '&:hover': { bgcolor: 'rgba(13, 148, 136, 0.03)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                    <AccountBalanceWalletIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="My Wallet" primaryTypographyProps={{ fontSize: '0.825rem' }} />
                </ListItemButton>
              </Link>

            </List>
          </Collapse>
        </ListItem>

        <Divider sx={{ my: 2, mx: 2 }} />

        {/* FULL-TIME FLOW GROUP */}
        <ListItem disablePadding sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <ListItemButton
            onClick={handleFullTimeToggle}
            sx={{
              borderRadius: 3,
              mx: 1,
              mb: 0.5,
              color: 'primary.main',
              fontWeight: 700,
              '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.04)' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'primary.main' }}>
              <BusinessCenterIcon />
            </ListItemIcon>
            <ListItemText primary="Full-Time Desk" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 700 }} />
            {fullTimeOpen ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
          </ListItemButton>

          <Collapse in={fullTimeOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 2 }}>
              {/* Browse Jobs */}
              <Link href="/jobs" style={{ width: '100%', textDecoration: 'none' }}>
                <ListItemButton
                  selected={isLinkActive('/jobs')}
                  onClick={() => isMobile && setMobileOpen(false)}
                  sx={{
                    borderRadius: 2.5,
                    mx: 1,
                    mb: 0.5,
                    color: isLinkActive('/jobs') ? 'primary.main' : 'text.secondary',
                    position: 'relative',
                    border: '2px solid transparent',
                    '&.Mui-selected': {
                      bgcolor: 'rgba(37, 99, 235, 0.05)',
                      borderColor: 'rgba(37, 99, 235, 0.3)',
                      boxShadow: '0 2px 8px -1px rgba(37, 99, 235, 0.06)',
                      color: 'primary.main',
                      fontWeight: 700,
                      '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.08)' },
                      '& .MuiListItemIcon-root': { color: 'primary.main' },
                    },
                    '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.03)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                    <WorkIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Browse Open Jobs" primaryTypographyProps={{ fontSize: '0.825rem' }} />
                </ListItemButton>
              </Link>

              {/* Job Applications */}
              <Link href="/applications" style={{ width: '100%', textDecoration: 'none' }}>
                <ListItemButton
                  selected={isLinkActive('/applications')}
                  onClick={() => isMobile && setMobileOpen(false)}
                  sx={{
                    borderRadius: 2.5,
                    mx: 1,
                    mb: 0.5,
                    color: isLinkActive('/applications') ? 'primary.main' : 'text.secondary',
                    position: 'relative',
                    border: '2px solid transparent',
                    '&.Mui-selected': {
                      bgcolor: 'rgba(37, 99, 235, 0.05)',
                      borderColor: 'rgba(37, 99, 235, 0.3)',
                      boxShadow: '0 2px 8px -1px rgba(37, 99, 235, 0.06)',
                      color: 'primary.main',
                      fontWeight: 700,
                      '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.08)' },
                      '& .MuiListItemIcon-root': { color: 'primary.main' },
                    },
                    '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.03)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                    <AssignmentIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Job Applications" primaryTypographyProps={{ fontSize: '0.825rem' }} />
                </ListItemButton>
              </Link>

              {/* Offers & Decisions */}
              <Link href="/offers" style={{ width: '100%', textDecoration: 'none' }}>
                <ListItemButton
                  selected={isLinkActive('/offers')}
                  onClick={() => isMobile && setMobileOpen(false)}
                  sx={{
                    borderRadius: 2.5,
                    mx: 1,
                    mb: 0.5,
                    color: isLinkActive('/offers') ? 'primary.main' : 'text.secondary',
                    position: 'relative',
                    border: '2px solid transparent',
                    '&.Mui-selected': {
                      bgcolor: 'rgba(37, 99, 235, 0.05)',
                      borderColor: 'rgba(37, 99, 235, 0.3)',
                      boxShadow: '0 2px 8px -1px rgba(37, 99, 235, 0.06)',
                      color: 'primary.main',
                      fontWeight: 700,
                      '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.08)' },
                      '& .MuiListItemIcon-root': { color: 'primary.main' },
                    },
                    '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.03)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                    <AssignmentTurnedInIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Offers & Decisions" primaryTypographyProps={{ fontSize: '0.825rem' }} />
                </ListItemButton>
              </Link>
            </List>
          </Collapse>
        </ListItem>
      </List>

      <Divider sx={{ my: 2, mx: 2 }} />

      <List>
        {/* Help */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <Link href="/help" style={{ width: '100%', textDecoration: 'none' }}>
            <ListItemButton
              selected={isLinkActive('/help')}
              onClick={() => isMobile && setMobileOpen(false)}
              sx={{
                borderRadius: 3,
                mx: 1,
                color: isLinkActive('/help') ? 'primary.main' : 'text.secondary',
                fontWeight: isLinkActive('/help') ? 700 : 500,
                '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.04)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                <HelpIcon />
              </ListItemIcon>
              <ListItemText primary="Help" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 'inherit' }} />
            </ListItemButton>
          </Link>
        </ListItem>

        {/* Logout */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={() => setShowLogoutModal(true)}
            sx={{
              borderRadius: 3,
              mx: 1,
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
        </ListItem>
      </List>
    </Box>
  );

  return (
    <RoleGuard allowedRoles={['CANDIDATE']}>
      <Box sx={{ display: 'flex', bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Top Bar */}
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
                <Typography component="span" variant="caption" sx={{ bgcolor: 'secondary.light', color: 'secondary.dark', px: 1, py: 0.25, borderRadius: 1.5, fontWeight: 700 }}>
                  Candidate Workspace
                </Typography>
              </Typography>
            </Link>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            {/* Notification Bell */}
            <IconButton color="inherit" onClick={handleNotifOpen} sx={{ color: 'text.primary' }}>
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>

            {/* Notification Dropdown Popover */}
            <Popover
              open={Boolean(notifAnchor)}
              anchorEl={notifAnchor}
              onClose={handleNotifClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{ sx: { width: 340, borderRadius: 4, mt: 1, boxShadow: '0 8px 30px rgba(0,0,0,0.1)' } }}
            >
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Notifications</Typography>
                {unreadCount > 0 && (
                  <Button size="small" onClick={handleMarkAllRead} startIcon={<MarkEmailReadIcon />} sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}>
                    Mark all read
                  </Button>
                )}
              </Box>
              <List sx={{ p: 0, maxHeight: 360, overflowY: 'auto' }}>
                {dbNotifications.length === 0 ? (
                  <Box sx={{ py: 4, px: 2, textAlign: 'center', color: 'text.secondary' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      No notifications yet
                    </Typography>
                  </Box>
                ) : (
                  dbNotifications.slice(0, 5).map((n) => (
                    <Link href={n.actionUrl || '#'} key={n.id} style={{ textDecoration: 'none', color: 'inherit' }} onClick={() => { handleNotificationClick(n.id); handleNotifClose(); }}>
                      <ListItemButton
                        sx={{
                          p: 2,
                          borderBottom: '1px solid #f1f5f9',
                          bgcolor: n.isRead ? 'transparent' : 'rgba(37, 99, 235, 0.02)',
                          borderLeft: n.isRead ? 'none' : '3px solid #3b82f6',
                        }}
                      >
                        <Stack spacing={0.5}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" sx={{ fontWeight: 800, color: n.priority === 'CRITICAL' ? 'error.main' : 'text.primary' }}>
                              {n.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{formatRelativeTime(n.createdAt)}</Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.3 }}>
                            {n.body}
                          </Typography>
                        </Stack>
                      </ListItemButton>
                    </Link>
                  ))
                )}
              </List>
              <Box sx={{ p: 1.5, textAlign: 'center', borderTop: '1px solid #e2e8f0' }}>
                <Link href="/notifications" style={{ textDecoration: 'none' }} onClick={handleNotifClose}>
                  <Typography variant="caption" color="primary" sx={{ fontWeight: 800 }}>
                    See all notifications →
                  </Typography>
                </Link>
              </Box>
            </Popover>

            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', display: { xs: 'none', sm: 'block' } }}>
              {user?.fullName || 'Candidate'}
            </Typography>
            <Avatar
              src={user?.profileImage || undefined}
              sx={{ bgcolor: 'primary.main', width: 30, height: 30, fontSize: '0.8rem', fontWeight: 700 }}
            >
              {candidateInitials}
            </Avatar>
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
            Are you sure you want to log out of Bivio Candidate Workspace?
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
