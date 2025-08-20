import { collection, doc, getDoc, onSnapshot, orderBy, query, where, Firestore } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { db } from '@/lib/firebase/config';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

interface EmailLog {
  id: string;
  to: string;
  subject: string;
  gameId: string;
  sentAt: { seconds: number };
  status: string;
}

const ITEMS_PER_PAGE = 10;

export function ClientEmailList() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [gameNames, setGameNames] = useState<Record<string, string>>({});
  const { user } = useAuth();

  useEffect(() => {
    let isSubscribed = true;
    let unsubscribe: (() => void) | undefined;

    // Recuperar nombres de juegos cacheados
    const cachedGameNames = localStorage.getItem('gameNames');
    if (cachedGameNames) {
      setGameNames(JSON.parse(cachedGameNames));
    }

    const setupSubscription = async () => {
      if (!user || !db) return;

      const q = query(
        collection(db as Firestore, 'outbound_emails'),
        where('clientId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      unsubscribe = onSnapshot(
        q,
        async (querySnapshot) => {
          if (!isSubscribed) return;
        const logsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as EmailLog[];

        // Obtener IDs únicos de juegos que no están en caché
        const uniqueGameIds = [...new Set(logsData.map(log => log.gameId))];
        const newGameNames = { ...gameNames };

        if (db && uniqueGameIds.length > 0) {
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

          await Promise.all(promises);

          // Actualizar caché local
          localStorage.setItem('gameNames', JSON.stringify(newGameNames));
        }

        if (isSubscribed) {
          setGameNames(newGameNames);
          setLogs(logsData);
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
  }, [user, db]);

  const totalPages = Math.ceil(logs.length / ITEMS_PER_PAGE);
  const paginatedLogs = logs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Correos Enviados</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Juego</TableHead>
              <TableHead>Destinatario</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  {format(new Date(log.sentAt.seconds * 1000), 'dd/MM/yyyy HH:mm', {
                    locale: es,
                  })}
                </TableCell>
                <TableCell>{gameNames[log.gameId] || 'Cargando...'}</TableCell>
                <TableCell>{log.to}</TableCell>
                <TableCell>{log.status === 'sent' ? 'Enviado' : 'Error'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="px-3 py-1">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
