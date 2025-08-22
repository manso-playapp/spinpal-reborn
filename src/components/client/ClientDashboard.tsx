'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Gamepad2, Users, Link as LinkIcon, Copy, AlertTriangle, Settings, Mail } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { ClientEmailList } from './EmailList';

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
  const { user, userRole } = useAuth();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonatedEmail, setImpersonatedEmail] = useState<string | null>(null);
  const [viewTitle, setViewTitle] = useState('Mis Juegos');

  useEffect(() => {
    const clientEmailParam = searchParams.get('clientEmail');
    const clientNameParam = searchParams.get('clientName');

    if (clientEmailParam && userRole.isSuperAdmin) {
        setImpersonatedEmail(clientEmailParam);
        const title = clientNameParam ? `Juegos de: ${clientNameParam}` : `Juegos de: ${clientEmailParam}`;
        setViewTitle(title);
    } else if (user) {
        setImpersonatedEmail(user.email);
    }
  }, [searchParams, userRole.isSuperAdmin, user]);

  useEffect(() => {
    let isSubscribed = true;
    let unsubscribe: (() => void) | undefined;

    const setupSubscription = async () => {
      if (!impersonatedEmail) {
          if (!user) setLoading(true);
          else setLoading(false);
          return;
      }

      if (!db) {
          setLoading(false);
          toast({
              title: 'Error de conexión',
              description: 'No se pudo conectar a la base de datos.',
              variant: 'destructive',
          });
          return;
      }

      setLoading(true);

      const q = query(
        collection(db, 'games'), 
        where('clientEmail', '==', impersonatedEmail)
      );

      unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          if (!isSubscribed) return;
        const gamesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Game[];
        
        if (!userRole.isSuperAdmin && gamesData.length > 0 && gamesData[0].clientName) {
            setViewTitle(`Panel de: ${gamesData[0].clientName}`);
        } else if (!userRole.isSuperAdmin) {
            setViewTitle('Mis Juegos');
        }

          if (isSubscribed) {
            setGames(gamesData);
            setLoading(false);
          }
        },
        (error) => {
          console.error('Error fetching client games: ', error);
          if (isSubscribed) {
            setLoading(false);
          }
        }
      );
    };

    setupSubscription();

    return () => {
      isSubscribed = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [impersonatedEmail, user, userRole.isSuperAdmin, toast, db]);

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
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="font-headline text-3xl font-semibold tracking-tight">{viewTitle}</h1>
                <p className="text-muted-foreground mt-1">Panel de control de tus campañas activas</p>
            </div>
            {userRole.isSuperAdmin && impersonatedEmail && (
                <Button variant="outline" asChild>
                    <Link href="/admin">Volver al Panel de Admin</Link>
                </Button>
            )}
        </div>

        {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <Skeleton className="h-[400px] w-full" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        ) : games.length === 0 ? (
            <div className="mt-8 p-12 text-center border-2 border-dashed border-border rounded-lg bg-muted/50">
                <Gamepad2 className="mx-auto h-16 w-16 text-muted-foreground" />
                <h2 className="mt-6 text-2xl font-semibold">No tienes juegos asignados</h2>
                <p className="text-muted-foreground mt-3 max-w-md mx-auto">
                    Contacta con el administrador para que te asigne tus campañas y empieza a recibir participantes.
                </p>
            </div>
        ) : (
            <>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                    {games.map((game) => (
                        <Card key={game.id} className="group flex flex-col hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-lg overflow-hidden">
                            <CardHeader className="pb-0">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <CardTitle className="font-headline text-2xl">{game.name}</CardTitle>
                                            <Badge 
                                                variant={game.status === 'activo' ? 'default' : 'secondary'} 
                                                className={`text-xs ${game.status === 'activo' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                            >
                                                {game.status === 'activo' ? 'Activo' : 'Demo'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-6 pt-6">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-primary/5 transition-colors group-hover:bg-primary/10">
                                        <p className="text-4xl font-bold text-primary mb-1">{game.plays || 0}</p>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider text-center">Participantes Totales</p>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-green-500/5 transition-colors group-hover:bg-green-500/10">
                                        <p className="text-4xl font-bold text-green-600 dark:text-green-500 mb-1">{game.prizesAwarded || 0}</p>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider text-center">Premios Entregados</p>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-blue-500/5 transition-colors group-hover:bg-blue-500/10">
                                        <p className="text-4xl font-bold text-blue-600 dark:text-blue-500 mb-1">
                                            {game.plays ? Math.round((game.prizesAwarded || 0) / game.plays * 100) : 0}%
                                        </p>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider text-center">Ratio de Premios</p>
                                    </div>
                                </div>
                                
                                {game.status === 'demo' && (
                                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                        <p className="font-medium flex items-center text-yellow-700 dark:text-yellow-400 mb-1">
                                            <AlertTriangle className="h-4 w-4 mr-2" />
                                            Modo Demo Activo
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Este es un ambiente de pruebas. No se registrarán participantes ni se enviarán premios reales.
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <Button asChild size="lg" className="h-auto py-4">
                                        <Link href={`/client/juegos/editar/${game.id}`} className="flex flex-col items-center gap-1">
                                            <Settings className="h-5 w-5"/>
                                            <span>Configurar</span>
                                            <span className="text-xs text-muted-foreground">Ajustes del juego</span>
                                        </Link>
                                    </Button>
                                    <Button asChild size="lg" variant="secondary" className="h-auto py-4">
                                        <Link href={`/client/clientes/${game.id}`} className="flex flex-col items-center gap-1">
                                            <Users className="h-5 w-5" />
                                            <span>Participantes</span>
                                            <span className="text-xs text-muted-foreground">Ver listado</span>
                                        </Link>
                                    </Button>
                                </div>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" className="w-full">
                                            <LinkIcon className="mr-2 h-4 w-4" /> Obtener Link para TV
                                        </Button>
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
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                onClick={() => copyToClipboard(getGameUrl(game.id))}
                                            >
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
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="mt-12">
                    <Card>
                        <CardHeader className="border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="h-5 w-5" />
                                Registro de Correos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <ClientEmailList />
                        </CardContent>
                    </Card>
                </div>
            </>
        )}
    </main>
  );
}
