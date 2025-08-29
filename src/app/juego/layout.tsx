import { PublicProviders } from './providers';
import { FirebasePublicProvider } from '@/context/FirebasePublicContext';

export default function JuegoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebasePublicProvider>
      <PublicProviders>
        {children}
      </PublicProviders>
    </FirebasePublicProvider>
  );
}
