
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { useAuth } from '@/hooks/useAuth';

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
import { ArrowLeft, Trash2, PlusCircle, Gift, Image as ImageIcon, FileText, Settings, GripVertical, Eye, Copy as CopyIcon, Palette, Type, PictureInPicture, QrCode, Gamepad2, Users, RefreshCw, Smartphone, Instagram, ExternalLink, Clipboard, ClipboardPaste } from 'lucide-react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '../ui/slider';
import { Separator } from '../ui/separator';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import SpinningWheel from '@/components/game/SpinningWheel';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

const generateUniqueId = () => Math.random().toString(36).substring(2, 11);

const segmentSchema = z.object({
  id: z.string().default(() => generateUniqueId()),
  name: z.string().min(1, 'El nombre del premio no puede estar vacío.'),
  formalName: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Debe ser un color HEX válido.'),
  isRealPrize: z.boolean().optional(),
  probability: z.number().optional(),
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
});

const formSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  status: z.enum(['activo', 'demo']),
  clientName: z.string().optional(),
  clientEmail: z.string().email({ message: "Por favor, introduce un correo válido." }).optional().or(z.literal('')),
  managementType: z.enum(['client', 'playapp']).default('client'),
  exemptedEmails: z.string().optional(),
  instagramProfile: z.string().url({ message: 'Debe ser una URL de Instagram válida.' }).or(z.literal('')).optional(),
  tvWinMessage: z.string().optional(),
  tvWinSubtitle: z.string().optional(),
  tvLoseMessage: z.string().optional(),
  tvLoseSubtitle: z.string().optional(),
  mobileWinMessage: z.string().optional(),
  mobileWinSubtitle: z.string().optional(),
  mobileLoseMessage: z.string().optional(),
  mobileLoseSubtitle: z.string().optional(),
  segments: z.array(segmentSchema).min(2, 'Se necesitan al menos 2 premios.').max(16, 'No puedes tener más de 16 premios.'),
  segmentsJson: z.string().optional(),
  backgroundImage: z.string().url({ message: 'Por favor, introduce una URL válida.' }).or(z.literal('')),
  backgroundFit: z.enum(['cover', 'contain', 'fill', 'none']),
  backgroundVideo: z.string().url({ message: 'Por favor, introduce una URL válida.' }).or(z.literal('')),
  mobileBackgroundImage: z.string().url({ message: 'Por favor, introduce una URL válida.' }).or(z.literal('')).optional(),
  mobileBackgroundFit: z.enum(['cover', 'contain', 'fill', 'none']).optional(),
  mobileBackgroundVideo: z.string().url({ message: 'Por favor, introduce una URL válida.' }).or(z.literal('')).optional(),
  registrationTitle: z.string().optional(),
  registrationSubtitle: z.string().optional(),
  isPhoneRequired: z.boolean().optional(),
  successMessage: z.string().optional(),
  qrCodeScale: z.number().min(0.1).max(2).optional(),
  rouletteScale: z.number().min(0.1).max(2).optional(),
  wheelScale: z.number().min(0.1).max(2).optional(),
  rouletteVerticalOffset: z.number().min(-500).max(500).optional(),
  qrVerticalOffset: z.number().min(-500).max(500).optional(),
  screenRotation: z.number().default(0),
  config: z.object({
    borderImage: z.string().url({ message: 'Por favor, introduce una URL válida.' }).or(z.literal('')),
    borderScale: z.number().min(0.1).max(2).optional(),
    centerImage: z.string().url({ message: 'Por favor, introduce una URL válida.' }).or(z.literal('')),
    centerScale: z.number().min(0.1).max(2).optional(),
    strokeWidth: z.number().min(0).max(8).optional(),
    strokeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Debe ser un color HEX válido.').optional(),
  }),
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
type SegmentStyle = Omit<z.infer<typeof segmentSchema>, 'id' | 'name' | 'color' | 'isRealPrize' | 'probability' | 'formalName'>;


interface Game {
  id: string;
  name: string;
  status: 'activo' | 'demo';
  clientName?: string;
  clientEmail?: string;
  managementType?: 'client' | 'playapp';
  exemptedEmails?: string[];
  instagramProfile?: string;
  segments?: z.infer<typeof segmentSchema>[];
  backgroundImage?: string;
  backgroundFit?: 'cover' | 'contain' | 'fill' | 'none';
  mobileBackgroundImage?: string;
  mobileBackgroundFit?: 'cover' | 'contain' | 'fill' | 'none';
  registrationTitle?: string;
  registrationSubtitle?: string;
  isPhoneRequired?: boolean;
  successMessage?: string;
  plays?: number;
  prizesAwarded?: number;
  qrCodeScale?: number;
  rouletteScale?: number;
  wheelScale?: number;
  rouletteVerticalOffset?: number;
  qrVerticalOffset?: number;
  config?: {
    borderImage?: string;
    borderScale?: number;
    centerImage?: string;
    centerScale?: number;
    strokeWidth?: number;
    strokeColor?: string;
  },
  [key: string]: any;
}

