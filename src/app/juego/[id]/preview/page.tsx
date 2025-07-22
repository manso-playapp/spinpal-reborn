
// This is a special layout-less page for the iframe preview
// It now directly renders the GameClientPage which handles its own data fetching.
// This component is a Server Component that passes the gameId to the client component.
import GameClientPage from '@/components/game/GameClientPage';
import { notFound } from 'next/navigation';

export default function GamePreviewPage({ params }: { params: { id: string } }) {
    const { id } = params;

    if (!id) {
        // This is an important check to prevent rendering with an undefined ID,
        // which could cause errors in GameClientPage.
        notFound();
    }
    return <GameClientPage gameId={id} />;
}
