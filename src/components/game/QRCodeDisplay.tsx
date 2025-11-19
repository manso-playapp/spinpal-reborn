'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode.react';
import { Skeleton } from '../ui/skeleton';

export default function QRCodeDisplay({ gameId, scale = 1 }: { gameId: string; scale?: number }) {
  const qrSize = 256 * scale;
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    // Evita diferencia SSR/CSR; calcula la URL en el siguiente frame
    const frame = requestAnimationFrame(() => {
      const origin = window.location.origin;
      setUrl(`${origin}/jugar/${gameId}`);
    });
    return () => cancelAnimationFrame(frame);
  }, [gameId]);

  if (!url) {
    return <Skeleton className="bg-gray-300" style={{ height: qrSize, width: qrSize }} />;
  }

  return (
    <div className="bg-white p-2 rounded-lg shadow-inner inline-block">
      <QRCode
        value={url}
        size={qrSize - 16 * scale}
        level="H"
        includeMargin
      />
    </div>
  );
}
