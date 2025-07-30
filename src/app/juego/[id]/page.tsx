// Eliminamos CUALQUIER importación de PageProps
// Eliminamos CUALQUIER definición local de CustomPageProps

import GameClientPage from '@/app/game/GameClientPage';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';

async function getGameData(id: string) {
  // Verificar si db es null (Mantenemos esta verificación, es crucial)
  if (!db) {
    console.error("Firestore (db) is not initialized in getGameData. Check Firebase configuration.");
    return null; // Retorna null si db no está inicializado
  }

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

// @ts-ignore
export default async function GamePage({ params }: { params: { id: string } }) {
  const gameId = params.id;
  const gameData = await getGameData(gameId);

  if (!gameData) {
    notFound();
  }

  return <GameClientPage initialGame={gameData} />;
}
