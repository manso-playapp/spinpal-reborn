'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { LogOut, PlusCircle, Link as LinkIcon, Gamepad2, MoreHorizontal, Eye } from 'lucide-react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

interface Game {
  id: string;
  name: string;
  status: 'activo' | 'demo';
  plays: number;
  prizesAwarded: number;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  } | null;
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const superAdminEmail = 'grupomanso@gmail.com';
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'games'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const gamesData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Game[];
          setGames(gamesData);
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching games: ', error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    }
  }, [user]);

  const formatDate = (timestamp: Game['createdAt']) => {
    if (!timestamp) return 'Fecha no disponible';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <h1 className="font-headline text-xl font-semibold">Dashboard de Juegos</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="h-8 gap-1">
            <Link href="/admin/juegos/crear">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Crear Juego
              </span>
            </Link>
          </Button>
          {user && user.email === superAdminEmail && (
            <Button asChild size="sm" variant="outline" className="h-8 gap-1">
              <Link href="/conexiones">
                <LinkIcon className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Conexiones
                </span>
              </Link>
            </Button>
          )}
          <Button onClick={signOut} variant="outline" size="icon" className="h-8 w-8">
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Logout</span>
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-0">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 />
              Mis Juegos
            </CardTitle>
            <CardDescription>
              Aquí puedes ver y gestionar todos tus juegos de ruleta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ) : games.length === 0 ? (
                <div className="p-4 text-center border-2 border-dashed border-border rounded-lg">
                    <h2 className="text-xl font-semibold">Aún no tienes juegos</h2>
                    <p className="text-muted-foreground mt-2">
                        ¡Crea tu primer juego para empezar a verlo aquí!
                    </p>
                </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre del Juego</TableHead>
                    <TableHead className="hidden md:table-cell">Estado</TableHead>
                    <TableHead className="hidden md:table-cell text-center">Jugadas</TableHead>
                    <TableHead className="hidden md:table-cell text-center">Premios</TableHead>
                    <TableHead>
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {games.map((game) => (
                    <TableRow key={game.id}>
                      <TableCell className="font-medium">{game.name}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={game.status === 'activo' ? 'default' : 'secondary'} className={game.status === 'activo' ? 'bg-green-600 text-white' : ''}>
                          {game.status === 'activo' ? 'Activo' : 'Demo'}
                        </Badge>
                      </TableCell>
                       <TableCell className="hidden text-center md:table-cell">{game.plays || 0}</TableCell>
                       <TableCell className="hidden text-center md:table-cell">{game.prizesAwarded || 0}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                               <Link href={`/juego/${game.id}`} className="flex items-center" target="_blank">
                                <Eye className="mr-2 h-4 w-4" /> Ver Juego
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>Editar</DropdownMenuItem>
                            <DropdownMenuItem>Ver Clientes</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
