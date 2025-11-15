
// Añadir @ts-ignore y tipar params como any
// @ts-ignore
export default async function GamePreviewPage({ params }: any) {
  const gameId = params.id;
  const gameData = await getGameData(gameId);

  if (!gameData) {
    notFound();
  }

  return <GameClientPage initialGame={gameData} />;
}

// ... (resto del código como estaba antes)
import GameClientPage from '@/app/game/GameClientPage';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';

async function getGameData(id: string) {
  if (!id) return null;
  if (!db) {
    console.error("Firestore (db) is not initialized in getGameData. Check Firebase configuration.");
    return null;
  }

  const gameRef = doc(db, 'games', id);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    return null;
  }

  const data = gameSnap.data();
  const serializableData = JSON.parse(JSON.stringify({ id: gameSnap.id, ...data }));
  
  return serializableData;
}
