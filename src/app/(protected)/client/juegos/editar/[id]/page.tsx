
// Añadir @ts-ignore y tipar params como any
// @ts-ignore
export default async function ClientEditGamePage({ params }: any) {
  const gameId = params.id;
  const game = await getGameData(gameId);

  if (!game) {
    notFound();
  }

  return (
    <AuthWrapper clientOnly>
      <ClientLayout>
        <EditGameForm game={game} />
      </ClientLayout>
    </AuthWrapper>
  );
}

// ... (resto del código como estaba antes)
import AuthWrapper from '@/components/auth/AuthWrapper';
import EditGameForm from '@/components/admin/EditGameForm';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { ClientLayout } from '@/components/client/ClientLayout';

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
  
  const serializableData = JSON.parse(JSON.stringify({ id: gameSnap.id, ...data }));

  serializableData.segments = serializableData.segments || [];

  return serializableData;
}
