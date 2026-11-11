'use client';

import { Box, Typography, Stack } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 10,
        px: 4,
        textAlign: 'center',
        bgcolor: '#ffffff',
        border: '1px dashed #cbd5e1',
        borderRadius: 3,
      }}
    >
      <Box sx={{ color: '#94a3b8', mb: 2, fontSize: 64 }}>
        {icon ?? <InboxIcon fontSize="inherit" />}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#475569' }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: 3 }}>
          {description}
        </Typography>
      )}
      {action}
    </Box>
  );
}
