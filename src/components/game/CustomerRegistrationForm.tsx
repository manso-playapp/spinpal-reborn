
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase/config';
import { collection, serverTimestamp, doc, query, where, getDocs, limit, increment, addDoc, updateDoc, onSnapshot, getDoc, writeBatch } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Send, PartyPopper, AlertCircle, Loader2, RotateCw, Gift, ThumbsDown, CheckCircle, Bug } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { sendPrizeNotification } from '@/ai/flows/prize-notification-flow';

const baseFormSchema = z.object({
  name: z.string().min(2, { message: 'Tu nombre debe tener al menos 2 caracteres.' }),
  email: z.string().email({ message: 'Por favor, introduce un correo electrónico válido.' }),
});

interface GameData {
    isDemoMode: boolean;
    exemptedEmails: string[];
    isPhoneRequired: boolean;
    successMessage: string;
    segments: any[];
}

interface SpinResult {
    name: string;
    isRealPrize: boolean;
}

type UiState = 'LOADING' | 'FORM' | 'READY_TO_SPIN' | 'WAITING_FOR_RESULT' | 'SHOW_RESULT' | 'ALREADY_PLAYED' | 'ERROR';

export default function CustomerRegistrationForm({ gameId }: { gameId: string }) {
    const { toast } = useToast();
    const [uiState, setUiState] = useState<UiState>('LOADING');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
    const [gameData, setGameData] = useState<GameData | null>(null);
    const [errorMessage, setErrorMessage] = useState('Ha ocurrido un error inesperado.');
    const [dynamicSchema, setDynamicSchema] = useState(baseFormSchema.extend({ phone: z.string().optional() }));

    const form = useForm<z.infer<typeof dynamicSchema>>({
        resolver: zodResolver(dynamicSchema),
        defaultValues: { name: '', email: '', phone: '' },
    });

    useEffect(() => {
        const gameRef = doc(db, 'games', gameId);
        const unsubscribe = onSnapshot(gameRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const isPhoneRequired = !!data.isPhoneRequired;
                const segments = data.segments || [];

                if (!Array.isArray(segments) || segments.length < 2 || !segments.every(s => s && typeof s.id === 'string')) {
                    setErrorMessage('El juego no está configurado correctamente (faltan premios válidos con ID).');
                    setUiState('ERROR');
                    return;
                }

                const newGameData: GameData = {
                    isDemoMode: data.status === 'demo',
                    exemptedEmails: data.exemptedEmails || [],
                    isPhoneRequired: isPhoneRequired,
                    successMessage: data.successMessage || '¡Mucha suerte! Revisa la pantalla grande.',
                    segments: segments,
                };
                
                setGameData(newGameData);

                const newSchema = baseFormSchema.extend({
                  phone: isPhoneRequired
                    ? z.string().min(6, 'Por favor, introduce un número de teléfono válido.')
                    : z.string().optional(),
                });
                setDynamicSchema(newSchema);

                if (uiState === 'LOADING') {
                    setUiState('FORM');
                }

            } else {
                setErrorMessage('Este juego no existe o ha sido eliminado.');
                setUiState('ERROR');
            }
        }, (error) => {
            console.error("Error fetching game data:", error);
            setErrorMessage('No se pudo cargar la información del juego.');
            setUiState('ERROR');
        });

        return () => unsubscribe();
    }, [gameId, uiState]);
    
    useEffect(() => {
        if (uiState !== 'WAITING_FOR_RESULT' || !customerId) return;

        const gameRef = doc(db, 'games', gameId);
        const unsubscribe = onSnapshot(gameRef, (docSnap) => {
            const data = docSnap.data();
            if (data?.lastResult?.customerId === customerId) {
                setTimeout(() => {
                    setSpinResult({
                        name: data.lastResult.name,
                        isRealPrize: data.lastResult.isRealPrize,
                    });
                    setUiState('SHOW_RESULT');
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
            const q = query(collection(db, 'games', gameId, 'customers'), where("email", "==", submittedEmail), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                setUiState('ALREADY_PLAYED');
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
            setUiState('READY_TO_SPIN');
        } catch (error) {
            console.error('Error registering customer:', error);
            setErrorMessage('No se pudo completar el registro.');
            setUiState('ERROR');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSpin = async () => {
        if (!customerId || !gameData) {
            setErrorMessage('Faltan datos críticos para iniciar el giro.');
            setUiState('ERROR');
            return;
        }

        setIsSubmitting(true);

        try {
            const validSegments = gameData.segments.filter(s => s && s.id);

            if (validSegments.length < 2) {
                throw new Error('El juego no tiene suficientes premios válidos configurados.');
            }

            const realPrizeSegments = validSegments.filter(s => s.isRealPrize);
            const nonRealPrizeSegments = validSegments.filter(s => !s.isRealPrize);

            const realPrizeTotalProbability = realPrizeSegments.reduce((acc, seg) => acc + (seg.probability || 0), 0);
            
            const nonRealPrizeProb = nonRealPrizeSegments.length > 0 
                ? Math.max(0, 100 - realPrizeTotalProbability) / nonRealPrizeSegments.length 
                : 0;
            
            const finalProbabilities = validSegments.map(seg => seg.isRealPrize ? (seg.probability || 0) : nonRealPrizeProb);
            
            const random = Math.random() * 100;
            let accumulatedProb = 0;
            let winningIndex = -1;

            for (let i = 0; i < finalProbabilities.length; i++) {
                accumulatedProb += finalProbabilities[i];
                if (random < accumulatedProb) {
                    winningIndex = i;
                    break;
                }
            }
            
            if (winningIndex === -1) {
                winningIndex = validSegments.length - 1; 
            }
            
            const winningSegment = validSegments[winningIndex];

            if (!winningSegment || !winningSegment.id) {
                throw new Error('No se pudo determinar un premio ganador válido.');
            }
            
            const gameRef = doc(db, 'games', gameId);
            const customerRef = doc(db, 'games', gameId, 'customers', customerId);
            const batch = writeBatch(db);

            const gameUpdateData: { [key: string]: any } = {
                plays: increment(1),
                spinRequest: { timestamp: serverTimestamp(), customerId, winningId: winningSegment.id },
                lastResult: { name: winningSegment.name, isRealPrize: !!winningSegment.isRealPrize, customerId, timestamp: serverTimestamp() }
            };
            
            const customerUpdateData: { [key: string]: any } = { hasPlayed: true };

            if (winningSegment.isRealPrize) {
                gameUpdateData.prizesAwarded = increment(1);
                customerUpdateData.prizeWonName = winningSegment.name;
                customerUpdateData.prizeWonAt = serverTimestamp();
                sendPrizeNotification({ gameId, customerId, prizeName: winningSegment.name });
            }

            batch.update(gameRef, gameUpdateData);
            batch.update(customerRef, customerUpdateData);
            
            await batch.commit();
            setUiState('WAITING_FOR_RESULT');

        } catch (error: any) {
            console.error('Error triggering spin:', error);
            setErrorMessage(error.message || 'Hubo un problema al iniciar el giro.');
            setUiState('ERROR');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const renderContent = () => {
        switch (uiState) {
            case 'LOADING':
                return (
                    <Card className="w-full max-w-md shadow-lg">
                        <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                        <CardContent className="space-y-6">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </CardContent>
                    </Card>
                );

            case 'FORM':
                if (gameData?.isDemoMode) {
                    return (
                        <Card className="w-full max-w-md text-center shadow-lg">
                            <CardHeader><PartyPopper className="h-12 w-12 text-green-600 mx-auto" /></CardHeader>
                            <CardContent>
                                <CardTitle>¡Modo Demo Activo!</CardTitle>
                                <CardDescription>Usa el botón en la pantalla grande para hacer un giro de prueba.</CardDescription>
                            </CardContent>
                        </Card>
                    );
                }
                return (
                    <Card className="w-full max-w-md shadow-lg">
                        <CardHeader>
                            <CardTitle>¡Regístrate para Jugar!</CardTitle>
                            <CardDescription>Completa tus datos para participar.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Tu nombre" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><Input type="email" placeholder="tu@correo.com" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    {gameData?.isPhoneRequired && (
                                        <FormField control={form.control} name="phone" render={({ field }) => (
                                            <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input type="tel" placeholder="Tu teléfono" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    )}
                                    <Button type="submit" className="w-full" disabled={isSubmitting || !gameData}>
                                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Registrarme'}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                );

            case 'READY_TO_SPIN':
                return (
                    <Card className="w-full max-w-md text-center shadow-lg">
                        <CardHeader>
                            <CardTitle>¡Registro Exitoso!</CardTitle>
                            <CardDescription>Presiona el botón para girar la ruleta.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button size="lg" className="w-full h-16 text-xl" onClick={handleSpin} disabled={isSubmitting || !gameData}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <><RotateCw className="mr-3 h-6 w-6" />¡Girar la Ruleta!</>}
                            </Button>
                        </CardContent>
                    </Card>
                );

            case 'WAITING_FOR_RESULT':
                return (
                    <Card className="w-full max-w-md text-center shadow-lg">
                        <CardContent className="pt-6 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="h-16 w-16 animate-spin text-primary" />
                            <p className="text-xl font-semibold">¡Mucha Suerte!</p>
                            <p className="text-sm text-muted-foreground">{gameData?.successMessage}</p>
                        </CardContent>
                    </Card>
                );
            
            case 'SHOW_RESULT':
                return (
                    <Card className="w-full max-w-md text-center shadow-lg">
                        <CardHeader>
                            {spinResult?.isRealPrize ? <Gift className="h-12 w-12 text-green-600 mx-auto" /> : <ThumbsDown className="h-12 w-12 text-gray-600 mx-auto" />}
                        </CardHeader>
                        <CardContent>
                            <CardTitle>{spinResult?.isRealPrize ? '¡Felicidades!' : '¡Casi!'}</CardTitle>
                            <p className="text-xl font-semibold text-primary my-2">{spinResult?.name}</p>
                            <CardDescription>
                                {spinResult?.isRealPrize
                                    ? 'Hemos enviado un correo a tu dirección con los detalles. ¡Gracias por participar!'
                                    : 'No te desanimes, ¡suerte para la próxima!'}
                            </CardDescription>
                        </CardContent>
                    </Card>
                );

            case 'ALREADY_PLAYED':
                return (
                    <Card className="w-full max-w-md text-center shadow-lg">
                        <CardHeader><AlertCircle className="h-12 w-12 text-yellow-600 mx-auto" /></CardHeader>
                        <CardContent>
                            <CardTitle>¡Ya has participado!</CardTitle>
                            <CardDescription>Este correo ya ha sido utilizado. ¡Gracias!</CardDescription>
                        </CardContent>
                    </Card>
                );
            
            case 'ERROR':
                return (
                    <Card className="w-full max-w-md shadow-lg">
                        <CardContent className="pt-6">
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{errorMessage}</AlertDescription>
                            </Alert>
                             <Button variant="outline" className="mt-4 w-full" onClick={() => setUiState('FORM')}>
                                Volver a intentar
                            </Button>
                        </CardContent>
                    </Card>
                );
        }
    };

    return renderContent();
}

    