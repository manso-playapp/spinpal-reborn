import AuthWrapper from '@/components/auth/AuthWrapper';
import EditGameForm from '@/components/admin/EditGameForm';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';

async function getGameData(id: string) {
  const gameRef = doc(db, 'games', id);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    return null;
  }

  // Asegúrate de incluir los segmentos o un array vacío si no existen
  const data = gameSnap.data();
  return { 
    id: gameSnap.id, 
    ...data,
    segments: data.segments || [], // Garantiza que segments siempre sea un array
  };
}

export default async function EditGamePage({ params }: { params: { id: string } }) {
  const game = await getGameData(params.id);

  if (!game) {
    notFound();
  }

  return (
    <AuthWrapper>
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
          <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
            <EditGameForm game={game} />
          </main>
        </div>
      </div>
    </AuthWrapper>
  );
}
