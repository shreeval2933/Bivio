'use client';

import { Box, Stepper, Step, StepLabel, Typography, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import type { Milestone, MilestoneStatus } from '@/types';
import { formatCurrency } from '@/lib/format';

function MilestoneIcon({ status }: { status: MilestoneStatus }) {
  if (status === 'PAID' || status === 'APPROVED') return <CheckCircleIcon color="success" />;
  if (status === 'FUNDED' || status === 'SUBMITTED') return <HourglassTopIcon color="primary" />;
  if (status === 'DISPUTED') return <LockIcon color="error" />;
  return null;
}

interface MilestoneTimelineProps {
  milestones: Milestone[];
  currency?: string;
}

export default function MilestoneTimeline({ milestones, currency = 'INR' }: MilestoneTimelineProps) {
  const activeStep = milestones.findIndex((m) => m.status !== 'PAID' && m.status !== 'APPROVED');

  return (
    <Stepper activeStep={activeStep} orientation="vertical" sx={{ '& .MuiStepConnector-line': { minHeight: 24 } }}>
      {milestones.map((milestone, idx) => (
        <Step key={milestone.id} completed={milestone.status === 'PAID'}>
          <StepLabel
            icon={<MilestoneIcon status={milestone.status} />}
            optional={
              <Typography variant="caption" color="text.secondary">
                {formatCurrency(milestone.amount, currency)} • Due: {milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : 'TBD'}
              </Typography>
            }
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {milestone.title}
              </Typography>
              <Chip
                label={milestone.status.replace('_', ' ')}
                size="small"
                color={
                  milestone.status === 'PAID' ? 'success' :
                  milestone.status === 'FUNDED' || milestone.status === 'SUBMITTED' ? 'primary' :
                  milestone.status === 'DISPUTED' ? 'error' : 'default'
                }
                sx={{ fontWeight: 700, fontSize: '0.65rem' }}
              />
            </Box>
          </StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}
