'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
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

  return <>{children}</>;
}
