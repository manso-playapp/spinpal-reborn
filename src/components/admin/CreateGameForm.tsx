'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';

const formSchema = z.object({
  name: z.string().min(3, {
    message: 'El nombre debe tener al menos 3 caracteres.',
  }),
  status: z.enum(['activo', 'demo']),
});

type GameFormValues = z.infer<typeof formSchema>;

export default function CreateGameForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<GameFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      status: 'demo',
    },
  });

  const onSubmit = async (data: GameFormValues) => {
    setLoading(true);
    try {
      await addDoc(collection(db, 'games'), {
        name: data.name,
        status: data.status,
        plays: 0,
        prizesAwarded: 0,
        createdAt: serverTimestamp(),
      });
      toast({
        title: '¡Juego Creado!',
        description: `El juego "${data.name}" ha sido creado exitosamente.`,
      });
      router.push('/admin');
    } catch (error) {
      console.error('Error creating game: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Hubo un problema al crear el juego. Inténtalo de nuevo.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Volver</span>
            </Link>
          </Button>
          <div className="flex-1">
            <CardTitle className="font-headline text-2xl">Crear Nuevo Juego</CardTitle>
            <CardDescription>
              Completa los detalles para configurar tu nueva ruleta.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Juego</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Ruleta Aniversario"
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                   <div className="flex items-center space-x-4 rounded-lg border p-4">
                     <div className="flex-1 space-y-1">
                       <FormLabel>Estado del Juego</FormLabel>
                       <FormDescription>
                          Activa o desactiva el juego. El modo Demo no requiere que los jugadores se registren.
                       </FormDescription>
                     </div>
                     <FormControl>
                       <div className="flex flex-col items-center gap-2">
                         <Switch
                           checked={field.value === 'activo'}
                           onCheckedChange={(checked) => field.onChange(checked ? 'activo' : 'demo')}
                           disabled={loading}
                         />
                         <span className={`text-xs font-medium ${field.value === 'activo' ? 'text-green-600' : 'text-muted-foreground'}`}>
                           {field.value === 'activo' ? 'Activo' : 'Demo'}
                         </span>
                       </div>
                     </FormControl>
                   </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Juego'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
