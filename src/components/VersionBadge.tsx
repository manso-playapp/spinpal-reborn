"use client";

import { usePathname } from 'next/navigation';

export default function VersionBadge({ text }: { text: string }) {
  const pathname = usePathname();
  // Ocultar en pantallas de TV (/juego/...) y en móviles (/jugar/...)
  const hide = pathname?.startsWith('/juego/') || pathname?.startsWith('/jugar/');
  if (hide) return null;
  return (
    <div className="fixed bottom-2 right-2 bg-background/80 text-muted-foreground text-xs px-2 py-1 rounded-md shadow z-50">
      {text}
    </div>
  );
}
