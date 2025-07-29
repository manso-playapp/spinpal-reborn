
'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/useAuth';
import Logo from '../logo';
import { Button } from '../ui/button';
import { LogOut, Bell, History, Settings } from 'lucide-react';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut, isSuperAdmin } = useAuth();

  return (
    <TooltipProvider>
    <div className="flex min-h-screen flex-col">
       <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
          <div className="flex gap-6 md:gap-10">
             <Link href={isSuperAdmin ? "/admin" : "/client/dashboard"}>
                <Logo className="h-10 w-auto text-primary" />
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-1">
                <span className="text-sm text-muted-foreground hidden sm:inline-block">{user?.email}</span>
                 <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/client/changelog">
                            <History className="h-5 w-5" />
                            <span className="sr-only">Historial de Cambios</span>
                        </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ver historial de cambios</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={signOut}>
                            <LogOut className="h-5 w-5" />
                            <span className="sr-only">Cerrar Sesión</span>
                        </Button>
                    </TooltipTrigger>
                     <TooltipContent>
                        <p>Cerrar Sesión</p>
                    </TooltipContent>
                </Tooltip>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
    </TooltipProvider>
  );
}
