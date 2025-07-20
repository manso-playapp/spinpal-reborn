'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase/config';
import { collection, serverTimestamp, doc, writeBatch, query, where, getDocs, limit, increment } from 'firebase/firestore';

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Send, PartyPopper, RotateCw, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Tu nombre debe tener al menos 2 caracteres.',
  }),
  email: z.string().email({
    message: 'Por favor, introduce un correo electrónico válido.',
  }),
});

type CustomerFormValues = z.infer<typeof formSchema>;

enum FormState {
  Loading,
  ReadyToRegister,
  Submitting,
  AlreadyPlayed,
  Success,
  Error,
}

export default function CustomerRegistrationForm({ gameId, isDemoMode }: { gameId: string, isDemoMode: boolean }) {
  const { toast } = useToast();
  const [formState, setFormState] = useState<FormState>(FormState.Loading);

  useEffect(() => {
    if (isDemoMode) {
      setFormState(FormState.Success); // Directamente a la pantalla de éxito/giro para Demo
    } else {
      setFormState(FormState.ReadyToRegister);
    }
  }, [isDemoMode]);


  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  const handleDemoSpin = async () => {
    setFormState(FormState.Submitting);
    try {
        const gameRef = doc(db, 'games', gameId);
        const batch = writeBatch(db);
        batch.update(gameRef, {
            spinRequest: {
                timestamp: serverTimestamp(),
                nonce: Math.random(),
            },
            plays: increment(1),
        });
        await batch.commit();
        toast({
            title: "¡Giro enviado!",
            description: "La ruleta en la pantalla grande debería estar girando.",
        });
    } catch(error) {
        console.error("Error requesting demo spin:", error);
        toast({
            variant: "destructive",
            title: "Error al girar",
            description: "No se pudo iniciar el giro de prueba."
        });
        setFormState(FormState.Error);
    } finally {
        // En modo demo, permitimos seguir girando.
        setFormState(FormState.Success);
    }
  }

  const onSubmit = async (data: CustomerFormValues) => {
    setFormState(FormState.Submitting);
    
    try {
      const customersCollectionRef = collection(db, 'games', gameId, 'customers');
      const q = query(customersCollectionRef, where("email", "==", data.email.toLowerCase()), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Si el usuario ya existe (independientemente de si ha jugado o no), mostramos el mensaje.
        setFormState(FormState.AlreadyPlayed);
        return;
      }

      // Si el usuario no existe, realizamos el registro y el giro en una sola transacción.
      const batch = writeBatch(db);
      const gameRef = doc(db, 'games', gameId);
      
      // 1. Crear el nuevo documento de cliente. Generamos una referencia vacía para obtener un ID.
      const newCustomerRef = doc(collection(db, 'games', gameId, 'customers'));
      batch.set(newCustomerRef, {
        name: data.name,
        email: data.email.toLowerCase(),
        registeredAt: serverTimestamp(),
        hasPlayed: true, // Lo marcamos como que ha jugado desde el momento de la creación
      });

      // 2. Actualizar el juego para solicitar el giro y contar la jugada.
      batch.update(gameRef, {
        spinRequest: {
          timestamp: serverTimestamp(),
          nonce: Math.random(),
        },
        plays: increment(1),
      });

      // 3. Ejecutar la transacción
      await batch.commit();

      // Transición al estado final.
      setFormState(FormState.AlreadyPlayed); // Mostramos el mensaje de que ya participó.

    } catch (error) {
      console.error('Error registering customer and spinning: ', error);
      setFormState(FormState.Error);
      toast({
        variant: 'destructive',
        title: 'Error en el registro',
        description: 'Hubo un problema al registrarte. Por favor, recarga e inténtalo de nuevo.',
      });
    }
  };

  if (formState === FormState.Loading) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-6 flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  // Pantalla para modo Demo o para después de girar en modo activo
  if (formState === FormState.Success) {
     return (
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto bg-green-100 rounded-full p-4 w-fit dark:bg-green-800/50">
            <PartyPopper className="h-12 w-12 text-green-600" />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <CardTitle className="text-2xl font-headline mb-2">¡Todo listo para la acción!</CardTitle>
          <CardDescription>
            {isDemoMode
              ? "Estás en modo Demo. ¡Presiona el botón para hacer una prueba de giro!"
              : "Presiona el botón para hacer girar la ruleta en la pantalla grande."}
          </CardDescription>
          <Button onClick={handleDemoSpin} disabled={formState === FormState.Submitting} size="lg" className="w-full">
            {formState === FormState.Submitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <RotateCw className="mr-2 h-5 w-5" />
                ¡Girar la ruleta!
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (formState === FormState.AlreadyPlayed) {
    return (
       <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto bg-amber-100 rounded-full p-4 w-fit dark:bg-amber-900/50">
            <AlertCircle className="h-12 w-12 text-amber-600 dark:text-amber-400" />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
            <CardTitle className="text-2xl font-headline mb-2">¡Ya has participado!</CardTitle>
            <CardDescription>
                Este correo electrónico ya fue utilizado para jugar. ¡Gracias por participar!
            </CardDescription>
        </CardContent>
      </Card>
    );
  }
  
  if (formState === FormState.Error) {
       return (
       <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-6">
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                 Ha ocurrido un error inesperado. Por favor, recarga la página e inténtalo de nuevo.
                </AlertDescription>
            </Alert>
        </CardContent>
      </Card>
    );
  }

  // Estado por defecto: Formulario de Registro para modo Activo
  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">¡Regístrate para Jugar!</CardTitle>
        <CardDescription>
          Completa tus datos para participar en la ruleta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Tu nombre y apellido" {...field} disabled={formState === FormState.Submitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="tu@correo.com" {...field} disabled={formState === FormState.Submitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={formState === FormState.Submitting}>
              {formState === FormState.Submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Registrarme y Jugar
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
