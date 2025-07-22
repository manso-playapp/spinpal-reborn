'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase/config';
import { collection, serverTimestamp, doc, writeBatch, query, where, getDocs, limit, increment, addDoc, updateDoc } from 'firebase/firestore';

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
import { Send, PartyPopper, AlertCircle, Loader2, RotateCw } from 'lucide-react';
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
  const [uiState, setUiState] = useState<'loading' | 'form' | 'spin_button' | 'submitted' | 'already_played' | 'error'>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });
  
  useEffect(() => {
    // We just set the initial state, no more localStorage checks here.
    setUiState('form');
  }, []);


  const onSubmit = async (data: CustomerFormValues) => {
    setIsSubmitting(true);
    
    try {
      const customersCollectionRef = collection(db, 'games', gameId, 'customers');
      const q = query(customersCollectionRef, where("email", "==", data.email.toLowerCase()), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setUiState('already_played');
        return;
      }

      // Step 1: Just create the customer document.
      const newCustomerRef = await addDoc(collection(db, 'games', gameId, 'customers'), {
        name: data.name,
        email: data.email.toLowerCase(),
        registeredAt: serverTimestamp(),
        hasPlayed: false, // Not played yet
      });
      
      setCustomerId(newCustomerRef.id);
      // Step 2: Show the spin button
      setUiState('spin_button');

    } catch (error) {
      console.error('Error registering customer: ', error);
      setUiState('error');
      toast({
        variant: 'destructive',
        title: 'Error en el registro',
        description: 'Hubo un problema al registrarte. Por favor, inténtalo de nuevo.',
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSpin = async () => {
    if (!customerId) {
        setUiState('error');
        return;
    };
    setIsSubmitting(true);
    try {
        const batch = writeBatch(db);
        const gameRef = doc(db, 'games', gameId);
        const customerRef = doc(db, 'games', gameId, 'customers', customerId);

        // Update game to trigger spin and increment plays
        batch.update(gameRef, {
            spinRequest: {
                timestamp: serverTimestamp(),
            },
            plays: increment(1),
        });

        // Mark customer as having played
        batch.update(customerRef, { hasPlayed: true });

        await batch.commit();

        setUiState('submitted');

    } catch (error) {
        console.error('Error triggering spin: ', error);
        setUiState('error');
        toast({
            variant: 'destructive',
            title: 'Error al girar',
            description: 'Hubo un problema al iniciar el giro. Por favor, inténtalo de nuevo.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (uiState === 'loading') {
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

  if (uiState === 'error') {
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
  
  if (uiState === 'submitted' || uiState === 'already_played') {
    return (
       <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto bg-green-100 rounded-full p-4 w-fit dark:bg-green-800/50">
            <PartyPopper className="h-12 w-12 text-green-600" />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
            <CardTitle className="text-2xl font-headline mb-2">
                {uiState === 'already_played' ? '¡Ya has participado!' : '¡Giro solicitado!'}
            </CardTitle>
            <CardDescription>
                {uiState === 'already_played'
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

  if (uiState === 'spin_button') {
    return (
        <Card className="w-full max-w-md text-center shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">¡Registro Exitoso!</CardTitle>
                <CardDescription>
                    ¡Todo listo! Presiona el botón para hacer girar la ruleta en la pantalla grande.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button size="lg" className="w-full h-16 text-xl" onClick={handleSpin} disabled={isSubmitting}>
                     {isSubmitting ? (
                        <>
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        Girando...
                        </>
                    ) : (
                        <>
                        <RotateCw className="mr-3 h-6 w-6" />
                        ¡Girar la Ruleta!
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    )
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
                  Registrarme
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
