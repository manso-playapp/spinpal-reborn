
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import SpinningWheel from '../game/SpinningWheel';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Trash2, PlusCircle, Gift, Image as ImageIcon, FileText, Settings, GripVertical, Eye, Copy as CopyIcon, Palette, Type, PictureInPicture, QrCode, Gamepad2, Users } from 'lucide-react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '../ui/slider';
import { Separator } from '../ui/separator';
import QRCodeDisplay from '../game/QRCodeDisplay';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

const segmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'El nombre del premio no puede estar vacío.'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Debe ser un color HEX válido.'),
  isRealPrize: z.boolean().optional(),
  probability: z.number().optional(),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Debe ser un color HEX válido.').default('#FFFFFF'),
  fontFamily: z.string().default('PT Sans'),
  fontSize: z.number().min(4).max(40).default(16),
  lineHeight: z.number().min(0.5).max(3).default(1),
  letterSpacing: z.number().min(-5).max(10).default(0.5),
  distanceFromCenter: z.number().min(0).max(1).default(0.7),
  iconUrl: z.string().url({ message: 'Por favor, introduce una URL válida.' }).or(z.literal('')).default(''),
  iconScale: z.number().min(0.1).max(2).default(1),
});


const formSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  status: z.enum(['activo', 'demo']),
  clientName: z.string().optional(),
  clientEmail: z.string().email({ message: "Por favor, introduce un correo válido." }).optional().or(z.literal('')),
  managementType: z.enum(['client', 'playapp']).default('client'),
  exemptedEmails: z.string().optional(),
  segments: z.array(segmentSchema).min(2, 'Se necesitan al menos 2 premios para la ruleta.'),
  backgroundImage: z.string().url({ message: 'Por favor, introduce una URL válida.' }).or(z.literal('')),
  backgroundFit: z.enum(['cover', 'contain', 'fill', 'none']),
  registrationTitle: z.string().optional(),
  registrationSubtitle: z.string().optional(),
  isPhoneRequired: z.boolean().optional(),
  successMessage: z.string().optional(),
  borderImage: z.string().url({ message: 'Por favor, introduce una URL válida.' }).or(z.literal('')),
  borderScale: z.number().min(0.1).max(2).optional(),
  centerImage: z.string().url({ message: 'Por favor, introduce una URL válida.' }).or(z.literal('')),
  centerScale: z.number().min(0.1).max(2).optional(),
  qrCodeScale: z.number().min(0.1).max(2).optional(),
  rouletteScale: z.number().min(0.1).max(2).optional(),
  rouletteVerticalOffset: z.number().min(-500).max(500).optional(),
  qrVerticalOffset: z.number().min(-500).max(500).optional(),
}).superRefine((data, ctx) => {
    const realPrizeTotalProbability = data.segments
        .filter(s => s.isRealPrize)
        .reduce((acc, seg) => acc + (seg.probability || 0), 0);
    
    if (realPrizeTotalProbability > 100) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['segments'],
            message: `La probabilidad total de los premios reales no puede superar el 100%. Actualmente es ${realPrizeTotalProbability.toFixed(2)}%.`,
        });
    }
});

type GameFormValues = z.infer<typeof formSchema>;

interface Game {
  id: string;
  name: string;
  status: 'activo' | 'demo';
  clientName?: string;
  clientEmail?: string;
  managementType?: 'client' | 'playapp';
  exemptedEmails?: string[];
  segments?: z.infer<typeof segmentSchema>[];
  backgroundImage?: string;
  backgroundFit?: 'cover' | 'contain' | 'fill' | 'none';
  registrationTitle?: string;
  registrationSubtitle?: string;
  isPhoneRequired?: boolean;
  successMessage?: string;
  plays?: number;
  prizesAwarded?: number;
  borderImage?: string;
  borderScale?: number;
  centerImage?: string;
  centerScale?: number;
  qrCodeScale?: number;
  rouletteScale?: number;
  rouletteVerticalOffset?: number;
  qrVerticalOffset?: number;
  [key: string]: any;
}

