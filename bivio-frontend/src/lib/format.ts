import { format, formatDistanceToNow } from 'date-fns';

export const formatCurrency = (amount: string | number, currency = 'INR'): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(isNaN(num) ? 0 : num);
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  return format(new Date(dateString), 'MMM dd, yyyy');
};

export const formatTimeAgo = (dateString?: string): string => {
  if (!dateString) return '-';
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
};
