'use client';

import { useEffect, useState, startTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore';
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
import { useAdminI18n } from '@/context/AdminI18nContext';

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
  const { t } = useAdminI18n();
  
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonatedEmail, setImpersonatedEmail] = useState<string | null>(null);
  const [viewTitle, setViewTitle] = useState(t('dashboard'));

  useEffect(() => {
    const clientEmailParam = searchParams.get('clientEmail');
    const clientNameParam = searchParams.get('clientName');

    if (clientEmailParam && userRole.isSuperAdmin) {
        startTransition(() => {
            setImpersonatedEmail(clientEmailParam);
            const title = clientNameParam ? t('clientGamesOf', { name: clientNameParam }) : t('clientGamesOf', { name: clientEmailParam });
            setViewTitle(title);
        });
    } else if (user) {
        startTransition(() => {
            setImpersonatedEmail(user.email);
        });
    }
  }, [searchParams, userRole.isSuperAdmin, user, t]);

  useEffect(() => {
    let isSubscribed = true;
    let unsubscribe: (() => void) | undefined;

    const watchByAllowedIds = () => {
    const firestore = db;
    if (!firestore || !userRole.allowedGameIds || userRole.allowedGameIds.length === 0) {
      return false;
    }

      const filteredIds = userRole.allowedGameIds.filter(Boolean);
      if (filteredIds.length === 0) {
        return false;
      }

      setLoading(true);
      const gameMap = new Map<string, Game>();
      const unsubscribers = filteredIds.map((gameId) =>
        onSnapshot(
          doc(firestore, 'games', gameId),
          (docSnap) => {
            if (!isSubscribed) return;
            if (docSnap.exists()) {
              const data = docSnap.data() as Game;
              gameMap.set(gameId, { ...data, id: docSnap.id });
            } else {
              gameMap.delete(gameId);
            }
            setGames(Array.from(gameMap.values()));
            setLoading(false);
          },
          (error) => {
            console.error('Error fetching game by ID: ', gameId, error);
            if (isSubscribed) {
              setLoading(false);
            }
          }
        )
      );

      unsubscribe = () => {
        unsubscribers.forEach((fn) => fn && fn());
      };

      return true;
    };

    const watchByEmail = () => {
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

      const q = query(collection(db, 'games'), where('clientEmail', '==', impersonatedEmail));

      unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          if (!isSubscribed) return;
          const gamesData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Game[];

          if (!userRole.isSuperAdmin && gamesData.length > 0 && gamesData[0].clientName) {
            setViewTitle(t('clientPanelOf', { name: gamesData[0].clientName }));
          } else if (!userRole.isSuperAdmin) {
            setViewTitle(t('dashboard'));
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

    if (!watchByAllowedIds()) {
      watchByEmail();
    }

    return () => {
      isSubscribed = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [impersonatedEmail, user, userRole.allowedGameIds, userRole.isSuperAdmin, toast, t]);

  const getGameUrl = (gameId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/juego/${gameId}`;
    }
    return `/juego/${gameId}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
        title: t('linkCopiedTitle'),
        description: t('linkCopiedDesc'),
    });
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="font-headline text-3xl font-semibold tracking-tight">{viewTitle}</h1>
                <p className="text-muted-foreground mt-1">{t('clientDashboardSubtitle')}</p>
            </div>
            {userRole.isSuperAdmin && impersonatedEmail && (
                <Button variant="outline" asChild>
                    <Link href="/admin/dashboard">{t('clientBackToAdmin')}</Link>
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
                <h2 className="mt-6 text-2xl font-semibold">{t('clientNoGamesTitle')}</h2>
                <p className="text-muted-foreground mt-3 max-w-md mx-auto">
                    {t('clientNoGamesSubtitle')}
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
                                                {game.status === 'activo' ? t('statusActive') : t('statusDemo')}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-6 pt-6">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-primary/5 transition-colors group-hover:bg-primary/10">
                                        <p className="text-4xl font-bold text-primary mb-1">{game.plays || 0}</p>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider text-center">{t('clientStatsParticipants')}</p>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-green-500/5 transition-colors group-hover:bg-green-500/10">
                                        <p className="text-4xl font-bold text-green-600 dark:text-green-500 mb-1">{game.prizesAwarded || 0}</p>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider text-center">{t('clientStatsPrizes')}</p>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-blue-500/5 transition-colors group-hover:bg-blue-500/10">
                                        <p className="text-4xl font-bold text-blue-600 dark:text-blue-500 mb-1">
                                            {game.plays ? Math.round((game.prizesAwarded || 0) / game.plays * 100) : 0}%
                                        </p>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider text-center">{t('clientStatsRatio')}</p>
                                    </div>
                                </div>
                                
                                {game.status === 'demo' && (
                                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                        <p className="font-medium flex items-center text-yellow-700 dark:text-yellow-400 mb-1">
                                            <AlertTriangle className="h-4 w-4 mr-2" />
                                            {t('clientDemoTitle')}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {t('clientDemoDesc')}
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <Button asChild size="lg" className="h-auto py-4">
                                        <Link href={`/client/juegos/editar/${game.id}`} className="flex flex-col items-center gap-1">
                                            <Settings className="h-5 w-5"/>
                                            <span>{t('clientBtnConfigure')}</span>
                                            <span className="text-xs text-white">{t('clientBtnConfigureSubtitle')}</span>
                                        </Link>
                                    </Button>
                                    <Button asChild size="lg" variant="secondary" className="h-auto py-4">
                                        <Link href={`/client/clientes/${game.id}`} className="flex flex-col items-center gap-1">
                                            <Users className="h-5 w-5" />
                                            <span>{t('clientBtnParticipants')}</span>
                                            <span className="text-xs text-white">{t('clientBtnParticipantsSubtitle')}</span>
                                        </Link>
                                    </Button>
                                </div>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" className="w-full">
                                            <LinkIcon className="mr-2 h-4 w-4" /> {t('clientLinkTv')}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t('clientLinkDialogTitle')}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {t('clientLinkDialogDesc')}
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
                                            <AlertDialogCancel>{t('clientLinkDialogClose')}</AlertDialogCancel>
                                            <AlertDialogAction asChild>
                                                <Link href={getGameUrl(game.id)} target="_blank">
                                                    {t('clientLinkDialogOpen')}
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
