'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Stack,
  Box,
  Button,
  TextField,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
  CircularProgress,
  IconButton,
  Tooltip,
  InputAdornment,
  Divider,
} from '@mui/material';

// Icons
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HistoryIcon from '@mui/icons-material/History';

import {
  useGetSettingsQuery,
  useGetSettingsAuditLogsQuery,
  useUpdateSettingMutation,
} from '@/store/api/adminApi';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { showNotification } from '@/store/slices/notificationSlice';
import { formatDate, formatTimeAgo } from '@/lib/format';

interface ConfigSchema {
  key: string;
  label: string;
  description: string;
  type: 'DECIMAL' | 'PERCENTAGE' | 'INTEGER' | 'BOOLEAN';
  section: 'FEES' | 'THRESHOLDS' | 'FLAGS' | 'POLICY';
  defaultValue: string;
  adornment?: string;
}

const SETTING_SCHEMAS: ConfigSchema[] = [
  // Fees
  {
    key: 'JOB_POSTING_FEE',
    label: 'Job posting fee',
    description: 'One-time fee charged to recruiter accounts before a job listing becomes public on the platform.',
    type: 'DECIMAL',
    section: 'FEES',
    defaultValue: '2500',
    adornment: '₹',
  },
  {
    key: 'CANDIDATE_PROFILE_FEE',
    label: 'Candidate registration fee',
    description: 'One-time registration unlock fee for candidate profile visibility and direct applications.',
    type: 'DECIMAL',
    section: 'FEES',
    defaultValue: '499',
    adornment: '₹',
  },
  {
    key: 'PLATFORM_FEE_PERCENT',
    label: 'Freelance platform commission',
    description:
      'Percentage taken on each freelance milestone release payment. Changing this rate only applies to new contracts signed after this change.',
    type: 'PERCENTAGE',
    section: 'FEES',
    defaultValue: '10',
    adornment: '%',
  },

  // Thresholds
  {
    key: 'KYC_THRESHOLD',
    label: 'KYC required above contract value',
    description: 'Contract value threshold above which identity & business verification becomes mandatory.',
    type: 'DECIMAL',
    section: 'THRESHOLDS',
    defaultValue: '500000',
    adornment: '₹',
  },
  {
    key: 'PAYOUT_MINIMUM',
    label: 'Payout minimum transfer',
    description: 'Minimum allowed wallet balance required to request a bank transfer or UPI payout.',
    type: 'DECIMAL',
    section: 'THRESHOLDS',
    defaultValue: '500',
    adornment: '₹',
  },
  {
    key: 'OFFER_EXPIRY_DAYS',
    label: 'Offer expiry duration',
    description: 'Duration in days after which an unanswered job offer automatically expires.',
    type: 'INTEGER',
    section: 'THRESHOLDS',
    defaultValue: '7',
    adornment: 'days',
  },
  {
    key: 'INVITATION_EXPIRY_DAYS',
    label: 'Invitation expiry duration',
    description: 'Duration in days after which a sent candidate interview invitation automatically expires.',
    type: 'INTEGER',
    section: 'THRESHOLDS',
    defaultValue: '7',
    adornment: 'days',
  },
  {
    key: 'REVIEW_PUBLISH_DAYS',
    label: 'Review double-blind window',
    description: 'Days reviews remain hidden until published or until both parties complete their feedback.',
    type: 'INTEGER',
    section: 'THRESHOLDS',
    defaultValue: '14',
    adornment: 'days',
  },
  {
    key: 'DISPUTE_SLA_HOURS',
    label: 'Dispute resolution SLA',
    description: 'Target hours within which an administrator is required to review and resolve open escrow disputes.',
    type: 'INTEGER',
    section: 'THRESHOLDS',
    defaultValue: '48',
    adornment: 'hours',
  },

  // Feature Flags
  {
    key: 'FEATURE_FREELANCER_SEARCH',
    label: 'Freelancer discovery page enabled',
    description: 'Toggles visibility of recruiter freelancer discovery search dashboard.',
    type: 'BOOLEAN',
    section: 'FLAGS',
    defaultValue: 'true',
  },
  {
    key: 'FEATURE_CHAT',
    label: 'Direct chat & messaging enabled',
    description: 'Platform-wide chat killswitch in case of server system/WebSockets maintenance.',
    type: 'BOOLEAN',
    section: 'FLAGS',
    defaultValue: 'true',
  },
  {
    key: 'FEATURE_REGISTRATIONS_OPEN',
    label: 'New registrations enabled',
    description: 'Emergency shutdown toggle for new accounts creation under spam/abuse spikes.',
    type: 'BOOLEAN',
    section: 'FLAGS',
    defaultValue: 'true',
  },

  // Review Policy
  {
    key: 'REVIEW_MIN_RATING',
    label: 'Minimum review rating score',
    description: 'Fixed absolute lower bounds score for platform reviews.',
    type: 'INTEGER',
    section: 'POLICY',
    defaultValue: '1',
    adornment: 'stars',
  },
  {
    key: 'REVIEW_MAX_RATING',
    label: 'Maximum review rating score',
    description: 'Fixed absolute upper bounds score for platform reviews.',
    type: 'INTEGER',
    section: 'POLICY',
    defaultValue: '5',
    adornment: 'stars',
  },
  {
    key: 'REVIEW_EDIT_ALLOWED',
    label: 'Allow review edits before publish',
    description: 'Permits modification of written feedback before public disclosure.',
    type: 'BOOLEAN',
    section: 'POLICY',
    defaultValue: 'false',
  },
];

