'use client';

import QRCode from 'qrcode.react';
import { Skeleton } from '../ui/skeleton';

export default function QRCodeDisplay({ gameId, scale = 1 }: { gameId: string; scale?: number }) {
  const qrSize = 256 * scale;
  const origin = typeof window !== 'undefined' ? window.location.origin : null;
  const url = origin ? `${origin}/jugar/${gameId}` : '';

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
