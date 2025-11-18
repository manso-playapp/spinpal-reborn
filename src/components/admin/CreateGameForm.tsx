
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
import { Textarea } from '../ui/textarea';

const segmentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'El nombre del premio no puede estar vacío.'),
  formalName: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Debe ser un color HEX válido.'),
  isRealPrize: z.boolean().optional(),
  probability: z.number().optional(),
  useStockControl: z.boolean().default(false).optional(),
  quantity: z.number().int().min(0, 'La cantidad no puede ser negativa.').nullable().optional(),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Debe ser un color HEX válido.').default('#FFFFFF'),
  fontFamily: z.string().default('DM Sans'),
  fontSize: z.number().min(4).max(40).default(16),
  lineHeight: z.number().min(0.5).max(3).default(1),
  letterSpacing: z.number().min(-5).max(10).default(0.5),
  letterSpacingLineTwo: z.number().min(-5).max(10).optional(),
  distanceFromCenter: z.number().min(0).max(1).default(0.7),
  iconUrl: z.string().url({ message: 'Por favor, introduce una URL válida.' }).or(z.literal('')).default(''),
  iconName: z.string().optional(),
  iconScale: z.number().min(0.1).max(2).default(1),
}).superRefine((segment, ctx) => {
  if (segment.useStockControl) {
    if (!segment.isRealPrize) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['useStockControl'],
        message: 'El control de stock solo aplica a premios reales.',
      });
    }
    if (segment.quantity === null || segment.quantity === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quantity'],
        message: 'Indica cuántas unidades hay disponibles.',
      });
    }
  }
});

const formSchema = z.object({
  name: z.string().min(3, {
    message: 'El nombre debe tener al menos 3 caracteres.',
  }),
  clientName: z.string().optional(),
  clientEmail: z.string().email({ message: "Por favor, introduce un correo válido." }).optional().or(z.literal('')),
  status: z.enum(['activo', 'demo']),
  managementType: z.enum(['client', 'playapp']).default('client'),
  importJson: z.string().optional(),
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
      importJson: '',
    },
  });

  const onSubmit = async (data: GameFormValues) => {
    setLoading(true);

    if (!db) {
      toast({
        variant: "destructive",
        title: "Error de Configuración",
        description: "La base de datos no está disponible. Revisa tu conexión y la configuración de Firebase.",
      });
      setLoading(false);
      return;
    }

    let segmentsToSave = [
        { id: generateUniqueId(), name: 'Premio 1', color: '#FFC107', isRealPrize: true, probability: 10, useStockControl: false, quantity: null, textColor: '#000000', fontFamily: 'PT Sans', fontSize: 16, lineHeight: 1, letterSpacing: 0.5, distanceFromCenter: 0.7, iconUrl: '', iconScale: 1 },
        { id: generateUniqueId(), name: 'No Ganas', color: '#E0E0E0', isRealPrize: false, useStockControl: false, quantity: null, textColor: '#000000', fontFamily: 'PT Sans', fontSize: 16, lineHeight: 1, letterSpacing: 0.5, distanceFromCenter: 0.7, iconUrl: '', iconScale: 1 },
    ];

    if (data.importJson) {
        try {
            const parsedData = JSON.parse(data.importJson);
            // Intentamos validar si es un objeto de juego completo o solo un array de segmentos
            let parsedSegments;
            if (Array.isArray(parsedData)) {
                parsedSegments = parsedData;
            } else if (parsedData.segments && Array.isArray(parsedData.segments)) {
                parsedSegments = parsedData.segments;
            }

            const validationResult = z.array(segmentSchema.partial()).safeParse(parsedSegments);
            if (validationResult.success) {
                segmentsToSave = validationResult.data.map(seg => ({ ...seg, id: seg.id || generateUniqueId() })) as any;
                 toast({ title: '¡Datos Importados!', description: 'Se usará la configuración de premios del JSON que pegaste.' });
            } else {
                 toast({ variant: 'destructive', title: 'Error en JSON', description: 'El JSON de premios no es válido. Se usará la configuración por defecto.' });
            }
        } catch (e) {
             toast({ variant: 'destructive', title: 'Error en JSON', description: 'El texto introducido no es un JSON válido. Se usará la configuración por defecto.' });
        }
    }


    try {
      const docRef = await addDoc(collection(db, 'games'), {
        name: data.name,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        status: data.status,
        managementType: data.managementType,
        isBirthdateRequired: true,
        plays: 0,
        prizesAwarded: 0,
        createdAt: serverTimestamp(),
        segments: segmentsToSave,
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
                <Link href="/admin/dashboard">
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
                 <FormField
                    control={form.control}
                    name="importJson"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Importar desde JSON (Opcional)</FormLabel>
                        <FormControl>
                            <Textarea
                            placeholder='Pega aquí el JSON de un juego exportado para clonar su configuración de premios.'
                            className="min-h-[120px] font-mono text-sm"
                            {...field}
                            disabled={loading}
                            />
                        </FormControl>
                        <FormDescription>
                            Puedes usar esta opción para migrar un juego desde otro proyecto. Pega los datos del campo `segments` aquí.
                        </FormDescription>
                        <FormMessage />
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
