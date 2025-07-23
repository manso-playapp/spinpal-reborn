import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import packageJson from '../../package.json';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'PlayApp',
  description: 'El blueprint de reconstrucción definitivo.',
};

// Genera un ID de compilación corto basado en el timestamp actual
const buildId = new Date().getTime().toString(36).slice(-6);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appVersion = packageJson.version;
  const displayVersion = `v${appVersion}-${buildId}`;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@400;500;700&family=Bebas+Neue&family=DM+Sans:wght@400;500;700&family=Oswald:wght@400;500;700&family=PT+Sans+Narrow:wght@400;700&family=Roboto+Condensed:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <AuthProvider>
            {children}
            <Toaster />
            </AuthProvider>
            <div className="fixed bottom-2 right-2 bg-background/80 text-muted-foreground text-xs px-2 py-1 rounded-md shadow z-50">
            {displayVersion}
            </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
