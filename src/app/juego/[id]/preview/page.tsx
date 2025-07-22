
'use client';

import { useState, useEffect } from 'react';
import GameClientPage from '@/components/game/GameClientPage';

// This is a special layout-less page for the iframe preview
export default function GamePreviewPage({ params }: { params: { id: string } }) {
    const [previewData, setPreviewData] = useState(null);

    useEffect(() => {
        const handleStorageChange = () => {
            const data = localStorage.getItem(`game-preview-${params.id}`);
            if (data) {
                setPreviewData(JSON.parse(data));
            }
        };

        // Initial load
        handleStorageChange();

        // Listen for updates from the parent form
        const handlePreviewUpdate = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail.gameId === params.id) {
                handleStorageChange();
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('previewUpdate', handlePreviewUpdate);


        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('previewUpdate', handlePreviewUpdate);
        };
    }, [params.id]);

    if (!previewData) {
        // You can return a loader here, or just the original GameClientPage
        // which will fetch its own data. This is a fallback.
        return <GameClientPage gameId={params.id} isPreview={true} />;
    }
    
    // Pass the preview data to the GameClientPage
    return <GameClientPage gameId={params.id} isPreview={true} initialData={previewData} />;
}
