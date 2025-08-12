
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
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
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '../ui/button';


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

export default function EmailLogList() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [gameNames, setGameNames] = useState<GameNames>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        
        const newGameNames = { ...gameNames };
        for (const log of logsData) {
          if (log.gameId && !newGameNames[log.gameId]) {
            const gameRef = doc(db, 'games', log.gameId);
            const gameSnap = await getDoc(gameRef);
            if (gameSnap.exists()) {
              newGameNames[log.gameId] = gameSnap.data().name || 'Juego Eliminado';
            }
          }
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead>Destinatario</TableHead>
                <TableHead className="hidden md:table-cell">Juego</TableHead>
                <TableHead className="hidden md:table-cell">Premio</TableHead>
                <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                <TableHead className="text-right">Detalles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
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
        )}
      </CardContent>
    </Card>
  );
}

