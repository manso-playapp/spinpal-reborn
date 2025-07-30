import { type PageProps } from 'next/types'; // Importamos PageProps
// This is a special layout-less page for the iframe preview
import GameClientPage from '@/app/game/GameClientPage';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';

async function getGameData(id: string) {
  if (!id) return null;
  const gameRef = doc(db, 'games', id);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    return null;
  }

  const data = gameSnap.data();
  // Nos aseguramos de que los datos sean serializables (convertibles a JSON)
  // eliminando tipos de datos complejos como Timestamps de Firebase.
  const serializableData = JSON.parse(JSON.stringify({ id: gameSnap.id, ...data }));
  
  return serializableData;
}

// Usamos PageProps para tipar los props del componente
export default async function GamePreviewPage({ params }: PageProps<{ id: string }>) {
  const gameId = params.id;
  const gameData = await getGameData(gameId);

  if (!gameData) {
    notFound();
  }
    
  return <GameClientPage key={Date.now()} initialGame={gameData} />;
}
