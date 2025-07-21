import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode } from 'lucide-react';
import SpinningWheel from '@/components/game/SpinningWheel';
import QRCodeDisplay from '@/components/game/QRCodeDisplay';
import { Separator } from '@/components/ui/separator';

async function getGameData(id: string) {
  const gameRef = doc(db, 'games', id);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    return null;
  }

  const data = gameSnap.data();
  return { 
    id: gameSnap.id, 
    ...data,
    name: data.name || 'Juego sin nombre',
    status: data.status || 'demo',
    segments: data.segments || [],
    backgroundImage: data.backgroundImage || '',
    backgroundFit: data.backgroundFit || 'cover',
    qrCodeScale: data.qrCodeScale || 1,
    config: {
      borderImage: data.borderImage || '',
      borderScale: data.borderScale || 1,
      centerImage: data.centerImage || '',
      centerScale: data.centerScale || 1,
    }
  };
}

export default async function GamePage({ params }: { params: { id:string } }) {
  const game = await getGameData(params.id);

  if (!game) {
    notFound();
  }
  
  const backgroundStyles: React.CSSProperties = game.backgroundImage ? {
    backgroundImage: `url(${game.backgroundImage})`,
    backgroundSize: game.backgroundFit as 'cover' | 'contain' | 'fill' | 'none',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  } : {};

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <div 
          className="relative w-full h-full flex flex-col items-center justify-center gap-8 p-4 lg:flex-row lg:gap-8 overflow-hidden rounded-lg"
          style={backgroundStyles}
        >
            {game.status === 'demo' && (
                <div className="absolute top-0 left-0 bg-yellow-500 text-black px-8 py-1 text-sm font-bold shadow-lg transform -rotate-45 -translate-x-8 translate-y-4">
                    DEMO
                </div>
            )}
            {/* Columna de la Ruleta */}
            <div className="w-full max-w-2xl text-center mb-8 lg:mb-0 flex flex-col items-center justify-center">
                <div className="w-full max-w-sm sm:max-w-md">
                  <SpinningWheel 
                    segments={game.segments} 
                    gameId={game.id} 
                    isDemoMode={game.status === 'demo'}
                    config={game.config}
                  />
                </div>
            </div>

            {/* Columna del QR */}
             <Card 
              className="w-full max-w-sm text-center shadow-lg bg-black/10 backdrop-blur-sm border-white/20 text-white"
              style={{ transform: `scale(${game.qrCodeScale})` }}
             >
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
        </div>
    </div>
  );
}
