import { Role } from '@/types';

export const hasRole = (userRole: Role | undefined, allowedRoles: Role[]): boolean => {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
};
