import GameClientPage from '@/app/game/GameClientPage';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';

// Definimos una interfaz para el objeto del juego serializado
// Esto asegura que solo pasamos datos compatibles entre el servidor y el cliente.
interface SerializableGame {
  id: string;
  name: string;
  status: string;
  segments: any[];
  backgroundImage: string;
  backgroundFit: string;
  qrCodeScale: number;
  rouletteScale: number;
  rouletteVerticalOffset: number;
  qrVerticalOffset: number;
  config: {
    borderImage: string;
    borderScale: number;
    centerImage: string;
    centerScale: number;
  };
  // Incluimos cualquier otro campo que pueda venir de Firestore
  [key: string]: any;
}

interface GamePageProps {
  params: { id: string };
}

async function getGameData(id: string): Promise<SerializableGame | null> {
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


export default async function GamePage({ params }: GamePageProps) {
  const gameData = await getGameData(params.id);

  if (!gameData) {
    notFound();
  }

  return <GameClientPage initialGame={gameData} />;
}
