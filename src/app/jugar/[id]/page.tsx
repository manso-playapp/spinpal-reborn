
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
    registrationTitle: data.registrationTitle || `Estás jugando a`,
    registrationSubtitle: data.registrationSubtitle,
    mobileBackgroundImage: data.mobileBackgroundImage || '',
  };
}

export default async function PlayerPage({ params }: { params: { id:string } }) {
  const game = await getGameData(params.id);

  if (!game) {
    notFound();
  }
  
  const backgroundStyles: React.CSSProperties = game.mobileBackgroundImage ? {
    backgroundImage: `url(${game.mobileBackgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  } : {};

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4 relative" style={backgroundStyles}>
       {game.mobileBackgroundImage && <div className="absolute inset-0 bg-black/30 z-0"></div>}
       <div className="w-full max-w-md z-10">
         <div className={`flex flex-col items-center justify-center mb-6 text-center rounded-xl p-6 ${game.mobileBackgroundImage ? 'bg-background/80 backdrop-blur-sm' : ''}`}>
            <Gamepad2 className="h-12 w-12 text-primary mb-4" />
            <p className="text-muted-foreground">{game.registrationTitle}</p>
            <h1 className="font-headline text-3xl font-bold">
              {game.name}
            </h1>
            {game.registrationSubtitle && (
                <p className="text-muted-foreground mt-2">{game.registrationSubtitle}</p>
            )}
          </div>
        <CustomerRegistrationForm gameId={game.id} />
      </div>
    </div>
  );
}