export default function AdminSettingsPage() {
  const dispatch = useAppDispatch();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // API Queries
  const { data: apiSettings, isLoading: settingsLoading, isFetching, refetch: refetchSettings } = useGetSettingsQuery();
  const { data: auditLogs = [], refetch: refetchLogs } = useGetSettingsAuditLogsQuery();
  const [updateSetting, { isLoading: isUpdating }] = useUpdateSettingMutation();

  // Local setting values mapping
  const [values, setValues] = useState<Record<string, string>>({});
  const [timestamps, setTimestamps] = useState<Record<string, string>>({});

  // Confirmation modal state
  const [pendingSave, setPendingSave] = useState<{
    key: string;
    label: string;
    from: string;
    to: string;
    adornment?: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    document.title = 'Platform Settings — Bivio Admin';
  }, []);

  // Merge live backend settings with standard schemas
  useEffect(() => {
    if (!apiSettings) return;

    const valMap: Record<string, string> = {};
    const timeMap: Record<string, string> = {};

    SETTING_SCHEMAS.forEach((schema) => {
      const matched = apiSettings.find((s) => s.key === schema.key);
      valMap[schema.key] = matched ? matched.value : schema.defaultValue;
      if (matched?.updatedAt) {
        timeMap[schema.key] = matched.updatedAt;
      }
    });

    setValues(valMap);
    setTimestamps(timeMap);
  }, [apiSettings]);

  const handleValueChange = (key: string, newValue: string) => {
    setValues((prev) => ({ ...prev, [key]: newValue }));
  };

  const handleSaveClick = (item: ConfigSchema) => {
    const currentValue = values[item.key];
    const previousMatched = apiSettings?.find((s) => s.key === item.key);
    const previousValue = previousMatched ? previousMatched.value : item.defaultValue;

    if (currentValue === previousValue) return;

    // Trigger confirmation modal for sensitive Fee/Threshold settings
    if (item.section === 'FEES' || item.section === 'THRESHOLDS') {
      setPendingSave({
        key: item.key,
        label: item.label,
        from: previousValue,
        to: currentValue,
        adornment: item.adornment,
      });
    } else {
      executeSave(item.key, currentValue);
    }
  };

  const executeSave = async (key: string, value: string) => {
    try {
      await updateSetting({ key, value }).unwrap();
      const schema = SETTING_SCHEMAS.find((s) => s.key === key);

      dispatch(
        showNotification({
          message: `${schema?.label || key} updated successfully.`,
          severity: 'success',
        })
      );

      setPendingSave(null);
      refetchSettings();
      refetchLogs();
    } catch (err: any) {
      dispatch(
        showNotification({
          message: err?.data?.message || 'Failed to update setting.',
          severity: 'error',
        })
      );
    }
  };

  const handleRefreshAll = () => {
    refetchSettings();
    refetchLogs();
  };

  const filteredItems = useMemo(() => {
    const sectionMap = ['FEES', 'THRESHOLDS', 'FLAGS', 'POLICY'];
    const currentSection = sectionMap[activeTab];
    return SETTING_SCHEMAS.filter((item) => item.section === currentSection);
  }, [activeTab]);

  if (!mounted) return null;

  if (settingsLoading) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading platform configuration settings...
          </Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{ mb: 4 }}
        gap={2}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 900, fontFamily: 'Outfit, sans-serif', color: '#0f172a', mb: 0.5 }}
          >
            Platform Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure fees, compliance thresholds, system policy enforcements, and feature flag killswitches.
          </Typography>
        </Box>

        <Tooltip title="Refresh Configuration">
          <IconButton
            onClick={handleRefreshAll}
            disabled={isFetching}
            sx={{
              bgcolor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              '&:hover': { bgcolor: '#e2e8f0' },
            }}
          >
            <RefreshIcon sx={{ color: '#475569' }} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Tabs Menu */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
          <Tab label="Fees & Commissions" sx={{ fontWeight: 800 }} />
          <Tab label="System Thresholds" sx={{ fontWeight: 800 }} />
          <Tab label="Feature Flags" sx={{ fontWeight: 800 }} />
          <Tab label="Review Policies" sx={{ fontWeight: 800 }} />
        </Tabs>
      </Box>

      <Grid container spacing={4}>
        {/* Left Column: Form Settings inputs */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            {filteredItems.map((item) => {
              const currentVal = values[item.key] ?? item.defaultValue;
              const lastUpdatedTime = timestamps[item.key];
              const previousMatched = apiSettings?.find((s) => s.key === item.key);
              const originalVal = previousMatched ? previousMatched.value : item.defaultValue;
              const hasChanged = currentVal !== originalVal;
              const isInvalid = currentVal === undefined || currentVal === null || String(currentVal).trim() === '';

              return (
                <Card
                  key={item.key}
                  sx={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 4,
                    boxShadow: 'none',
                    bgcolor: '#ffffff',
                    transition: 'all 0.2s ease',
                    '&:hover': { borderColor: '#cbd5e1' },
                  }}
                >
                  <CardContent sx={{ p: 3.5 }}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      justifyContent="space-between"
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                      gap={2}
                    >
                      <Box sx={{ flex: 1, pr: { sm: 2 } }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
                          {item.label}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, mb: 1 }}>
                          {item.description}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600 }}>
                          Key: <code>{item.key}</code>
                          {lastUpdatedTime && ` · Last modified: ${formatTimeAgo(lastUpdatedTime)}`}
                        </Typography>
                      </Box>

                      {/* Right Form Control Component */}
                      <Box sx={{ minWidth: { xs: '100%', sm: 220 }, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {item.type === 'BOOLEAN' ? (
                          <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={currentVal === 'true'}
                                  onChange={(e) => {
                                    const next = e.target.checked ? 'true' : 'false';
                                    handleValueChange(item.key, next);
                                    executeSave(item.key, next);
                                  }}
                                  color="primary"
                                />
                              }
                              label={
                                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                  {currentVal === 'true' ? 'Enabled' : 'Disabled'}
                                </Typography>
                              }
                            />
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <TextField
                              size="small"
                              fullWidth
                              value={currentVal}
                              onChange={(e) => handleValueChange(item.key, e.target.value)}
                              InputProps={{
                                startAdornment:
                                  item.adornment === '₹' ? (
                                    <InputAdornment position="start">₹</InputAdornment>
                                  ) : null,
                                endAdornment:
                                  item.adornment && item.adornment !== '₹' ? (
                                    <InputAdornment position="end">{item.adornment}</InputAdornment>
                                  ) : null,
                              }}
                            />
                            <Button
                              variant="contained"
                              size="medium"
                              startIcon={<SaveIcon />}
                              disabled={!hasChanged || isInvalid || isUpdating}
                              onClick={() => handleSaveClick(item)}
                              sx={{
                                textTransform: 'none',
                                fontWeight: 800,
                                borderRadius: 2.5,
                                px: 2,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Save
                            </Button>
                          </Stack>
                        )}
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </Grid>

        {/* Right Column: Settings Audit Log Trail */}
        <Grid item xs={12} lg={4}>
          <Card
            sx={{
              border: '1px solid #e2e8f0',
              borderRadius: 4,
              bgcolor: '#ffffff',
              boxShadow: 'none',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <CardContent sx={{ p: 3.5, display: 'flex', flexDirection: 'column', flex: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                <HistoryIcon sx={{ color: 'primary.main' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>
                  Settings Audit Trail
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2.5, display: 'block' }}>
                Real-time database log of configuration adjustments made by platform administrators.
              </Typography>

              <Divider sx={{ mb: 2.5 }} />

              {auditLogs.length === 0 ? (
                <Box
                  sx={{
                    my: 'auto',
                    py: 6,
                    textAlign: 'center',
                    border: '1px dashed #cbd5e1',
                    borderRadius: 3,
                    bgcolor: '#f8fafc',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    No setting modifications recorded yet in audit logs.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2} sx={{ overflowY: 'auto', maxHeight: 520, pr: 0.5 }}>
                  {auditLogs.map((log: any) => {
                    const diff = log.diff || {};
                    const actorName = log.actor?.fullName || 'Administrator';

                    return (
                      <Box
                        key={log.id}
                        sx={{
                          p: 2,
                          border: '1px solid #f1f5f9',
                          borderRadius: 2.5,
                          bgcolor: '#f8fafc',
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 0.8 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                              {diff.label || diff.key || log.action}
                            </Typography>
                          </Stack>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            {formatTimeAgo(log.createdAt)}
                          </Typography>
                        </Stack>

                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                          Set to: <strong style={{ color: '#0f172a' }}>{String(diff.newValue ?? '')}</strong>
                        </Typography>

                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
                          Updated by: {actorName}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* CONFIRMATION DIALOG MODAL FOR FEES & THRESHOLDS */}
      <Dialog
        open={pendingSave !== null}
        onClose={() => setPendingSave(null)}
        PaperProps={{ sx: { borderRadius: 4, p: 1, maxWidth: 500, width: '100%' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>
          Confirm Configuration Change
        </DialogTitle>
        <DialogContent>
          {pendingSave?.key === 'PLATFORM_FEE_PERCENT' && (
            <Alert severity="warning" sx={{ mb: 3, borderRadius: 2.5, fontWeight: 700 }}>
              Changing this commission rate will only apply to new freelance contracts signed after this change. Existing
              contracts maintain the agreed rate at signing.
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Change <strong>{pendingSave?.label}</strong> from{' '}
            <strong style={{ color: '#dc2626' }}>
              {pendingSave?.adornment === '₹' ? '₹' : ''}
              {pendingSave?.from}
              {pendingSave?.adornment && pendingSave?.adornment !== '₹' ? ` ${pendingSave.adornment}` : ''}
            </strong>{' '}
            to{' '}
            <strong style={{ color: '#16a34a' }}>
              {pendingSave?.adornment === '₹' ? '₹' : ''}
              {pendingSave?.to}
              {pendingSave?.adornment && pendingSave?.adornment !== '₹' ? ` ${pendingSave.adornment}` : ''}
            </strong>
            ?
          </Typography>

          <Typography variant="caption" color="text.secondary" display="block">
            This administrative change will be recorded in the system audit logs.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPendingSave(null)} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={isUpdating}
            onClick={() => pendingSave && executeSave(pendingSave.key, pendingSave.to)}
            sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
          >
            {isUpdating ? 'Saving...' : 'Confirm Change'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
