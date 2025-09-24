
'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table"
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
import { Users, Trash2, Download, ArrowUpDown } from 'lucide-react';
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
import Papa from 'papaparse';
import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, writeBatch, getDocs } from '@firebase/firestore';
import { Checkbox } from "../ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  birthdate?: string;
  hasPlayed: boolean;
  registeredAt: any;
  prizeWonName?: string;
  prizeWonAt?: any;
}

const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    // Handle both Firebase Timestamp object and string formats
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleString();
};


export default function CustomerList({ gameId, gameName }: { gameId: string, gameName: string }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});

  useEffect(() => {
    if (!gameId || !db) {
        setLoading(false);
        return;
    };

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

  const handleDeleteCustomers = async (customerIds: string[]) => {
    const firestore = db;
    if (!firestore) {
        toast({
            variant: "destructive",
            title: "Error de Conexión",
            description: "No se puede eliminar porque no hay conexión con la base de datos.",
        });
        return;
    }
    const batch = writeBatch(firestore);
    customerIds.forEach(id => {
        const docRef = doc(firestore, "games", gameId, "customers", id);
        batch.delete(docRef);
    });

    try {
        await batch.commit();
        toast({
            title: "¡Participantes Eliminados!",
            description: `${customerIds.length} participante(s) ha(n) sido eliminado(s). Ahora puede(n) volver a jugar.`,
        });
        table.toggleAllPageRowsSelected(false); // Clear selection
    } catch (error) {
        console.error("Error deleting customers in batch: ", error);
        toast({
            variant: "destructive",
            title: "Error al eliminar",
            description: "No se pudieron eliminar los participantes. Inténtalo de nuevo.",
        });
    }
  };
  
  const columns: ColumnDef<Customer>[] = useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Nombre
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
        accessorKey: "email",
        header: "Email",
    },
    {
        accessorKey: "phone",
        header: "Teléfono",
        cell: ({ row }) => <div>{row.original.phone || '-'}</div>,
    },
    {
        accessorKey: "birthdate",
        header: "Cumpleaños",
        cell: ({ row }) => <div>{row.original.birthdate || '-'}</div>,
    },
    {
        accessorKey: "registeredAt",
        header: ({ column }) => (
             <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Fecha de Registro
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            return formatDate(row.original.registeredAt);
        }
    },
    {
        accessorKey: "hasPlayed",
        header: "Ha Jugado",
        cell: ({ row }) => (
             <Badge variant={row.original.hasPlayed ? 'default' : 'secondary'} className={row.original.hasPlayed ? 'bg-green-600 text-white' : ''}>
                {row.original.hasPlayed ? 'Sí' : 'No'}
            </Badge>
        )
    },
    {
        accessorKey: "prizeWonName",
        header: "Premio Ganado",
        cell: ({ row }) => <div>{row.original.prizeWonName || '-'}</div>,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const customer = row.original
        return (
          <AlertDialog>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash2 className="h-4 w-4 text-destructive" />
                              <span className="sr-only">Eliminar</span>
                          </Button>
                      </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent><p>Eliminar Participante</p></TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                  <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Se eliminará permanentemente al participante <span className="font-bold">{customer.name}</span>. Esto le permitirá volver a jugar.
                  </AlertDialogDescription>
                  </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteCustomers([customer.id])} className="bg-destructive hover:bg-destructive/90">
                          Sí, eliminar
                      </AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        )
      },
    },
  ], [gameId, toast]);

  const table = useReactTable({
    data: customers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
    },
  });

  const handleDownloadData = async () => {
    if (!db) {
       toast({
        variant: 'destructive',
        title: 'Error de Conexión',
        description: 'No se pudieron descargar los datos. Revisa la configuración de Firebase.',
      });
      return;
    }
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
          cumpleaños: data.birthdate || '',
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
  
  const selectedRows = table.getFilteredSelectedRowModel().rows;

  return (
    <TooltipProvider>
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
            <CardTitle className="flex items-center gap-2">
                <Users />
                Lista de Participantes
            </CardTitle>
            <CardDescription>
              Aquí puedes ver, gestionar, ordenar y exportar los clientes que se han registrado para este juego.
            </CardDescription>
        </div>
         <Button onClick={handleDownloadData} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Descargar CSV
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
        <div className="w-full">
            {selectedRows.length > 0 && (
                <div className="flex items-center justify-between gap-4 p-4 mb-4 bg-muted rounded-lg">
                    <div className="text-sm font-medium">
                        {selectedRows.length} de {table.getCoreRowModel().rows.length} fila(s) seleccionadas.
                    </div>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar Seleccionados ({selectedRows.length})
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>¿Confirmas la eliminación?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminarán permanentemente los <strong>{selectedRows.length}</strong> participantes seleccionados. Esto les permitirá volver a jugar.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteCustomers(selectedRows.map(row => row.original.id))} className="bg-destructive hover:bg-destructive/90">
                                    Sí, eliminar
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}
            <div className="rounded-md border">
            <Table>
                <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                        return (
                        <TableHead key={header.id}>
                            {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                                )}
                        </TableHead>
                        )
                    })}
                    </TableRow>
                ))}
                </TableHeader>
                <TableBody>
                {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                    <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                    >
                        {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                        ))}
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                        No hay participantes todavía.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </div>
            <div className="flex items-center justify-between space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">Filas por página</p>
                        <Select
                        value={`${table.getState().pagination.pageSize}`}
                        onValueChange={(value) => {
                            table.setPageSize(Number(value))
                        }}
                        >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={table.getState().pagination.pageSize} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[20, 50, 100].map((pageSize) => (
                            <SelectItem key={pageSize} value={`${pageSize}`}>
                                {pageSize}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                    <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            </div>
        </div>
        )}
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}
