
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
import { Send, PartyPopper, AlertCircle, Loader2, RotateCw, Gift, ThumbsDown, CheckCircle, Bug, Instagram } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { sendPrizeNotification } from '@/ai/flows/prize-notification-flow';
import { Checkbox } from '../ui/checkbox';
import Link from 'next/link';
import { Separator } from '../ui/separator';

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
    instagramProfile?: string;
}

interface SpinResult {
    name: string;
    isRealPrize: boolean;
}

type UiState = 'LOADING' | 'FORM' | 'SUBMITTING' | 'SUCCESS' | 'ALREADY_PLAYED' | 'ERROR';

export default function CustomerRegistrationForm({ gameId }: { gameId: string }) {
    const { toast } = useToast();
    const [uiState, setUiState] = useState<UiState>('LOADING');
    const [gameData, setGameData] = useState<GameData | null>(null);
    const [errorMessage, setErrorMessage] = useState('Ha ocurrido un error inesperado.');
    const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
    
    const [dynamicSchema, setDynamicSchema] = useState(
        baseFormSchema.extend({ 
            phone: z.string().optional(),
            confirmFollow: z.boolean().optional(),
        })
    );

    const form = useForm<z.infer<typeof dynamicSchema>>({
        resolver: zodResolver(dynamicSchema),
        defaultValues: { name: '', email: '', phone: '', confirmFollow: false },
    });

    useEffect(() => {
        const gameRef = doc(db, 'games', gameId);
        const unsubscribe = onSnapshot(gameRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const isPhoneRequired = !!data.isPhoneRequired;
                const segments = data.segments || [];
                const instagramProfile = data.instagramProfile || '';

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
                    instagramProfile: instagramProfile,
                };
                
                setGameData(newGameData);

                let schema = baseFormSchema.extend({
                  phone: isPhoneRequired
                    ? z.string().min(6, 'Por favor, introduce un número de teléfono válido.')
                    : z.string().optional(),
                });
                
                if (instagramProfile) {
                    schema = schema.extend({
                        confirmFollow: z.literal(true, {
                            errorMap: () => ({ message: "Debes confirmar que sigues la cuenta para participar." })
                        })
                    })
                } else {
                     schema = schema.extend({
                        confirmFollow: z.boolean().optional()
                    })
                }
                
                setDynamicSchema(schema);

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


    const onSubmit = async (formData: z.infer<typeof dynamicSchema>) => {
        if (!gameData) return;
        setUiState('SUBMITTING');
        const submittedEmail = formData.email.toLowerCase().trim();

        if (!gameData.isDemoMode && !gameData.exemptedEmails.includes(submittedEmail)) {
            const q = query(collection(db, 'games', gameId, 'customers'), where("email", "==", submittedEmail), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                setUiState('ALREADY_PLAYED');
                return;
            }
        }

        try {
            const newCustomerRef = await addDoc(collection(db, 'games', gameId, 'customers'), {
                name: formData.name,
                email: submittedEmail,
                phone: formData.phone || '',
                registeredAt: serverTimestamp(),
                hasPlayed: false,
            });

            // This is the core logic to trigger the spin
            const validSegments = gameData.segments.filter(s => s && typeof s.id === 'string');
            if (validSegments.length < 2) throw new Error('El juego no tiene suficientes premios válidos configurados.');

            const realPrizeSegments = validSegments.filter(s => s.isRealPrize);
            const nonRealPrizeSegments = validSegments.filter(s => !s.isRealPrize);
            const realPrizeTotalProbability = realPrizeSegments.reduce((acc, seg) => acc + (seg.probability || 0), 0);
            const nonRealPrizeProb = nonRealPrizeSegments.length > 0 ? Math.max(0, 100 - realPrizeTotalProbability) / nonRealPrizeSegments.length : 0;
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
            if (winningIndex === -1) winningIndex = validSegments.length - 1;
            
            const winningSegment = validSegments[winningIndex];
            if (!winningSegment || typeof winningSegment.id !== 'string') throw new Error('No se pudo determinar un premio ganador válido.');

            setSpinResult({ name: winningSegment.name, isRealPrize: !!winningSegment.isRealPrize });

            const gameRef = doc(db, 'games', gameId);
            const customerRef = doc(db, 'games', gameId, 'customers', newCustomerRef.id);
            const batch = writeBatch(db);

            const gameUpdateData: { [key: string]: any } = {
                plays: increment(1),
                spinRequest: { timestamp: serverTimestamp(), customerId: newCustomerRef.id, winningId: winningSegment.id },
                lastResult: { name: winningSegment.name, isRealPrize: !!winningSegment.isRealPrize, customerId: newCustomerRef.id, timestamp: serverTimestamp() }
            };
            const customerUpdateData: { [key: string]: any } = { hasPlayed: true };

            if (winningSegment.isRealPrize) {
                gameUpdateData.prizesAwarded = increment(1);
                customerUpdateData.prizeWonName = winningSegment.name;
                customerUpdateData.prizeWonAt = serverTimestamp();
                sendPrizeNotification({ gameId, customerId: newCustomerRef.id, prizeName: winningSegment.name });
            }

            batch.update(gameRef, gameUpdateData);
            batch.update(customerRef, customerUpdateData);
            
            await batch.commit();
            setUiState('SUCCESS');

        } catch (error: any) {
            console.error('Error registering customer and spinning:', error);
            setErrorMessage(error.message || 'No se pudo completar el registro.');
            setUiState('ERROR');
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
                                <CardDescription>El registro de prueba iniciará el giro en la pantalla grande automáticamente.</CardDescription>
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
                                    {gameData?.instagramProfile && (
                                        <FormField
                                            control={form.control}
                                            name="confirmFollow"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                                    <FormControl>
                                                        <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel>
                                                             Confirmo que sigo a <Link href={gameData.instagramProfile!} target="_blank" className="text-primary hover:underline font-bold inline-flex items-center gap-1">@{gameData.instagramProfile!.split('/').pop()}<Instagram className="h-4 w-4"/></Link> en Instagram.
                                                        </FormLabel>
                                                        <FormMessage />
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                    <Button type="submit" className="w-full" disabled={!gameData}>
                                        ¡Jugar ahora!
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                );

            case 'SUBMITTING':
                return (
                    <Card className="w-full max-w-md text-center shadow-lg">
                        <CardContent className="pt-6 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="h-16 w-16 animate-spin text-primary" />
                            <p className="text-xl font-semibold">Registrando y girando...</p>
                            <p className="text-muted-foreground">¡Mucha suerte!</p>
                        </CardContent>
                    </Card>
                );

            case 'SUCCESS':
                return (
                    <Card className="w-full max-w-md text-center shadow-lg">
                        <CardHeader className="p-6">
                            <CardTitle className="font-headline text-3xl md:text-4xl flex items-center justify-center gap-4 text-primary">
                                {spinResult?.isRealPrize ? <Gift className="h-10 w-10" /> : <ThumbsDown className="text-red-400 h-10 w-10" />}
                                {spinResult?.isRealPrize ? '¡Felicidades!' : '¡Casi!'}
                            </CardTitle>
                        </CardHeader>
                        <Separator />
                        <CardContent className="p-6">
                            <p className="text-xl font-semibold mb-2">
                                {spinResult?.name}
                            </p>
                            <CardDescription className="text-card-foreground/80 mt-2 text-sm">
                                {spinResult?.isRealPrize 
                                    ? 'Hemos enviado un email a tu correo con las instrucciones para reclamar tu premio. ¡Gracias por participar!' 
                                    : 'Más suerte la próxima vez. ¡Gracias por participar!'
                                }
                            </CardDescription>
                             <p className="text-xs text-muted-foreground mt-6">Puedes cerrar esta ventana.</p>
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
                                <Bug className="h-4 w-4" />
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
