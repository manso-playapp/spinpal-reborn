'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, doc, updateDoc, query, where, getDocs, limit } from 'firebase/firestore';

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
import { Send, PartyPopper, RotateCw } from 'lucide-react';
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
  NotRegistered,
  Registering,
  Registered,
  AlreadyPlayed,
  Error,
}

export default function CustomerRegistrationForm({ gameId }: { gameId: string }) {
  const { toast } = useToast();
  const [formState, setFormState] = useState<FormState>(FormState.NotRegistered);
  const [spinLoading, setSpinLoading] = useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  const handleSpin = async () => {
    setSpinLoading(true);
    try {
      const gameRef = doc(db, 'games', gameId);
      // Actualizamos el documento del juego con una solicitud de giro.
      // Usamos un valor aleatorio para asegurar que onSnapshot se dispare.
      await updateDoc(gameRef, { 
        spinRequest: { 
          timestamp: serverTimestamp(),
          nonce: Math.random() 
        } 
      });
      setFormState(FormState.AlreadyPlayed);
    } catch (error) {
      console.error("Error requesting spin:", error);
      toast({
        variant: "destructive",
        title: "Error al girar",
        description: "No se pudo iniciar el giro. Inténtalo de nuevo."
      });
    } finally {
      setSpinLoading(false);
    }
  };


  const onSubmit = async (data: CustomerFormValues) => {
    setFormState(FormState.Registering);
    try {
      // 1. Verificar si el email ya jugó en este juego
      const customersCollectionRef = collection(db, 'games', gameId, 'customers');
      const q = query(customersCollectionRef, where("email", "==", data.email), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // El usuario ya existe, comprobamos si ha jugado
        const customerData = querySnapshot.docs[0].data();
        if (customerData.hasPlayed) {
          setFormState(FormState.AlreadyPlayed);
          return;
        } else {
           // Si existe pero no ha jugado, lo marcamos como registrado
           // Esto es un caso raro, pero lo manejamos
           setFormState(FormState.Registered);
           return;
        }
      }

      // 2. Si no ha jugado, registrarlo
      await addDoc(customersCollectionRef, {
        ...data,
        registeredAt: serverTimestamp(),
        hasPlayed: false, // Nuevo campo para controlar si ya jugó
      });

      setFormState(FormState.Registered);

    } catch (error) {
      console.error('Error registering customer: ', error);
      setFormState(FormState.Error);
      toast({
        variant: 'destructive',
        title: 'Error en el registro',
        description: 'Hubo un problema al registrarte. Inténtalo de nuevo.',
      });
    }
  };

  if (formState === FormState.Registered) {
     return (
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto bg-green-100 rounded-full p-4 w-fit">
            <PartyPopper className="h-12 w-12 text-green-600" />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <CardTitle className="text-2xl font-headline mb-2">¡Registro Exitoso!</CardTitle>
          <CardDescription>
            ¡Todo listo para la acción! Presiona el botón para hacer girar la ruleta en la pantalla grande.
          </CardDescription>
          <Button onClick={handleSpin} disabled={spinLoading} size="lg" className="w-full">
            {spinLoading ? 'Enviando...' : (
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
          <CardTitle className="text-2xl font-headline mb-2">¡Gracias por participar!</CardTitle>
          <CardDescription>
            Ya has utilizado tu giro para este juego. ¡Mucha suerte la próxima vez!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  if (formState === FormState.Error) {
       return (
       <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-6">
            <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                 Ha ocurrido un error inesperado. Por favor, recarga la página e inténtalo de nuevo.
                </AlertDescription>
            </Alert>
        </CardContent>
      </Card>
    );
  }

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
                    <Input placeholder="Tu nombre y apellido" {...field} disabled={formState === FormState.Registering} />
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
                    <Input placeholder="tu@correo.com" {...field} disabled={formState === FormState.Registering} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={formState === FormState.Registering}>
              {formState === FormState.Registering ? 'Registrando...' : (
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
