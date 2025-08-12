

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, orderBy, getDoc, doc, addDoc, serverTimestamp, deleteDoc, updateDoc, getDocs, FieldValue } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { PlusCircle, Gamepad2, Edit, Trash2, Copy as CopyIcon, CopyPlus, RotateCcw, Download, Users, Mail, MoreVertical, Link as LinkIcon, User, Eye, Briefcase, ExternalLink, Clipboard } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import Papa from 'papaparse';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Separator } from '../ui/separator';
import { format } from 'date-fns';


interface Game {
  id: string;
  name: string;
  status: 'activo' | 'demo';
  clientName?: string;
  clientEmail?: string;
  managementType?: 'client' | 'playapp';
  plays: number;
  prizesAwarded: number;
  createdAt: any; // More flexible to handle different timestamp formats
  [key: string]: any; // Allow any other fields for migration
}

const MIGRATION_MODE = false; // Set to false to disable migration view

export default function AdminDashboard() {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user && db) {
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
    } else {
      setLoading(false);
    }
  }, [user]);

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast({
        title: "¡Copiado!",
        description: message,
    });
  };

  const handleCopyGameData = async (gameId: string) => {
    if (!db) return;
    try {
        const gameRef = doc(db, 'games', gameId);
        const gameSnap = await getDoc(gameRef);

        if (gameSnap.exists()) {
            const gameData = gameSnap.data();
            // Clean up the data for re-import
            const { id, plays, prizesAwarded, lastResult, spinRequest, ...cleanData } = gameData;
            const dataString = JSON.stringify({ ...cleanData, plays: 0, prizesAwarded: 0, createdAt: new Date().toISOString() }, null, 2);
            copyToClipboard(dataString, 'Los datos JSON del juego han sido copiados.');
        } else {
             throw new Error("El juego no existe.");
        }
    } catch (error) {
        console.error("Error copying game data: ", error);
        toast({
            variant: "destructive",
            title: "Error al copiar",
            description: "No se pudieron copiar los datos del juego.",
        });
    }
  };


  if (MIGRATION_MODE) {
    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md mb-6" role="alert">
                <h2 className="font-bold text-lg">MODO MIGRACIÓN ACTIVO</h2>
                <p className="mt-2">
                    Este panel está en modo de migración. No verás el dashboard normal. Sigue estos pasos:
                </p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Abre el panel de administrador en el proyecto **VIEJO ("RULETA")**.</li>
                    <li>Para cada juego listado abajo, haz clic en **"Copiar Datos del Juego (JSON)"**.</li>
                    <li>Abre un editor de texto (como el Bloc de Notas o VSCode) y **pega los datos** de cada juego. Guarda estos archivos.</li>
                    <li>Luego, iremos al proyecto **NUEVO ("SpinPal Reborn")** y crearemos los juegos a partir de estos datos.</li>
                    <li>Después de migrar los juegos, haz clic en **"Descargar Clientes (CSV)"** para cada juego.</li>
                </ol>
            </div>
             {loading ? <Skeleton className="h-40 w-full" /> : (
                <div className="space-y-4">
                    {games.map(game => (
                        <Card key={game.id}>
                            <CardHeader>
                                <CardTitle>{game.name}</CardTitle>
                                <CardDescription>ID del Juego: {game.id}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex gap-4">
                                <Button onClick={() => handleCopyGameData(game.id)}>
                                    <Clipboard className="mr-2 h-4 w-4" />
                                    Copiar Datos del Juego (JSON)
                                </Button>
                                 <Button variant="secondary" asChild>
                                    <Link href={`/admin/clientes/${game.id}`}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Descargar Clientes (CSV)
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
             )}
        </main>
    );
  }

  // --- El resto del componente queda como estaba ---

  const getGameUrl = (gameId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/juego/${gameId}`;
    }
    return `/juego/${gameId}`;
  };

  const handleDuplicateGame = async (gameId: string) => {
    if (!db) return;
    try {
        const gameRef = doc(db, 'games', gameId);
        const gameSnap = await getDoc(gameRef);

        if (gameSnap.exists()) {
            const gameData = gameSnap.data();
            const newGameData: { [key: string]: any } = {
                ...gameData,
                name: `Copia de ${gameData.name}`,
                plays: 0,
                prizesAwarded: 0,
                createdAt: serverTimestamp(),
            };
            delete newGameData.lastResult;
            delete newGameData.spinRequest;
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
    if (!db) return;
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
    if (!db) return;
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
    if (!db) return;
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
        const registeredAt = data.registeredAt;
        const registrationDate = registeredAt && typeof registeredAt.toDate === 'function'
          ? registeredAt.toDate().toLocaleString()
          : (registeredAt ? new Date(registeredAt).toLocaleString() : 'N/A');
          
        return {
          nombre: data.name || '',
          email: data.email || '',
          telefono: data.phone || '',
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
  
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    // Handle both Firebase Timestamp object and string formats
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return format(date, "dd/MM/yyyy");
  };

  return (
    <TooltipProvider>
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="font-headline text-2xl font-semibold">Mis Juegos</h1>
                <p className="text-muted-foreground">Crea, edita y gestiona tus campañas de ruletas interactivas.</p>
            </div>
            <div className="flex items-center gap-2">
                <Button asChild size="sm" className="h-8 gap-1">
                    <Link href="/admin/juegos/crear">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Crear Juego
                    </span>
                    </Link>
                </Button>
            </div>
        </div>

        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Skeleton className="h-80 w-full" />
                <Skeleton className="h-80 w-full" />
                <Skeleton className="h-80 w-full" />
            </div>
        ) : games.length === 0 ? (
            <div className="mt-8 p-8 text-center border-2 border-dashed border-border rounded-lg">
                <Gamepad2 className="mx-auto h-12 w-12 text-muted-foreground" />
                <h2 className="mt-4 text-xl font-semibold">Aún no tienes juegos</h2>
                <p className="text-muted-foreground mt-2">
                    ¡Haz clic en "Crear Juego" para empezar a configurar tu primera ruleta!
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
                                <span>•</span>
                                <p>
                                    Creado: {formatDate(game.createdAt)}
                                </p>
                            </div>
                        </div>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2 flex-shrink-0">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Más opciones</span>
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {game.clientEmail && (
                                    <DropdownMenuItem asChild>
                                        <Link href={`/client/dashboard?clientEmail=${game.clientEmail}&clientName=${game.clientName || ''}`}>
                                            <Eye className="mr-2 h-4 w-4" />
                                            Ver como Cliente
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        <span>Resetear Contadores</span>
                                    </DropdownMenuItem>
                                    </AlertDialogTrigger>
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
                                <DropdownMenuItem onClick={() => handleDuplicateGame(game.id)}>
                                    <CopyPlus className="mr-2 h-4 w-4" />
                                    Duplicar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadData(game.id, game.name)}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Descargar Datos (CSV)
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Eliminar Juego</span>
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción no se puede deshacer. Se eliminará permanentemente el juego <span className="font-bold">{game.name}</span> y todos sus datos asociados.
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
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <Separator className="my-4"/>

                    <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2 font-medium">
                            {game.managementType === 'client' ? <User className="h-4 w-4 text-muted-foreground" /> : <Briefcase className="h-4 w-4 text-muted-foreground" />}
                            <span>
                                {game.managementType === 'client' ? 'Controlado por Cliente' : 'Controlado por PlayApp'}
                            </span>
                        </div>
                        {(game.clientName || game.clientEmail) && (
                            <div className="p-3 bg-muted/50 rounded-lg text-xs">
                                {game.clientName && (
                                    <div className="font-semibold text-card-foreground">
                                        {game.clientName}
                                    </div>
                                )}
                                {game.clientEmail && (
                                    <div className="text-muted-foreground">
                                        {game.clientEmail}
                                    </div>
                                )}
                            </div>
                        )}
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
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground">Enlace para TV / Pantalla</label>
                         <div className="flex items-center space-x-2 mt-1">
                            <Input value={getGameUrl(game.id)} readOnly className="h-9 text-xs"/>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => copyToClipboard(getGameUrl(game.id), "El enlace público del juego ha sido copiado a tu portapapeles.")}>
                                        <CopyIcon className="h-4 w-4" />
                                        <span className="sr-only">Copiar</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Copiar enlace</p></TooltipContent>
                            </Tooltip>
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild variant="outline" size="icon" className="h-9 w-9 flex-shrink-0">
                                        <Link href={getGameUrl(game.id)} target="_blank">
                                            <ExternalLink className="h-4 w-4" />
                                            <span className="sr-only">Abrir</span>
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Abrir en nueva pestaña</p></TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </CardContent>
                <Separator />
                <CardFooter className="flex p-4 gap-2">
                    <Button asChild className="w-full">
                        <Link href={`/admin/juegos/editar/${game.id}`}><Edit className="mr-2 h-4 w-4"/> Configurar</Link>
                    </Button>
                    <Button asChild variant="secondary" className="w-full">
                        <Link href={`/admin/clientes/${game.id}`}><Users className="mr-2 h-4 w-4" /> Participantes</Link>
                    </Button>
                </CardFooter>
            </Card>
            ))}
        </div>
        )}
    </main>
    </TooltipProvider>
  );
}
