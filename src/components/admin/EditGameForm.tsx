'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';

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
import { ArrowLeft, Trash2, PlusCircle, Gift, Image as ImageIcon, FileText, Settings, GripVertical } from 'lucide-react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';


const segmentSchema = z.object({
  name: z.string().min(1, 'El nombre del premio no puede estar vacío.'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Debe ser un color HEX válido.'),
  isRealPrize: z.boolean().optional(),
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
  [key: string]: any;
}

const getRandomColor = () => `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;

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
      segments: game.segments || [{name: 'Premio 1', color: '#FFDD00', isRealPrize: true}, {name: 'Premio 2', color: '#B5D5E2', isRealPrize: false}],
      backgroundImage: game.backgroundImage || '',
      backgroundFit: game.backgroundFit || 'cover',
      registrationTitle: game.registrationTitle || 'Estás jugando a',
      registrationSubtitle: game.registrationSubtitle || '',
      successMessage: game.successMessage || 'La ruleta en la pantalla grande debería empezar a girar. ¡Gracias por participar!',
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'segments',
  });
  
  const watchedSegments = form.watch('segments');

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
      append({ name: newSegmentName.trim(), color: getRandomColor(), isRealPrize: false });
      setNewSegmentName('');
    }
  };

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
            <Tabs defaultValue="data" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="data"><Settings className="mr-2 h-4 w-4" />Datos Generales</TabsTrigger>
                <TabsTrigger value="prizes"><Gift className="mr-2 h-4 w-4" />Premios</TabsTrigger>
                <TabsTrigger value="texts"><FileText className="mr-2 h-4 w-4" />Textos</TabsTrigger>
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
                    <CardDescription>Define los segmentos que aparecerán en la ruleta. Necesitas al menos 2.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                       <div className="space-y-4">
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
                          
                           <div className="space-y-2">
                                <div className="flex items-center text-sm font-medium text-muted-foreground px-2 -mb-1">
                                    <div className="w-10 flex-shrink-0"></div>
                                    <div className="flex-1 pl-2">Nombre</div>
                                    <div className="w-48 text-center">Probabilidad %</div>
                                    <div className="w-24 text-center">Premio Real</div>
                                    <div className="w-32 text-center">Color</div>
                                    <div className="w-10 flex-shrink-0"></div>
                                </div>
                                <DndContext 
                                  sensors={sensors}
                                  collisionDetection={closestCenter}
                                  onDragEnd={handleDragEnd}
                                >
                                  <SortableContext
                                    items={fields.map(field => field.id)}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    {fields.map((field, index) => (
                                      <SortableItem key={field.id} id={field.id}>
                                        {(listeners) => (
                                          <div className="flex items-center gap-2 p-1 pr-2 border rounded-md bg-background hover:bg-muted/50">
                                              <Button type="button" {...listeners} className="cursor-grab p-1 flex-shrink-0 h-10 w-10" variant="ghost">
                                                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                                              </Button>
                                              
                                              <div className="flex-1 min-w-0">
                                                  <Controller
                                                      control={form.control}
                                                      name={`segments.${index}.name`}
                                                      render={({ field: controllerField }) => (
                                                          <Input {...controllerField} className="border-none focus-visible:ring-0 bg-transparent w-full" />
                                                      )}
                                                  />
                                              </div>
                                              <div className="w-48 text-center text-sm text-muted-foreground">
                                                  {watchedSegments[index]?.isRealPrize ? 'Probabilidad basada en otros premios reales' : 'No es un premio real'}
                                              </div>

                                              <div className="w-24 flex justify-center">
                                                 <Controller
                                                    control={form.control}
                                                    name={`segments.${index}.isRealPrize`}
                                                    render={({ field: { onChange, value, ...rest } }) => (
                                                      <Checkbox
                                                          checked={!!value}
                                                          onCheckedChange={onChange}
                                                          {...rest}
                                                      />
                                                    )}
                                                  />
                                              </div>
                                              <div className="w-32 flex items-center justify-center gap-1">
                                                <Controller
                                                    control={form.control}
                                                    name={`segments.${index}.color`}
                                                    render={({ field: { onChange, value } }) => (
                                                      <div className="flex items-center gap-2 border rounded-md p-1">
                                                        <Input 
                                                          type="color" 
                                                          value={value || '#ffffff'}
                                                          onChange={onChange}
                                                          className="h-6 w-6 p-0 border-none"
                                                        />
                                                        <Input
                                                          type="text"
                                                          value={value || ''}
                                                          onChange={onChange}
                                                          className="h-6 w-full font-mono text-xs p-1 border-none bg-transparent focus-visible:ring-0"
                                                        />
                                                      </div>
                                                    )}
                                                  />
                                              </div>
                                              <div className="w-10 flex-shrink-0">
                                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(index)} disabled={loading}>
                                                      <Trash2 className="h-4 w-4 text-destructive" />
                                                      <span className="sr-only">Eliminar</span>
                                                  </Button>
                                              </div>
                                          </div>
                                        )}
                                      </SortableItem>
                                    ))}
                                  </SortableContext>
                                </DndContext>
                            </div>
                          {form.formState.errors.segments && (
                              <p className="text-sm font-medium text-destructive">{form.formState.errors.segments.message || form.formState.errors.segments.root?.message}</p>
                          )}
                      </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="texts">
                <Card>
                  <CardHeader>
                    <CardTitle>Textos Personalizados</CardTitle>
                    <CardDescription>Ajusta los mensajes que ven los jugadores en diferentes momentos.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
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
          </form>
         </Form>
    </div>
  );
}
