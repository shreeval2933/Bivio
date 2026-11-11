'use client';

import { formatCurrency } from '@/lib/format';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Box,
  Avatar,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';
import WifiIcon from '@mui/icons-material/Wifi';
import type { Job } from '@/types';
import Link from 'next/link';

interface JobCardProps {
  job: Job;
  compact?: boolean;
}

export default function JobCard({ job, compact = false }: JobCardProps) {
  const compensation =
    job.jobType === 'FULL_TIME'
      ? `${formatCurrency(job.salaryMin ?? '0', job.currency)} – ${formatCurrency(job.salaryMax ?? '0', job.currency)} / yr`
      : `${formatCurrency(job.budget ?? '0', job.currency)} ${job.budgetType === 'HOURLY' ? '/hr' : 'Fixed'}`;

  return (
    <Card
      component={Link}
      href={`/jobs/${job.id}`}
      sx={{
        display: 'block',
        textDecoration: 'none',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.1), 0 8px 16px -6px rgba(37, 99, 235, 0.05)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: compact ? 2 : 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Chip
                label={job.jobType === 'FULL_TIME' ? 'Full-Time' : 'Freelance'}
                size="small"
                color={job.jobType === 'FULL_TIME' ? 'primary' : 'secondary'}
                sx={{ fontWeight: 700, fontSize: '0.7rem' }}
              />
              {job.isRemote && (
                <Chip
                  icon={<WifiIcon sx={{ fontSize: '0.8rem !important' }} />}
                  label="Remote"
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
              {job.company?.isVerified && (
                <Chip label="✓ Verified" size="small" color="success" variant="outlined" sx={{ fontSize: '0.7rem' }} />
              )}
            </Stack>

            <Typography variant={compact ? 'subtitle1' : 'h6'} sx={{ fontWeight: 700, mb: 0.5, color: '#0f172a' }}>
              {job.title}
            </Typography>

            <Stack direction="row" spacing={2} sx={{ color: 'text.secondary', mb: compact ? 0 : 1 }}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <BusinessIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2">{job.company?.name ?? "—"}</Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <LocationOnIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2">{job.location}</Typography>
              </Stack>
            </Stack>

            {!compact && (
              <Stack direction="row" spacing={0.75} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
                {job.skills.slice(0, 4).map((s) => (
                  <Chip key={s.id} label={s.skill.name} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                ))}
              </Stack>
            )}
          </Box>

          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1d4f8c', whiteSpace: 'nowrap' }}>
              {compensation}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {job.vacancies} vacanc{job.vacancies === 1 ? 'y' : 'ies'}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
