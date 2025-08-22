
'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import { DocumentData, doc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { QrCode, Gift, ThumbsDown, Loader2 } from 'lucide-react';
import SpinningWheel from '@/components/game/SpinningWheel';
import QRCodeDisplay from '@/components/game/QRCodeDisplay';
import { Separator } from '@/components/ui/separator';
import Confetti from '@/components/game/Confetti';
import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';

interface GameData extends DocumentData {
  id: string;
  name: string;
  status: string;
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
    if (!db) return;
    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(gameRef, async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            const spinRequest = data.spinRequest;
            if (spinRequest && spinRequest.customerId && uiState === 'IDLE' && db) {
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
                wheelScale: data.wheelScale || 1,
                rouletteVerticalOffset: data.rouletteVerticalOffset || 0,
                qrVerticalOffset: data.qrVerticalOffset || 0,
                screenRotation: data.screenRotation || 0,
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
    
    // Refresh the page after 15 seconds to return to the initial state
    setTimeout(() => {
      window.location.reload();
    }, 15000);
  }, []);

  const handleDemoSpin = async () => {
    if (game.status !== 'demo' || uiState !== 'IDLE' || !db) return;
  
    const winningIndex = Math.floor(Math.random() * game.segments.length);
    const winningSegment = game.segments[winningIndex];
  
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
    ...(game.backgroundImage && !game.backgroundVideo ? {
      backgroundImage: `url(${game.backgroundImage})`,
      backgroundSize: game.backgroundFit as 'cover' | 'contain' | 'fill' | 'none',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    } : {})
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
                <div 
                    className="text-center text-white p-4 rounded-lg animate-in fade-in zoom-in-95"
                    style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
                >
                    <h2 className="font-headline text-6xl md:text-7xl font-bold flex items-center justify-center gap-4 text-primary">
                        {spinResult?.isRealPrize ? <Gift className="h-16 w-16 md:h-20 md:w-20" /> : <ThumbsDown className="text-red-400 h-16 w-16 md:h-20 md:w-20" />}
                        {spinResult?.isRealPrize ? '¡Premio!' : '¡Casi!'}
                    </h2>
                    <p className="mt-4 text-4xl md:text-5xl font-semibold">
                        {spinResult?.name}
                    </p>
                    <p className="text-white/80 mt-4 text-lg md:text-xl">
                        {spinResult?.isRealPrize ? 'El ganador recibirá un email con instrucciones.' : '¡Mucha suerte para la próxima!'}
                    </p>
                </div>
            );
        case 'IDLE':
        default:
             return (
                <Card className="shadow-lg bg-black/10 backdrop-blur-sm border-white/20 text-white animate-in fade-in">
                    <CardHeader>
                    <CardTitle className="font-headline text-2xl flex items-center justify-center">
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
      {game.backgroundVideo && (
        <video
          className="absolute inset-0 w-full h-full object-cover z-0"
          src={game.backgroundVideo}
          autoPlay
          loop
          muted
          playsInline
          style={{
            objectFit: game.backgroundFit as 'cover' | 'contain' | 'fill' | 'none',
          }}
        />
      )}
        {game.status === 'demo' && (
             <div className="absolute top-4 right-4 z-30 flex flex-col gap-2 items-end">
                <div className="bg-yellow-400 text-black px-4 py-1 text-sm font-bold shadow-lg rounded-full">
                    MODO DEMO
                </div>
                 <Button onClick={handleDemoSpin} disabled={uiState !== 'IDLE'} size="sm" variant="secondary" className="shadow-lg">
                    {uiState !== 'IDLE' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Giro de Prueba
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
                <div className="text-xs text-gray-300/50">Build: 2508211535</div>
                <div className="bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
                    <a href="https://playapp.mansoestudiocreativo.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white/80 hover:text-white transition-colors text-base">
                        <span className="font-semibold">un producto de</span>
                        <Logo className="h-6 w-auto text-white" />
                    </a>
                </div>
            </div>
        </div>
    </div>
  );
}

    
