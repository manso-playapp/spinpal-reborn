
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Gamepad2, Users, Link as LinkIcon, Copy, AlertTriangle, Settings } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '../ui/separator';

interface Game {
  id: string;
  name: string;
  status: 'activo' | 'demo';
  plays: number;
  prizesAwarded: number;
  clientName?: string;
  clientEmail?: string;
}

export default function ClientDashboard() {
  const { user, isSuperAdmin } = useAuth();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonatedEmail, setImpersonatedEmail] = useState<string | null>(null);
  const [viewTitle, setViewTitle] = useState('Mis Juegos');

  useEffect(() => {
    const clientEmailParam = searchParams.get('clientEmail');
    const clientNameParam = searchParams.get('clientName');

    if (clientEmailParam && isSuperAdmin) {
        setImpersonatedEmail(clientEmailParam);
        const title = clientNameParam ? `Juegos de: ${clientNameParam}` : `Juegos de: ${clientEmailParam}`;
        setViewTitle(title);
    } else if (user) {
        setImpersonatedEmail(user.email);
    }

  }, [searchParams, isSuperAdmin, user]);

  useEffect(() => {
            if (!impersonatedEmail) {
                    if (!user) setLoading(true);
                    else setLoading(false);
                    return;
            };

            setLoading(true);
    setLoading(true);
            if (!db) {
                setLoading(false);
                toast({
                    title: 'Error de conexión',
                    description: 'No se pudo conectar a la base de datos.',
                    variant: 'destructive',
                });
                return;
            }

    const q = query(
      collection(db, 'games'), 
      where('clientEmail', '==', impersonatedEmail)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const gamesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Game[];
        
        if (!isSuperAdmin && gamesData.length > 0 && gamesData[0].clientName) {
            setViewTitle(`Panel de: ${gamesData[0].clientName}`);
        } else if (!isSuperAdmin) {
            setViewTitle('Mis Juegos');
        }

        setGames(gamesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching client games: ', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [impersonatedEmail, user, isSuperAdmin]);

  const getGameUrl = (gameId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/juego/${gameId}`;
    }
    return `/juego/${gameId}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
        title: "¡Enlace Copiado!",
        description: "El enlace público del juego ha sido copiado a tu portapapeles.",
    });
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="font-headline text-2xl font-semibold">{viewTitle}</h1>
                <p className="text-muted-foreground">Aquí puedes ver y configurar tus campañas activas.</p>
            </div>
             {isSuperAdmin && impersonatedEmail && (
                <Button variant="outline" asChild>
                    <Link href="/admin">Volver al Panel de Admin</Link>
                </Button>
            )}
        </div>

        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Skeleton className="h-80 w-full" />
                <Skeleton className="h-80 w-full" />
            </div>
        ) : games.length === 0 ? (
            <div className="mt-8 p-8 text-center border-2 border-dashed border-border rounded-lg">
                <Gamepad2 className="mx-auto h-12 w-12 text-muted-foreground" />
                <h2 className="mt-4 text-xl font-semibold">No tienes juegos asignados</h2>
                <p className="text-muted-foreground mt-2">
                    Contacta con el administrador para que te asigne tus campañas.
                </p>
            </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {games.map((game) => (
            <Card key={game.id} className="flex flex-col hover:border-primary/50 transition-colors duration-300 shadow-sm hover:shadow-lg">
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <CardTitle className="font-headline text-xl mb-1">{game.name}</CardTitle>
                             <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant={game.status === 'activo' ? 'default' : 'secondary'} className="text-xs">
                                    {game.status === 'activo' ? 'Activo' : 'Demo'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                    <div className="flex justify-around text-center border-t border-b py-4">
                        <div className="px-2">
                            <p className="text-3xl font-bold">{game.plays || 0}</p>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Jugadas</p>
                        </div>
                        <div className="border-l"></div>
                        <div className="px-2">
                            <p className="text-3xl font-bold">{game.prizesAwarded || 0}</p>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Premios</p>
                        </div>
                    </div>
                     {game.status === 'demo' && (
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md text-center text-xs text-yellow-700 dark:text-yellow-400">
                            <p className="font-bold flex items-center justify-center gap-2"><AlertTriangle className="h-4 w-4" />Modo Demo</p>
                            <p>El juego no registrará participantes ni enviará premios reales.</p>
                        </div>
                    )}
                </CardContent>
                <Separator />
                <CardFooter className="p-4 grid gap-2">
                     <Button asChild className="w-full">
                        <Link href={`/client/juegos/editar/${game.id}`}><Settings className="mr-2 h-4 w-4"/> Configurar Juego</Link>
                    </Button>
                    <div className="grid grid-cols-2 gap-2 w-full">
                        <Button asChild variant="secondary">
                            <Link href={`/client/clientes/${game.id}`}><Users className="mr-2 h-4 w-4" /> Participantes</Link>
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="secondary"><LinkIcon className="mr-2 h-4 w-4" /> TV Link</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Enlace Público del Juego</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Usa este enlace para mostrar la ruleta en una pantalla o TV.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="flex items-center space-x-2">
                                    <Input value={getGameUrl(game.id)} readOnly />
                                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(getGameUrl(game.id))}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cerrar</AlertDialogCancel>
                                    <AlertDialogAction asChild>
                                        <Link href={getGameUrl(game.id)} target="_blank">
                                            Abrir enlace
                                        </Link>
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardFooter>
            </Card>
            ))}
        </div>
        )}
    </main>
  );
}
