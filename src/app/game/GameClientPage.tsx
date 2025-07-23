
'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot, DocumentData, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { QrCode, Gift, ThumbsDown, Loader2 } from 'lucide-react';
import SpinningWheel from '@/components/game/SpinningWheel';
import QRCodeDisplay from '@/components/game/QRCodeDisplay';
import { Separator } from '@/components/ui/separator';
import Confetti from '@/components/game/Confetti';

interface GameData extends DocumentData {
  id: string;
  name: string;
  status: string;
  segments: any[];
  backgroundImage: string;
  backgroundFit: string;
  qrCodeScale: number;
  rouletteScale: number;
  rouletteVerticalOffset: number;
  qrVerticalOffset: number;
  config: {
    borderImage: string;
    borderScale: number;
    centerImage: string;
    centerScale: number;
  };
}

interface SpinResult {
    name: string;
    isRealPrize: boolean;
}

type UiState = 'IDLE' | 'SPINNING' | 'SHOW_RESULT';

export default function GameClientPage({ initialGame }: { initialGame: GameData }) {
  const [game, setGame] = useState<GameData>(initialGame);
  const [uiState, setUiState] = useState<UiState>('IDLE');
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const gameId = initialGame.id;

  useEffect(() => {
    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(gameRef, async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            const spinRequest = data.spinRequest;
            if (spinRequest && spinRequest.customerId && uiState === 'IDLE') {
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
                name: data.name || 'Juego sin nombre',
                status: data.status || 'demo',
                segments: data.segments || [],
                backgroundImage: data.backgroundImage || '',
                backgroundFit: data.backgroundFit || 'cover',
                qrCodeScale: data.qrCodeScale || 1,
                rouletteScale: data.rouletteScale || 1,
                rouletteVerticalOffset: data.rouletteVerticalOffset || 0,
                qrVerticalOffset: data.qrVerticalOffset || 0,
                config: data.config || {
                    borderImage: data.borderImage || '',
                    borderScale: data.borderScale || 1,
                    centerImage: data.centerImage || '',
                    centerScale: data.centerScale || 1,
                }
            };
            
            setGame(newGameData as GameData);
        }
    }, (error) => {
        console.error("Error fetching game data in real-time:", error);
    });

    return () => unsubscribe();
  }, [gameId, uiState]);


  const handleSpinEnd = useCallback((result: SpinResult) => {
    setSpinResult(result);
    setUiState('SHOW_RESULT');
    setCurrentPlayer(null);

    if (result.isRealPrize) {
        setShowConfetti(true);
    }
    
    setTimeout(() => {
      setUiState('IDLE');
      setSpinResult(null);
      setShowConfetti(false);
    }, 15000);
  }, []);
  
  const backgroundStyles: React.CSSProperties = game.backgroundImage ? {
    backgroundImage: `url(${game.backgroundImage})`,
    backgroundSize: game.backgroundFit as 'cover' | 'contain' | 'fill' | 'none',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  } : {};

  const renderBottomCard = () => {
    switch(uiState) {
        case 'SPINNING':
            return (
                <Card className="shadow-lg bg-black/70 backdrop-blur-md border-primary/50 text-white animate-in fade-in">
                    <CardContent className="p-6 flex flex-col items-center justify-center gap-4">
                         <Loader2 className="h-12 w-12 text-primary animate-spin" />
                         <p className="font-headline text-3xl">¡Mucha suerte...!</p>
                         <p className="font-bold text-4xl text-primary">{currentPlayer || ''}</p>
                    </CardContent>
                </Card>
            );
        case 'SHOW_RESULT':
            return (
                <Card className="shadow-lg bg-black/70 backdrop-blur-md border-primary/50 text-white animate-in fade-in zoom-in-95">
                    <CardHeader className="p-6">
                        <CardTitle className="font-headline text-6xl md:text-7xl flex items-center justify-center gap-4 text-primary">
                            {spinResult?.isRealPrize ? <Gift className="h-16 w-16 md:h-20 md:w-20" /> : <ThumbsDown className="text-red-400 h-16 w-16 md:h-20 md:w-20" />}
                            {spinResult?.isRealPrize ? '¡Premio!' : '¡Casi!'}
                        </CardTitle>
                        <Separator className="bg-primary/20 mt-4"/>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <p className="text-4xl md:text-5xl font-semibold">
                            {spinResult?.name}
                        </p>
                        <CardDescription className="text-white/80 mt-4 text-lg md:text-xl">
                            {spinResult?.isRealPrize ? 'El ganador recibirá un email con instrucciones.' : '¡Mucha suerte para la próxima!'}
                        </CardDescription>
                    </CardContent>
                </Card>
            );
        case 'IDLE':
        default:
             return (
                <Card className="shadow-lg bg-black/10 backdrop-blur-sm border-white/20 text-white animate-in fade-in">
                    <CardHeader>
                    <CardTitle className="font-headline text-2xl flex items-center justify-center gap-2">
                        <QrCode />
                        ¡Escanea para Jugar!
                    </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center gap-4">
                        <QRCodeDisplay gameId={game.id} />
                        <Separator className="bg-white/20"/>
                        <p className="text-sm">
                        Abre la cámara de tu teléfono, apunta al código QR y sigue el enlace para registrarte y jugar.
                        </p>
                    </CardContent>
                </Card>
            );
    }
  }

  return (
    <div 
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden p-4"
      style={backgroundStyles}
    >
        {game.status === 'demo' && (
             <div className="absolute top-4 right-4 z-30 flex flex-col gap-2 items-end">
                <div className="bg-yellow-400 text-black px-4 py-1 text-sm font-bold shadow-lg rounded-full">
                    MODO DEMO
                </div>
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
              className="w-full max-w-sm text-center"
              style={{
                transform: `scale(${game.qrCodeScale})`,
                transformOrigin: 'bottom center'
              }}
            >
              {renderBottomCard()}
            </div>
        </div>
    </div>
  );
}
