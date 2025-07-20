'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';

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
import { ArrowLeft, Trash2, PlusCircle, Palette, Gift } from 'lucide-react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Separator } from '../ui/separator';

const segmentSchema = z.object({
  name: z.string().min(1, 'El nombre del premio no puede estar vacío.'),
});

const formSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  status: z.enum(['activo', 'demo']),
  segments: z.array(segmentSchema).min(2, 'Se necesitan al menos 2 premios para la ruleta.'),
});

type GameFormValues = z.infer<typeof formSchema>;

interface Game {
  id: string;
  name: string;
  status: 'activo' | 'demo';
  segments?: { name: string }[];
  [key: string]: any;
}

export default function EditGameForm({ game }: { game: Game }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState('');

  const form = useForm<GameFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: game.name || '',
      status: game.status || 'demo',
      segments: game.segments || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'segments',
  });

  const onSubmit = async (data: GameFormValues) => {
    setLoading(true);
    try {
      const gameRef = doc(db, 'games', game.id);
      await updateDoc(gameRef, data);

      toast({
        title: '¡Juego Actualizado!',
        description: `Los cambios en "${data.name}" han sido guardados.`,
      });
      router.push('/admin');
    } catch (error) {
      console.error('Error updating game: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Hubo un problema al guardar los cambios.',
      });
    } finally {
      setLoading(false);
    }
  };

  const addSegment = () => {
    if (newSegmentName.trim()) {
      append({ name: newSegmentName.trim() });
      setNewSegmentName('');
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Volver</span>
            </Link>
          </Button>
          <div className="flex-1">
            <CardTitle className="font-headline text-2xl">Editar Juego</CardTitle>
            <CardDescription>
              Ajusta la configuración de tu ruleta.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* --- General Settings --- */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Juego</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Estado del Juego</FormLabel>
                      <FormDescription>
                        Activa el juego para todos o mantenlo en modo Demo.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-medium ${field.value === 'demo' ? 'text-muted-foreground' : 'text-foreground'}`}>Demo</span>
                        <Switch
                          checked={field.value === 'activo'}
                          onCheckedChange={(checked) => field.onChange(checked ? 'activo' : 'demo')}
                          disabled={loading}
                        />
                        <span className={`text-sm font-medium ${field.value === 'activo' ? 'text-green-600' : 'text-muted-foreground'}`}>Activo</span>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <Separator />

            {/* --- Prize Segments --- */}
            <div className="space-y-4">
                <div className="space-y-1">
                    <h3 className="text-lg font-medium flex items-center gap-2"><Gift /> Premios de la Ruleta</h3>
                    <p className="text-sm text-muted-foreground">Define los segmentos que aparecerán en la ruleta. Necesitas al menos 2.</p>
                </div>

                <div className="flex gap-2">
                    <Input
                        value={newSegmentName}
                        onChange={(e) => setNewSegmentName(e.target.value)}
                        placeholder="Nombre del nuevo premio"
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSegment(); } }}
                        disabled={loading}
                    />
                    <Button type="button" onClick={addSegment} disabled={!newSegmentName.trim() || loading}>
                        <PlusCircle className="h-4 w-4 mr-2" /> Añadir
                    </Button>
                </div>
                
                <div className="space-y-2">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2 p-2 border rounded-md bg-background">
                           <Controller
                                control={form.control}
                                name={`segments.${index}.name`}
                                render={({ field: controllerField }) => (
                                    <Input {...controllerField} className="border-none focus-visible:ring-0" />
                                )}
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={loading}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span className="sr-only">Eliminar</span>
                            </Button>
                        </div>
                    ))}
                </div>
                {form.formState.errors.segments && (
                    <p className="text-sm font-medium text-destructive">{form.formState.errors.segments.message || form.formState.errors.segments.root?.message}</p>
                )}
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
