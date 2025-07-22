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
import { Send, PartyPopper, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';

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
  const [submissionState, setSubmissionState] = useState<'idle' | 'submitting' | 'submitted' | 'error' | 'already_played'>('idle');
  const [loadingState, setLoadingState] = useState(true);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  useEffect(() => {
    // This useEffect now ONLY handles the initial loading state and demo mode.
    // It no longer checks localStorage, ensuring the form always shows by default.
    setLoadingState(false);
  }, []);


  const onSubmit = async (data: CustomerFormValues) => {
    setSubmissionState('submitting');
    
    try {
      const customersCollectionRef = collection(db, 'games', gameId, 'customers');
      const q = query(customersCollectionRef, where("email", "==", data.email.toLowerCase()), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setSubmissionState('already_played');
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
        },
        plays: increment(1),
      });

      await batch.commit();

      setSubmissionState('submitted');

    } catch (error) {
      console.error('Error registering customer and spinning: ', error);
      setSubmissionState('error');
      toast({
        variant: 'destructive',
        title: 'Error en el registro',
        description: 'Hubo un problema al registrarte. Por favor, inténtalo de nuevo.',
      });
    }
  };
  
  if (loadingState) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (submissionState === 'error') {
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
  
  if (submissionState === 'submitted' || submissionState === 'already_played') {
    return (
       <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto bg-green-100 rounded-full p-4 w-fit dark:bg-green-800/50">
            <PartyPopper className="h-12 w-12 text-green-600" />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
            <CardTitle className="text-2xl font-headline mb-2">
                {submissionState === 'already_played' ? '¡Ya has participado!' : '¡Giro solicitado!'}
            </CardTitle>
            <CardDescription>
                {submissionState === 'already_played'
                  ? 'Este correo electrónico ya ha sido utilizado para participar. ¡Gracias!'
                  : successMessage || 'La ruleta en la pantalla grande debería empezar a girar. ¡Gracias por participar!'}
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
            Estás en modo Demo. ¡Presiona el botón en la pantalla de juego para hacer una prueba de giro!
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  const isSubmitting = submissionState === 'submitting';
  
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
