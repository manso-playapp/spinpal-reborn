// Eliminamos la importación de PageProps de 'next/types'

// **INICIO DE LA CORRECCIÓN: Definición local de CustomPageProps**
type CustomPageProps<P = { [key: string]: string | string[] }, S = { [key: string]: string | string[] | undefined }> = {
  params: P;
  searchParams?: S;
};
// **FIN DE LA CORRECCIÓN**

import GameClientPage from '@/app/game/GameClientPage';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';

async function getGameData(id: string) {
  // Verificar si db es null
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

// Usamos CustomPageProps para tipar los props del componente
export default async function GamePage({ params }: CustomPageProps<{ id: string }>) {
  const gameId = params.id;
  const gameData = await getGameData(gameId);

  if (!gameData) {
    notFound();
  }

  return <GameClientPage initialGame={gameData} />;
}
