'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, doc, updateDoc, query, where, getDocs, limit, writeBatch } from 'firebase/firestore';

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
import { Send, PartyPopper, RotateCw, AlertCircle } from 'lucide-react';
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
  const [customerDocId, setCustomerDocId] = useState<string | null>(null);


  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  const handleSpin = async () => {
    if (!customerDocId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se encontró el ID del cliente para actualizar su estado."
      });
      setFormState(FormState.Error);
      return;
    }

    setSpinLoading(true);
    try {
      const batch = writeBatch(db);

      const customerRef = doc(db, 'games', gameId, 'customers', customerDocId);
      batch.update(customerRef, { hasPlayed: true });

      const gameRef = doc(db, 'games', gameId);
      batch.update(gameRef, {
        spinRequest: {
          timestamp: serverTimestamp(),
          nonce: Math.random(),
        },
      });

      await batch.commit();
      setFormState(FormState.AlreadyPlayed);

    } catch (error) {
      console.error("Error requesting spin:", error);
      toast({
        variant: "destructive",
        title: "Error al girar",
        description: "No se pudo iniciar el giro. Inténtalo de nuevo."
      });
      setFormState(FormState.Error);
    } finally {
      setSpinLoading(false);
    }
  };


  const onSubmit = async (data: CustomerFormValues) => {
    setFormState(FormState.Registering);
    try {
      const customersCollectionRef = collection(db, 'games', gameId, 'customers');
      const q = query(customersCollectionRef, where("email", "==", data.email.toLowerCase()), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const customerDoc = querySnapshot.docs[0];
        setFormState(FormState.AlreadyPlayed);
        return;
      }

      const newCustomerDoc = await addDoc(customersCollectionRef, {
        name: data.name,
        email: data.email.toLowerCase(),
        registeredAt: serverTimestamp(),
        hasPlayed: false,
      });

      setCustomerDocId(newCustomerDoc.id);
      setFormState(FormState.Registered);

    } catch (error) {
      console.error('Error registering customer: ', error);
      setFormState(FormState.Error);
      toast({
        variant: 'destructive',
        title: 'Error en el registro',
        description: 'Hubo un problema al registrarte. Por favor, recarga e inténtalo de nuevo.',
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
          <div className="mx-auto bg-amber-100 rounded-full p-4 w-fit dark:bg-amber-900/50">
            <AlertCircle className="h-12 w-12 text-amber-600 dark:text-amber-400" />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
            <CardTitle className="text-2xl font-headline mb-2">¡Ya has participado!</CardTitle>
            <CardDescription>
                Este correo electrónico ya fue utilizado para jugar en esta ruleta. ¡Gracias por participar!
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
                    <Input type="email" placeholder="tu@correo.com" {...field} disabled={formState === FormState.Registering} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={formState === FormState.Registering}>
              {formState === FormState.Registering ? 'Verificando...' : (
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
