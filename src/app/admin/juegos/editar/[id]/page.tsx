// Eliminamos CUALQUIER importación de PageProps
// Eliminamos CUALQUIER definición local de CustomPageProps

import AuthWrapper from '@/components/auth/AuthWrapper';
import EditGameForm from '@/components/admin/EditGameForm';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';

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
  
  // Convertimos el objeto a una cadena JSON y luego de vuelta a un objeto
  // Esto elimina cualquier tipo de dato complejo como los Timestamps de Firebase
  const serializableData = JSON.parse(JSON.stringify({ id: gameSnap.id, ...data }));

  // Aseguramos que los segmentos sean siempre un array
  serializableData.segments = serializableData.segments || [];

  return serializableData;
}

// **CORRECCIÓN FINAL AQUÍ:** Tipamos directamente los props esperados por el componente de página.
export default async function EditGamePage({ params }: { params: { id: string } }) {
  const gameId = params.id;
  const game = await getGameData(gameId);

  if (!game) {
    notFound();
  }

  return (
    <AuthWrapper>
      <AdminLayout>
        <EditGameForm game={game} />
      </AdminLayout>
    </AuthWrapper>
  );
}
