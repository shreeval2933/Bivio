import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb', // Rich Modern Blue
      light: '#60a5fa',
      dark: '#1d4ed8',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#0d9488', // Premium Teal
      light: '#2dd4bf',
      dark: '#0f766e',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc', // Premium slate-50 background
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a', // Slate-900
      secondary: '#475569', // Slate-600
    },
    divider: '#f1f5f9', // Slate-100
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.01em',
    },
    h1: { fontFamily: 'Outfit, Inter, sans-serif', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' },
    h2: { fontFamily: 'Outfit, Inter, sans-serif', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' },
    h3: { fontFamily: 'Outfit, Inter, sans-serif', fontWeight: 700, letterSpacing: '-0.019em', color: '#0f172a' },
    h4: { fontFamily: 'Outfit, Inter, sans-serif', fontWeight: 700, letterSpacing: '-0.015em', color: '#0f172a' },
    h5: { fontFamily: 'Outfit, Inter, sans-serif', fontWeight: 700, letterSpacing: '-0.01em', color: '#0f172a' },
    h6: { fontFamily: 'Outfit, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.01em', color: '#0f172a' },
    subtitle1: { fontWeight: 500, letterSpacing: '0.005em' },
    subtitle2: { fontWeight: 600, letterSpacing: '0.005em' },
    body1: { letterSpacing: '0.005em', lineHeight: 1.6 },
    body2: { letterSpacing: '0.005em', lineHeight: 1.5 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 20px',
          fontWeight: 600,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)',
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #f1f5f9',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
          borderRadius: 16,
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 8px -1px rgba(15, 23, 42, 0.03)',
          border: '1px solid #f1f5f9',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #f1f5f9',
          color: '#0f172a',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
  },
});

