import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { Gamepad2 } from 'lucide-react';
import CustomerRegistrationForm from '@/components/game/CustomerRegistrationForm';

async function getGameData(id: string) {
  const gameRef = doc(db, 'games', id);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    return null;
  }
  const data = gameSnap.data();
  return { 
    id: gameSnap.id, 
    name: data.name || "Juego sin nombre",
  };
}

export default async function PlayerPage({ params }: { params: { id:string } }) {
  const game = await getGameData(params.id);

  if (!game) {
    notFound();
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
         <div className="flex flex-col items-center justify-center mb-6 text-center">
            <Gamepad2 className="h-12 w-12 text-primary mb-4" />
            <p className="text-muted-foreground">Estás jugando a</p>
            <h1 className="font-headline text-3xl font-bold">
              {game.name}
            </h1>
          </div>
        <CustomerRegistrationForm gameId={game.id} />
      </div>
    </div>
  );
}
