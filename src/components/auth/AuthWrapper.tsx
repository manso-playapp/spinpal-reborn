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
    if (loading) return;

    if (!user) {
      // Permitir acceso público a las rutas /juego/[id]
      if (pathname.startsWith('/juego/')) {
        return;
      }
      
      // Redirigir a la página principal si no es una ruta pública
      if (pathname !== '/login' && pathname !== '/') {
        router.replace('/');
      }
      return;
    }

    if (adminOnly && !userRole.isSuperAdmin) {
        // A non-admin user is trying to access an admin-only page
        router.replace('/client/dashboard');
    }

    if (clientOnly && userRole.isSuperAdmin) {
        // An admin is trying to access a client-only page.
        // We allow this for impersonation purposes. 
        // The page component will handle the specific logic.
    } else if (clientOnly && !userRole.isSuperAdmin && !pathname.startsWith('/client/dashboard')) {
        // A client is somewhere they shouldn't be, other than their dashboard.
        router.replace('/client/dashboard');
    }

  }, [user, loading, router, userRole.isSuperAdmin, adminOnly, clientOnly, pathname]);

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

  // Final check to prevent flashing content for unauthorized users
  if (!user && (adminOnly || clientOnly)) {
    return null; // Don't render anything if not logged in and page requires auth
  }
  
  if (adminOnly && !userRole.isSuperAdmin) {
     return null; // Or a specific loading/unauthorized component
  }


  return <>{children}</>;
}
