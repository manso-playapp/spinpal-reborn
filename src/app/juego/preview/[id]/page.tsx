
'use client';

import GameClientPage from '@/components/game/GameClientPage';

// This is a special layout-less page for the iframe preview
export default function GamePreviewPage({ params }: { params: { id: string } }) {
    // This page no longer uses localStorage.
    // It will be rendered by the parent EditGameForm and passed data via props.
    // For standalone access (which shouldn't happen), it will fetch from Firestore.
    return <GameClientPage gameId={params.id} isPreview={true} />;
}
