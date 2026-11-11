'use client';

import { useState } from 'react';
import {
  Dialog,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Divider,
  Box,
  Button,
  TextField,
  IconButton,
  Fade,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface GoogleMockPopupProps {
  open: boolean;
  onClose: () => void;
  onSelect: (credentialStr: string) => void;
}

export function GoogleMockPopup({ open, onClose, onSelect }: GoogleMockPopupProps) {
  const [customMode, setCustomMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSelectMock = (profile: { email: string; name: string; picture?: string }) => {
    const jsonStr = JSON.stringify(profile);
    const mockToken = 'mock_' + btoa(unescape(encodeURIComponent(jsonStr)));
    onSelect(mockToken);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email) {
      handleSelectMock({ name, email, picture: `https://api.dicebear.com/7.x/initials/svg?seed=${name}` });
      setCustomMode(false);
      setName('');
      setEmail('');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Fade}
      transitionDuration={250}
      PaperProps={{
        sx: {
          borderRadius: '8px',
          width: '100%',
          maxWidth: 400,
          p: '36px 40px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e0e0e0',
          position: 'relative',
          backgroundColor: '#ffffff',
          boxSizing: 'border-box',
        },
      }}
    >
      {/* Top Close Button */}
      <IconButton
        onClick={onClose}
        size="small"
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          color: '#5f6368',
          '&:hover': { backgroundColor: '#f1f3f4' },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      {/* Google Header Logo */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
        {/* Google Multicolored "G" Icon */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: 16 }}>
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c.81.63 1.89.96 3.01.96 1.48 0 2.73-.4 3.71-1.06l-3.57-2.77c-.87 2.6-3.3 4.53-6.16 4.53z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l2.85 2.22c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>

        {!customMode ? (
          <>
            <Typography variant="h5" sx={{ fontWeight: 400, color: '#202124', fontFamily: '"Google Sans", Roboto, Arial, sans-serif', mb: 1, letterSpacing: -0.2, fontSize: '1.5rem' }}>
              Choose an account
            </Typography>
            <Typography variant="body1" sx={{ color: '#5f6368', fontSize: '0.875rem' }}>
              to continue to <span style={{ color: '#1a73e8', fontWeight: 500 }}>Bivio</span>
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h5" sx={{ fontWeight: 400, color: '#202124', fontFamily: '"Google Sans", Roboto, Arial, sans-serif', mb: 1, fontSize: '1.5rem' }}>
              Sign in
            </Typography>
            <Typography variant="body1" sx={{ color: '#5f6368', fontSize: '0.875rem' }}>
              with your Google Account
            </Typography>
          </>
        )}
      </Box>

      {!customMode ? (
        <>
          <List sx={{ p: 0, mb: 3 }}>
            {/* Candidate Profile 1 */}
            <ListItemButton
              onClick={() => handleSelectMock({ name: 'Ram Kumar', email: 'ram@example.com' })}
              sx={{
                p: '12px 0',
                borderBottom: '1px solid #e0e0e0',
                transition: 'background-color 0.2s',
                '&:hover': { backgroundColor: 'transparent', '& .MuiTypography-root': { color: '#1a73e8', transition: 'color 0.2s' } },
              }}
            >
              <ListItemAvatar sx={{ minWidth: 44 }}>
                <Avatar
                  src="https://api.dicebear.com/7.x/initials/svg?seed=RK"
                  sx={{ width: 32, height: 32, border: '1px solid #dadce0' }}
                />
              </ListItemAvatar>
              <ListItemText
                primary="Ram Kumar"
                secondary="ram@example.com"
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500, color: '#3c4043' }}
                secondaryTypographyProps={{ fontSize: '0.75rem', color: '#5f6368' }}
              />
            </ListItemButton>

            {/* Candidate Profile 2 */}
            <ListItemButton
              onClick={() => handleSelectMock({ name: 'Shyam Singh', email: 'shyam@example.com' })}
              sx={{
                p: '12px 0',
                borderBottom: '1px solid #e0e0e0',
                transition: 'background-color 0.2s',
                '&:hover': { backgroundColor: 'transparent', '& .MuiTypography-root': { color: '#1a73e8', transition: 'color 0.2s' } },
              }}
            >
              <ListItemAvatar sx={{ minWidth: 44 }}>
                <Avatar
                  src="https://api.dicebear.com/7.x/initials/svg?seed=SS"
                  sx={{ width: 32, height: 32, border: '1px solid #dadce0' }}
                />
              </ListItemAvatar>
              <ListItemText
                primary="Shyam Singh"
                secondary="shyam@example.com"
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500, color: '#3c4043' }}
                secondaryTypographyProps={{ fontSize: '0.75rem', color: '#5f6368' }}
              />
            </ListItemButton>

            {/* Custom Account */}
            <ListItemButton
              onClick={() => setCustomMode(true)}
              sx={{
                p: '12px 0',
                borderBottom: '1px solid #e0e0e0',
                '&:hover': { backgroundColor: 'transparent' },
              }}
            >
              <ListItemAvatar sx={{ minWidth: 44 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#ffffff', color: '#5f6368', border: '1px solid #dadce0' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 8c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zm-6 4c.22-.72 3.31-2 6-2 2.69 0 5.78 1.28 6 2H3zm13-8h-3v2h3v3h2v-3h3v-2h-3V7h-2v3z" fill="currentColor"/>
                  </svg>
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary="Use another account"
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500, color: '#1a73e8' }}
              />
            </ListItemButton>
          </List>

          <Typography variant="caption" sx={{ color: '#5f6368', display: 'block', lineHeight: 1.5, mb: 3, fontSize: '0.75rem' }}>
            To continue, Google will share your name, email address, profile picture, and language preference with Bivio.
          </Typography>
        </>
      ) : (
        <Box component="form" onSubmit={handleCustomSubmit} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            fullWidth
            required
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: '4px',
              },
            }}
          />
          <TextField
            label="Email Address"
            type="email"
            fullWidth
            required
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{
              mb: 4,
              '& .MuiOutlinedInput-root': {
                borderRadius: '4px',
              },
            }}
          />
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              onClick={() => setCustomMode(false)}
              sx={{ textTransform: 'none', fontWeight: 600, color: '#1a73e8', fontSize: '0.875rem' }}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '4px',
                px: 3,
                backgroundColor: '#1a73e8',
                '&:hover': { backgroundColor: '#1557b0' },
                fontSize: '0.875rem',
              }}
            >
              Next
            </Button>
          </Box>
        </Box>
      )}

      {/* Google Footer */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, pt: 2, borderTop: '1px solid #e0e0e0' }}>
        <Typography variant="caption" sx={{ color: '#757575', cursor: 'pointer', '&:hover': { color: '#202124' }, fontSize: '0.7rem' }}>
          English (United States)
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Typography variant="caption" sx={{ color: '#757575', cursor: 'pointer', '&:hover': { color: '#202124' }, fontSize: '0.7rem' }}>
            Help
          </Typography>
          <Typography variant="caption" sx={{ color: '#757575', cursor: 'pointer', '&:hover': { color: '#202124' }, fontSize: '0.7rem' }}>
            Privacy
          </Typography>
          <Typography variant="caption" sx={{ color: '#757575', cursor: 'pointer', '&:hover': { color: '#202124' }, fontSize: '0.7rem' }}>
            Terms
          </Typography>
        </Box>
      </Box>
    </Dialog>
  );
}
