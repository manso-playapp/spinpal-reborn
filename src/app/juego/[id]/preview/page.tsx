
'use client';

import GameClientPage from '@/components/game/GameClientPage';

// This is a special layout-less page for the iframe preview
// It now directly renders the GameClientPage which handles its own data fetching.
export default function GamePreviewPage({ params }: { params: { id: string } }) {
    return <GameClientPage gameId={params.id} />;
}
