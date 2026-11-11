'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  CircularProgress,
  Button,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import LockIcon from '@mui/icons-material/Lock';
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

export default function CandidateMessagesPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user: currentUser } = useAppSelector((state) => state.auth);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');

  // API Queries & Mutations
  const { data: publicSettings } = useGetPublicSettingsQuery();
  const chatEnabled = publicSettings?.FEATURE_CHAT ?? true;
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
      // Invalidate tags so RTK Query refetches rooms and messages
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
            Your inbox is currently empty. Conversations will be automatically created here once a client initiates contact regarding an active contract or a scheduled interview.
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
  const partnerName = partner?.fullName || 'Client';
  const partnerInitials = partnerName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'C';

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* HEADER */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 855, fontFamily: 'Outfit, sans-serif', color: 'text.primary', mb: 0.5 }}>
          Inbox Messages
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Chat with your contracted clients, manage milestones, and collaborate on projects.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ height: 'calc(100vh - 180px)', minHeight: 560 }}>
        {/* LEFT COLUMN: ROOMS LIST */}
        <Grid item xs={12} md={4} sx={{ height: '100%' }}>
          <Card sx={{ border: '1px solid #cbd5e1', borderRadius: 4, height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 'none' }}>
            <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 850, fontFamily: 'Outfit, sans-serif' }}>
                Conversations
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
              {dbRooms.map((r) => {
                const isSelected = r.id === activeRoomId;
                const otherUser = r.participants.find((p) => p.id !== currentUser?.id) || r.participants[0];
                const otherName = otherUser?.fullName || 'Client';
                const otherInitials = otherName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'C';

                return (
                  <Box
                    key={r.id}
                    onClick={() => handleSelectRoom(r.id)}
                    sx={{
                      p: 2.5,
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f5f9',
                      bgcolor: isSelected ? 'rgba(37, 99, 235, 0.04)' : 'transparent',
                      borderLeft: isSelected ? '4px solid #2563eb' : '4px solid transparent',
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.02)' },
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Badge badgeContent={r.unreadCount} color="error">
                        <Avatar sx={{ bgcolor: isSelected ? 'primary.main' : 'secondary.main', fontWeight: 700 }}>
                          {otherInitials}
                        </Avatar>
                      </Badge>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {otherName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {r.lastMessage ? new Date(r.lastMessage.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="primary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                          {r.contextLabel}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {r.lastMessage?.body || 'No messages yet'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          </Card>
        </Grid>

        {/* RIGHT COLUMN: ACTIVE CONVERSATION */}
        <Grid item xs={12} md={8} sx={{ height: '100%' }}>
          <Card sx={{ border: '1px solid #cbd5e1', borderRadius: 4, height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 'none' }}>
            {/* Header info */}
            <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: 'secondary.main', fontWeight: 700 }}>{partnerInitials}</Avatar>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 855 }}>{partnerName}</Typography>
                  <Typography variant="caption" color="text.secondary">Context: {activeRoom?.contextLabel}</Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                {activeRoom?.roomType === 'CONTRACT' && activeRoom?.contractId && (
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    onClick={() => router.push(`/contracts/${activeRoom.contractId}`)}
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                  >
                    Manage Contract
                  </Button>
                )}
                {isCurrentlyLocked && (
                  <Chip icon={<LockIcon sx={{ fontSize: '14px !important' }} />} label="Locked" color="error" variant="outlined" size="small" sx={{ fontWeight: 800 }} />
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

            {/* Conversation Feed */}
            <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto', bgcolor: '#fafafa' }}>
              {messagesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={30} color="secondary" />
                </Box>
              ) : (
                <Stack spacing={2}>
                  {[...dbMessages].reverse().map((msg) => {
                    const isMe = msg.sender?.id === currentUser?.id;
                    const isSys = msg.isSystem;

                    if (isSys) {
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

                    const messageSenderInitials = (msg.sender?.fullName || 'Client').split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();

                    return (
                      <Stack
                        key={msg.id}
                        direction="row"
                        sx={{
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          flexDirection: isMe ? 'row-reverse' : 'row',
                          maxWidth: '75%',
                          gap: 2,
                        }}
                      >
                        <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', bgcolor: isMe ? 'primary.main' : 'secondary.main', fontWeight: 700 }}>
                          {isMe ? 'ME' : messageSenderInitials}
                        </Avatar>
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: isMe ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                            bgcolor: isMe ? 'primary.main' : '#ffffff',
                            color: isMe ? '#ffffff' : 'text.primary',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                            border: isMe ? 'none' : '1px solid #cbd5e1',
                          }}
                        >
                          <Typography variant="body2" sx={{ lineHeight: 1.4 }}>{msg.body}</Typography>
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center" sx={{ mt: 0.5, opacity: 0.8 }}>
                            <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
                              {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </Stack>
                        </Box>
                      </Stack>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </Stack>
              )}
            </Box>

            {/* Message input */}
            <Box sx={{ p: 2.5, bgcolor: '#ffffff', borderTop: '1px solid #cbd5e1' }}>
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
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <TextField
                    placeholder="Type your message..."
                    fullWidth
                    size="small"
                    value={inputText}
                    disabled={messagesLoading}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <IconButton
                    color="primary"
                    disabled={!inputText.trim() || isSending || messagesLoading}
                    onClick={handleSendMessage}
                  >
                    <SendIcon />
                  </IconButton>
                </Stack>
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
