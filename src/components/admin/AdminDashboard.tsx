'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, orderBy, getDoc, doc, addDoc, serverTimestamp, deleteDoc, updateDoc, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { LogOut, PlusCircle, Link as LinkIcon, Gamepad2, Edit, Trash2, Copy, CopyPlus, RotateCcw, Download } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Papa from 'papaparse';


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
  const { toast } = useToast();

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

  const handleDuplicateGame = async (gameId: string) => {
    try {
        const gameRef = doc(db, 'games', gameId);
        const gameSnap = await getDoc(gameRef);

        if (gameSnap.exists()) {
            const gameData = gameSnap.data();
            const newGameData = {
                ...gameData,
                name: `Copia de ${gameData.name}`,
                plays: 0,
                prizesAwarded: 0,
                createdAt: serverTimestamp(),
            };
            await addDoc(collection(db, 'games'), newGameData);
            toast({
                title: "¡Juego Duplicado!",
                description: `Se ha creado una copia de "${gameData.name}".`,
            });
        } else {
             throw new Error("El juego que intentas duplicar no existe.");
        }
    } catch (error) {
        console.error("Error duplicating game: ", error);
        toast({
            variant: "destructive",
            title: "Error al duplicar",
            description: "No se pudo duplicar el juego. Inténtalo de nuevo.",
        });
    }
  };

  const handleDeleteGame = async (gameId: string, gameName: string) => {
     try {
        await deleteDoc(doc(db, "games", gameId));
        toast({
            title: "¡Juego Eliminado!",
            description: `El juego "${gameName}" ha sido eliminado correctamente.`,
        });
    } catch (error) {
        console.error("Error deleting game: ", error);
        toast({
            variant: "destructive",
            title: "Error al eliminar",
            description: "No se pudo eliminar el juego. Inténtalo de nuevo.",
        });
    }
  };

  const handleResetCounters = async (gameId: string, gameName: string) => {
    try {
      const gameRef = doc(db, 'games', gameId);
      await updateDoc(gameRef, {
        plays: 0,
        prizesAwarded: 0,
      });
      toast({
        title: '¡Contadores Reseteados!',
        description: `Las jugadas y premios de "${gameName}" se han restablecido a 0.`,
      });
    } catch (error) {
      console.error('Error resetting counters: ', error);
      toast({
        variant: 'destructive',
        title: 'Error al resetear',
        description: 'No se pudieron restablecer los contadores. Inténtalo de nuevo.',
      });
    }
  };

  const handleDownloadData = async (gameId: string, gameName: string) => {
    try {
      const customersRef = collection(db, 'games', gameId, 'customers');
      const querySnapshot = await getDocs(customersRef);

      if (querySnapshot.empty) {
        toast({
          title: 'No hay datos para descargar',
          description: 'Aún no se ha registrado ningún cliente en este juego.',
        });
        return;
      }
      
      const customersData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Check if registeredAt exists and is a Firestore Timestamp before converting
        const registrationDate = data.registeredAt && typeof data.registeredAt.toDate === 'function'
          ? data.registeredAt.toDate().toLocaleString()
          : 'N/A';
          
        return {
          nombre: data.name || '',
          email: data.email || '',
          fecha_registro: registrationDate,
          ha_jugado: data.hasPlayed ? 'Sí' : 'No',
        };
      });

      const csv = Papa.unparse(customersData);
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `datos_${gameName.replace(/ /g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
       toast({
          title: '¡Descarga Iniciada!',
          description: `Se están descargando los datos de "${gameName}".`,
      });

    } catch (error) {
      console.error('Error downloading data: ', error);
      toast({
        variant: 'destructive',
        title: 'Error al descargar',
        description: 'No se pudieron descargar los datos. Inténtalo de nuevo.',
      });
    }
  };

  return (
    <TooltipProvider>
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
                    <TableHead className="text-right">Acciones</TableHead>
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
                      <TableCell className="text-right">
                         <div className="flex items-center justify-end gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild variant="outline" size="icon" className="h-8 w-8">
                                        <Link href={`/admin/juegos/editar/${game.id}`}>
                                            <Edit className="h-4 w-4" />
                                            <span className="sr-only">Editar Juego</span>
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Editar Juego</p>
                                </TooltipContent>
                            </Tooltip>
                            
                             <AlertDialog>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" size="icon" className="h-8 w-8">
                                                <RotateCcw className="h-4 w-4" />
                                                <span className="sr-only">Resetear Contadores</span>
                                            </Button>
                                        </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Resetear Contadores</p>
                                    </TooltipContent>
                                </Tooltip>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>¿Resetear contadores?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción restablecerá las jugadas y premios de <span className="font-bold">{game.name}</span> a 0. No se puede deshacer.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                     <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleResetCounters(game.id, game.name)}>
                                            Sí, resetear
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                     <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleDownloadData(game.id, game.name)}>
                                        <Download className="h-4 w-4" />
                                        <span className="sr-only">Descargar Datos</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Descargar Datos (CSV)</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                     <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleDuplicateGame(game.id)}>
                                        <CopyPlus className="h-4 w-4" />
                                        <span className="sr-only">Duplicar Juego</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Duplicar Juego</p>
                                </TooltipContent>
                            </Tooltip>

                            <AlertDialog>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" size="icon" className="h-8 w-8">
                                                <LinkIcon className="h-4 w-4" />
                                                <span className="sr-only">Ver Link para TV</span>
                                            </Button>
                                        </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Ver Link para TV</p>
                                    </TooltipContent>
                                </Tooltip>
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
                                                Abrir en nueva pestaña
                                            </Link>
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                             <AlertDialog>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="icon" className="h-8 w-8">
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Eliminar Juego</span>
                                            </Button>
                                        </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Eliminar Juego</p>
                                    </TooltipContent>
                                </Tooltip>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Se eliminará permanentemente el juego
                                        <span className="font-bold"> {game.name}</span> y todos sus datos asociados.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                     <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteGame(game.id, game.name)} className="bg-destructive hover:bg-destructive/90">
                                            Sí, eliminar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                         </div>
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
    </TooltipProvider>
  );
}
