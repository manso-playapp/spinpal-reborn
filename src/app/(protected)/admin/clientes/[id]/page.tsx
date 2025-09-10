

// @ts-ignore

export default async function ClientCustomerListPage({ params }: any) {
  const awaitedParams = await params;
  const gameId = awaitedParams.id;
  const game = await getGameData(gameId);

  if (!game) {
    notFound();
  }

  return (
    <AuthWrapper clientOnly>
        <ClientLayout>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                <div className="flex items-center gap-4 mb-4">
                    <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                        <Link href="/admin/dashboard">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Volver</span>
                        </Link>
                    </Button>
                    <h1 className="font-headline text-2xl font-semibold">
                        Participantes de: <span className="font-bold">{game.name}</span>
                    </h1>
                </div>
                <CustomerList gameId={gameId} gameName={game.name} />
            </main>
      </ClientLayout>
    </AuthWrapper>
  );
}

// ... (resto del código como estaba antes)
import AuthWrapper from '@/components/auth/AuthWrapper';
import CustomerList from '@/components/admin/CustomerList';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ClientLayout } from '@/components/client/ClientLayout';

async function getGameData(id: string): Promise<{ name: string } | null> {
  if (!db) {
    console.error("Firestore (db) is not initialized in getGameData. Check Firebase configuration.");
    return null;
  }

  try {
    const gameRef = doc(db, 'games', id);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) {
        return null;
    }

    const data = gameSnap.data();
    return { name: data.name || 'Juego sin nombre' };
  } catch (error) {
    console.error("Error fetching game data:", error);
    return null;
  }
}
