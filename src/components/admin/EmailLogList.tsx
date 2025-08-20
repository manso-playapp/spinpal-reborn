
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, Firestore, writeBatch } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Mail, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
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


interface EmailLog {
  id: string;
  to: string;
  gameId: string;
  status: 'sent' | 'failed';
  prize: string;
  error?: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  } | null;
  message: {
    subject: string;
    html: string;
  }
}

interface GameNames {
  [key: string]: string;
}

const ITEMS_PER_PAGE = 20;

export default function EmailLogList() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [gameNames, setGameNames] = useState<GameNames>({});
  const [loading, setLoading] = useState(true);
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    // Recuperar nombres de juegos cacheados
    const cachedGameNames = localStorage.getItem('gameNames');
    if (cachedGameNames) {
      setGameNames(JSON.parse(cachedGameNames));
    }

    if (!db) {
      setLoading(false);
      return;
    }
    const logsRef = collection(db, 'outbound_emails');
    const q = query(logsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        const logsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as EmailLog[];

        // Obtener IDs únicos de juegos
        const uniqueGameIds = [...new Set(logsData.map(log => log.gameId))];
        const newGameNames = { ...gameNames };

        if (db && uniqueGameIds.length > 0) {
          // Crear un array de promesas para obtener los juegos en paralelo
          const promises = uniqueGameIds.map(async (gameId) => {
            if (!newGameNames[gameId] && gameId) {
              const gameRef = doc(db as Firestore, 'games', gameId);
              const gameSnap = await getDoc(gameRef);
              if (gameSnap.exists()) {
                newGameNames[gameId] = gameSnap.data().name || 'Juego Eliminado';
              } else {
                newGameNames[gameId] = 'Juego Eliminado';
              }
            }
          });

          // Esperar a que todas las promesas se resuelvan
          await Promise.all(promises);
        
        // Actualizar caché local
        localStorage.setItem('gameNames', JSON.stringify(newGameNames));
        }

        setGameNames(newGameNames);
        setLogs(logsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching email logs: ', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Mail />
            Registros de Correo
        </CardTitle>
        <CardDescription>
          Aquí puedes ver todos los correos que la aplicación ha intentado enviar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-4 text-center border-2 border-dashed border-border rounded-lg">
            <h2 className="text-xl font-semibold">No hay registros todavía</h2>
            <p className="text-muted-foreground mt-2">
              Cuando se gane un premio, los intentos de envío aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="select-all"
                  checked={logs.length > 0 && selectedLogs.length === logs.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedLogs(logs.map(log => log.id));
                    } else {
                      setSelectedLogs([]);
                    }
                  }}
                />
                <label htmlFor="select-all" className="text-sm text-muted-foreground">
                  {selectedLogs.length === 0 
                    ? "Seleccionar todo" 
                    : `${selectedLogs.length} seleccionado${selectedLogs.length === 1 ? '' : 's'}`}
                </label>
              </div>
              {selectedLogs.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={deleteLoading}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar {selectedLogs.length} {selectedLogs.length === 1 ? 'registro' : 'registros'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción eliminará permanentemente {selectedLogs.length} {selectedLogs.length === 1 ? 'registro' : 'registros'} de correo.
                        Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={async (e) => {
                          e.preventDefault();
                          setDeleteLoading(true);
                          try {
                            if (!db) return;
                            const batch = writeBatch(db as Firestore);
                            selectedLogs.forEach((id) => {
                              const docRef = doc(db as Firestore, 'outbound_emails', id);
                              batch.delete(docRef);
                            });
                            await batch.commit();
                            setSelectedLogs([]);
                          } catch (error) {
                            console.error('Error deleting logs:', error);
                          } finally {
                            setDeleteLoading(false);
                          }
                        }}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Destinatario</TableHead>
                  <TableHead className="hidden md:table-cell">Juego</TableHead>
                  <TableHead className="hidden md:table-cell">Premio</TableHead>
                  <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                  <TableHead className="text-right">Detalles</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {logs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE).map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedLogs.includes(log.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedLogs([...selectedLogs, log.id]);
                        } else {
                          setSelectedLogs(selectedLogs.filter(id => id !== log.id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.status === 'sent' ? 'default' : 'destructive'} className={log.status === 'sent' ? 'bg-green-600' : ''}>
                      {log.status === 'sent' ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <AlertCircle className="mr-1 h-3 w-3" />}
                      {log.status === 'sent' ? 'Enviado' : 'Fallido'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{log.to}</TableCell>
                  <TableCell className="hidden md:table-cell">{gameNames[log.gameId] || 'Cargando...'}</TableCell>
                  <TableCell className="hidden md:table-cell">{log.prize}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {log.createdAt
                      ? new Date(log.createdAt.seconds * 1000).toLocaleString()
                      : 'N/A'}
                  </TableCell>
                   <TableCell className="text-right">
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">Ver</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[625px]">
                            <DialogHeader>
                            <DialogTitle>Detalles del Correo</DialogTitle>
                            <DialogDescription>
                                Asunto: {log.message.subject}
                            </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                {log.status === 'failed' && (
                                    <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-md">
                                        <h4 className="font-semibold text-destructive">Motivo del fallo:</h4>
                                        <p className="text-sm text-destructive/90 font-mono">{log.error}</p>
                                    </div>
                                )}
                                <div className="p-4 border rounded-md">
                                    <h4 className="font-semibold mb-2">Contenido del Correo:</h4>
                                    <div 
                                        className="prose prose-sm max-w-none [&_p]:my-2"
                                        dangerouslySetInnerHTML={{ __html: log.message.html }}
                                    />
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {logs.length > ITEMS_PER_PAGE && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="outline"
                size="sm"
              >
                Anterior
              </Button>
              <span className="px-3 py-1">
                Página {page} de {Math.ceil(logs.length / ITEMS_PER_PAGE)}
              </span>
              <Button
                onClick={() => setPage(p => Math.min(Math.ceil(logs.length / ITEMS_PER_PAGE), p + 1))}
                disabled={page === Math.ceil(logs.length / ITEMS_PER_PAGE)}
                variant="outline"
                size="sm"
              >
                Siguiente
              </Button>
            </div>
          )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

