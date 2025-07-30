// Eliminamos la importación de PageProps de 'next/types'

// **INICIO DE LA CORRECCIÓN: Definición local de CustomPageProps**
type CustomPageProps<P = { [key: string]: string | string[] }, S = { [key: string]: string | string[] | undefined }> = {
  params: P;
  searchParams?: S;
};
// **FIN DE LA CORRECCIÓN**

// This is a special layout-less page for the iframe preview
import GameClientPage from '@/app/game/GameClientPage';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';

async function getGameData(id: string) {
  if (!id) return null;
  // **INICIO DE LA CORRECCIÓN: Verificar si db es null**
  if (!db) {
    console.error("Firestore (db) is not initialized in getGameData. Check Firebase configuration.");
    return null; // Retorna null si db no está inicializado
  }
  // **FIN DE LA CORRECCIÓN**

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
export default async function GamePreviewPage({ params }: CustomPageProps<{ id: string }>) {
  const gameId = params.id;
  const gameData = await getGameData(gameId);

  if (!gameData) {
    notFound();
  }
    
  return <GameClientPage key={Date.now()} initialGame={gameData} />;
}
