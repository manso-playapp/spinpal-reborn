'use client';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, PlusCircle } from 'lucide-react';

export default function AdminDashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <h1 className="font-headline text-2xl font-semibold">Dashboard</h1>
        <div className="ml-auto flex items-center gap-2">
           <Button size="sm" variant="outline" className="h-7 gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Crear Juego
            </span>
          </Button>
          <Button onClick={signOut} variant="outline" size="icon">
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Logout</span>
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-0">
        <div className="p-4 border-2 border-dashed border-border rounded-lg">
          <div className="text-center">
             <h2 className="text-xl font-semibold">¡Bienvenido, {user?.displayName || user?.email}!</h2>
            <p className="text-muted-foreground mt-2">
                Aquí gestionarás tus ruletas. Próximamente verás aquí la lista de tus juegos.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
