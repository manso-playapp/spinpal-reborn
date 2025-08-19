'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode.react';
import { Skeleton } from '../ui/skeleton';

export default function QRCodeDisplay({ gameId, scale = 1 }: { gameId: string, scale?: number }) {
  const [url, setUrl] = useState('');
  const qrSize = 256 * scale;

  useEffect(() => {
    // Nos aseguramos de que este código solo se ejecute en el cliente
    // donde window.location.origin está disponible.
    const playerUrl = `${window.location.origin}/jugar/${gameId}`;
    setUrl(playerUrl);
  }, [gameId]);

  if (!url) {
    // Muestra un esqueleto de carga mientras se determina la URL
    return <Skeleton className="bg-gray-300" style={{ height: qrSize, width: qrSize }} />;
  }

  return (
    <div className="bg-white p-2 rounded-lg shadow-inner inline-block">
      <QRCode
        value={url}
        size={qrSize - (16 * scale)} // Adjust padding based on scale
        level="H"
        includeMargin={true}
      />
    </div>
  );
}
