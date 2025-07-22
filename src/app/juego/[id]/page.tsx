import GameClientPage from '@/components/game/GameClientPage';

export default function GamePage({ params }: { params: { id: string } }) {
  return <GameClientPage gameId={params.id} />;
}