const getRandomColor = () => `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
const CONDENSED_FONTS = [
  'DM Sans', 'Roboto Condensed', 'Oswald', 'Montserrat', 'Lato', 'Bebas Neue', 'Anton'
];

const getDefaultSegment = (name: string): z.infer<typeof segmentSchema> => ({
  name: name,
  color: getRandomColor(),
  isRealPrize: false,
  probability: 0,
  textColor: '#FFFFFF',
  fontFamily: 'DM Sans',
  fontSize: 16,
  lineHeight: 1,
  letterSpacing: 0.5,
  distanceFromCenter: 0.7,
  iconUrl: '',
  iconScale: 1,
});


export default function EditGameForm({ game }: { game: Game }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState('');
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
  
  const form = useForm<GameFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: game.name || '',
      status: game.status || 'demo',
      clientName: game.clientName || '',
      clientEmail: game.clientEmail || '',
      managementType: game.managementType || 'client',
      exemptedEmails: (game.exemptedEmails || []).join('\\n'),
      segments: game.segments && game.segments.length > 0 ? game.segments.map(s => ({...getDefaultSegment(''), ...s})) : [getDefaultSegment('Premio 1'), getDefaultSegment('No Ganas')],
      backgroundImage: game.backgroundImage || '',
      backgroundFit: game.backgroundFit || 'cover',
      registrationTitle: game.registrationTitle || 'Estás jugando a',
      registrationSubtitle: game.registrationSubtitle || '',
      isPhoneRequired: game.isPhoneRequired || false,
      successMessage: game.successMessage || 'La ruleta en la pantalla grande debería empezar a girar. ¡Gracias por participar!',
      borderImage: game.borderImage || 'https://i.imgur.com/J62nHj9.png',
      borderScale: game.borderScale || 1,
      centerImage: game.centerImage || 'https://i.imgur.com/N3PAzB2.png',
      centerScale: game.centerScale || 1,
      qrCodeScale: game.qrCodeScale || 1,
      rouletteScale: game.rouletteScale || 1,
      rouletteVerticalOffset: game.rouletteVerticalOffset || 0,
      qrVerticalOffset: game.qrVerticalOffset || 0,
    },
  });

  const { fields, append, remove, move, insert } = useFieldArray({
    control: form.control,
    name: 'segments',
  });
  
  const watchedFormData = form.watch();
  const watchedSegments = form.watch('segments');

  // This effect will update the localStorage for the preview iframe
  useEffect(() => {
    const previewData = { ...watchedFormData, id: game.id, config: { // Also pass config
        borderImage: watchedFormData.borderImage,
        borderScale: watchedFormData.borderScale,
        centerImage: watchedFormData.centerImage,
        centerScale: watchedFormData.centerScale,
    }};
    localStorage.setItem(`game-preview-${game.id}`, JSON.stringify(previewData));
    window.dispatchEvent(new CustomEvent('previewUpdate', { detail: { gameId: game.id } }));
  }, [watchedFormData, game.id]);
  
  const { realPrizeTotalProbability, nonRealPrizeProbability } = useMemo(() => {
    const segments = watchedSegments || [];
    const realPrizeSegments = segments.filter(s => s.isRealPrize);
    const nonRealPrizeSegments = segments.filter(s => !s.isRealPrize);

    const realPrizeTotal = realPrizeSegments.reduce((acc, seg) => acc + (seg.probability || 0), 0);
    
    let nonRealPrizeProb = 0;
    if (nonRealPrizeSegments.length > 0) {
      const remainingProbability = 100 - realPrizeTotal;
      nonRealPrizeProb = remainingProbability > 0 ? remainingProbability / nonRealPrizeSegments.length : 0;
    }
    
    return {
      realPrizeTotalProbability: realPrizeTotal,
      nonRealPrizeProbability: parseFloat(nonRealPrizeProb.toFixed(2))
    };
  }, [watchedSegments]);

  useEffect(() => {
    watchedSegments.forEach((segment, index) => {
      if (!segment.isRealPrize) {
        if (segment.probability !== nonRealPrizeProbability) {
            form.setValue(`segments.${index}.probability`, nonRealPrizeProbability, { shouldDirty: true, shouldValidate: true });
        }
      }
    });
  }, [nonRealPrizeProbability, watchedSegments, form]);
  

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((field) => field.id === active.id);
      const newIndex = fields.findIndex((field) => field.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        move(oldIndex, newIndex);
      }
    }
  };
  
  const onSubmit = async (data: GameFormValues) => {
    setLoading(true);
    try {
      const gameRef = doc(db, 'games', game.id);
      
      const emailList = data.exemptedEmails
        ? data.exemptedEmails.split('\\n').map(email => email.trim().toLowerCase()).filter(email => email)
        : [];
      
      const dataToSave = JSON.parse(JSON.stringify(data));
      
      const updateData: Partial<Game> = {
        ...dataToSave,
        exemptedEmails: emailList,
        plays: game.plays || 0,
        prizesAwarded: game.prizesAwarded || 0,
      };

      await updateDoc(gameRef, updateData);

      toast({
        title: '¡Juego Actualizado!',
        description: `Los cambios en "${data.name}" han sido guardados.`,
      });
      // Refresh the iframe preview just in case
      window.dispatchEvent(new CustomEvent('previewUpdate', { detail: { gameId: game.id } }));

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
      append(getDefaultSegment(newSegmentName.trim()));
      setNewSegmentName('');
    }
  };

  const duplicateSegment = (index: number) => {
    const segmentToDuplicate = form.getValues(`segments.${index}`);
    insert(index + 1, {
      ...segmentToDuplicate,
      name: `${segmentToDuplicate.name} (Copia)`,
      id: undefined, // ensure it gets a new ID from react-hook-form
    });
  };
  
  const currentConfig = {
    borderImage: watchedFormData.borderImage,
    borderScale: watchedFormData.borderScale,
    centerImage: watchedFormData.centerImage,
    centerScale: watchedFormData.centerScale,
  };

  const roulettePreviewKey = JSON.stringify(watchedSegments) + JSON.stringify(currentConfig);


  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
       <div className="flex items-center gap-4 mb-4">
          <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Volver</span>
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="font-headline text-2xl font-semibold">Editar Juego</h1>
            <p className="text-sm text-muted-foreground">
              Ajusta la configuración y los premios de tu juego.
            </p>
          </div>
        </div>
      
         <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              
              {/* Columna de Controles */}
              <div className="lg:col-span-2 space-y-4">
                <Tabs defaultValue="prizes" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="data"><Settings className="mr-2 h-4 w-4" />Datos Generales</TabsTrigger>
                    <TabsTrigger value="prizes"><Gift className="mr-2 h-4 w-4" />Premios</TabsTrigger>
                    <TabsTrigger value="gameConfig"><Gamepad2 className="mr-2 h-4 w-4" />Juego</TabsTrigger>
                  </TabsList>

                  <TabsContent value="data">
                    <Card>
                      <CardContent className="p-6 space-y-8">
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
                            name="clientName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre del Cliente</FormLabel>
                                <FormControl>
                                  <Input placeholder="Nombre de la empresa o persona" {...field} disabled={loading} />
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
                                <FormLabel>Email del Cliente (para notificaciones y acceso)</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="dueño.tienda@ejemplo.com" {...field} disabled={loading} />
                                </FormControl>
                                 <FormDescription>
                                  Dirección donde el dueño del juego recibirá un aviso cuando un premio sea ganado.
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
                                    className="flex flex-row space-x-4"
                                    disabled={loading}
                                    >
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="client" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Controlado por Cliente</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="playapp" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Controlado por PlayApp</FormLabel>
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
                            name="exemptedEmails"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2"><Users /> Correos Exentos de Verificación</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="un-email@ejemplo.com\\notro-email@ejemplo.com"
                                    className="min-h-[100px] font-mono text-sm"
                                    {...field}
                                    disabled={loading}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Lista de correos (uno por línea) que pueden jugar múltiples veces. Ideal para pruebas.
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
                                    <span className={`text-sm font-medium ${field.value === 'demo' ? 'text-muted-foreground' : 'text-foreground'}`}>Demo</span>
                                    <Switch
                                      checked={field.value === 'activo'}
                                      onCheckedChange={(checked) => field.onChange(checked ? 'activo' : 'demo')}
                                      disabled={loading}
                                    />
                                    <span className={`text-sm font-medium ${field.value === 'activo' ? 'text-primary' : 'text-muted-foreground'}`}>Activo</span>
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium flex items-center gap-2"><ImageIcon /> Imagen de Fondo</h3>
                            <FormField
                              control={form.control}
                              name="backgroundImage"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>URL de la Imagen</FormLabel>
                                  <FormControl>
                                    <Input placeholder="https://ejemplo.com/imagen.jpg" {...field} disabled={loading} />
                                  </FormControl>
                                  <FormDescription>
                                    Pega la URL de la imagen que quieres usar de fondo. Déjalo en blanco para no usar ninguna.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="backgroundFit"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ajuste de la Imagen</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecciona cómo se ajustará la imagen" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="cover">Cubrir (Cover)</SelectItem>
                                      <SelectItem value="contain">Contener (Contain)</SelectItem>
                                      <SelectItem value="fill">Rellenar (Fill)</SelectItem>
                                      <SelectItem value="none">Ninguno (None)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="prizes">
                    <Card>
                      <CardHeader>
                        <CardTitle>Premios de la Ruleta</CardTitle>
                        <CardDescription>Define los segmentos, sus imágenes y sus probabilidades.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="space-y-4">
                                    <h4 className="font-semibold">Imagen del Borde</h4>
                                    <FormField
                                    control={form.control}
                                    name="borderImage"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>URL</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://placehold.co/500x500.png" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                    <FormField
                                    control={form.control}
                                    name="borderScale"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Escala ({field.value?.toFixed(2)})</FormLabel>
                                        <FormControl>
                                            <Slider
                                            defaultValue={[1]}
                                            value={[field.value ?? 1]}
                                            onValueChange={(val) => field.onChange(val[0])}
                                            max={2}
                                            min={0.1}
                                            step={0.05}
                                            />
                                        </FormControl>
                                        </FormItem>
                                    )}
                                    />
                                </div>
                                <div className="space-y-4">
                                     <h4 className="font-semibold">Imagen del Centro/Puntero</h4>
                                     <FormField
                                    control={form.control}
                                    name="centerImage"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>URL</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://placehold.co/500x500.png" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                    <FormField
                                    control={form.control}
                                    name="centerScale"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Escala ({field.value?.toFixed(2)})</FormLabel>
                                        <FormControl>
                                            <Slider
                                            defaultValue={[1]}
                                            value={[field.value ?? 1]}
                                            onValueChange={(val) => field.onChange(val[0])}
                                            max={2}
                                            min={0.1}
                                            step={0.05}
                                            />
                                        </FormControl>
                                        </FormItem>
                                    )}
                                    />
                                </div>
                          </div>
                          
                          <Separator />

                          <div className="space-y-4 pt-4">
                              <div className="flex gap-2 mb-4">
                                <div className="grid w-full">
                                    <Label htmlFor="new-segment-name" className="sr-only">Nombre del nuevo premio</Label>
                                    <Input
                                        id="new-segment-name"
                                        value={newSegmentName}
                                        onChange={(e) => setNewSegmentName(e.target.value)}
                                        placeholder="Nombre del nuevo premio"
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSegment(); } }}
                                        disabled={loading}
                                    />
                                </div>
                                <Button type="button" onClick={addSegment} disabled={!newSegmentName.trim() || loading}>
                                    <PlusCircle className="h-4 w-4 mr-2" /> Añadir
                                </Button>
                              </div>
                              
                              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={fields.map(field => field.id)} strategy={verticalListSortingStrategy}>
                                    <Accordion type="multiple" value={openAccordionItems} onValueChange={setOpenAccordionItems}>
                                    {fields.map((field, index) => (
                                      <SortableItem key={field.id} id={field.id}>
                                        {(listeners) => (
                                          <AccordionItem value={`item-${index}`} className="border rounded-md mb-2 bg-background hover:bg-muted/50">
                                            <div className="flex items-center p-2 text-sm font-medium w-full">
                                                <Button type="button" {...listeners} className="cursor-grab p-1 h-8 w-8" variant="ghost">
                                                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                                                </Button>
                                                <div className="flex-1 px-2">
                                                    <Controller control={form.control} name={`segments.${index}.name`} render={({ field: controllerField }) => (
                                                      <Input {...controllerField} className="border-none focus-visible:ring-0 bg-transparent w-full" onClick={(e) => e.stopPropagation()} />
                                                    )}/>
                                                </div>
                                                <AccordionTrigger className="p-2 hover:bg-accent rounded-md" />
                                                <div className="flex items-center gap-1 pl-2">
                                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); duplicateSegment(index); }}>
                                                        <CopyIcon className="h-4 w-4 text-blue-500" />
                                                    </Button>
                                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); remove(index); }}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <AccordionContent className="p-4 border-t">
                                              <Tabs defaultValue="basic" className="w-full">
                                                <TabsList className="grid w-full grid-cols-4">
                                                  <TabsTrigger value="basic"><Palette className="mr-2 h-4 w-4"/>Básico</TabsTrigger>
                                                  <TabsTrigger value="probability"><Gift className="mr-2 h-4 w-4" />Probabilidad</TabsTrigger>
                                                  <TabsTrigger value="text"><Type className="mr-2 h-4 w-4"/>Texto</TabsTrigger>
                                                  <TabsTrigger value="icon"><PictureInPicture className="mr-2 h-4 w-4"/>Icono</TabsTrigger>
                                                </TabsList>
                                                <TabsContent value="basic" className="pt-4 space-y-6">
                                                  <FormField control={form.control} name={`segments.${index}.color`} render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Color del Gajo</FormLabel>
                                                      <FormControl>
                                                          <div className="flex items-center gap-2 border rounded-md p-1 w-32">
                                                            <Input type="color" value={field.value || '#ffffff'} onChange={field.onChange} className="h-6 w-6 p-0 border-none cursor-pointer" />
                                                            <Input type="text" value={field.value || ''} onChange={field.onChange} className="h-6 w-full font-mono text-xs p-1 border-none bg-transparent focus-visible:ring-0" />
                                                          </div>
                                                      </FormControl>
                                                    </FormItem>
                                                  )}/>
                                                </TabsContent>
                                                <TabsContent value="probability" className="pt-4 space-y-6">
                                                  <FormField
                                                      control={form.control}
                                                      name={`segments.${index}.isRealPrize`}
                                                      render={({ field }) => (
                                                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                                              <div className="space-y-0.5">
                                                                  <FormLabel>Premio Real</FormLabel>
                                                                  <FormDescription>Define si este premio cuenta para las estadísticas y consume probabilidad.</FormDescription>
                                                              </div>
                                                              <FormControl>
                                                                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                              </FormControl>
                                                          </FormItem>
                                                      )}
                                                  />
                                                  <FormField
                                                      control={form.control}
                                                      name={`segments.${index}.probability`}
                                                      render={({ field }) => (
                                                          <FormItem>
                                                            <FormLabel>Probabilidad</FormLabel>
                                                            <FormControl>
                                                              {watchedSegments[index]?.isRealPrize ? (
                                                                  <div className="flex items-center gap-4">
                                                                    <Controller
                                                                        name={`segments.${index}.probability`}
                                                                        control={form.control}
                                                                        render={({ field: renderField }) => (
                                                                            <Slider
                                                                                value={[renderField.value ?? 0]}
                                                                                onValueChange={(val) => renderField.onChange(val[0])}
                                                                                max={100}
                                                                                step={1}
                                                                                className="w-full"
                                                                            />
                                                                        )}
                                                                    />
                                                                    <div className="relative w-24">
                                                                      <Controller
                                                                          name={`segments.${index}.probability`}
                                                                          control={form.control}
                                                                          render={({ field: renderField }) => (
                                                                              <Input
                                                                                type="number"
                                                                                value={renderField.value || 0}
                                                                                onChange={(e) => renderField.onChange(parseFloat(e.target.value) || 0)}
                                                                                className="text-center font-mono"
                                                                              />
                                                                          )}
                                                                      />
                                                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                                                                    </div>
                                                                  </div>
                                                              ) : (
                                                                  <Input 
                                                                    value={`${(field.value || 0).toFixed(2)}% (auto)`} 
                                                                    disabled 
                                                                    className="text-center bg-muted/50 border-dashed" 
                                                                  />
                                                              )}
                                                            </FormControl>
                                                            <FormMessage />
                                                          </FormItem>
                                                      )}
                                                  />
                                                </TabsContent>
                                                <TabsContent value="text" className="pt-4 grid grid-cols-2 gap-x-6 gap-y-4">
                                                  <FormField control={form.control} name={`segments.${index}.textColor`} render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel>Color del Texto</FormLabel>
                                                        <div className="flex items-center gap-2 border rounded-md p-1 w-32">
                                                            <Input type="color" {...field} className="h-6 w-6 p-0 border-none cursor-pointer" />
                                                            <Input type="text" {...field} className="h-6 w-full font-mono text-xs p-1 border-none bg-transparent focus-visible:ring-0" />
                                                        </div>
                                                      </FormItem>
                                                  )}/>
                                                  <FormField control={form.control} name={`segments.${index}.fontFamily`} render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Tipografía</FormLabel>
                                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                          {CONDENSED_FONTS.map(font => <SelectItem key={font} value={font} style={{fontFamily: font}}>{font}</SelectItem>)}
                                                        </SelectContent>
                                                      </Select>
                                                    </FormItem>
                                                  )}/>
                                                  <FormField control={form.control} name={`segments.${index}.fontSize`} render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel>Tamaño ({field.value}px)</FormLabel>
                                                        <Slider value={[field.value]} onValueChange={(v) => field.onChange(v[0])} min={4} max={40} step={1} />
                                                      </FormItem>
                                                  )}/>
                                                  <FormField control={form.control} name={`segments.${index}.lineHeight`} render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel>Interlineado ({field.value})</FormLabel>
                                                        <Slider value={[field.value]} onValueChange={(v) => field.onChange(v[0])} min={0.5} max={3} step={0.1} />
                                                      </FormItem>
                                                  )}/>
                                                   <FormField control={form.control} name={`segments.${index}.letterSpacing`} render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel>Interletrado ({field.value}px)</FormLabel>
                                                        <Slider value={[field.value]} onValueChange={(v) => field.onChange(v[0])} min={-5} max={10} step={0.1} />
                                                      </FormItem>
                                                  )}/>
                                                  <FormField control={form.control} name={`segments.${index}.distanceFromCenter`} render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel>Distancia del Centro ({Math.round(field.value*100)}%)</FormLabel>
                                                        <Slider value={[field.value]} onValueChange={(v) => field.onChange(v[0])} min={0} max={1} step={0.01} />
                                                      </FormItem>
                                                  )}/>
                                                </TabsContent>
                                                <TabsContent value="icon" className="pt-4 space-y-4">
                                                   <FormField control={form.control} name={`segments.${index}.iconUrl`} render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel>URL del Icono</FormLabel>
                                                        <Input placeholder="https://..." {...field} />
                                                        <FormDescription>URL de una imagen PNG transparente.</FormDescription>
                                                      </FormItem>
                                                   )}/>
                                                   <FormField control={form.control} name={`segments.${index}.iconScale`} render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel>Escala del Icono ({field.value.toFixed(2)})</FormLabel>
                                                        <Slider value={[field.value]} onValueChange={(v) => field.onChange(v[0])} min={0.1} max={2} step={0.05} />
                                                      </FormItem>
                                                   )}/>
                                                </TabsContent>
                                              </Tabs>
                                            </AccordionContent>
                                          </AccordionItem>
                                        )}
                                      </SortableItem>
                                    ))}
                                  </Accordion>
                                </SortableContext>
                              </DndContext>
                                
                              <div className="text-right font-medium text-sm text-muted-foreground mt-2">
                                  Probabilidad Total de Premios Reales: <span className={`font-bold ${realPrizeTotalProbability > 100 ? 'text-destructive' : 'text-foreground'}`}>{realPrizeTotalProbability.toFixed(2)}%</span>
                              </div>
                              {form.formState.errors.segments && (
                                  <p className="text-sm font-medium text-destructive">{form.formState.errors.segments.message || form.formState.errors.segments.root?.message}</p>
                              )}
                          </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="gameConfig">
                    <Card>
                      <CardHeader>
                        <CardTitle>Configuración de Pantalla de Juego</CardTitle>
                        <CardDescription>Ajusta los mensajes y elementos que ven los jugadores.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-8">
                        <FormField
                            control={form.control}
                            name="rouletteScale"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Escala de la Ruleta ({field.value?.toFixed(2)})</FormLabel>
                                <FormControl>
                                    <Slider
                                    defaultValue={[1]}
                                    value={[field.value ?? 1]}
                                    onValueChange={(val) => field.onChange(val[0])}
                                    max={2}
                                    min={0.1}
                                    step={0.05}
                                    />
                                </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="rouletteVerticalOffset"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Desplazamiento Vertical Ruleta ({field.value?.toFixed(0)}px)</FormLabel>
                                <FormControl>
                                    <Slider
                                    defaultValue={[0]}
                                    value={[field.value ?? 0]}
                                    onValueChange={(val) => field.onChange(val[0])}
                                    max={500}
                                    min={-500}
                                    step={1}
                                    />
                                </FormControl>
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="qrVerticalOffset"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Desplazamiento Vertical del QR/TXT ({field.value?.toFixed(0)}px)</FormLabel>
                                <FormControl>
                                    <Slider
                                    defaultValue={[0]}
                                    value={[field.value ?? 0]}
                                    onValueChange={(val) => field.onChange(val[0])}
                                    max={500}
                                    min={-500}
                                    step={1}
                                    />
                                </FormControl>
                                </FormItem>
                            )}
                        />
                        <Separator />
                        <FormField
                            control={form.control}
                            name="qrCodeScale"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Escala del Módulo QR ({field.value?.toFixed(2)})</FormLabel>
                                <FormControl>
                                    <Slider
                                    defaultValue={[1]}
                                    value={[field.value ?? 1]}
                                    onValueChange={(val) => field.onChange(val[0])}
                                    max={2}
                                    min={0.1}
                                    step={0.05}
                                    />
                                </FormControl>
                                <FormDescription>Ajusta el tamaño del módulo con el código QR en la pantalla de juego.</FormDescription>
                                </FormItem>
                            )}
                        />
                        <Separator />
                        <FormField
                          control={form.control}
                          name="registrationTitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Título en Pantalla de Registro</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={loading} placeholder="Ej: Estás jugando a" />
                              </FormControl>
                              <FormDescription>El texto que aparece encima del nombre del juego en la pantalla del móvil.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="registrationSubtitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subtítulo en Pantalla de Registro</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={loading} placeholder="Ej: Completa tus datos para ganar" />
                              </FormControl>
                              <FormDescription>Un texto adicional opcional debajo del nombre del juego.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                            control={form.control}
                            name="isPhoneRequired"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Requerir Teléfono</FormLabel>
                                  <FormDescription>
                                    Si se activa, el campo de teléfono será obligatorio para poder registrarse.
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={loading}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        <FormField
                          control={form.control}
                          name="successMessage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mensaje de Éxito</FormLabel>
                              <FormControl>
                                <Textarea {...field} disabled={loading} placeholder="Ej: ¡Felicidades! Revisa la pantalla grande para ver tu premio."/>
                              </FormControl>
                              <FormDescription>El mensaje que ve el jugador en su móvil después de solicitar el giro.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
                <div className="mt-8">
                  <Button type="submit" disabled={loading} size="lg">
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              </div>
              
              {/* Columna de Vista Previa */}
              <div className="lg:col-span-1 lg:sticky top-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5"/>
                        Vista Previa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="roulette" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="roulette"><Gamepad2 className="mr-2 h-4 w-4"/>Ruleta</TabsTrigger>
                        <TabsTrigger value="game"><QrCode className="mr-2 h-4 w-4"/>Juego</TabsTrigger>
                      </TabsList>
                      <TabsContent value="roulette">
                        <div className="mt-4 p-4 flex justify-center items-center bg-muted/50 rounded-lg min-h-[450px]">
                          <div className="w-full max-w-md">
                            <SpinningWheel
                              key={roulettePreviewKey}
                              segments={watchedSegments}
                              gameId={game.id}
                              isDemoMode={true}
                              showDemoButton={true}
                              config={currentConfig}
                              onSpinEnd={() => {}}
                            />
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="game">
                        <div className="mt-4 p-2 flex justify-center items-center bg-muted/50 rounded-lg overflow-hidden aspect-[9/16] w-full">
                          <div className="w-full h-full bg-background shadow-lg overflow-hidden relative rounded-lg transform origin-top-left">
                             <iframe
                                key={roulettePreviewKey}
                                src={`/juego/${game.id}/preview`}
                                className="w-full h-full border-0"
                                scrolling="no"
                                title="Game Preview"
                            />
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
         </Form>
    </main>
  );
}
