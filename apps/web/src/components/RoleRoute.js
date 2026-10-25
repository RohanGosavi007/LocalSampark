'use client';
import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

// Roles are stored lower case ('super_admin'); the checks below compared them with
// 'SUPER_ADMIN' / 'ADMIN', so an administrator was not recognised as one and was
// sent to a page that did not exist. Compare case-insensitively.
const norm = (r) => String(r || '').toLowerCase();
const mayEnter = (user, allowedRoles) => {
  const role = norm(user && user.role);
  return role === 'super_admin' || role === 'admin' || (allowedRoles || []).map(norm).includes(role);
};

export default function RoleRoute({ allowedRoles, children }) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (user && user.role) {
        if (!mayEnter(user, allowedRoles)) {
          router.replace('/unauthorized');
        }
      }
    }
  }, [isAuthenticated, isLoading, user, router, allowedRoles]);

  if (isLoading || !isAuthenticated) return null;

  if (user && user.role && !mayEnter(user, allowedRoles)) {
    return null; // Don't render children while redirecting
  }

  return <>{children}</>;
}
