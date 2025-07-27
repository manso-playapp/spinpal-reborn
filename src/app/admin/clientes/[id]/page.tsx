

import AuthWrapper from '@/components/auth/AuthWrapper';
import CustomerList from '@/components/admin/CustomerList';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';

async function getGameData(id: string): Promise<{ name: string } | null> {
  const gameRef = doc(db, 'games', id);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    return null;
  }

  const data = gameSnap.data();
  return { name: data.name || 'Juego sin nombre' };
}

interface CustomerListPageProps {
  params: { id: string };
}

export default async function CustomerListPage({ params }: CustomerListPageProps) {
  const game = await getGameData(params.id);

  if (!game) {
    notFound();
  }

  return (
    <AuthWrapper>
        <AdminLayout>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                <div className="flex items-center gap-4 mb-4">
                    <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                        <Link href="/admin">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Volver</span>
                        </Link>
                    </Button>
                    <h1 className="font-headline text-2xl font-semibold">
                        Participantes de: <span className="font-bold">{game.name}</span>
                    </h1>
                </div>
                <CustomerList gameId={params.id} gameName={game.name}/>
            </main>
      </AdminLayout>
    </AuthWrapper>
  );
}
