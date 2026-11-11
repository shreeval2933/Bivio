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
  Chip,
  Checkbox,
  Divider,
  List,
  ListItem,
  Avatar,
  CircularProgress,
  Paper,
} from '@mui/material';
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import { showNotification } from '@/store/slices/notificationSlice';
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllReadMutation,
  useDeleteNotificationsMutation,
} from '@/store/api/notificationsApi';

// Icons
import DeleteIcon from '@mui/icons-material/Delete';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import NotificationsIcon from '@mui/icons-material/Notifications';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import DescriptionIcon from '@mui/icons-material/Description';
import GavelIcon from '@mui/icons-material/Gavel';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import MessageIcon from '@mui/icons-material/Message';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';

export default function RecruiterNotificationsPage() {
  const dispatch = useDispatch();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [filterType, setFilterType] = useState<string>('All');
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // API Queries & Mutations
  const { data: dbNotifications = [], isLoading: notificationsLoading } = useGetNotificationsQuery(undefined, {
    skip: !mounted,
    pollingInterval: 5000, // Poll every 5s for real-time notifications
  });

  const [markNotificationRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllReadMutation();
  const [deleteNotifications] = useDeleteNotificationsMutation();

  // Helper mappings
  const mapBackendTypeToCategory = (type: string): string => {
    switch (type) {
      case 'INVITE':
      case 'APPLICATION_UPDATE':
        return 'Applications';
      case 'PROPOSAL_UPDATE':
        return 'Proposals';
      case 'MILESTONE_UPDATE':
        return 'Milestones';
      case 'PAYMENT':
        return 'Payments';
      case 'MESSAGE':
        return 'Messages';
      case 'DISPUTE':
        return 'Disputes';
      default:
        return 'System';
    }
  };

  const getDayGroup = (dateString: string): 'Today' | 'Yesterday' | 'Last 7 days' | 'Earlier' => {
    const date = new Date(dateString);
    const now = new Date();
    
    const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffTime = Math.abs(dNow.getTime() - dDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (dNow.getTime() === dDate.getTime()) {
      return 'Today';
    }
    
    const dYesterday = new Date(dNow);
    dYesterday.setDate(dYesterday.getDate() - 1);
    if (dYesterday.getTime() === dDate.getTime()) {
      return 'Yesterday';
    }
    
    if (diffDays <= 7) {
      return 'Last 7 days';
    }
    
    return 'Earlier';
  };

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

  const getActionLabel = (type: string): string | null => {
    switch (type) {
      case 'INVITE':
      case 'APPLICATION_UPDATE':
        return 'View Application';
      case 'PROPOSAL_UPDATE':
        return 'Review Bid';
      case 'MILESTONE_UPDATE':
        return 'Review Submission';
      case 'PAYMENT':
        return 'View Payment';
      case 'MESSAGE':
        return 'Reply';
      case 'DISPUTE':
        return 'View Dispute';
      default:
        return 'View Details';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'INVITE':
      case 'APPLICATION_UPDATE':
        return <BusinessCenterIcon />;
      case 'PROPOSAL_UPDATE':
        return <DescriptionIcon />;
      case 'MILESTONE_UPDATE':
        return <PriorityHighIcon />;
      case 'PAYMENT':
        return <AccountBalanceWalletIcon />;
      case 'MESSAGE':
        return <MessageIcon />;
      case 'DISPUTE':
        return <GavelIcon />;
      default:
        return <NotificationsIcon />;
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredNotifs.map(n => n.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id));
    }
  };

  const handleMarkSelectedRead = async () => {
    try {
      await Promise.all(selectedIds.map(id => markNotificationRead(id).unwrap()));
      setSelectedIds([]);
      dispatch(showNotification({ message: 'Selected alerts marked as read.', severity: 'success' }));
    } catch (err: any) {
      dispatch(showNotification({ message: 'Failed to update alert status.', severity: 'error' }));
    }
  };

  const handleDeleteSelected = async () => {
    try {
      await deleteNotifications({ ids: selectedIds }).unwrap();
      setSelectedIds([]);
      dispatch(showNotification({ message: 'Selected alerts deleted successfully.', severity: 'success' }));
    } catch (err: any) {
      dispatch(showNotification({ message: 'Failed to delete selected alerts.', severity: 'error' }));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead().unwrap();
      dispatch(showNotification({ message: 'All alerts marked as read.', severity: 'success' }));
    } catch (err: any) {
      dispatch(showNotification({ message: 'Failed to update alerts.', severity: 'error' }));
    }
  };

  const handleNotificationClick = async (id: string) => {
    try {
      await markNotificationRead(id).unwrap();
    } catch (err) {
      // safe fallback
    }
  };

  if (!mounted) return null;

  if (notificationsLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading your alerts...
          </Typography>
        </Stack>
      </Container>
    );
  }

  const filteredNotifs = dbNotifications.filter((notif) => {
    if (unreadOnly && notif.isRead) return false;
    const category = mapBackendTypeToCategory(notif.type);
    if (filterType !== 'All' && category !== filterType) return false;
    return true;
  });

  const dayGroups: ('Today' | 'Yesterday' | 'Last 7 days' | 'Earlier')[] = [
    'Today',
    'Yesterday',
    'Last 7 days',
    'Earlier',
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* HEADER */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 855, fontFamily: 'Outfit, sans-serif', color: 'text.primary', mb: 0.5 }}>
            Notification Desk
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your alerts, application updates, and payment releases.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          {dbNotifications.some(n => !n.isRead) && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<MarkEmailReadIcon />}
              onClick={handleMarkAllRead}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Mark All Read
            </Button>
          )}
          {selectedIds.length > 0 && (
            <>
              <Button
                variant="outlined"
                size="small"
                startIcon={<MarkEmailReadIcon />}
                onClick={handleMarkSelectedRead}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Mark Selected Read
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteSelected}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Delete Selected
              </Button>
            </>
          )}
        </Stack>
      </Box>

      {/* FILTER BUTTONS ROW */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
        <Chip
          label="All"
          onClick={() => setFilterType('All')}
          color={filterType === 'All' ? 'primary' : 'default'}
          sx={{ fontWeight: 800 }}
        />
        {['Applications', 'Proposals', 'Milestones', 'Payments', 'Messages', 'Disputes', 'System'].map((type) => (
          <Chip
            key={type}
            label={type}
            onClick={() => setFilterType(type)}
            color={filterType === type ? 'primary' : 'default'}
            sx={{ fontWeight: 800 }}
          />
        ))}
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        <Chip
          label="Unread only"
          onClick={() => setUnreadOnly(!unreadOnly)}
          color={unreadOnly ? 'secondary' : 'default'}
          variant={unreadOnly ? 'filled' : 'outlined'}
          sx={{ fontWeight: 800 }}
        />
      </Stack>

      {/* NOTIFICATIONS BOX */}
      <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 4, boxShadow: 'none' }}>
        <CardContent sx={{ p: 0 }}>
          {filteredNotifs.length > 0 && (
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <Checkbox
                checked={selectedIds.length === filteredNotifs.length && filteredNotifs.length > 0}
                indeterminate={selectedIds.length > 0 && selectedIds.length < filteredNotifs.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', ml: 1 }}>
                Select all visible ({filteredNotifs.length})
              </Typography>
            </Box>
          )}

          {filteredNotifs.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center', px: 2 }}>
              <NotificationsIcon color="disabled" sx={{ fontSize: 50, mb: 1.5 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
                No notifications yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {unreadOnly ? "You're all caught up." : "Nothing here yet. You'll see updates on applications, proposals, and payments as they happen."}
              </Typography>
            </Box>
          ) : (
            dayGroups.map((group) => {
              const groupNotifs = filteredNotifs.filter(n => getDayGroup(n.createdAt) === group);
              if (groupNotifs.length === 0) return null;

              return (
                <Box key={group}>
                  <Box sx={{ bgcolor: '#fafafa', px: 3, py: 1, borderBottom: '1px solid #f1f5f9' }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase' }}>
                      {group}
                    </Typography>
                  </Box>
                  <List sx={{ p: 0 }}>
                    {groupNotifs.map((n) => {
                      const actionLabel = getActionLabel(n.type);
                      return (
                        <ListItem
                          key={n.id}
                          sx={{
                            px: 3,
                            py: 2.5,
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 2,
                            bgcolor: n.isRead ? 'transparent' : 'rgba(37, 99, 235, 0.01)',
                            borderLeft: n.isRead ? 'none' : '4px solid #3b82f6',
                          }}
                        >
                          <Checkbox
                            checked={selectedIds.includes(n.id)}
                            onChange={(e) => handleSelectOne(n.id, e.target.checked)}
                            sx={{ mt: -0.5 }}
                          />
                          <Avatar sx={{
                            bgcolor: n.priority === 'CRITICAL' ? 'error.light' : n.priority === 'HIGH' ? 'warning.light' : 'primary.light',
                            color: n.priority === 'CRITICAL' ? 'error.main' : n.priority === 'HIGH' ? 'warning.main' : 'primary.main',
                            width: 40, height: 40
                          }}>
                            {getIcon(n.type)}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 0.5 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: n.priority === 'CRITICAL' ? 'error.main' : 'text.primary' }}>
                                {n.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">{formatRelativeTime(n.createdAt)}</Typography>
                            </Stack>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.825rem', mb: actionLabel && n.actionUrl ? 1.5 : 0 }}>
                              {n.body}
                            </Typography>
                            {actionLabel && n.actionUrl && (
                              <Link href={n.actionUrl} style={{ textDecoration: 'none' }} onClick={() => handleNotificationClick(n.id)}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700, px: 2.5 }}
                                >
                                  {actionLabel}
                                </Button>
                              </Link>
                            )}
                          </Box>
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              );
            })
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
