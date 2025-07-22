
'use client';

import { useState, useMemo } from 'react';
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
import { ArrowLeft, Trash2, PlusCircle, Gift, Image as ImageIcon, FileText, Settings, GripVertical, Eye, Copy as CopyIcon, Palette, Type, PictureInPicture, QrCode, Gamepad2 } from 'lucide-react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '../ui/slider';
import { Separator } from '../ui/separator';
import QRCodeDisplay from '../game/QRCodeDisplay';

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
  segments: z.array(segmentSchema).min(2, 'Se necesitan al menos 2 premios para la ruleta.'),
  backgroundImage: z.string().url({ message: 'Por favor, introduce una URL válida.' }).or(z.literal('')),
  backgroundFit: z.enum(['cover', 'contain', 'fill', 'none']),
  registrationTitle: z.string().optional(),
  registrationSubtitle: z.string().optional(),
  successMessage: z.string().optional(),
  borderImage: z.string().url({ message: 'Por favor, introduce una URL válida.' }).or(z.literal('')),
  borderScale: z.number().min(0.1).max(2).optional(),
  centerImage: z.string().url({ message: 'Por favor, introduce una URL válida.' }).or(z.literal('')),
  centerScale: z.number().min(0.1).max(2).optional(),
  qrCodeScale: z.number().min(0.1).max(2).optional(),
  rouletteScale: z.number().min(0.1).max(2).optional(),
  rouletteVerticalOffset: z.number().min(-500).max(500).optional(),
  rouletteQrGap: z.number().min(0).max(800).optional(),
});

type GameFormValues = z.infer<typeof formSchema>;

interface Game {
  id: string;
  name: string;
  status: 'activo' | 'demo';
  segments?: z.infer<typeof segmentSchema>[];
  backgroundImage?: string;
  backgroundFit?: 'cover' | 'contain' | 'fill' | 'none';
  registrationTitle?: string;
  registrationSubtitle?: string;
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
  rouletteQrGap?: number;
  [key: string]: any;
}

