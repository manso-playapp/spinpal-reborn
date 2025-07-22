

'use client';

import GameClientPage from '@/components/game/GameClientPage';
import { notFound } from 'next/navigation';

// This is a special layout-less page for the iframe preview
// It now directly renders the GameClientPage which handles its own data fetching.
export default function GamePreviewPage({ params }: { params: { id: string } }) {
    if (!params.id) {
        // This is an important check to prevent rendering with an undefined ID,
        // which could cause errors in GameClientPage.
        notFound();
    }
    return <GameClientPage gameId={params.id} />;
}
