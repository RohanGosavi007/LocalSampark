'use client';
import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export default function RoleRoute({ allowedRoles, children }) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (user && user.role) {
        if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && !allowedRoles.includes(user.role)) {
          router.replace('/unauthorized'); // or redirect to their home
        }
      }
    }
  }, [isAuthenticated, isLoading, user, router, allowedRoles]);

  if (isLoading || !isAuthenticated) return null;

  if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && !allowedRoles.includes(user.role)) {
    return null; // Don't render children while redirecting
  }

  return <>{children}</>;
}