const getRandomColor = () => `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
const CONDENSED_FONTS = [
  'PT Sans', 'Roboto Condensed', 'Oswald', 'Montserrat', 'Lato', 'Bebas Neue', 'Anton'
];

const getDefaultSegment = (name: string): z.infer<typeof segmentSchema> => ({
  name: name,
  color: getRandomColor(),
  isRealPrize: false,
  probability: 0,
  textColor: '#FFFFFF',
  fontFamily: 'PT Sans',
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
      segments: game.segments && game.segments.length > 0 ? game.segments.map(s => ({...getDefaultSegment(''), ...s})) : [getDefaultSegment('Premio 1'), getDefaultSegment('No Ganas')],
      backgroundImage: game.backgroundImage || '',
      backgroundFit: game.backgroundFit || 'cover',
      registrationTitle: game.registrationTitle || 'Estás jugando a',
      registrationSubtitle: game.registrationSubtitle || '',
      successMessage: game.successMessage || 'La ruleta en la pantalla grande debería empezar a girar. ¡Gracias por participar!',
      borderImage: game.borderImage || '',
      borderScale: game.borderScale || 1,
      centerImage: game.centerImage || '',
      centerScale: game.centerScale || 1,
      qrCodeScale: game.qrCodeScale || 1,
      rouletteScale: game.rouletteScale || 1,
      rouletteVerticalOffset: game.rouletteVerticalOffset || 0,
      rouletteQrGap: game.rouletteQrGap || 32,
    },
  });

  const { fields, append, remove, move, insert } = useFieldArray({
    control: form.control,
    name: 'segments',
  });
  
  const watchedFormData = form.watch();

  const { realPrizeTotalProbability, nonRealPrizeProbability } = useMemo(() => {
    const realPrizeSegments = watchedFormData.segments.filter(s => s.isRealPrize);
    const nonRealPrizeSegments = watchedFormData.segments.filter(s => !s.isRealPrize);

    const realPrizeTotalProbability = realPrizeSegments.reduce((acc, seg) => acc + (seg.probability || 0), 0);
    
    let nonRealPrizeProbability = 0;
    if (nonRealPrizeSegments.length > 0) {
      const remainingProbability = 100 - realPrizeTotalProbability;
      nonRealPrizeProbability = remainingProbability > 0 ? remainingProbability / nonRealPrizeSegments.length : 0;
    }
    
    return {
      realPrizeTotalProbability,
      nonRealPrizeProbability: parseFloat(nonRealPrizeProbability.toFixed(2))
    };
  }, [watchedFormData.segments]);


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
      
      const dataToSave = JSON.parse(JSON.stringify(data));
      
      const updateData: Partial<Game> = {
        ...dataToSave,
        plays: game.plays || 0,
        prizesAwarded: game.prizesAwarded || 0,
      };

      await updateDoc(gameRef, updateData);

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

  const backgroundPreviewStyles: React.CSSProperties = watchedFormData.backgroundImage ? {
    backgroundImage: `url(${watchedFormData.backgroundImage})`,
    backgroundSize: watchedFormData.backgroundFit as 'cover' | 'contain' | 'fill' | 'none',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  } : {};

  return (
    <div>
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
                <Tabs defaultValue="data" className="w-full">
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
                                                <TabsList className="grid w-full grid-cols-3">
                                                  <TabsTrigger value="basic"><Palette className="mr-2 h-4 w-4"/>Básico</TabsTrigger>
                                                  <TabsTrigger value="text"><Type className="mr-2 h-4 w-4"/>Texto</TabsTrigger>
                                                  <TabsTrigger value="icon"><PictureInPicture className="mr-2 h-4 w-4"/>Icono</TabsTrigger>
                                                </TabsList>
                                                <TabsContent value="basic" className="pt-4 space-y-6">
                                                  <div className="flex items-center justify-between rounded-lg border p-3">
                                                      <div className="space-y-0.5">
                                                        <Label>Premio Real</Label>
                                                        <FormDescription>Define si este premio cuenta para las estadísticas y consume probabilidad.</FormDescription>
                                                      </div>
                                                      <Controller control={form.control} name={`segments.${index}.isRealPrize`} render={({ field: { onChange, value } }) => ( <Checkbox checked={!!value} onCheckedChange={onChange} /> )}/>
                                                  </div>
                                                  <FormField
                                                    control={form.control}
                                                    name={`segments.${index}.probability`}
                                                    render={({ field }) => (
                                                      <FormItem>
                                                          <FormLabel>Probabilidad ({field.value || 0}%)</FormLabel>
                                                          {watchedFormData.segments[index]?.isRealPrize ? (
                                                              <Slider value={[field.value || 0]} onValueChange={(vals) => field.onChange(vals[0])} max={100 - (realPrizeTotalProbability - (field.value || 0))} step={1} />
                                                          ) : (
                                                              <Input value={`${nonRealPrizeProbability}%`} disabled className="text-center bg-muted" />
                                                          )}
                                                      </FormItem>
                                                    )}
                                                  />
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
                                                          {CONDENSED_FONTS.map(font => <SelectItem key={font} value={font}>{font}</SelectItem>)}
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
                                  Probabilidad Total de Premios Reales: <span className={`font-bold ${realPrizeTotalProbability > 100 ? 'text-destructive' : 'text-foreground'}`}>{realPrizeTotalProbability}%</span>
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
                            name="rouletteQrGap"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Separación Ruleta-QR ({field.value?.toFixed(0)}px)</FormLabel>
                                <FormControl>
                                    <Slider
                                    defaultValue={[32]}
                                    value={[field.value ?? 32]}
                                    onValueChange={(val) => field.onChange(val[0])}
                                    max={800}
                                    min={0}
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
                        <TabsContent value="roulette" className="mt-4 p-4 flex justify-center items-center bg-muted/50 rounded-lg min-h-[500px]">
                           <div className="w-full max-w-md">
                                <SpinningWheel
                                    segments={watchedFormData.segments}
                                    gameId={game.id}
                                    isDemoMode={true}
                                    showDemoButton={true}
                                    config={currentConfig}
                                />
                            </div>
                        </TabsContent>
                        <TabsContent value="game" className="mt-4 p-2 min-h-[500px] flex justify-center items-center bg-muted/50 rounded-lg overflow-hidden">
                           <div
                              className="w-[281px] h-[500px] flex justify-center items-center transform scale-[0.8] origin-center"
                            >
                              <div 
                                className="relative w-full h-full rounded-lg overflow-hidden flex flex-col items-center justify-center"
                                style={backgroundPreviewStyles}
                              >
                                <div 
                                  className="flex flex-col items-center justify-center w-full"
                                  style={{ gap: `${watchedFormData.rouletteQrGap}px` }}
                                >
                                  <div 
                                    className="w-full max-w-2xl text-center flex flex-col items-center justify-center"
                                    style={{ 
                                      transform: `translateY(${watchedFormData.rouletteVerticalOffset}px) scale(${watchedFormData.rouletteScale})` 
                                    }}
                                  >
                                    <div className="w-full max-w-sm sm:max-w-md">
                                      <SpinningWheel 
                                        segments={watchedFormData.segments} 
                                        gameId={game.id} 
                                        isDemoMode={true}
                                        config={currentConfig}
                                      />
                                    </div>
                                  </div>
                                  <Card 
                                    className="w-full max-w-sm text-center shadow-lg bg-black/10 backdrop-blur-sm border-white/20 text-white"
                                    style={{ transform: `scale(${watchedFormData.qrCodeScale})` }}
                                   >
                                    <CardHeader className="p-4">
                                      <CardTitle className="font-headline text-lg flex items-center justify-center gap-2">
                                          <QrCode size={20} />
                                          ¡Escanea para Jugar!
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-col items-center justify-center gap-2 p-4 pt-0">
                                        <QRCodeDisplay gameId={game.id} scale={0.5} />
                                        <Separator className="bg-white/20 my-1"/>
                                        <p className="text-xs">
                                          Abre la cámara de tu teléfono y apunta al código QR para jugar.
                                        </p>
                                    </CardContent>
                                  </Card>
                                </div>
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
    </div>
  );
}
