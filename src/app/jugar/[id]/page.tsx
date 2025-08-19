
import { redirect } from 'next/navigation';

export default function LegacyPlayerPage({ params }: { params: { id: string } }) {
  redirect(`/j/${params.id}`);
}
