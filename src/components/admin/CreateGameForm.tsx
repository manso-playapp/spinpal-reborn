
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
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

const formSchema = z.object({
  name: z.string().min(3, {
    message: 'El nombre debe tener al menos 3 caracteres.',
  }),
  clientName: z.string().optional(),
  clientEmail: z.string().email({ message: "Por favor, introduce un correo válido." }).optional().or(z.literal('')),
  status: z.enum(['activo', 'demo']),
  managementType: z.enum(['client', 'playapp']).default('client'),
});

type GameFormValues = z.infer<typeof formSchema>;

const generateUniqueId = () => Math.random().toString(36).substr(2, 9);

export default function CreateGameForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<GameFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      status: 'demo',
      clientName: '',
      clientEmail: '',
      managementType: 'client',
    },
  });

  const onSubmit = async (data: GameFormValues) => {
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'games'), {
        ...data,
        plays: 0,
        prizesAwarded: 0,
        createdAt: serverTimestamp(),
        // Default values for new games
        segments: [
            { id: generateUniqueId(), name: 'Premio 1', color: '#FFC107', isRealPrize: true, probability: 10, textColor: '#000000', fontFamily: 'PT Sans', fontSize: 16, lineHeight: 1, letterSpacing: 0.5, distanceFromCenter: 0.7, iconUrl: '', iconScale: 1 },
            { id: generateUniqueId(), name: 'No Ganas', color: '#E0E0E0', isRealPrize: false, textColor: '#000000', fontFamily: 'PT Sans', fontSize: 16, lineHeight: 1, letterSpacing: 0.5, distanceFromCenter: 0.7, iconUrl: '', iconScale: 1 },
            { id: generateUniqueId(), name: 'Premio 2', color: '#4CAF50', isRealPrize: true, probability: 5, textColor: '#FFFFFF', fontFamily: 'PT Sans', fontSize: 16, lineHeight: 1, letterSpacing: 0.5, distanceFromCenter: 0.7, iconUrl: '', iconScale: 1 },
            { id: generateUniqueId(), name: 'Sigue Intentando', color: '#F0F0F0', isRealPrize: false, textColor: '#000000', fontFamily: 'PT Sans', fontSize: 16, lineHeight: 1, letterSpacing: 0.5, distanceFromCenter: 0.7, iconUrl: '', iconScale: 1 },
        ],
        borderImage: 'https://i.imgur.com/J62nHj9.png',
        borderScale: 1,
        centerImage: 'https://i.imgur.com/N3PAzB2.png',
        centerScale: 1,
        backgroundFit: 'cover',
      });
      toast({
        title: '¡Juego Creado!',
        description: `El juego "${data.name}" ha sido creado. Ahora configúralo.`,
      });
      router.push(`/admin/juegos/editar/${docRef.id}`);
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
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
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
                Completa los detalles iniciales. Podrás configurar los premios y el diseño después de crearlo.
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
                    name="clientName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nombre del Cliente (Opcional)</FormLabel>
                        <FormControl>
                            <Input
                            placeholder="Nombre de la empresa o persona"
                            {...field}
                            disabled={loading}
                            />
                        </FormControl>
                        <FormDescription>
                            El nombre que identifica al propietario de este juego.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="clientEmail"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email del Cliente (Opcional)</FormLabel>
                        <FormControl>
                            <Input
                            type="email"
                            placeholder="propietario@tienda.com"
                            {...field}
                            disabled={loading}
                            />
                        </FormControl>
                        <FormDescription>
                            Asigna este juego a un cliente para futura gestión de permisos y notificaciones.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                  control={form.control}
                  name="managementType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Tipo de Gestión</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                          disabled={loading}
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="client" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Controlado por Cliente
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="playapp" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Controlado por PlayApp
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormDescription>
                        Elige quién se encargará de administrar esta campaña.
                      </FormDescription>
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
                            <span className={`text-sm font-medium ${field.value === 'demo' ? 'text-muted-foreground' : 'text-foreground'}`}>
                            Demo
                            </span>
                            <Switch
                            checked={field.value === 'activo'}
                            onCheckedChange={(checked) =>
                                field.onChange(checked ? 'activo' : 'demo')
                            }
                            disabled={loading}
                            aria-label="Estado del juego"
                            />
                            <span className={`text-sm font-medium ${field.value === 'activo' ? 'text-primary' : 'text-muted-foreground'}`}>
                            Activo
                            </span>
                        </div>
                    </FormControl>
                    </FormItem>
                )}
                />
                <Button type="submit" disabled={loading}>
                {loading ? 'Creando...' : 'Crear y Configurar Juego'}
                </Button>
            </form>
            </Form>
        </CardContent>
        </Card>
    </main>
  );
}
