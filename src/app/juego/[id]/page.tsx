import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2 } from 'lucide-react';
import SpinningWheel from '@/components/game/SpinningWheel';

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
    segments: data.segments || [], // Asegura que segments siempre sea un array
  };
}

export default async function GamePage({ params }: { params: { id: string } }) {
  const game = await getGameData(params.id);

  if (!game) {
    notFound();
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl text-center shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-4xl flex items-center justify-center gap-4">
            <Gamepad2 className="h-10 w-10" />
            {game.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center">
          <p className="text-muted-foreground mb-8">
            ¡Prepárate para girar la ruleta!
          </p>
          <div className="w-full max-w-sm sm:max-w-md">
            <SpinningWheel segments={game.segments} />
          </div>
          {/* Aquí irá el QR más adelante */}
        </CardContent>
      </Card>
    </div>
  );
}
