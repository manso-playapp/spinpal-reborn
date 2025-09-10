import type { Metadata } from 'next';
import './globals.css';
import { format } from 'date-fns';
import VersionBadge from '@/components/VersionBadge';
import { Providers } from './providers';
import { Poppins, PT_Sans, Bebas_Neue } from 'next/font/google';
const bebas = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bebas',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-poppins',
});

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
});



export const metadata: Metadata = {
  title: 'SpinPal Reborn',
  description: 'Aplicación de ruleta de premios interactiva.',
};

// Genera un ID de compilación numérico basado en la fecha y hora YYMMDDHHMM
const buildId = format(new Date(), 'yyMMddHHmm');


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const displayVersion = `Build: ${buildId}`;

  return (
    <html lang="es" suppressHydrationWarning>
  <body className={`${poppins.variable} ${ptSans.variable} ${bebas.variable}`}>
        <Providers>
          {children}
        </Providers>
        <VersionBadge text={displayVersion} />
      </body>
    </html>
  );
}
