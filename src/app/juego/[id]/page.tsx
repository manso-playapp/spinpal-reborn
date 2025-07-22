
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, onSnapshot, DocumentData } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { QrCode, Gift, ThumbsDown, Loader2 } from 'lucide-react';
import SpinningWheel from '@/components/game/SpinningWheel';
import QRCodeDisplay from '@/components/game/QRCodeDisplay';
import { Separator } from '@/components/ui/separator';

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
  rouletteQrGap: number;
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

export default function GamePage({ params }: { params: { id:string } }) {
  const [game, setGame] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const gameId = params.id;

  useEffect(() => {
    const getGameData = async () => {
      const gameRef = doc(db, 'games', gameId);
      const gameSnap = await getDoc(gameRef);

      if (!gameSnap.exists()) {
        setLoading(false);
        // This will trigger the notFound UI in production
        notFound();
        return;
      }

      const data = gameSnap.data();
      setGame({ 
        id: gameSnap.id, 
        ...data,
        name: data.name || 'Juego sin nombre',
        status: data.status || 'demo',
        segments: data.segments || [],
        backgroundImage: data.backgroundImage || '',
        backgroundFit: data.backgroundFit || 'cover',
        qrCodeScale: data.qrCodeScale || 1,
        rouletteScale: data.rouletteScale || 1,
        rouletteVerticalOffset: data.rouletteVerticalOffset || 0,
        rouletteQrGap: data.rouletteQrGap || 32,
        config: {
          borderImage: data.borderImage || '',
          borderScale: data.borderScale || 1,
          centerImage: data.centerImage || '',
          centerScale: data.centerScale || 1,
        }
      });
      setLoading(false);
    };
    getGameData();
  }, [gameId]);


  const handleSpinEnd = (result: SpinResult) => {
    setSpinResult(result);
    // Hide the result and show QR code again after 15 seconds
    setTimeout(() => {
      setSpinResult(null);
    }, 15000);
  };
  
  if (loading) {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  if (!game) {
    // notFound() is handled in useEffect, this is a fallback.
    return null;
  }
  
  const backgroundStyles: React.CSSProperties = game.backgroundImage ? {
    backgroundImage: `url(${game.backgroundImage})`,
    backgroundSize: game.backgroundFit as 'cover' | 'contain' | 'fill' | 'none',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  } : {};

  return (
    <div 
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden"
      style={backgroundStyles}
    >
        {game.status === 'demo' && (
            <div className="absolute top-0 left-0 bg-yellow-500 text-black px-8 py-1 text-sm font-bold shadow-lg transform -rotate-45 -translate-x-8 translate-y-4 z-30">
                DEMO
            </div>
        )}

        <div 
          className="flex flex-col items-center justify-center w-full"
          style={{ gap: `${game.rouletteQrGap}px` }}
        >
          {/* Columna de la Ruleta */}
          <div 
            className="w-full max-w-2xl text-center flex flex-col items-center justify-center"
            style={{ 
              transform: `translateY(${game.rouletteVerticalOffset}px) scale(${game.rouletteScale})` 
            }}
          >
              <div className="w-full max-w-sm sm:max-w-md">
                <SpinningWheel 
                  segments={game.segments} 
                  gameId={game.id} 
                  isDemoMode={game.status === 'demo'}
                  config={game.config}
                  onSpinEnd={handleSpinEnd}
                />
              </div>
          </div>

          {/* Columna del QR o Resultado */}
           <div 
            className="w-full max-w-sm text-center"
            style={{ transform: `scale(${game.qrCodeScale})` }}
           >
            {spinResult ? (
                 <Card className="shadow-lg bg-black/50 backdrop-blur-md border-white/30 text-white animate-in fade-in zoom-in-95">
                    <CardHeader>
                        <CardTitle className="font-headline text-3xl flex items-center justify-center gap-3">
                           {spinResult.isRealPrize ? <Gift className="text-yellow-400" /> : <ThumbsDown className="text-red-400" />}
                           {spinResult.isRealPrize ? '¡Premio!' : '¡Casi!'}
                        </CardTitle>
                        <Separator className="bg-white/20 mt-2"/>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-semibold">
                            {spinResult.name}
                        </p>
                        <CardDescription className="text-white/80 mt-2">
                           {spinResult.isRealPrize ? 'El ganador recibirá un email con instrucciones.' : '¡Mucha suerte para la próxima!'}
                        </CardDescription>
                    </CardContent>
                </Card>
            ) : (
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
            )}
           </div>
        </div>
    </div>
  );
}