const getRandomColor = () => `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
const CONDENSED_FONTS = [
    'Lato', 'Anton', 'Bebas Neue', 'DM Sans', 'Oswald', 'PT Sans Narrow', 'Roboto Condensed', 'Barlow Condensed'
];

const getDefaultSegment = (name: string): z.infer<typeof segmentSchema> => ({
  id: generateUniqueId(),
  name: name,
  formalName: '',
  color: getRandomColor(),
  isRealPrize: false,
  probability: 0,
  textColor: '#FFFFFF',
  fontFamily: 'Bebas Neue',
  fontSize: 16,
  lineHeight: 1,
  letterSpacing: 0.5,
  letterSpacingLineTwo: 0.5 * 1.1,
  distanceFromCenter: 0.7,
  iconUrl: '',
  iconName: '',
  iconScale: 1,
});


export default function EditGameForm({ game: initialGame }: { game: Game }) {
  const router = useRouter();
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState('');
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
  const [copiedStyle, setCopiedStyle] = useState<SegmentStyle | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  
  const form = useForm<GameFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialGame.name || '',
      status: initialGame.status || 'demo',
      clientName: initialGame.clientName || '',
      clientEmail: initialGame.clientEmail || '',
      managementType: initialGame.managementType || 'client',
      exemptedEmails: (initialGame.exemptedEmails || []).join(', '),
      instagramProfile: initialGame.instagramProfile || '',
      segments: initialGame.segments && initialGame.segments.length > 0 ? initialGame.segments.map(s => ({...getDefaultSegment(''), ...s, id: s.id || generateUniqueId()})) : [getDefaultSegment('Premio 1'), getDefaultSegment('No Ganas')],
      segmentsJson: JSON.stringify(initialGame.segments, null, 2),
      backgroundImage: initialGame.backgroundImage || '',
      backgroundFit: initialGame.backgroundFit || 'cover',
      mobileBackgroundImage: initialGame.mobileBackgroundImage || '',
      mobileBackgroundFit: initialGame.mobileBackgroundFit || 'cover',
      registrationTitle: initialGame.registrationTitle || '',
      registrationSubtitle: initialGame.registrationSubtitle || '',
      isPhoneRequired: initialGame.isPhoneRequired || false,
      successMessage: initialGame.successMessage || 'La ruleta en la pantalla grande debería empezar a girar. ¡Gracias por participar!',
      screenRotation: initialGame.screenRotation || 0,
      qrCodeScale: initialGame.qrCodeScale || 1,
      rouletteScale: initialGame.rouletteScale || 1,
      tvWinMessage: initialGame.tvWinMessage || '¡Premio!',
      tvWinSubtitle: initialGame.tvWinSubtitle || 'El ganador recibirá un email con instrucciones.',
      tvLoseMessage: initialGame.tvLoseMessage || '¡Casi!',
      tvLoseSubtitle: initialGame.tvLoseSubtitle || '¡Mucha suerte para la próxima!',
      mobileWinMessage: initialGame.mobileWinMessage || '¡Felicidades!',
      mobileWinSubtitle: initialGame.mobileWinSubtitle || 'El ganador recibirá un email con instrucciones.',
      mobileLoseMessage: initialGame.mobileLoseMessage || '¡Casi!',
      mobileLoseSubtitle: initialGame.mobileLoseSubtitle || '¡Mucha suerte para la próxima!',
      wheelScale: initialGame.wheelScale || 1,
      rouletteVerticalOffset: initialGame.rouletteVerticalOffset || 0,
      qrVerticalOffset: initialGame.qrVerticalOffset || 0,
      config: {
        borderImage: initialGame.config?.borderImage || initialGame.borderImage || 'https://i.imgur.com/J62nHj9.png',
        borderScale: initialGame.config?.borderScale || initialGame.borderScale || 1,
        centerImage: initialGame.config?.centerImage || initialGame.centerImage || 'https://i.imgur.com/N3PAzB2.png',
        centerScale: initialGame.config?.centerScale || initialGame.centerScale || 1,
        strokeWidth: initialGame.config?.strokeWidth ?? 1,
        strokeColor: initialGame.config?.strokeColor || '#000000',
      }
    },
  });

  useEffect(() => {
    if (!db) {
      // Opcional: puedes mostrar un mensaje de error o advertencia aquí
      return;
    }
    const gameRef = doc(db, 'games', initialGame.id);
    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Game;
        const segmentsData = data.segments && data.segments.length > 0 ? data.segments.map(s => ({...getDefaultSegment(''), ...s, id: s.id || generateUniqueId()})) : [getDefaultSegment('Premio 1'), getDefaultSegment('No Ganas')];
        const formValues = {
          name: data.name || '',
          status: data.status || 'demo',
          clientName: data.clientName || '',
          clientEmail: data.clientEmail || '',
          managementType: data.managementType || 'client',
          exemptedEmails: (data.exemptedEmails || []).join(', '),
          instagramProfile: data.instagramProfile || '',
          segments: segmentsData,
          segmentsJson: JSON.stringify(segmentsData, null, 2),
          backgroundImage: data.backgroundImage || '',
          backgroundFit: data.backgroundFit || 'cover',
          mobileBackgroundImage: data.mobileBackgroundImage || '',
          mobileBackgroundFit: data.mobileBackgroundFit || 'cover',
          registrationTitle: data.registrationTitle || '',
          registrationSubtitle: data.registrationSubtitle || '',
          isPhoneRequired: data.isPhoneRequired || false,
          successMessage: data.successMessage || 'La ruleta en la pantalla grande debería empezar a girar. ¡Gracias por participar!',
          qrCodeScale: data.qrCodeScale || 1,
          rouletteScale: data.rouletteScale || 1,
          wheelScale: data.wheelScale || 1,
          rouletteVerticalOffset: data.rouletteVerticalOffset || 0,
          qrVerticalOffset: data.qrVerticalOffset || 0,
          config: {
            borderImage: data.config?.borderImage || data.borderImage || 'https://i.imgur.com/J62nHj9.png',
            borderScale: data.config?.borderScale || data.borderScale || 1,
            centerImage: data.config?.centerImage || data.centerImage || 'https://i.imgur.com/N3PAzB2.png',
                centerScale: data.config?.centerScale || data.centerScale || 1,
                strokeWidth: data.config?.strokeWidth ?? 1,
                strokeColor: data.config?.strokeColor || '#000000',
              }
            };
            form.reset(formValues);
        }
    });

    return () => unsubscribe();
  }, [initialGame.id, form]);
  
  const watchedFormData = form.watch();
  const watchedSegments = form.watch('segments');

  const { fields, append, remove, move, insert, replace } = useFieldArray({
    control: form.control,
    name: 'segments',
    keyName: "fieldId",
  });

  const { realPrizeTotalProbability, nonRealPrizeProbability } = useMemo(() => {
    const realPrizeSegments = watchedSegments.filter(s => s.isRealPrize);
    const nonRealPrizeSegments = watchedSegments.filter(s => !s.isRealPrize);

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
  
  useEffect(() => {
    form.setValue('segmentsJson', JSON.stringify(watchedSegments, null, 2));
  }, [watchedSegments, form]);

  const handleJsonChange = (jsonString: string) => {
    try {
      const parsedSegments = JSON.parse(jsonString);
      const result = z.array(segmentSchema).safeParse(parsedSegments);
      if (result.success) {
        replace(result.data);
        form.clearErrors('segmentsJson');
      } else {
        form.setError('segmentsJson', { type: 'manual', message: 'El formato JSON es inválido o no coincide con el esquema.' });
      }
    } catch (e) {
      form.setError('segmentsJson', { type: 'manual', message: 'El JSON no es válido.' });
    }
  };

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
      if (!db) {
        toast({
          title: 'Error de Firebase',
          description: 'No se pudo conectar a la base de datos. Verifica la configuración de Firebase.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      const gameRef = doc(db, 'games', initialGame.id);

      const emailList = data.exemptedEmails
        ? data.exemptedEmails.split(',').map(email => email.trim().toLowerCase()).filter(email => email)
        : [];

      const formData = JSON.parse(JSON.stringify(data));
      const dirtyFields = Object.keys(form.formState.dirtyFields);
      
      // Solo incluir los campos que realmente han cambiado
      const updateData: Partial<Game> = {};
      dirtyFields.forEach(field => {
        if (field === 'exemptedEmails') {
          updateData.exemptedEmails = emailList;
        } else if (field !== 'segmentsJson' && field !== 'borderImage' && field !== 'borderScale' && field !== 'centerImage' && field !== 'centerScale') {
          updateData[field] = formData[field];
        }
      });

      await updateDoc(gameRef, updateData);

      toast({
        title: '¡Juego Actualizado!',
        description: `Los cambios en "${data.name}" han sido guardados.`,
      });
      
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
    if (newSegmentName.trim() && fields.length < 16) {
      append(getDefaultSegment(newSegmentName.trim()));
      setNewSegmentName('');
    } else if (fields.length >= 16) {
        toast({
            variant: "destructive",
            title: "Límite de premios alcanzado",
            description: "No puedes añadir más de 16 premios a una ruleta.",
        });
    }
  };

  const duplicateSegment = (index: number) => {
    if (fields.length >= 16) {
       toast({
            variant: "destructive",
            title: "Límite de premios alcanzado",
            description: "No puedes añadir más de 16 premios a una ruleta.",
        });
        return;
    }
    const segmentToDuplicate = form.getValues(`segments.${index}`);
    insert(index + 1, {
      ...segmentToDuplicate,
      name: `${segmentToDuplicate.name} (Copia)`,
      id: generateUniqueId(),
    });
  };

  const copyStyle = (index: number) => {
    const { id, name, color, isRealPrize, probability, formalName, ...style } = form.getValues(`segments.${index}`);
    setCopiedStyle(style);
    toast({
        title: "Estilo Copiado",
        description: "El estilo del premio ha sido copiado al portapapeles.",
    });
  };

  const pasteStyle = (index: number) => {
      if (!copiedStyle) {
          toast({
              variant: "destructive",
              title: "No hay estilo que pegar",
              description: "Primero copia el estilo de otro premio.",
          });
          return;
      }
      form.setValue(`segments.${index}.textColor`, copiedStyle.textColor, { shouldDirty: true });
      form.setValue(`segments.${index}.fontFamily`, copiedStyle.fontFamily, { shouldDirty: true });
      form.setValue(`segments.${index}.fontSize`, copiedStyle.fontSize, { shouldDirty: true });
      form.setValue(`segments.${index}.lineHeight`, copiedStyle.lineHeight, { shouldDirty: true });
      form.setValue(`segments.${index}.letterSpacing`, copiedStyle.letterSpacing, { shouldDirty: true });
      form.setValue(`segments.${index}.letterSpacingLineTwo`, copiedStyle.letterSpacingLineTwo, { shouldDirty: true });
      form.setValue(`segments.${index}.distanceFromCenter`, copiedStyle.distanceFromCenter, { shouldDirty: true });
      form.setValue(`segments.${index}.iconUrl`, copiedStyle.iconUrl, { shouldDirty: true });
      form.setValue(`segments.${index}.iconName`, copiedStyle.iconName, { shouldDirty: true });
      form.setValue(`segments.${index}.iconScale`, copiedStyle.iconScale, { shouldDirty: true });
      toast({
          title: "Estilo Pegado",
          description: "Se ha aplicado el estilo copiado a este premio.",
      });
  };

  const getGameUrl = (gameId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/juego/${gameId}`;
    }
    return `/juego/${gameId}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
        title: "¡Enlace Copiado!",
        description: "El enlace público del juego ha sido copiado a tu portapapeles.",
    });
  };

  const backUrl = isSuperAdmin ? '/admin' : '/client/dashboard';

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
       <div className="flex items-center gap-4 mb-4">
          <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href={backUrl}>
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
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="data" className={!isSuperAdmin ? "hidden md:flex" : ""}><Settings className="mr-2 h-4 w-4" />Generales</TabsTrigger>
                    <TabsTrigger value="prizes"><Gamepad2 className="mr-2 h-4 w-4" />Ruleta</TabsTrigger>
                    <TabsTrigger value="gameConfig"><Settings className="mr-2 h-4 w-4"/>Pantallas</TabsTrigger>
                    <TabsTrigger value="texts"><Type className="mr-2 h-4 w-4"/>Textos</TabsTrigger>
                  </TabsList>

                  <TabsContent value="data" className={!isSuperAdmin ? "hidden md:block" : ""}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      {/* Card 1: Información Básica */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Información Básica</CardTitle>
                          <CardDescription>Datos principales del juego</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre del Juego</FormLabel>
                                <FormControl>
                                  <Input {...field} disabled={loading || !isSuperAdmin} />
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
                                    <span className={`text-sm font-medium ${field.value === 'activo' ? 'text-primary' : 'text-muted-foreground'}`}>Activo</span>
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      {/* Card 2: Información del Cliente */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Información del Cliente</CardTitle>
                          <CardDescription>Datos del propietario del juego</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="clientName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre del Cliente</FormLabel>
                                <FormControl>
                                  <Input placeholder="Nombre de la empresa o persona" {...field} value={field.value || ''} disabled={loading || !isSuperAdmin} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="clientEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email del Cliente</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="dueño.tienda@ejemplo.com" {...field} value={field.value || ''} disabled={!isSuperAdmin}/>
                                </FormControl>
                                 <FormDescription>
                                  Dirección donde recibirá avisos cuando se gane un premio.
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
                                    disabled={loading || !isSuperAdmin}
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
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      {/* Card 3: Configuración de Registro */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Configuración de Registro</CardTitle>
                          <CardDescription>Opciones para el formulario de registro</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="instagramProfile"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Instagram className="h-4 w-4"/> URL de Instagram
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="https://www.instagram.com/tu_usuario"
                                    {...field}
                                    value={field.value ?? ''}
                                    disabled={loading}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Si se completa, se pedirá confirmar que sigue esta cuenta.
                                </FormDescription>
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
                                    Hacer obligatorio el campo de teléfono.
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
                        </CardContent>
                      </Card>

                      {/* Card 4: Configuración Avanzada */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Configuración Avanzada</CardTitle>
                          <CardDescription>Opciones de desarrollo y pruebas</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="exemptedEmails"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Users className="h-4 w-4"/> Correos Exentos
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="un-email@ejemplo.com, otro@ejemplo.com"
                                    className="min-h-[100px] font-mono text-sm"
                                    {...field}
                                    value={field.value ?? ''}
                                    disabled={loading}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Emails que pueden jugar múltiples veces (separados por comas).
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="prizes">
                    <Card>
                      <CardHeader>
                        <CardTitle>Diseño de la Ruleta</CardTitle>
                        <CardDescription>Define los segmentos, sus imágenes y sus probabilidades.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-6">
                                <div className="space-y-4">
                                    <FormField
                                        name="config.borderImage"
                                        control={form.control}
                                        render={() => (
                                            <FormItem>
                                                <FormLabel>Imagen del Borde</FormLabel>
                                                <ImageUpload fieldName="config.borderImage" gameId={initialGame.id} />
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                    control={form.control}
                                    name="config.borderScale"
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
                                     <FormField
                                        name="config.centerImage"
                                        control={form.control}
                                        render={() => (
                                            <FormItem>
                                                <FormLabel>Imagen del Centro/Puntero</FormLabel>
                                                <ImageUpload fieldName="config.centerImage" gameId={initialGame.id} />
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                    control={form.control}
                                    name="config.centerScale"
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
                                    <h4 className="font-semibold">Líneas Divisorias</h4>
                                    <FormField
                                    control={form.control}
                                    name="config.strokeWidth"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Grosor de Línea ({field.value?.toFixed(1)}px)</FormLabel>
                                        <FormControl>
                                            <Slider
                                            value={[field.value ?? 1]}
                                            onValueChange={(val) => field.onChange(val[0])}
                                            max={8}
                                            min={0}
                                            step={0.5}
                                            />
                                        </FormControl>
                                        </FormItem>
                                    )}
                                    />
                                    
                                    <FormField
                                    control={form.control}
                                    name="wheelScale"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <RefreshCw className="h-4 w-4"/> 
                                            Escala Global ({field.value?.toFixed(2)})
                                        </FormLabel>
                                        <FormControl>
                                            <Slider
                                            value={[field.value ?? 1]}
                                            onValueChange={(val) => field.onChange(val[0])}
                                            max={2}
                                            min={0.1}
                                            step={0.05}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Este control escala toda la ruleta (incluidos borde y puntero) manteniendo las proporciones.
                                        </FormDescription>
                                        </FormItem>
                                    )}
                                    />
                                </div>
                                <div className="space-y-4">
                                  <h4 className="font-semibold opacity-0">.</h4>
                                   <FormField control={form.control} name={`config.strokeColor`} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Color de Línea</FormLabel>
                                            <div className="flex items-center gap-2 border rounded-md p-1 w-32">
                                                <Input type="color" {...field} value={field.value || '#000000'} className="h-6 w-6 p-0 border-none cursor-pointer" />
                                                <Input type="text" {...field} value={field.value || '#000000'} className="h-6 w-full font-mono text-xs p-1 border-none bg-transparent focus-visible:ring-0" />
                                            </div>
                                        </FormItem>
                                    )}/>
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
                                        disabled={loading || fields.length >= 16}
                                    />
                                </div>
                                <Button type="button" onClick={addSegment} disabled={!newSegmentName.trim() || loading || fields.length >= 16}>
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

                                                <Controller
                                                    control={form.control}
                                                    name={`segments.${index}.color`}
                                                    render={({ field: colorField }) => (
                                                        <div className="flex items-center gap-2 border rounded-md p-1" onClick={(e) => e.stopPropagation()}>
                                                          <Input 
                                                              type="color" 
                                                              value={colorField.value || '#ffffff'}
                                                              onChange={colorField.onChange}
                                                              className="h-6 w-6 p-0 border-none cursor-pointer bg-transparent"
                                                          />
                                                          <Input
                                                              type="text"
                                                              value={colorField.value}
                                                              onChange={colorField.onChange}
                                                              className="h-6 w-20 font-mono text-xs p-1 border-none bg-transparent focus-visible:ring-0"
                                                          />
                                                        </div>
                                                    )}
                                                />

                                                <div className="flex-1 px-2">
                                                    <Controller control={form.control} name={`segments.${index}.name`} render={({ field: controllerField }) => (
                                                      <Input {...controllerField} className="border-none focus-visible:ring-0 bg-transparent w-full" onClick={(e) => e.stopPropagation()} />
                                                    )}/>
                                                </div>
                                                <AccordionTrigger className="p-2 hover:bg-accent rounded-md" />
                                                <div className="flex items-center gap-1 pl-2">
                                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); copyStyle(index); }}>
                                                        <Clipboard className="h-4 w-4 text-blue-500" />
                                                    </Button>
                                                     <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); pasteStyle(index); }} disabled={!copiedStyle}>
                                                        <ClipboardPaste className="h-4 w-4 text-green-500" />
                                                    </Button>
                                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); duplicateSegment(index); }}>
                                                        <CopyIcon className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); remove(index); }}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <AccordionContent className="p-4 border-t">
                                              <Tabs defaultValue="probability" className="w-full">
                                                <TabsList className="grid w-full grid-cols-3">
                                                  <TabsTrigger value="probability"><Gift className="mr-2 h-4 w-4" />Probabilidad</TabsTrigger>
                                                  <TabsTrigger value="text"><Type className="mr-2 h-4 w-4"/>Texto</TabsTrigger>
                                                  <TabsTrigger value="icon"><PictureInPicture className="mr-2 h-4 w-4"/>Icono</TabsTrigger>
                                                </TabsList>
                                                <TabsContent value="probability" className="pt-4 space-y-6">
                                                    <FormField
                                                      control={form.control}
                                                      name={`segments.${index}.formalName`}
                                                      render={({ field }) => (
                                                        <FormItem>
                                                          <FormLabel>Nombre Formal del Premio</FormLabel>
                                                          <FormControl>
                                                            <Input {...field} placeholder="Ej: 2x1 en Cerveza Lager" value={field.value || ''} />
                                                          </FormControl>
                                                          <FormDescription>
                                                            Este es el nombre que se usará en los emails de notificación. Si se deja vacío, se usará el nombre del gajo.
                                                          </FormDescription>
                                                          <FormMessage />
                                                        </FormItem>
                                                      )}
                                                    />
                                                    <Separator/>
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
                                                                      render={({ field: { onChange, value } }) => (
                                                                          <Slider
                                                                              value={[value || 0]}
                                                                              onValueChange={(val) => onChange(val[0])}
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
                                                                          render={({ field: { onChange, value } }) => (
                                                                              <Input
                                                                                  type="number"
                                                                                  value={value || 0}
                                                                                  onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
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
                                                            <Input type="color" {...field} value={field.value || '#000000'} className="h-6 w-6 p-0 border-none cursor-pointer" />
                                                            <Input type="text" {...field} value={field.value || '#000000'} className="h-6 w-full font-mono text-xs p-1 border-none bg-transparent focus-visible:ring-0" />
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
                                                        <Slider value={[field.value ?? 0]} onValueChange={(v) => field.onChange(v[0])} min={4} max={40} step={1} />
                                                      </FormItem>
                                                  )}/>
                                                  <FormField control={form.control} name={`segments.${index}.lineHeight`} render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel>Interlineado ({field.value})</FormLabel>
                                                        <Slider value={[field.value ?? 1]} onValueChange={(v) => field.onChange(v[0])} min={0.5} max={3} step={0.1} />
                                                      </FormItem>
                                                  )}/>
                                                   <FormField control={form.control} name={`segments.${index}.letterSpacing`} render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel>Interletrado ({field.value}px)</FormLabel>
                                                        <Slider value={[field.value ?? 0]} onValueChange={(v) => field.onChange(v[0])} min={-5} max={10} step={0.1} />
                                                      </FormItem>
                                                  )}/>
                                                   <FormField control={form.control} name={`segments.${index}.letterSpacingLineTwo`} render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel>Interletrado Línea 2 ({field.value?.toFixed(1)}px)</FormLabel>
                                                        <Slider value={[field.value ?? 0]} onValueChange={(v) => field.onChange(v[0])} min={-5} max={10} step={0.1} />
                                                      </FormItem>
                                                  )}/>
                                                  <FormField control={form.control} name={`segments.${index}.distanceFromCenter`} render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel>Distancia del Centro ({Math.round((field.value ?? 0)*100)}%)</FormLabel>
                                                        <Slider value={[field.value ?? 0]} onValueChange={(v) => field.onChange(v[0])} min={0} max={1} step={0.01} />
                                                      </FormItem>
                                                  )}/>
                                                </TabsContent>
                                                <TabsContent value="icon" className="pt-4 space-y-4">
                                                   <FormField control={form.control} name={`segments.${index}.iconName`} render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel>Nombre del Icono (Lucide)</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Ej: Gift, Trophy, Star" {...field} value={field.value || ''}/>
                                                        </FormControl>
                                                        <FormDescription>
                                                            Busca un icono en la <a href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">biblioteca de Lucide</a> y pega su nombre aquí.
                                                        </FormDescription>
                                                      </FormItem>
                                                   )}/>
                                                   <FormField control={form.control} name={`segments.${index}.iconScale`} render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel>Escala del Icono ({field.value?.toFixed(2)})</FormLabel>
                                                        <Slider value={[field.value ?? 1]} onValueChange={(v) => field.onChange(v[0])} min={0.1} max={2} step={0.05} />
                                                      </FormItem>
                                                   )}/>
                                                   <FormField
                                                        name={`segments.${index}.iconUrl`}
                                                        control={form.control}
                                                        render={() => (
                                                          <FormItem>
                                                            <FormLabel>O usa una URL de imagen personalizada</FormLabel>
                                                            <ImageUpload fieldName={`segments.${index}.iconUrl`} gameId={initialGame.id} />
                                                             <FormDescription>Si rellenas este campo, se usará esta imagen en lugar del icono de Lucide.</FormDescription>
                                                            <FormMessage/>
                                                          </FormItem>
                                                        )}
                                                    />
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

                  <TabsContent value="texts">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      {/* Card 1: Pantalla de Registro */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <QrCode className="h-5 w-5"/>
                            Pantalla de Registro
                          </CardTitle>
                          <CardDescription>Textos mostrados en el formulario inicial</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="registrationSubtitle"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Subtítulo del Juego</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Ej: Completa tus datos para ganar" value={field.value || ''}/>
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
                                <FormLabel>Mensaje de Confirmación</FormLabel>
                                <FormControl>
                                  <Textarea {...field} placeholder="Ej: ¡Felicidades! Revisa la pantalla grande para ver tu premio." value={field.value || ''} />
                                </FormControl>
                                <FormDescription>El mensaje que ve el jugador después de completar el registro.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      {/* Card 2: Pantalla de TV - Ganar */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Gift className="h-5 w-5"/>
                            Pantalla TV - Victoria
                          </CardTitle>
                          <CardDescription>Textos mostrados en la TV cuando se gana</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="tvWinMessage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Título</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="¡Premio!" value={field.value || ''}/>
                                </FormControl>
                                <FormDescription>Título principal que aparece cuando alguien gana un premio real.</FormDescription>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="tvWinSubtitle"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Subtítulo</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="El ganador recibirá un email con instrucciones." value={field.value || ''}/>
                                </FormControl>
                                <FormDescription>Texto secundario que aparece debajo del título.</FormDescription>
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      {/* Card 3: Pantalla de TV - Perder */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Type className="h-5 w-5"/>
                            Pantalla TV - No Victoria
                          </CardTitle>
                          <CardDescription>Textos mostrados en la TV cuando no se gana</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="tvLoseMessage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Título</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="¡Casi!" value={field.value || ''}/>
                                </FormControl>
                                <FormDescription>Título principal que aparece cuando no se gana un premio real.</FormDescription>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="tvLoseSubtitle"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Subtítulo</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="¡Mucha suerte para la próxima!" value={field.value || ''}/>
                                </FormControl>
                                <FormDescription>Texto secundario que aparece debajo del título.</FormDescription>
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      {/* Card 4: Pantalla Móvil - Mensajes */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Smartphone className="h-5 w-5"/>
                            Pantalla Móvil - Resultados
                          </CardTitle>
                          <CardDescription>Textos mostrados en el móvil tras el giro</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            <div className="space-y-4">
                              <h4 className="text-sm font-medium">Al Ganar</h4>
                              <FormField
                                control={form.control}
                                name="mobileWinMessage"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Título</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="¡Felicidades!" value={field.value || ''} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="mobileWinSubtitle"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Descripción</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} 
                                        placeholder="El ganador recibirá un email con instrucciones."
                                        value={field.value || ''} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <Separator />
                            
                            <div className="space-y-4">
                              <h4 className="text-sm font-medium">Al No Ganar</h4>
                              <FormField
                                control={form.control}
                                name="mobileLoseMessage"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Título</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="¡Casi!" value={field.value || ''} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="mobileLoseSubtitle"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Descripción</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} 
                                        placeholder="¡Mucha suerte para la próxima!"
                                        value={field.value || ''} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="gameConfig">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      {/* Card 1: Configuración de TV */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5"/> 
                            Pantalla TV
                          </CardTitle>
                          <CardDescription>Ajustes generales de la pantalla principal</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                              control={form.control}
                              name="screenRotation"
                              render={({ field }) => (
                                <FormItem className="space-y-3">
                                  <FormLabel>Rotación de Pantalla</FormLabel>
                                  <FormControl>
                                    <RadioGroup
                                      onValueChange={(value) => field.onChange(Number(value))}
                                      value={String(field.value || 0)}
                                      className="flex flex-row space-x-4"
                                    >
                                      <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                          <RadioGroupItem value="-90" />
                                        </FormControl>
                                        <FormLabel className="font-normal">-90°</FormLabel>
                                      </FormItem>
                                      <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                          <RadioGroupItem value="0" />
                                        </FormControl>
                                        <FormLabel className="font-normal">0°</FormLabel>
                                      </FormItem>
                                      <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                          <RadioGroupItem value="90" />
                                        </FormControl>
                                        <FormLabel className="font-normal">90°</FormLabel>
                                      </FormItem>
                                    </RadioGroup>
                                  </FormControl>
                                  <FormDescription>
                                    Rota la pantalla del juego para adaptarse a TVs verticales.
                                  </FormDescription>
                                </FormItem>
                              )}
                            />
                             <FormField
                                control={form.control}
                                name="wheelScale"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <RefreshCw className="h-4 w-4"/> 
                                        Escala Global de la Ruleta ({field.value?.toFixed(2)})
                                    </FormLabel>
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
                                    <FormDescription>
                                        Este control escala toda la ruleta (incluidos borde y puntero) manteniendo las proporciones.
                                    </FormDescription>
                                    </FormItem>
                                )}
                            />
                             <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="backgroundImage"
                                    render={() => (
                                        <FormItem>
                                        <FormLabel>Imagen de Fondo (TV)</FormLabel>
                                        <ImageUpload fieldName="backgroundImage" gameId={initialGame.id} />
                                        <FormDescription>
                                            Sube una imagen para usar de fondo. Déjalo en blanco para no usar ninguna.
                                        </FormDescription>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="backgroundVideo"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Video de Fondo (TV)</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="url" 
                                                placeholder="https://tu-video.mp4" 
                                                {...field} 
                                                value={field.value || ''}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            URL de un video .mp4 para usar como fondo. Si se especifica un video, tendrá prioridad sobre la imagen.
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
                                      <FormLabel>Ajuste del Fondo</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Selecciona cómo se ajustará el fondo" />
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
                      
                        {/* Card 2: Ajustes de la Ruleta */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <RefreshCw className="h-5 w-5"/>
                              Ajustes de la Ruleta
                            </CardTitle>
                            <CardDescription>Configuración de tamaño y posición</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
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
                          </CardContent>
                        </Card>

                        {/* Card 3: Pantalla Móvil */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Smartphone className="h-5 w-5"/>
                              Pantalla de Registro (Móvil)
                            </CardTitle>
                            <CardDescription>Ajustes de la pantalla del jugador</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="mobileBackgroundImage"
                                    render={() => (
                                    <FormItem>
                                        <FormLabel>Imagen de Fondo (Móvil)</FormLabel>
                                        <ImageUpload fieldName="mobileBackgroundImage" gameId={initialGame.id} />
                                        <FormDescription>
                                        Fondo para la pantalla de registro en el móvil. Si se deja en blanco, usará el color de fondo por defecto.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="mobileBackgroundVideo"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Video de Fondo (Móvil)</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="url" 
                                                placeholder="https://tu-video.mp4" 
                                                {...field} 
                                                value={field.value || ''}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            URL de un video .mp4 para usar como fondo. Si se especifica un video, tendrá prioridad sobre la imagen.
                                        </FormDescription>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                  control={form.control}
                                  name="mobileBackgroundFit"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Ajuste del Fondo (Móvil)</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value || 'cover'} disabled={loading}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Selecciona cómo se ajustará el fondo" />
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
                    </div>
                  </TabsContent>

                </Tabs>
                <div className="mt-8">
                  <Button type="submit" disabled={loading} size="lg">
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              </div>
              
              {/* Columna de Vista Previa */}
              <div className="lg:col-span-1 lg:sticky top-4 space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Vista Previa de la Ruleta
                    </CardTitle>
                  </CardHeader>
                  <CardContent ref={previewContainerRef} className="p-0 bg-muted/50 flex items-center justify-center rounded-b-lg aspect-square overflow-hidden">
                     <div className="w-full max-w-md">
                        <SpinningWheel 
                            segments={watchedFormData.segments}
                            gameId={initialGame.id}
                            onSpinEnd={() => {}}
                            isDemoMode={true}
                            config={watchedFormData.config}
                        />
                    </div>
                  </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Enlace Público del Juego</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TooltipProvider>
                         <div className="flex items-center space-x-2">
                            <Input value={getGameUrl(initialGame.id)} readOnly className="h-9 text-xs"/>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => copyToClipboard(getGameUrl(initialGame.id))}>
                                        <CopyIcon className="h-4 w-4" />
                                        <span className="sr-only">Copiar</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Copiar enlace</p></TooltipContent>
                            </Tooltip>
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild variant="outline" size="icon" className="h-9 w-9 flex-shrink-0">
                                        <Link href={getGameUrl(initialGame.id)} target="_blank">
                                            <ExternalLink className="h-4 w-4" />
                                            <span className="sr-only">Abrir</span>
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Abrir en nueva pestaña</p></TooltipContent>
                            </Tooltip>
                        </div>
                        </TooltipProvider>
                    </CardContent>
                 </Card>
              </div>
            </div>
          </form>
         </Form>
    </main>
  );
}
