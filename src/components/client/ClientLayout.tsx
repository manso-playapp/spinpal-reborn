
'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/useAuth';
import Logo from '../logo';
import { Button } from '../ui/button';
import { LogOut, Bell, History, Settings, MessageSquareWarning } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, Firestore } from 'firebase/firestore';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut, userRole } = useAuth();
  const pathname = usePathname();
  const [gameName, setGameName] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchGameName = async () => {
      try {
        // Try to extract a gameId from known client routes
        const match = pathname.match(/\/client\/(?:juegos\/editar|clientes)\/([^/]+)/);
        const gameId = match?.[1];
        if (db && gameId) {
          const gameRef = doc(db as Firestore, 'games', gameId);
          const snap = await getDoc(gameRef);
          if (snap.exists()) {
            const data: any = snap.data();
            setGameName(data?.name || null);
          } else {
            setGameName(null);
          }
        } else {
          setGameName(null);
        }
      } catch (e) {
        setGameName(null);
      }
    };
    fetchGameName();
  }, [pathname]);

  const handleReportBug = () => {
    const subject = `quiero reportar el siguiente error en la ruleta de ${gameName || 'mi ruleta'}`;
    const body = `Describí con tus palabras el error que quieres reportar`;
    if (typeof window !== 'undefined') {
      window.location.href = `mailto:grupomanso@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  };

  return (
    <TooltipProvider>
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="flex h-16 w-full items-center justify-between px-4 md:px-6">
          <div className="flex gap-6 md:gap-10">
             <Link href={userRole.isSuperAdmin ? "/admin" : "/client/dashboard"}>
                <Logo className="h-10 w-auto text-primary" />
            </Link>
          </div>
          <div className="flex items-center justify-end space-x-4">
            <nav className="flex items-center space-x-1">
                <span className="text-sm text-muted-foreground hidden sm:inline-block">{user?.email}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleReportBug}>
                      <MessageSquareWarning className="h-5 w-5" />
                      <span className="sr-only">Reportar un problema</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reportar un problema</p>
                  </TooltipContent>
                </Tooltip>
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
