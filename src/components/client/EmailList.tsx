import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, where, Firestore, DocumentData } from 'firebase/firestore';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { db } from '@/lib/firebase/config';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

interface EmailLog {
  id: string;
  to: string;
  message: {
    subject: string;
    html: string;
  };
  gameId?: string;
  createdAt: { seconds: number };
  status: string;
  type?: string;
}

const ITEMS_PER_PAGE = 10;

export function ClientEmailList() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [gameNames, setGameNames] = useState<Record<string, string>>({});
  const { user } = useAuth();

  const fetchGameNames = useCallback(async (gameIds: string[], isSubscribed: boolean) => {
    if (!db || !isSubscribed || gameIds.length === 0) return {};

    const cachedNames = localStorage.getItem('gameNames');
    const cache = cachedNames ? JSON.parse(cachedNames) : {};
    const newGameNames = { ...cache };
    
    const missingIds = gameIds.filter(id => !cache[id]);
    
    if (missingIds.length > 0) {
      const promises = missingIds.map(async (gameId) => {
        try {
          const gameRef = doc(db as Firestore, 'games', gameId);
          const gameSnap = await getDoc(gameRef);
          newGameNames[gameId] = gameSnap.exists() ? gameSnap.data().name : 'Juego Eliminado';
        } catch (error) {
          console.error('Error fetching game:', gameId, error);
          newGameNames[gameId] = 'Error';
        }
      });

      await Promise.all(promises);
      localStorage.setItem('gameNames', JSON.stringify(newGameNames));
    }
    
    return newGameNames;
  }, [db]);

  useEffect(() => {
    console.log('Current user:', user?.uid);
    if (!user) {
      console.log('No user authenticated');
      setLoading(false);
      return;
    }
    if (!db) {
      console.log('Firestore not initialized');
      setLoading(false);
      return;
    }

    let isSubscribed = true;
    let unsubscribe: (() => void) | undefined;

    // Recuperar nombres de juegos cacheados
    const cachedGameNames = localStorage.getItem('gameNames');
    if (cachedGameNames) {
      setGameNames(JSON.parse(cachedGameNames));
    }

    const setupSubscription = async () => {
      if (!user || !db) return;

      try {
        console.log('Setting up query for emails');
        
        // Consulta directa de emails
        const q = query(
          collection(db as Firestore, 'outbound_emails'),
          orderBy('createdAt', 'desc')
        );

        // Suscribirse a los cambios
        unsubscribe = onSnapshot(q, async (querySnapshot) => {
          if (!isSubscribed) return;
          
          const logsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as EmailLog[];

          // Obtener los IDs de juegos únicos
          const gameIds = [...new Set(logsData.filter(log => log.gameId).map(log => log.gameId as string))];
          
          // Obtener los nombres de los juegos
          const names = await fetchGameNames(gameIds, isSubscribed);
          
          if (isSubscribed) {
            setGameNames(names);
            setLogs(logsData);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Error setting up subscription:', error);
        setLoading(false);
      }
    };

    setupSubscription();

    return () => {
      isSubscribed = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, db, fetchGameNames]);

  const totalPages = Math.ceil(logs.length / ITEMS_PER_PAGE);
  const paginatedLogs = logs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <Card>
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
                  {format(new Date(log.createdAt.seconds * 1000), 'dd/MM/yyyy HH:mm', {
                    locale: es,
                  })}
                </TableCell>
                <TableCell>
                  {log.gameId ? gameNames[log.gameId] || 'Cargando...' : (log.type === 'Test Email' ? 'Email de Prueba' : 'N/A')}
                </TableCell>
                <TableCell title={log.message.subject}>{log.to}</TableCell>
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
