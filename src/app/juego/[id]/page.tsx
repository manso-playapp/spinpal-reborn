
type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function GamePage(props: Props) {
  const { id: gameId } = await props.params;
  const gameData = await getGameData(gameId);

  if (!gameData) {
    notFound();
  }

  return <GameClientPage initialGame={gameData} />;
}

// ... (resto del código como estaba antes)
import GameClientPage from '@/app/game/GameClientPage';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { mergeGameTexts, extractGameTextOverrides } from '@/lib/textDefaults';

interface GameData extends DocumentData {
  id: string;
  name: string;
  status: string;
  language?: 'es' | 'en' | 'pt';
  segments: any[];
  backgroundImage: string;
  backgroundVideo?: string;
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
    strokeWidth?: number;
    strokeColor?: string;
  };
  texts_es?: any;
  texts_en?: any;
  texts_pt?: any;
  registrationTitle?: string;
  registrationSubtitle?: string;
}

async function getGameData(id: string): Promise<GameData | null> {
  try {
    if (!db) {
      console.error("Firestore (db) is not initialized in getGameData. Check Firebase configuration.");
      return null;
    }

    console.log(`Fetching game data for ID: ${id}`);
    const gameRef = doc(db, 'games', id);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) {
      console.error(`Game with ID ${id} not found`);
      return null;
    }

    const data = gameSnap.data();
    const lang = (data.language as 'es' | 'en' | 'pt') || 'es';
    const mergedTexts = mergeGameTexts(data[`texts_${lang}`] || extractGameTextOverrides(data), lang);
    
    // Asegurarnos de que las URLs son absolutas y completas
    const ensureAbsoluteUrl = (url: string) => {
      if (!url) return '';
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      if (url.startsWith('/')) return `${process.env.NEXT_PUBLIC_BASE_URL || ''}${url}`;
      return url;
    };

    // Pre-cargar y validar las URLs de las imágenes
    console.log('Raw game data:', {
      config: data.config,
      backgroundImage: data.backgroundImage,
      backgroundVideo: data.backgroundVideo
    });

    // Convert Firestore timestamps to ISO strings and ensure all required fields exist
    const sanitizedData: GameData = {
      id: gameSnap.id,
      name: data.name || 'Juego sin nombre',
      status: data.status || 'demo',
      language: lang,
      segments: data.segments || [],
      backgroundImage: data.backgroundImage || '',
      backgroundVideo: data.backgroundVideo || '',
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
        centerScale: data.config?.centerScale || 1,
        strokeWidth: data.config?.strokeWidth ?? 1,
        strokeColor: data.config?.strokeColor || '#000000',
      },
      texts_es: data.texts_es || null,
      texts_en: data.texts_en || null,
      texts_pt: data.texts_pt || null,
      registrationTitle: mergedTexts.registrationTitle,
      registrationSubtitle: mergedTexts.registrationSubtitle,
    };

    return sanitizedData;
  } catch (error) {
    console.error("Error fetching game data:", error);
    return null;
  }
}
