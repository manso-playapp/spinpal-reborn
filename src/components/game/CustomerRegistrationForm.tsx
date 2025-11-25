
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase/config';
import { collection, serverTimestamp, doc, query, where, getDocs, limit, addDoc, onSnapshot, getDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Send, PartyPopper, AlertCircle, Loader2, RotateCw, Gift, ThumbsDown, CheckCircle, Bug, Instagram, PlayCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { Checkbox } from '../ui/checkbox';
import Link from 'next/link';
import { Separator } from '../ui/separator';
import { defaultGameTexts, extractGameTextOverrides, mergeGameTexts, GameTextConfig } from '@/lib/textDefaults';


// Always include all possible fields, with optional as needed

const getBaseSchema = (texts: GameTextConfig) => z.object({
    name: z.string().min(2, { message: texts.nameValidationMessage }),
    email: z.string().email({ message: texts.emailValidationMessage }),
    phone: z.string().optional(),
    birthdate: z.string().optional(),
    confirmFollow: z.boolean().optional(),
});

type RegistrationFormValues = z.infer<ReturnType<typeof getBaseSchema>>;

interface GameData {
    isDemoMode: boolean;
    exemptedEmails: string[];
    isPhoneRequired: boolean;
    isBirthdateRequired: boolean;
    successMessage: string;
    segments: any[];
    instagramProfile?: string;
    texts: GameTextConfig;
}

interface SpinResult {
    name: string;
    isRealPrize: boolean;
}

// 1. REGISTRO (FORM) -> 2. GIRO (READY) -> 3. SUERTE (SPINNING) -> 4. CIERRE (SUCCESS)
type UiState = 'LOADING' | 'FORM' | 'SUBMITTING' | 'ALREADY_PLAYED' | 'ERROR' | 'READY' | 'SPINNING' | 'SUCCESS';


export default function CustomerRegistrationForm({ gameId }: { gameId: string }) {
    const { toast } = useToast();
    const [uiState, setUiState] = useState<UiState>('LOADING');
    const [gameData, setGameData] = useState<GameData | null>(null);
    const [errorMessage, setErrorMessage] = useState(defaultGameTexts.loadErrorMessage);
    const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
    const [customerId, setCustomerId] = useState<string | null>(null);
    const texts = useMemo(() => mergeGameTexts(gameData?.texts || {}), [gameData]);
    

    // dynamicSchema is always the same shape, but we add conditional validation with .superRefine
    const [dynamicSchema, setDynamicSchema] = useState<z.ZodTypeAny>(() => getBaseSchema(defaultGameTexts));

    const form = useForm<RegistrationFormValues>({
        resolver: zodResolver(dynamicSchema),
        defaultValues: { name: '', email: '', phone: '', birthdate: '', confirmFollow: false },
    });

            useEffect(() => {
                    if (!db) {
                            setErrorMessage(defaultGameTexts.dbUnavailableMessage);
                            setUiState('ERROR');
                            return;
                    }
                    const gameRef = doc(db, 'games', gameId);
                    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
                            if (docSnap.exists()) {
                                    const data = docSnap.data();
                                    const textOverrides = extractGameTextOverrides(data);
                                    const mergedTexts = mergeGameTexts(textOverrides);
                                    const isPhoneRequired = !!data.isPhoneRequired;
                                    const isBirthdateRequired = data.isBirthdateRequired !== false;
                                    const segments = data.segments || [];
                                    const instagramProfile = data.instagramProfile || '';

                                    if (!Array.isArray(segments) || segments.length < 2 || !segments.every(s => s && typeof s.id === 'string')) {
                                            setErrorMessage(mergedTexts.configErrorMessage);
                                            setUiState('ERROR');
                                            return;
                                    }

                                    const newGameData: GameData = {
                                            isDemoMode: data.status === 'demo',
                                            exemptedEmails: data.exemptedEmails || [],
                                            isPhoneRequired: isPhoneRequired,
                                            isBirthdateRequired,
                                            successMessage: mergedTexts.successMessage,
                                            segments: segments,
                                            instagramProfile: instagramProfile,
                                            texts: mergedTexts,
                                    };
                                    setGameData(newGameData);

                                    // Always use the same shape, but add conditional validation
                                    const conditionalSchema = getBaseSchema(mergedTexts).superRefine((values, ctx) => {
                                        if (isPhoneRequired && (!values.phone || values.phone.length < 6)) {
                                            ctx.addIssue({
                                                code: z.ZodIssueCode.custom,
                                                path: ['phone'],
                                                message: mergedTexts.phoneValidationMessage
                                            });
                                        }
                                        if (isBirthdateRequired && (!values.birthdate || values.birthdate.length < 4)) {
                                            ctx.addIssue({
                                                code: z.ZodIssueCode.custom,
                                                path: ['birthdate'],
                                                message: mergedTexts.birthdateValidationMessage
                                            });
                                        }
                                        if (instagramProfile && values.confirmFollow !== true) {
                                            ctx.addIssue({
                                                code: z.ZodIssueCode.custom,
                                                path: ['confirmFollow'],
                                                message: mergedTexts.instagramValidationMessage
                                            });
                                        }
                                    });
                                    setDynamicSchema(conditionalSchema);

                                    if (uiState === 'LOADING') {
                                            setUiState('FORM');
                                    }

                            } else {
                setErrorMessage(defaultGameTexts.notFoundMessage);
                setUiState('ERROR');
            }
        }, (error) => {
            console.error("Error fetching game data:", error);
            setErrorMessage(defaultGameTexts.loadErrorMessage);
            setUiState('ERROR');
        });

        return () => unsubscribe();
    }, [gameId, uiState]);


    // PASO 1: REGISTRO
    const handleRegistration = async (formData: RegistrationFormValues) => {
        if (!gameData || !db) return;
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
                birthdate: formData.birthdate || '',
                registeredAt: serverTimestamp(),
                hasPlayed: false,
            });
            
            setCustomerId(newCustomerRef.id);
            setUiState('READY'); // -> Pasa a la pantalla de GIRO (Paso 2)

        } catch (error: any) {
            console.error('Error during registration:', error);
            setErrorMessage(error.message || 'No se pudo completar el registro.');
            setUiState('ERROR');
        }
    };
    
    // PASO 2 & 3: Iniciar GIRO y mostrar pantalla de SUERTE
    const handleSpin = async () => {
        if (!gameData || !customerId || !db) return;
        setUiState('SPINNING'); // -> Pasa a la pantalla de SUERTE (Paso 3)

        try {
            // Lógica para determinar el premio
            const validSegments = gameData.segments.filter(s => s && typeof s.id === 'string');
            if (validSegments.length < 2) throw new Error('El juego no tiene suficientes premios válidos configurados.');

            const eligibleSegments = validSegments.filter((s) => {
                if (s.isRealPrize && s.useStockControl) {
                    return (s.quantity ?? 0) > 0;
                }
                return true;
            });

            if (eligibleSegments.length === 0) {
                throw new Error('No hay premios disponibles (stock agotado).');
            }

            const realPrizeSegments = eligibleSegments.filter(s => s.isRealPrize);
            const nonRealPrizeSegments = eligibleSegments.filter(s => !s.isRealPrize);
            const realPrizeTotalProbability = realPrizeSegments.reduce((acc, seg) => acc + (seg.probability || 0), 0);
            const nonRealPrizeProb = nonRealPrizeSegments.length > 0 ? Math.max(0, 100 - realPrizeTotalProbability) / nonRealPrizeSegments.length : 0;
            const finalProbabilities = eligibleSegments.map(seg => seg.isRealPrize ? (seg.probability || 0) : nonRealPrizeProb);
            
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
            if (winningIndex === -1) winningIndex = eligibleSegments.length - 1;
            
            const winningSegment = eligibleSegments[winningIndex];
            if (!winningSegment || typeof winningSegment.id !== 'string') throw new Error('No se pudo determinar un premio ganador válido.');
            const winningSegmentIndex = gameData.segments.findIndex((s) => s.id === winningSegment.id);

            const prizeNameToDisplay = (winningSegment && (winningSegment.formalName || winningSegment.name)) || '';
            const result = { name: prizeNameToDisplay, isRealPrize: !!winningSegment.isRealPrize };
            setSpinResult(result);

            // Actualizar Firestore para disparar la animación en la TV
            console.log('Iniciando giro con los siguientes datos:', {
                customerId,
                winningSegment,
                prizeNameToDisplay
            });

            // Llamar a API backend con credenciales de servidor (evita reglas de cliente)
            const spinResponse = await fetch('/api/spin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId,
                    customerId,
                    winningId: winningSegment.id,
                    prizeName: prizeNameToDisplay,
                    isRealPrize: !!winningSegment.isRealPrize,
                    useStockControl: !!winningSegment.useStockControl,
                })
            });

            if (!spinResponse.ok) {
                const result = await spinResponse.json().catch(() => ({ message: 'Error al actualizar el giro.' }));
                throw new Error(result.message || 'Error al actualizar el giro.');
            }

            if (winningSegment.isRealPrize) {
                // Disparar notificación de premio vía API (server-side)
                try {
                    fetch('/api/notify-prize', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ gameId, customerId, prizeName: prizeNameToDisplay })
                    }).catch(() => {});
                } catch (_) {
                    // No bloquear el flujo por errores de red
                }
            }

            // Esperar un tiempo prudencial para la animación antes de mostrar el resultado
            setTimeout(() => {
                setUiState('SUCCESS'); // -> Pasa a la pantalla de CIERRE (Paso 4)
            }, 11000); // 11 segundos para la animación

        } catch (error: any) {
            console.error('Error during spin logic:', error);
            setErrorMessage(error.message || 'No se pudo iniciar el giro.');
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

            case 'FORM': // PASO 1: REGISTRO
                if (gameData?.isDemoMode) {
                    return (
                        <Card className="w-full max-w-md text-center shadow-lg">
                            <CardHeader><PartyPopper className="h-12 w-12 text-green-600 mx-auto" /></CardHeader>
                            <CardContent>
                                <CardTitle>{texts.demoModeTitle}</CardTitle>
                                <CardDescription>{texts.demoModeDescription}</CardDescription>
                            </CardContent>
                        </Card>
                    );
                }
                return (
                    <Card className="w-full max-w-md shadow-lg">
                        <CardHeader>
                            <CardTitle>{texts.registrationTitle}</CardTitle>
                            <CardDescription>{texts.registrationDescription}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleRegistration)} className="space-y-6">
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem><FormLabel>{texts.formNameLabel}</FormLabel><FormControl><Input placeholder={texts.formNamePlaceholder} {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem><FormLabel>{texts.formEmailLabel}</FormLabel><FormControl><Input type="email" placeholder={texts.formEmailPlaceholder} {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    {gameData?.isBirthdateRequired && (
                                        <FormField control={form.control} name="birthdate" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{texts.formBirthdateLabel}</FormLabel>
                                                <FormControl>
                                                    <Input type="date" placeholder={texts.formBirthdatePlaceholder} {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    )}
                                    {gameData?.isPhoneRequired && (
                                        <FormField control={form.control} name="phone" render={({ field }) => (
                                            <FormItem><FormLabel>{texts.formPhoneLabel}</FormLabel><FormControl><Input type="tel" placeholder={texts.formPhonePlaceholder} {...field} /></FormControl><FormMessage /></FormItem>
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
                                                        {texts.instagramCheckboxLabel}{' '}
                                                        <Link href={gameData.instagramProfile!} target="_blank" className="text-primary hover:underline font-bold inline-flex items-center gap-1">
                                                            @{gameData.instagramProfile!.split('/').pop()}<Instagram className="h-4 w-4"/>
                                                        </Link>
                                                    </FormLabel>
                                                    <FormMessage />
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                    )}
                                    <Button type="submit" className="w-full" disabled={!gameData}>
                                        {texts.registrationSubmitText}
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
                            <p className="text-xl font-semibold">{texts.validatingTitle}</p>
                        </CardContent>
                    </Card>
                );

            case 'READY': // PASO 2: GIRO
                 return (
                    <Card className="w-full max-w-md text-center shadow-lg">
                        <CardHeader>
                            <CardTitle>{texts.readyTitle}</CardTitle>
                            <CardDescription>{texts.readySubtitle}</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Button onClick={handleSpin} className="w-full h-16 text-lg" size="lg">
                                <PlayCircle className="mr-2 h-6 w-6"/>
                                {texts.spinButtonText}
                           </Button>
                        </CardContent>
                    </Card>
                );

            case 'SPINNING': // PASO 3: SUERTE
                return (
                    <Card className="w-full max-w-md text-center shadow-lg">
                        <CardContent className="pt-6 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="h-16 w-16 animate-spin text-primary" />
                            <p className="text-xl font-semibold">{texts.spinningTitle}</p>
                            <p className="text-muted-foreground">{texts.spinningSubtitle}</p>
                        </CardContent>
                    </Card>
                );

            case 'SUCCESS': // PASO 4: CIERRE
                return (
                    <Card className="w-full max-w-md text-center shadow-lg">
                        <CardHeader className="p-6">
                            <CardTitle className="font-headline text-3xl md:text-4xl flex items-center justify-center gap-4 text-primary">
                                {spinResult?.isRealPrize ? <Gift className="h-10 w-10" /> : <ThumbsDown className="text-red-400 h-10 w-10" />}
                                {spinResult?.isRealPrize ? texts.mobileWinMessage : texts.mobileLoseMessage}
                            </CardTitle>
                        </CardHeader>
                        <Separator />
                        <CardContent className="p-6">
                            <p className="text-xl font-semibold mb-2">
                                {spinResult?.name}
                            </p>
                            <CardDescription className="text-card-foreground/80 mt-2 text-sm">
                                {spinResult?.isRealPrize 
                                    ? texts.mobileWinSubtitle 
                                    : texts.mobileLoseSubtitle
                                }
                            </CardDescription>
                             <p className="text-xs text-muted-foreground mt-6">{texts.mobileCloseHint}</p>
                        </CardContent>
                    </Card>
                );
            
            case 'ALREADY_PLAYED':
                return (
                    <Card className="w-full max-w-md text-center shadow-lg">
                        <CardHeader><AlertCircle className="h-12 w-12 text-yellow-600 mx-auto" /></CardHeader>
                        <CardContent>
                            <CardTitle>{texts.alreadyPlayedTitle}</CardTitle>
                            <CardDescription>{texts.alreadyPlayedSubtitle}</CardDescription>
                        </CardContent>
                    </Card>
                );
            
            case 'ERROR':
                return (
                    <Card className="w-full max-w-md shadow-lg">
                        <CardContent className="pt-6">
                            <Alert variant="destructive">
                                <Bug className="h-4 w-4" />
                                <AlertTitle>{texts.errorTitle}</AlertTitle>
                                <AlertDescription>{errorMessage}</AlertDescription>
                            </Alert>
                             <Button variant="outline" className="mt-4 w-full" onClick={() => setUiState('FORM')}>
                                {texts.errorRetryButtonText}
                            </Button>
                        </CardContent>
                    </Card>
                );
        }
    };

    return renderContent();
}
