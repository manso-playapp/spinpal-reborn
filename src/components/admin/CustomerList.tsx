
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
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
import { Users, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';


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
  const { toast } = useToast();

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
  
  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    try {
      await deleteDoc(doc(db, "games", gameId, "customers", customerId));
      toast({
        title: "¡Participante Eliminado!",
        description: `El participante "${customerName}" ha sido eliminado.`,
      });
    } catch (error) {
      console.error("Error deleting customer: ", error);
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: "No se pudo eliminar el participante. Inténtalo de nuevo.",
      });
    }
  };

  return (
    <TooltipProvider>
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
                <TableHead className="text-right">Acciones</TableHead>
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
                    <Badge variant={customer.hasPlayed ? 'default' : 'secondary'} className={customer.hasPlayed ? 'bg-green-600 text-white' : ''}>
                      {customer.hasPlayed ? 'Sí' : 'No'}
                    </Badge>
                  </TableCell>
                   <TableCell className="text-right">
                     <AlertDialog>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon" className="h-8 w-8">
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Eliminar Participante</span>
                                    </Button>
                                </AlertDialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Eliminar Participante</p>
                            </TooltipContent>
                        </Tooltip>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará permanentemente al participante <span className="font-bold">{customer.name}</span>.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                             <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteCustomer(customer.id, customer.name)} className="bg-destructive hover:bg-destructive/90">
                                    Sí, eliminar
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}
