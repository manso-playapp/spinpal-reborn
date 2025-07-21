import type { Metadata } from 'next';
import './globals.css';
import './roulette.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import packageJson from '../../package.json';

export const metadata: Metadata = {
  title: 'SpinPal Reborn',
  description: 'El blueprint de reconstrucción definitivo.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appVersion = packageJson.version;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
        <div className="fixed bottom-2 right-2 bg-background/80 text-muted-foreground text-xs px-2 py-1 rounded-md shadow">
          v{appVersion}
        </div>
      </body>
    </html>
  );
}
