import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2 } from 'lucide-react';

async function getGameData(id: string) {
  const gameRef = doc(db, 'games', id);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    return null;
  }

  return { id: gameSnap.id, ...gameSnap.data() };
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
        <CardContent>
          <p className="text-muted-foreground">
            ¡Prepárate para girar la ruleta!
          </p>
          {/* Aquí irán la ruleta y el QR más adelante */}
        </CardContent>
      </Card>
    </div>
  );
}
