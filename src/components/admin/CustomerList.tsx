'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
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
import { Users } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  hasPlayed: boolean;
  registeredAt: {
    seconds: number;
    nanoseconds: number;
  } | null;
}

export default function CustomerList({ gameId }: { gameId: string }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    const customersRef = collection(db, 'games', gameId, 'customers');
    const q = query(customersRef, orderBy('registeredAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const customersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Customer[];
        setCustomers(customersData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching customers: ', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [gameId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Users />
            Lista de Participantes
        </CardTitle>
        <CardDescription>
          Aquí puedes ver todos los clientes que se han registrado para este juego.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : customers.length === 0 ? (
          <div className="p-4 text-center border-2 border-dashed border-border rounded-lg">
            <h2 className="text-xl font-semibold">No hay participantes todavía</h2>
            <p className="text-muted-foreground mt-2">
              Cuando los jugadores se registren, aparecerán en esta lista.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Fecha de Registro</TableHead>
                <TableHead className="text-center">¿Ha Jugado?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>
                    {customer.registeredAt
                      ? new Date(customer.registeredAt.seconds * 1000).toLocaleString()
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={customer.hasPlayed ? 'default' : 'secondary'}>
                      {customer.hasPlayed ? 'Sí' : 'No'}
                    </Badge>
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
