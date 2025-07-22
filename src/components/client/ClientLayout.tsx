
'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/useAuth';
import Logo from '../logo';
import { Button } from '../ui/button';
import { LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex min-h-screen flex-col">
       <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
          <div className="flex gap-6 md:gap-10">
            <Logo className="h-8 w-auto text-primary" />
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-1">
                <span className="text-sm text-muted-foreground hidden sm:inline-block">{user?.email}</span>
                <Button variant="ghost" size="icon" onClick={signOut}>
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Cerrar Sesión</span>
                </Button>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
