import { collection, doc, getDoc, onSnapshot, orderBy, query, where, Firestore } from 'firebase/firestore';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { db } from '@/lib/firebase/config';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';

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
  const searchParams = useSearchParams();
  const impersonatedEmail = searchParams.get('clientEmail');

  // We'll target either the impersonated client (if provided) or the current user's email
  const targetClientEmail = useMemo(() => impersonatedEmail || user?.email || null, [impersonatedEmail, user?.email]);

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
    if (!user || !targetClientEmail) {
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
    let unsubscribeEmails: (() => void) | undefined;
    let unsubscribeGames: (() => void) | undefined;
    let perGameUnsubs: Array<() => void> = [];

    // Recuperar nombres de juegos cacheados
    const cachedGameNames = localStorage.getItem('gameNames');
    if (cachedGameNames) {
      setGameNames(JSON.parse(cachedGameNames));
    }

    const setupSubscription = async () => {
      if (!user || !db || !targetClientEmail) return;

      try {
        // 1) Subscribe to games owned by this client (by clientEmail)
        const gamesQuery = query(
          collection(db as Firestore, 'games'),
          where('clientEmail', '==', targetClientEmail)
        );

        const ownedGameIds: Set<string> = new Set();
        let ownedClientId: string | undefined = undefined;

        unsubscribeGames = onSnapshot(gamesQuery, async (gamesSnap) => {
          if (!isSubscribed) return;

          const docs = gamesSnap.docs;
          ownedGameIds.clear();
          docs.forEach((d) => {
            ownedGameIds.add(d.id);
            const data: any = d.data();
            if (!ownedClientId && data?.clientId) ownedClientId = data.clientId as string;
          });

          // 2) Subscribe to outbound_emails with secure, allowed queries only
          if (unsubscribeEmails) { unsubscribeEmails = undefined; }
          perGameUnsubs.forEach((u) => u());
          perGameUnsubs = [];

          if (ownedClientId) {
            // Single query filtered by clientId (sort on client)
            const emailsByClient = query(
              collection(db as Firestore, 'outbound_emails'),
              where('clientId', '==', ownedClientId)
            );
            unsubscribeEmails = onSnapshot(emailsByClient, async (snap) => {
              if (!isSubscribed) return;
              const clientLogs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as EmailLog[];
              clientLogs.sort((a, b) => {
                const sa = (a.createdAt as any)?.seconds || 0;
                const sb = (b.createdAt as any)?.seconds || 0;
                return sb - sa;
              });
              const gameIds = [...new Set(clientLogs.filter(l => l.gameId).map(l => l.gameId as string))];
              const names = await fetchGameNames(gameIds, isSubscribed);
              if (isSubscribed) {
                setGameNames(names);
                setLogs(clientLogs);
                setLoading(false);
              }
            });
          } else {
            // Fallback: subscribe per each owned gameId
            const ids = Array.from(ownedGameIds);
            if (ids.length === 0) {
              setLogs([]);
              setLoading(false);
              return;
            }
            const allLogsMap = new Map<string, EmailLog>();
            ids.forEach((gid) => {
              const qEmails = query(
                collection(db as Firestore, 'outbound_emails'),
                where('gameId', '==', gid)
              );
              const unsub = onSnapshot(qEmails, async (snap) => {
                if (!isSubscribed) return;
                // Update map with latest docs for this game
                snap.docs.forEach((d) => {
                  const log = { id: d.id, ...(d.data() as any) } as EmailLog;
                  allLogsMap.set(d.id, log);
                });
                const merged = Array.from(allLogsMap.values()).sort((a, b) => {
                  const sa = (a.createdAt as any)?.seconds || 0;
                  const sb = (b.createdAt as any)?.seconds || 0;
                  return sb - sa;
                });
                const names = await fetchGameNames(ids, isSubscribed);
                if (isSubscribed) {
                  setGameNames(names);
                  setLogs(merged);
                  setLoading(false);
                }
              });
              perGameUnsubs.push(unsub);
            });
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
      if (unsubscribeEmails) unsubscribeEmails();
      if (unsubscribeGames) unsubscribeGames();
    };
  }, [user, db, fetchGameNames, targetClientEmail]);

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
