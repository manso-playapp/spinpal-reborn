import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2, QrCode } from 'lucide-react';
import SpinningWheel from '@/components/game/SpinningWheel';
import QRCodeDisplay from '@/components/game/QRCodeDisplay';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
    <div 
      className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 lg:flex-row lg:gap-8"
      style={backgroundStyles}
    >
      <div className={`w-full h-full flex flex-col items-center justify-center lg:flex-row lg:gap-8 ${game.backgroundImage ? 'bg-black/20' : ''}`}>
        
        {/* Columna de la Ruleta */}
        <Card className="w-full max-w-2xl text-center shadow-lg bg-card/90 backdrop-blur-sm mb-8 lg:mb-0">
          <CardHeader>
            <CardTitle className="font-headline text-4xl flex items-center justify-center gap-4">
              <Gamepad2 className="h-10 w-10" />
              {game.name}
            </CardTitle>
            {game.status === 'demo' && (
                <Alert variant="default" className="text-left bg-yellow-100/80 border-yellow-300 dark:bg-yellow-900/80 dark:border-yellow-700">
                    <AlertTitle className="font-semibold">Modo Demo</AlertTitle>
                    <AlertDescription>
                        Esta ruleta está en modo de prueba. Los giros no requieren registro.
                    </AlertDescription>
                </Alert>
            )}
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="w-full max-w-sm sm:max-w-md">
              <SpinningWheel 
                segments={game.segments} 
                gameId={game.id} 
                isDemoMode={game.status === 'demo'}
              />
            </div>
          </CardContent>
        </Card>

        {/* Columna del QR (solo en modo Activo) */}
        {game.status === 'activo' && (
             <Card className="w-full max-w-sm text-center shadow-lg bg-card/90 backdrop-blur-sm">
               <CardHeader>
                 <CardTitle className="font-headline text-2xl flex items-center justify-center gap-2">
                    <QrCode />
                    ¡Escanea para Jugar!
                 </CardTitle>
               </CardHeader>
               <CardContent className="flex flex-col items-center justify-center gap-4">
                  <QRCodeDisplay gameId={game.id} />
                  <Separator />
                  <p className="text-muted-foreground text-sm">
                    Abre la cámara de tu teléfono, apunta al código QR y sigue el enlace para registrarte.
                  </p>
               </CardContent>
            </Card>
        )}

      </div>
    </div>
  );
}
