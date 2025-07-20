'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode.react';
import { Skeleton } from '../ui/skeleton';

export default function QRCodeDisplay({ gameId }: { gameId: string }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    // Nos aseguramos de que este código solo se ejecute en el cliente
    // donde window.location.origin está disponible.
    const playerUrl = `${window.location.origin}/jugar/${gameId}`;
    setUrl(playerUrl);
  }, [gameId]);

  if (!url) {
    // Muestra un esqueleto de carga mientras se determina la URL
    return <Skeleton className="h-[256px] w-[256px]" />;
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-inner">
      <QRCode
        value={url}
        size={256}
        level="H"
        includeMargin={true}
      />
    </div>
  );
}
