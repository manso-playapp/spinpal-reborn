'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthWrapperProps {
    children: React.ReactNode;
    adminOnly?: boolean;
    clientOnly?: boolean;
}

export default function AuthWrapper({ children, adminOnly = false, clientOnly = false }: AuthWrapperProps) {
  const { user, loading, userRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return; // Wait until loading is finished

    // If no user, redirect to login, unless they are already there or on the home page.
    if (!user) {
      if (pathname !== '/login' && pathname !== '/') {
        router.replace('/login');
      }
      return;
    }

    // If user is logged in, but trying to access a page they shouldn't
    if (adminOnly && !userRole.isAdmin) {
        console.log('Redirecting non-admin from admin page');
        router.replace('/client/dashboard'); // or a generic dashboard
    }

    if (clientOnly && userRole.isAdmin) {
        // For now, redirect admins away from client-only pages
        // TODO: Re-implement impersonation logic here if needed
        console.log('Redirecting admin from client page');
        router.replace('/admin/dashboard');
    }

  }, [user, loading, router, userRole.isAdmin, adminOnly, clientOnly, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="w-full max-w-4xl space-y-4 p-4">
          <Skeleton className="h-12 w-1/4" />
          <Skeleton className="h-40 w-full" />
          <div className="flex gap-4">
            <Skeleton className="h-40 w-1/2" />
            <Skeleton className="h-40 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  // Prevent flashing content for unauthorized users
  if (!user && (adminOnly || clientOnly)) {
    return null; 
  }
  
  if (adminOnly && !userRole.isAdmin) {
     return null; 
  }

  if (clientOnly && userRole.isAdmin) {
    return null;
  }


  return <>{children}</>;
}
