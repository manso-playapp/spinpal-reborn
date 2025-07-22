

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase/config';
import { collection, serverTimestamp, doc, query, where, getDocs, limit, increment, addDoc, updateDoc, onSnapshot, getDoc } from 'firebase/firestore';

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
import { useToast } from '@/hooks/use-toast';
import { Send, PartyPopper, AlertCircle, Loader2, RotateCw, Gift, ThumbsDown, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';


const baseFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Tu nombre debe tener al menos 2 caracteres.',
  }),
  email: z.string().email({
    message: 'Por favor, introduce un correo electrónico válido.',
  }),
});

interface CustomerRegistrationFormProps {
  gameId: string;
}

type UiState = 'loading' | 'form' | 'spin_button' | 'waiting_result' | 'already_played' | 'error' | 'final_result' | 'success_message';

interface SpinResult {
    name: string;
    isRealPrize: boolean;
}

interface GameData {
    isDemoMode: boolean;
    exemptedEmails: string[];
    isPhoneRequired: boolean;
    successMessage?: string;
    segments: any[];
}

export default function CustomerRegistrationForm({ gameId }: CustomerRegistrationFormProps) {
  const { toast } = useToast();
  const [uiState, setUiState] = useState<UiState>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [dynamicSchema, setDynamicSchema] = useState(baseFormSchema.extend({ phone: z.string().optional() }));

  const form = useForm<z.infer<typeof dynamicSchema>>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
    },
  });
  
  useEffect(() => {
    const fetchGameData = async () => {
        try {
            const gameRef = doc(db, 'games', gameId);
            const docSnap = await getDoc(gameRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const isPhoneRequired = data.isPhoneRequired || false;
                
                const newGameData = {
                    isDemoMode: data.status === 'demo',
                    exemptedEmails: data.exemptedEmails || [],
                    isPhoneRequired: isPhoneRequired,
                    successMessage: data.successMessage || 'La ruleta en la pantalla grande debería empezar a girar. ¡Gracias por participar!',
                    segments: data.segments || [],
                };
                setGameData(newGameData);

                // Update schema based on game data
                const newSchema = baseFormSchema.extend({
                  phone: isPhoneRequired
                    ? z.string().min(6, 'Por favor, introduce un número de teléfono válido.')
                    : z.string().optional(),
                });
                setDynamicSchema(newSchema);

                setUiState('form');
            } else {
                setUiState('error');
            }
        } catch (error) {
            console.error("Error fetching game data:", error);
            setUiState('error');
        }
    };
    fetchGameData();
  }, [gameId]);

  useEffect(() => {
    form.reset(undefined, { keepValues: true });
  }, [dynamicSchema, form]);

  useEffect(() => {
    if (uiState !== 'success_message' || !customerId) return;

    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      const data = docSnap.data();
      if (data && data.lastResult && data.lastResult.customerId === customerId) {
        
        setTimeout(() => {
            setSpinResult({
              name: data.lastResult.name,
              isRealPrize: data.lastResult.isRealPrize,
            });
            setUiState('final_result');
        }, 6500); 

        unsubscribe();
      }
    });

    return () => unsubscribe();

  }, [uiState, customerId, gameId]);


  const onSubmit = async (data: z.infer<typeof dynamicSchema>) => {
    if (!gameData) return;
    setIsSubmitting(true);
    const submittedEmail = data.email.toLowerCase();

    if (!gameData.isDemoMode && !gameData.exemptedEmails.includes(submittedEmail)) {
        try {
            const customersCollectionRef = collection(db, 'games', gameId, 'customers');
            const q = query(customersCollectionRef, where("email", "==", submittedEmail), limit(1));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                setUiState('already_played');
                setIsSubmitting(false);
                return;
            }
        } catch (error) {
            console.error('Error checking for existing customer:', error);
             toast({
                variant: 'destructive',
                title: 'Error de Verificación',
                description: 'No se pudo comprobar si ya has participado. Inténtalo de nuevo.',
            });
            setIsSubmitting(false);
            return;
        }
    }
    
    try {
      const newCustomerRef = await addDoc(collection(db, 'games', gameId, 'customers'), {
        name: data.name,
        email: submittedEmail,
        phone: data.phone || '',
        registeredAt: serverTimestamp(),
        hasPlayed: false,
      });
      
      setCustomerId(newCustomerRef.id);
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
    if (!customerId || !gameData) {
        setUiState('error');
        return;
    };
    setIsSubmitting(true);
    try {
        const gameRef = doc(db, 'games', gameId);
        const customerRef = doc(db, 'games', gameId, 'customers', customerId);

        // Determine winning segment here
        const { segments } = gameData;
        const realPrizeSegments = segments.filter(s => s.isRealPrize);
        const nonRealPrizeSegments = segments.filter(s => !s.isRealPrize);
        const realPrizeTotalProbability = realPrizeSegments.reduce((acc, seg) => acc + (seg.probability || 0), 0);
        const remainingProbability = Math.max(0, 100 - realPrizeTotalProbability);
        let nonRealPrizeProb = nonRealPrizeSegments.length > 0 ? remainingProbability / nonRealPrizeSegments.length : 0;
        
        const finalSegments = segments.map(seg => ({
          ...seg,
          finalProbability: seg.isRealPrize ? (seg.probability || 0) : nonRealPrizeProb
        }));

        const random = Math.random() * 100;
        let accumulatedProb = 0;
        let winningIndex = finalSegments.length - 1;

        for (let i = 0; i < finalSegments.length; i++) {
            accumulatedProb += (finalSegments[i].finalProbability || 0);
            if (random < accumulatedProb) {
                winningIndex = i;
                break;
            }
        }
        const winningSegment = finalSegments[winningIndex];

        await updateDoc(gameRef, {
            spinRequest: {
                timestamp: serverTimestamp(),
                customerId: customerId,
                winningSegment: { name: winningSegment.name, isRealPrize: !!winningSegment.isRealPrize },
                winningIndex: winningIndex,
            },
            plays: increment(1),
        });

        await updateDoc(customerRef, { hasPlayed: true });
        
        setUiState('success_message');

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
  
  if (uiState === 'loading' || !gameData) {
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
  
  if (uiState === 'already_played') {
    return (
       <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto bg-yellow-100 rounded-full p-4 w-fit dark:bg-yellow-800/50">
            <AlertCircle className="h-12 w-12 text-yellow-600" />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
            <CardTitle className="text-2xl font-headline mb-2">
                ¡Ya has participado!
            </CardTitle>
            <CardDescription>
                Este correo electrónico ya ha sido utilizado para participar. ¡Gracias!
            </CardDescription>
        </CardContent>
      </Card>
    );
  }
  
  if (uiState === 'success_message') {
    return (
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardContent className="pt-6 flex flex-col items-center justify-center gap-4">
           <Loader2 className="h-16 w-16 animate-spin text-primary" />
           <p className="text-xl font-semibold text-foreground">¡Mucha Suerte!</p>
           <p className="text-sm text-muted-foreground">{gameData.successMessage}</p>
        </CardContent>
      </Card>
    )
  }

  if (uiState === 'final_result' && spinResult) {
     return (
       <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <div className={`mx-auto rounded-full p-4 w-fit ${spinResult.isRealPrize ? 'bg-green-100 dark:bg-green-800/50' : 'bg-gray-100 dark:bg-gray-800/50'}`}>
            {spinResult.isRealPrize ? (
                 <Gift className="h-12 w-12 text-green-600" />
            ) : (
                <ThumbsDown className="h-12 w-12 text-gray-600" />
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
            <CardTitle className="text-2xl font-headline mb-2">
                 {spinResult.isRealPrize ? '¡Felicidades!' : '¡Casi!'}
            </CardTitle>
            <p className="text-xl font-semibold text-primary">{spinResult.name}</p>
            <CardDescription className="mt-2">
                {spinResult.isRealPrize
                  ? 'Hemos enviado un correo electrónico a tu dirección con los detalles para reclamar tu premio. ¡Gracias por participar!'
                  : 'No te desanimes, ¡mucha suerte para la próxima! Gracias por participar.'}
            </CardDescription>
        </CardContent>
      </Card>
    );
  }

  if (gameData.isDemoMode) {
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
                        Enviando...
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
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono {gameData.isPhoneRequired ? '' : '(Opcional)'}</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="Tu número de teléfono" {...field} disabled={isSubmitting} />
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
