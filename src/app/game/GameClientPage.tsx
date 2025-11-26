
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import { useFirebasePublic } from '@/context/FirebasePublicContext';
import { DocumentData, doc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { QrCode, Gift, ThumbsDown, Loader2 } from 'lucide-react';
import SpinningWheel from '@/components/game/SpinningWheel';
import QRCodeDisplay from '@/components/game/QRCodeDisplay';
import { Separator } from '@/components/ui/separator';
import Confetti from '@/components/game/Confetti';
import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';
import { mergeGameTexts, extractGameTextOverrides, getDefaultTexts } from '@/lib/textDefaults';

interface GameData extends DocumentData {
  id: string;
  name: string;
  status: string;
  language?: 'es' | 'en' | 'pt';
  segments: any[];
  backgroundImage: string;
  backgroundVideo?: string;
  backgroundFit: string;
  qrCodeScale: number;
  rouletteScale: number;
  wheelScale: number;
  rouletteVerticalOffset: number;
  qrVerticalOffset: number;
  screenRotation?: number;
  config: {
    borderImage: string;
    borderScale: number;
    centerImage: string;
    centerScale: number;
    strokeWidth?: number;
    strokeColor?: string;
  };
  texts_es?: any;
  texts_en?: any;
  texts_pt?: any;
  clientEmail?: string;
  clientId?: string;
  accessCredentials?: {
    email: string;
    resetPasswordRequested?: boolean;
    lastPasswordReset?: Date;
  };
}

interface SpinResult {
    name: string;
    isRealPrize: boolean;
}

type UiState = 'IDLE' | 'SPINNING' | 'SHOW_RESULT';

export default function GameClientPage({ initialGame }: { initialGame: GameData }) {
  const { db } = useFirebasePublic();
  // Función para validar y normalizar URLs
  const validateUrl = (url: string | undefined) => {
    if (!url) return '';
    try {
      // Si la URL ya es absoluta, la devolvemos tal cual
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      // Si es relativa, asumimos que es relativa al dominio actual
      // No usamos window.location.origin porque no está disponible en SSR
      return url.startsWith('/') ? url : `/${url}`;
    } catch (e) {
      console.error('Invalid URL:', url, e);
      return url; // Devolvemos la URL original si hay error
    }
  };

  // Validar URLs en los datos iniciales
  const validatedInitialGame = {
    ...initialGame,
    language: initialGame.language || 'es',
    backgroundImage: validateUrl(initialGame.backgroundImage),
    backgroundVideo: validateUrl(initialGame.backgroundVideo),
    config: {
      ...initialGame.config,
      borderImage: validateUrl(initialGame.config.borderImage),
      centerImage: validateUrl(initialGame.config.centerImage),
      strokeWidth: initialGame.config?.strokeWidth ?? 1,
      strokeColor: initialGame.config?.strokeColor || '#000000',
    }
  };

  const [game, setGame] = useState<GameData>(validatedInitialGame);
  const [uiState, setUiState] = useState<UiState>('IDLE');
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const texts = useMemo(() => {
    const lang = game.language || 'es';
    const stored = game[`texts_${lang}`] || extractGameTextOverrides(game);
    return mergeGameTexts(stored, lang);
  }, [game]);
  
  const gameId = initialGame.id;

  const uiStateRef = useRef(uiState);

  useEffect(() => {
    uiStateRef.current = uiState;
  }, [uiState]);

  useEffect(() => {
    const imagesToPreload = [
      game.config.borderImage,
      game.config.centerImage,
      game.backgroundImage,
    ].filter(Boolean);

    imagesToPreload.forEach((src) => {
      const img = document.createElement('img');
      img.src = src;
    });
  }, [game.backgroundImage, game.config.borderImage, game.config.centerImage]);

  useEffect(() => {
    if (!db) {
      console.warn('Firebase DB no está inicializada, funcionando en modo offline');
      return;
    }

    const gameRef = doc(db, 'games', gameId);

    const unsubscribe = onSnapshot(
      gameRef,
      async (docSnap) => {
        if (!docSnap.exists()) {
          return;
        }

        const data = docSnap.data();
        const spinRequest = data.spinRequest;
        if (spinRequest && spinRequest.customerId && uiStateRef.current === 'IDLE') {
          setUiState('SPINNING');
          const customerRef = doc(db, 'games', gameId, 'customers', spinRequest.customerId);
          const customerSnap = await getDoc(customerRef);
          if (customerSnap.exists()) {
            setCurrentPlayer(customerSnap.data().name);
          }
        }

        const newGameData = {
          id: docSnap.id,
          ...data,
          language: data.language || 'es',
          name: data.name || 'Juego sin nombre',
          status: data.status || 'demo',
          segments: data.segments || [],
          backgroundImage: validateUrl(data.backgroundImage) || '',
          backgroundVideo: validateUrl(data.backgroundVideo) || '',
          backgroundFit: data.backgroundFit || 'cover',
          qrCodeScale: data.qrCodeScale || 1,
          rouletteScale: data.rouletteScale || 1,
          wheelScale: data.wheelScale || 1,
          rouletteVerticalOffset: data.rouletteVerticalOffset || 0,
          qrVerticalOffset: data.qrVerticalOffset || 0,
          screenRotation: data.screenRotation || 0,
          config: {
            borderImage: validateUrl(data.config?.borderImage) || '',
            borderScale: data.config?.borderScale || 1,
            centerImage: validateUrl(data.config?.centerImage) || '',
            centerScale: data.config?.centerScale || 1,
            strokeWidth: data.config?.strokeWidth ?? 1,
            strokeColor: data.config?.strokeColor || '#000000',
          },
        };

        setGame(newGameData as GameData);
      },
      (error) => {
        console.error('Error fetching game data in real-time:', error);
      },
    );

    return () => unsubscribe();
  }, [db, gameId]);


  const handleSpinEnd = useCallback((result: SpinResult) => {
    setSpinResult(result);
    setUiState('SHOW_RESULT');
    setCurrentPlayer(null);

    if (result.isRealPrize) {
        setShowConfetti(true);
    }
    
    // Refresh the page after 15 seconds to return to the initial state
    setTimeout(() => {
      window.location.reload();
    }, 15000);
  }, []);

  const handleDemoSpin = async () => {
    if (game.status !== 'demo' || uiState !== 'IDLE' || !db) return;
  
    const eligibleSegments = (game.segments || []).filter((s: any) => {
      if (s?.isRealPrize && s?.useStockControl) {
        return (s.quantity ?? 0) > 0;
      }
      return true;
    });

    if (eligibleSegments.length === 0) {
      console.error('No hay premios disponibles para el giro de demo (stock agotado).');
      return;
    }

    const winningIndex = Math.floor(Math.random() * eligibleSegments.length);
    const winningSegment = eligibleSegments[winningIndex];
  
    if (!winningSegment || typeof winningSegment.id !== 'string') {
      console.error('Invalid segment for demo spin.');
      return;
    }
  
    setUiState('SPINNING');
    setCurrentPlayer('Tester');
  
    try {
      const gameRef = doc(db, 'games', gameId);
      await updateDoc(gameRef, {
        spinRequest: {
          timestamp: new Date(), 
          customerId: 'demo-user',
          winningId: winningSegment.id,
        },
      });
    } catch (error) {
      console.error('Error triggering demo spin:', error);
      setUiState('IDLE');
      setCurrentPlayer(null);
    }
  };
  
  const backgroundStyles: React.CSSProperties = game.backgroundVideo || game.backgroundImage ? {
    position: 'relative',
  } : {};

  const renderBottomCard = () => {
    switch(uiState) {
        case 'SPINNING':
            return (
                <Card className="shadow-lg bg-black/70 backdrop-blur-md border-white/40 text-white animate-in fade-in">
                         <CardContent className="p-6 flex flex-col items-center justify-center gap-4">
                         <Loader2 className="h-12 w-12 text-white animate-spin" />
                         <p className="font-headline text-3xl">{texts.tvSpinningMessage}</p>
                         <p className="font-bold text-4xl text-white">{currentPlayer || ''}</p>
                    </CardContent>
                </Card>
            );
        case 'SHOW_RESULT':
             return (
                <div 
                    className="text-center text-white p-4 rounded-lg animate-in fade-in zoom-in-95"
                    style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
                >
                    <h2 className="font-headline text-6xl md:text-7xl font-bold flex items-center justify-center gap-4 text-white">
                        {spinResult?.isRealPrize ? <Gift className="h-16 w-16 md:h-20 md:w-20" /> : <ThumbsDown className="text-red-400 h-16 w-16 md:h-20 md:w-20" />}
                        {spinResult?.isRealPrize ? texts.tvWinMessage : texts.tvLoseMessage}
                    </h2>
                    <p className="mt-4 text-4xl md:text-5xl font-semibold">
                        {spinResult?.name}
                    </p>
                    <p className="text-white/80 mt-4 text-lg md:text-xl">
                        {spinResult?.isRealPrize ? texts.tvWinSubtitle : texts.tvLoseSubtitle}
                    </p>
                </div>
            );
        case 'IDLE':
        default:
             return (
                <Card className="shadow-lg bg-black/10 backdrop-blur-sm border-white/20 text-white animate-in fade-in">
                    <CardHeader>
                    <CardTitle className="font-headline text-2xl flex items-center justify-center">
                        {texts.tvIdleTitle}
                    </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center gap-4">
                        <QRCodeDisplay gameId={game.id} />
                        <Separator className="bg-white/20"/>
                        <p className="text-sm">
                        {texts.tvIdleDescription}
                        </p>
                    </CardContent>
                </Card>
            );
    }
  }

  // Calculamos los estilos del contenedor principal
  const containerStyles: React.CSSProperties = {
    ...backgroundStyles,
    transformOrigin: 'center center',
    width: game.screenRotation ? '100vh' : '100vw',
    height: game.screenRotation ? '100vw' : '100vh',
    position: 'fixed',
    top: game.screenRotation ? '50%' : '0',
    left: game.screenRotation ? '50%' : '0',
    transform: game.screenRotation ? `translate(-50%, -50%) rotate(${game.screenRotation}deg)` : 'none'
  };

  return (
    <div 
      className="relative flex flex-col items-center justify-center overflow-hidden p-4"
      style={containerStyles}
    >
      {game.backgroundVideo ? (
        <video
          className="absolute inset-0 w-full h-full z-0"
          src={game.backgroundVideo}
          autoPlay
          loop
          muted
          playsInline
          style={{
            objectFit: game.backgroundFit as 'cover' | 'contain' | 'fill' | 'none',
          }}
          onError={(e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
            console.error('Error loading background video:', game.backgroundVideo);
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : game.backgroundImage ? (
        <div className="absolute inset-0 w-full h-full z-0">
          <Image
            src={game.backgroundImage}
            alt="Background"
            fill
            priority
            className="transition-opacity duration-300"
            style={{
              objectFit: game.backgroundFit as 'cover' | 'contain' | 'fill' | 'none',
            }}
            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
              console.error('Error loading background image:', game.backgroundImage);
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      ) : null}
        {game.status === 'demo' && (
             <div className="absolute top-4 right-4 z-30 flex flex-col gap-2 items-end">
                <div className="bg-yellow-400 text-black px-4 py-1 text-sm font-bold shadow-lg rounded-full">
                    {texts.tvDemoBadgeText}
                </div>
                 <Button onClick={handleDemoSpin} disabled={uiState !== 'IDLE'} size="sm" variant="secondary" className="shadow-lg">
                    {uiState !== 'IDLE' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {texts.tvDemoButtonText}
                </Button>
            </div>
        )}
        {showConfetti && <Confetti />}

        <div
            className="absolute inset-0 flex justify-center items-center pointer-events-none"
            style={{
                transform: `translateY(${game.rouletteVerticalOffset}px) scale(${game.rouletteScale})`,
                transformOrigin: 'center center',
            }}
        >
          <div className="w-full max-w-sm sm:max-w-md md:max-w-lg">
            <SpinningWheel 
              segments={game.segments} 
              gameId={game.id} 
              isDemoMode={game.status === 'demo'}
              config={game.config}
              wheelScale={game.wheelScale || 1}
              onSpinEnd={handleSpinEnd}
            />
          </div>
        </div>

        <div 
          className="absolute bottom-4 px-4 w-full flex justify-center items-center"
          style={{ 
            transform: `translateY(${game.qrVerticalOffset}px)`
          }}
        >
            <div 
              className="w-full max-w-md text-center"
              style={{
                transform: `scale(${game.qrCodeScale})`,
                transformOrigin: 'bottom center'
              }}
            >
              {renderBottomCard()}
            </div>
        </div>
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50">
            <div className="flex flex-col items-center gap-1">
                <div className="text-xs text-gray-300/50">{texts.tvBuildLabel}: 2508211535</div>
                <div className="bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
                    <a href="https://playapp.mansoestudiocreativo.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white/80 hover:text-white transition-colors text-base">
                        <span className="font-semibold">{texts.tvFooterByline}</span>
                        <Logo className="h-6 w-auto text-white" />
                    </a>
                </div>
            </div>
        </div>
    </div>
  );
}

    
