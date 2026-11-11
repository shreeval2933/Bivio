'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Container,
  Grid,
  Card,
  Box,
  Typography,
  Stack,
  Avatar,
  TextField,
  IconButton,
  Badge,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Divider,
} from '@mui/material';

// Icons
import SendIcon from '@mui/icons-material/Send';
import LockIcon from '@mui/icons-material/Lock';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useSocket } from '@/hooks/useSocket';
import { showNotification } from '@/store/slices/notificationSlice';
import {
  notificationsApi,
  useGetChatRoomsQuery,
  useGetChatMessagesQuery,
  useSendChatMessageMutation,
  useMarkRoomReadMutation,
} from '@/store/api/notificationsApi';
import { useGetPublicSettingsQuery } from '@/store/api/profilesApi';

export default function RecruiterMessagesPage() {
  const dispatch = useDispatch();
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const { data: publicSettings } = useGetPublicSettingsQuery();
  const chatEnabled = publicSettings?.FEATURE_CHAT ?? true;

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mobile UI navigation state
  const [isMobileView, setIsMobileView] = useState(false);
  const [showChatPane, setShowChatPane] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        setIsMobileView(window.innerWidth < 900);
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');

  // API Queries & Mutations
  const { data: dbRooms = [], isLoading: roomsLoading } = useGetChatRoomsQuery(undefined, { 
    skip: !mounted,
    pollingInterval: 4000, // Fallback poll every 4 seconds to auto-update rooms
  });
  const { data: dbMessages = [], isLoading: messagesLoading } = useGetChatMessagesQuery(activeRoomId ?? '', {
    skip: !activeRoomId || !mounted,
    pollingInterval: 2500, // Fallback poll every 2.5 seconds to auto-update chat messages
  });

  const [sendChatMessage, { isLoading: isSending }] = useSendChatMessageMutation();
  const [markRoomRead] = useMarkRoomReadMutation();

  const socket = useSocket();

  // Scroll to bottom ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Set default active room on load
  useEffect(() => {
    if (dbRooms.length > 0 && !activeRoomId) {
      setActiveRoomId(dbRooms[0].id);
    }
  }, [dbRooms, activeRoomId]);

  // Mark room read when activeRoomId changes
  useEffect(() => {
    if (activeRoomId) {
      markRoomRead(activeRoomId).catch(() => {});
    }
  }, [activeRoomId, markRoomRead]);

  // Handle Socket message:new
  useEffect(() => {
    if (!socket || !activeRoomId) return;

    socket.emit('room:join', activeRoomId);

    const handleNewMessage = (msg: any) => {
      dispatch(
        notificationsApi.util.invalidateTags([
          { type: 'Chat', id: activeRoomId },
          { type: 'Chat', id: 'ROOMS' },
        ])
      );
    };

    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [socket, activeRoomId, dispatch]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [dbMessages, messagesLoading]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeRoomId) return;

    try {
      await sendChatMessage({
        roomId: activeRoomId,
        body: inputText.trim(),
      }).unwrap();

      setInputText('');
    } catch (err: any) {
      dispatch(
        showNotification({
          message: err?.data?.message || 'Failed to send message. Please try again.',
          severity: 'error',
        })
      );
    }
  };

  const handleSelectRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    if (isMobileView) {
      setShowChatPane(true);
    }
  };

  if (!mounted) return null;

  if (roomsLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading your messages...
          </Typography>
        </Stack>
      </Container>
    );
  }

  // Handle Empty State
  if (dbRooms.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 12 }}>
        <Paper sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: 4, bgcolor: 'rgba(241, 245, 249, 0.3)' }}>
          <SendIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2, transform: 'rotate(-45deg)' }} />
          <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'Outfit, sans-serif', mb: 1 }}>
            No conversations yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
            Your inbox is currently empty. Conversations will be automatically created here once you initiate contact with a freelancer regarding a proposal or active contract.
          </Typography>
        </Paper>
      </Container>
    );
  }

  const activeRoom = dbRooms.find((r) => r.id === activeRoomId) || dbRooms[0];
  const isCurrentlyLocked =
    activeRoom?.isLocked ||
    activeRoom?.contract?.status === 'COMPLETED' ||
    activeRoom?.contract?.status === 'CANCELLED';

  // Find partner details
  const partner = activeRoom?.participants.find((p) => p.id !== currentUser?.id) || activeRoom?.participants[0];
  const partnerName = partner?.fullName || 'Freelancer';
  const partnerInitials = partnerName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'F';

  // Filter rooms
  const filteredRooms = dbRooms.filter((room) => {
    const otherUser = room.participants.find((p) => p.id !== currentUser?.id) || room.participants[0];
    const otherName = otherUser?.fullName || '';
    return (
      otherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.contextLabel?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* HEADER ROW */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 855, fontFamily: 'Outfit, sans-serif', color: 'text.primary', mb: 0.5 }}>
          Inbox Messages
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Chat with your contracted freelancer partners, manage active project milestones, and secure payments.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ height: 'calc(100vh - 220px)', minHeight: 560 }}>
        {/* LEFT COLUMN: ROOMS LIST */}
        {(!isMobileView || !showChatPane) && (
          <Grid item xs={12} md={4} sx={{ height: '100%' }}>
            <Card sx={{ border: '1px solid #cbd5e1', borderRadius: 4, height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 'none' }}>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                <TextField
                  placeholder="Search project..."
                  fullWidth
                  size="small"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ bgcolor: '#ffffff', borderRadius: 2 }}
                />
              </Box>
              <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                {filteredRooms.length === 0 ? (
                  <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                      No conversations found.
                    </Typography>
                  </Box>
                ) : (
                  filteredRooms.map((room) => {
                    const isSelected = room.id === activeRoomId;
                    const otherUser = room.participants.find((p) => p.id !== currentUser?.id) || room.participants[0];
                    const otherName = otherUser?.fullName || 'Freelancer';
                    const otherInitials = otherName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'F';

                    return (
                      <Box
                        key={room.id}
                        onClick={() => handleSelectRoom(room.id)}
                        sx={{
                          p: 2.5,
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          bgcolor: isSelected ? 'rgba(37, 99, 235, 0.04)' : 'transparent',
                          borderLeft: isSelected ? '4px solid #2563eb' : '4px solid transparent',
                          '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.02)' },
                          transition: 'all 0.2s',
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Badge badgeContent={room.unreadCount} color="error">
                            <Avatar sx={{ bgcolor: isSelected ? 'primary.main' : 'secondary.main', fontWeight: 700 }}>
                              {otherInitials}
                            </Avatar>
                          </Badge>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="subtitle2" sx={{ fontWeight: room.unreadCount > 0 ? 800 : 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {otherName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {room.lastMessage ? new Date(room.lastMessage.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </Typography>
                            </Stack>
                            <Typography variant="caption" color="primary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                              {room.contextLabel}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {room.lastMessage?.body || 'No messages yet'}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    );
                  })
                )}
              </Box>
            </Card>
          </Grid>
        )}

        {/* RIGHT COLUMN: ACTIVE CONVERSATION */}
        {(!isMobileView || showChatPane) && (
          <Grid item xs={12} md={8} sx={{ height: '100%' }}>
            <Card sx={{ border: '1px solid #cbd5e1', borderRadius: 4, height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 'none' }}>
              
              {/* Header */}
              <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  {isMobileView && (
                    <IconButton onClick={() => setShowChatPane(false)} sx={{ mr: 0.5 }}>
                      <ArrowBackIcon />
                    </IconButton>
                  )}
                  <Avatar sx={{ bgcolor: 'secondary.main', fontWeight: 700 }}>
                    {partnerInitials}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 855 }}>
                      {partnerName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Context: {activeRoom?.contextLabel}
                    </Typography>
                  </Box>
                </Stack>
                
                <Stack direction="row" spacing={1} alignItems="center">
                  {isCurrentlyLocked && (
                    <Chip icon={<LockIcon sx={{ fontSize: '14px !important' }} />} label="Locked" color="error" variant="outlined" size="small" sx={{ fontWeight: 800 }} />
                  )}
                  {activeRoom?.roomType === 'CONTRACT' && activeRoom?.contractId && (
                    <Link href={`/recruiter/contracts/${activeRoom.contractId}`} style={{ textDecoration: 'none' }}>
                      <Button size="small" variant="outlined" sx={{ fontWeight: 750, textTransform: 'none', borderRadius: 2 }}>
                        Manage Contract
                      </Button>
                    </Link>
                  )}
                </Stack>
              </Box>

              {/* Locked warning banner */}
              {isCurrentlyLocked && (
                <Box sx={{ bgcolor: 'rgba(239, 68, 68, 0.05)', color: 'error.main', p: 1.5, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, borderBottom: '1px solid rgba(239, 68, 68, 0.15)' }}>
                  <LockIcon fontSize="small" />
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    This room is archived because the associated contract has ended. No new messages can be sent.
                  </Typography>
                </Box>
              )}

              {/* Message history */}
              <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto', bgcolor: '#fafafa', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {messagesLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={30} color="secondary" />
                  </Box>
                ) : (
                  [...dbMessages].reverse().map((msg) => {
                    if (msg.isSystem) {
                      return (
                        <Box
                          key={msg.id}
                          sx={{
                            alignSelf: 'center',
                            my: 1.5,
                            p: 1.5,
                            bgcolor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: 3.5,
                            maxWidth: '75%',
                            textAlign: 'center',
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 750, color: 'text.secondary' }}>
                            {msg.body}
                          </Typography>
                        </Box>
                      );
                    }

                    const isMe = msg.sender?.id === currentUser?.id;
                    return (
                      <Box
                        key={msg.id}
                        sx={{
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '70%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMe ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <Paper
                          sx={{
                            p: 1.5,
                            borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            bgcolor: isMe ? 'primary.main' : '#ffffff',
                            color: isMe ? '#ffffff' : 'text.primary',
                            border: isMe ? 'none' : '1px solid #cbd5e1',
                            boxShadow: 'none',
                          }}
                        >
                          <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                            {msg.body}
                          </Typography>
                        </Paper>
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5, px: 0.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Stack>
                      </Box>
                    );
                  })
                )}

                <div ref={messagesEndRef} />
              </Box>

              {/* Message Input Box */}
              <Divider />
              <Box sx={{ p: 2, bgcolor: '#f8fafc' }}>
                {!chatEnabled ? (
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 1, color: 'warning.main' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      Direct messaging is temporarily disabled for system maintenance.
                    </Typography>
                  </Stack>
                ) : isCurrentlyLocked ? (
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 1, color: 'text.secondary' }}>
                    <LockIcon fontSize="small" />
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      Contract closed. Messaging is archived.
                    </Typography>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      placeholder="Type your message here..."
                      fullWidth
                      size="small"
                      value={inputText}
                      disabled={isCurrentlyLocked || messagesLoading}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendMessage();
                      }}
                      sx={{ bgcolor: '#ffffff', borderRadius: 2 }}
                    />
                    <IconButton
                      color="primary"
                      onClick={handleSendMessage}
                      disabled={!inputText.trim() || isSending || messagesLoading}
                    >
                      <SendIcon />
                    </IconButton>
                  </Stack>
                )}
              </Box>
            </Card>
          </Grid>
        )}

      </Grid>
    </Container>
  );
}
