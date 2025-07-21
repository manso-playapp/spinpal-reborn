'use client';

import { useState } from 'react';
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

interface CustomerRegistrationFormProps {
  gameId: string;
  isDemoMode: boolean;
  successMessage?: string;
}


export default function CustomerRegistrationForm({ gameId, isDemoMode, successMessage }: CustomerRegistrationFormProps) {
  const { toast } = useToast();
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorOccurred, setErrorOccurred] = useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  const onSubmit = async (data: CustomerFormValues) => {
    setIsSubmitting(true);
    setErrorOccurred(false);
    
    try {
      const customersCollectionRef = collection(db, 'games', gameId, 'customers');
      const q = query(customersCollectionRef, where("email", "==", data.email.toLowerCase()), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setHasPlayed(true);
        return;
      }

      const batch = writeBatch(db);
      const gameRef = doc(db, 'games', gameId);
      
      const newCustomerRef = doc(collection(db, 'games', gameId, 'customers'));
      batch.set(newCustomerRef, {
        name: data.name,
        email: data.email.toLowerCase(),
        registeredAt: serverTimestamp(),
        hasPlayed: true,
      });

      batch.update(gameRef, {
        spinRequest: {
          timestamp: serverTimestamp(),
          nonce: Math.random(),
        },
        plays: increment(1),
      });

      await batch.commit();
      setHasPlayed(true);

    } catch (error) {
      console.error('Error registering customer and spinning: ', error);
      setErrorOccurred(true);
      toast({
        variant: 'destructive',
        title: 'Error en el registro',
        description: 'Hubo un problema al registrarte. Por favor, recarga e inténtalo de nuevo.',
      });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (errorOccurred) {
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
  
  if (hasPlayed) {
    return (
       <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto bg-green-100 rounded-full p-4 w-fit dark:bg-green-800/50">
            <PartyPopper className="h-12 w-12 text-green-600" />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
            <CardTitle className="text-2xl font-headline mb-2">¡Giro solicitado!</CardTitle>
            <CardDescription>
                {successMessage || 'La ruleta en la pantalla grande debería empezar a girar. ¡Gracias por participar!'}
            </CardDescription>
        </CardContent>
      </Card>
    );
  }

  if (isDemoMode) {
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
            Estás en modo Demo. ¡Presiona el botón para hacer una prueba de giro!
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  // Formulario de Registro para modo Activo
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
                    <Input placeholder="Tu nombre y apellido" {...field} disabled={isSubmitting} />
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
                    <Input type="email" placeholder="tu@correo.com" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
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
