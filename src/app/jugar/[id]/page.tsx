
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PlayerPage(props: Props) {
  const resolvedParams = await props.params;
  const gameId = resolvedParams.id;
  const game = await getGameData(gameId);

  if (!game) {
    notFound();
  }

  const backgroundStyles: React.CSSProperties = game.mobileBackgroundVideo || game.mobileBackgroundImage ? {
    ...(game.mobileBackgroundImage && !game.mobileBackgroundVideo ? {
      backgroundImage: `url(${game.mobileBackgroundImage})`,
      backgroundSize: game.mobileBackgroundFit as 'cover' | 'contain' | 'fill' | 'none',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    } : {})
  } : {};

  const headerTitle = (game.texts?.registrationPageTitle || '').replace('{game}', game.name) || game.name;
  const headerSubtitle = game.texts?.registrationPageSubtitle;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 relative" style={backgroundStyles}>
      {game.mobileBackgroundVideo && (
        <video
          className="absolute inset-0 w-full h-full object-cover z-0"
          src={game.mobileBackgroundVideo}
          autoPlay
          loop
          muted
          playsInline
          style={{
            objectFit: game.mobileBackgroundFit as 'cover' | 'contain' | 'fill' | 'none',
          }}
        />
      )}
       {(game.mobileBackgroundImage || game.mobileBackgroundVideo) && <div className="absolute inset-0 bg-black/30 z-0"></div>}
       <div className="w-full max-w-md z-10 flex flex-col justify-center items-center flex-grow">
         <div className="text-center text-white mb-6">
            <h1 className="font-headline text-3xl font-bold">
              {headerTitle}
            </h1>
            {(headerSubtitle || game.registrationSubtitle) && (
                <p className="mt-2">{headerSubtitle || game.registrationSubtitle}</p>
            )}
          </div>
        <CustomerRegistrationForm gameId={game.id} />
      </div>
       <div className="w-full z-10 py-2">
          <a href="https://playapp.mansoestudiocreativo.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-white/80 hover:text-white transition-colors text-xs">
              <span className="font-semibold">Desarrollado por</span>
              <Logo className="h-4 w-auto text-white" />
          </a>
      </div>
    </div>
  );
}

import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import CustomerRegistrationForm from '@/components/game/CustomerRegistrationForm';
import Logo from '@/components/logo';
import { mergeGameTexts, extractGameTextOverrides } from '@/lib/textDefaults';

async function getGameData(id: string) {
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
  const lang = (data.language as 'es' | 'en' | 'pt') || 'es';
  const mergedTexts = mergeGameTexts(data[`texts_${lang}`] || extractGameTextOverrides(data), lang);
  return { 
    id: gameSnap.id, 
    name: data.name || "Juego sin nombre",
    language: lang,
    registrationTitle: mergedTexts.registrationTitle,
    registrationSubtitle: mergedTexts.registrationSubtitle,
    texts: mergedTexts,
    texts_es: data.texts_es || null,
    texts_en: data.texts_en || null,
    texts_pt: data.texts_pt || null,
    mobileBackgroundImage: data.mobileBackgroundImage || '',
    mobileBackgroundVideo: data.mobileBackgroundVideo || '',
    mobileBackgroundFit: data.mobileBackgroundFit || 'cover',
  };
}
