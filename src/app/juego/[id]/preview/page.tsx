
import GameClientPage from '@/components/game/GameClientPage';

// This is a special layout-less page for the iframe preview
export default function GamePreviewPage({ params }: { params: { id: string } }) {
  return <GameClientPage gameId={params.id} />;
}
