import AuthWrapper from '@/components/auth/AuthWrapper';
import EditGameForm from '@/components/admin/EditGameForm';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';

// Definimos una interfaz para el objeto del juego serializado
interface SerializableGame {
  id: string;
  name: string;
  status: 'activo' | 'demo';
  segments: { name: string }[];
  // Añadimos cualquier otro campo que pueda venir de Firestore
  [key: string]: any;
}

async function getGameData(id: string): Promise<SerializableGame | null> {
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
