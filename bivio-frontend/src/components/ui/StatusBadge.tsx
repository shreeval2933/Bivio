'use client';

import { Chip } from '@mui/material';
import type { StatusDomain } from '@/types';

type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

/**
 * Status values COLLIDE across entities — OPEN is success for a Job but error
 * for a Dispute; ACTIVE is both a Contract state and an Account state. A flat
 * status->colour map cannot represent that, so the lookup is keyed by domain.
 */
const CONFIG: Record<StatusDomain, Record<string, { label: string; color: ChipColor }>> = {
  job: {
    DRAFT: { label: 'Draft', color: 'default' },
    // OQ-1: the posting fee is one-time per recruiter account, checked at
    // publish time — JobStatus has no PENDING_PAYMENT state. CONFIGURING
    // covers "basic info saved, stages/weightage not finished yet."
    CONFIGURING: { label: 'Configuring', color: 'warning' },
    OPEN: { label: 'Open', color: 'success' },
    CLOSED: { label: 'Closed', color: 'default' },
    CANCELLED: { label: 'Cancelled', color: 'error' },
  },
  application: {
    APPLIED: { label: 'Applied', color: 'primary' },
    IN_PROGRESS: { label: 'In Progress', color: 'info' },
    OFFERED: { label: 'Offer Received', color: 'warning' },
    HIRED: { label: 'Hired', color: 'success' },
    REJECTED: { label: 'Rejected', color: 'error' },
    WITHDRAWN: { label: 'Withdrawn', color: 'default' },
  },
  proposal: {
    SUBMITTED: { label: 'Submitted', color: 'primary' },
    SHORTLISTED: { label: 'Shortlisted', color: 'info' },
    ACCEPTED: { label: 'Accepted', color: 'success' },
    REJECTED: { label: 'Rejected', color: 'error' },
    WITHDRAWN: { label: 'Withdrawn', color: 'default' },
  },
  contract: {
    PENDING_FUNDING: { label: 'Pending Funding', color: 'warning' },
    ACTIVE: { label: 'Active', color: 'success' },
    COMPLETED: { label: 'Completed', color: 'success' },
    CANCELLED: { label: 'Cancelled', color: 'error' },
    DISPUTED: { label: 'Disputed', color: 'error' },
  },
  milestone: {
    PENDING: { label: 'Pending', color: 'default' },
    FUNDED: { label: 'Funded', color: 'info' },
    SUBMITTED: { label: 'Submitted', color: 'primary' },
    REVISION_REQUESTED: { label: 'Revision Requested', color: 'warning' },
    APPROVED: { label: 'Approved', color: 'success' },
    PAID: { label: 'Paid', color: 'success' },
    DISPUTED: { label: 'Disputed', color: 'error' },
  },
  escrow: {
    HELD: { label: 'In Escrow', color: 'info' },
    FROZEN: { label: 'Frozen', color: 'error' },
    RELEASED: { label: 'Released', color: 'success' },
    REFUNDED: { label: 'Refunded', color: 'warning' },
  },
  dispute: {
    OPEN: { label: 'Open', color: 'error' },
    UNDER_REVIEW: { label: 'Under Review', color: 'warning' },
    RESOLVED: { label: 'Resolved', color: 'success' },
    ESCALATED: { label: 'Escalated', color: 'error' },
  },
  account: {
    PENDING_VERIFICATION: { label: 'Pending Verification', color: 'warning' },
    ACTIVE: { label: 'Active', color: 'success' },
    SUSPENDED: { label: 'Suspended', color: 'warning' },
    BANNED: { label: 'Banned', color: 'error' },
    DELETED: { label: 'Deleted', color: 'default' },
  },
  payout: {
    REQUESTED: { label: 'Requested', color: 'default' },
    PROCESSING: { label: 'Processing', color: 'warning' },
    PAID: { label: 'Paid', color: 'success' },
    FAILED: { label: 'Failed', color: 'error' },
  },
  offer: {
    SENT: { label: 'Offer Sent', color: 'warning' },
    ACCEPTED: { label: 'Accepted', color: 'success' },
    REJECTED: { label: 'Rejected', color: 'error' },
    WITHDRAWN: { label: 'Withdrawn', color: 'default' },
    EXPIRED: { label: 'Expired', color: 'default' },
  },
  invite: {
    SENT: { label: 'Invited', color: 'primary' },
    ACCEPTED: { label: 'Accepted', color: 'success' },
    DECLINED: { label: 'Declined', color: 'error' },
    EXPIRED: { label: 'Expired', color: 'default' },
  },
  interview: {
    SCHEDULED: { label: 'Scheduled', color: 'primary' },
    RESCHEDULED: { label: 'Rescheduled', color: 'warning' },
    COMPLETED: { label: 'Completed', color: 'success' },
    CANCELLED: { label: 'Cancelled', color: 'error' },
    NO_SHOW: { label: 'No Show', color: 'error' },
  },
  verification: {
    NOT_STARTED: { label: 'Not Started', color: 'default' },
    PENDING: { label: 'Pending Review', color: 'warning' },
    APPROVED: { label: 'Approved', color: 'success' },
    REJECTED: { label: 'Rejected', color: 'error' },
    MANUAL_REVIEW: { label: 'Manual Review', color: 'warning' },
  },
};

interface StatusBadgeProps {
  /** Which entity this status belongs to — disambiguates colliding values. */
  domain: StatusDomain;
  status: string;
  size?: 'small' | 'medium';
}

export default function StatusBadge({ domain, status, size = 'small' }: StatusBadgeProps) {
  const config = CONFIG[domain]?.[status] ?? { label: status, color: 'default' as ChipColor };
  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      sx={{ fontWeight: 700, fontSize: size === 'small' ? '0.7rem' : '0.8rem' }}
    />
  );
}
