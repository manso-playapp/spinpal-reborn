
import { Metadata } from 'next';

interface PageProps {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function GamePage({ params }: PageProps) {
  const gameId = params.id;
  const gameData = await getGameData(gameId);

  if (!gameData) {
    notFound();
  }

  try {
    // gameData ya está correctamente formateado por getGameData
    return <GameClientPage initialGame={gameData} />;
  } catch (error) {
    console.error('Error preparing game data:', error);
    notFound();
  }
}

// ... (resto del código como estaba antes)
import GameClientPage from '@/app/game/GameClientPage';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { notFound } from 'next/navigation';

interface GameData extends DocumentData {
  id: string;
  name: string;
  status: string;
  segments: any[];
  backgroundImage: string;
  backgroundFit: string;
  qrCodeScale: number;
  rouletteScale: number;
  wheelScale: number;
  rouletteVerticalOffset: number;
  qrVerticalOffset: number;
  screenRotation?: number;
  config: {
    borderImage: string;
    borderScale: number;
    centerImage: string;
    centerScale: number;
  };
}

async function getGameData(id: string): Promise<GameData | null> {
  try {
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
    
    // Convert Firestore timestamps to ISO strings and ensure all required fields exist
    const sanitizedData: GameData = {
      id: gameSnap.id,
      name: data.name || 'Juego sin nombre',
      status: data.status || 'demo',
      segments: data.segments || [],
      backgroundImage: data.backgroundImage || '',
      backgroundFit: data.backgroundFit || 'cover',
      qrCodeScale: data.qrCodeScale || 1,
      rouletteScale: data.rouletteScale || 1,
      wheelScale: data.wheelScale || 1,
      rouletteVerticalOffset: data.rouletteVerticalOffset || 0,
      qrVerticalOffset: data.qrVerticalOffset || 0,
      screenRotation: data.screenRotation || 0,
      config: {
        borderImage: data.config?.borderImage || '',
        borderScale: data.config?.borderScale || 1,
        centerImage: data.config?.centerImage || '',
        centerScale: data.config?.centerScale || 1
      }
    };

    return sanitizedData;
  } catch (error) {
    console.error("Error fetching game data:", error);
    return null;
  }
}
