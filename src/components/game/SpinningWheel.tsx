'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';

// Carga dinámica del componente Wheel para que solo se renderice en el cliente
const Wheel = dynamic(() => import('react-custom-roulette').then(mod => mod.Wheel), { 
  ssr: false,
  loading: () => <Skeleton className="w-[350px] h-[350px] rounded-full" /> 
});

interface Segment {
  name: string;
}

interface SpinningWheelProps {
  segments: Segment[];
  gameId: string;
}

const formatSegmentsForWheel = (segments: Segment[]) => {
  if (!segments || segments.length === 0) {
    return [];
  }
  return segments.map((segment) => ({
    option: segment.name,
  }));
};

export default function SpinningWheel({ segments, gameId }: SpinningWheelProps) {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);

  const wheelData = formatSegmentsForWheel(segments);

  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Escuchamos por un nuevo spinRequest
        if (data.spinRequest && !mustSpin) {
          const newPrizeNumber = Math.floor(Math.random() * wheelData.length);
          setPrizeNumber(newPrizeNumber);
          setMustSpin(true);
        }
      }
    });

    return () => unsubscribe();
  }, [gameId, wheelData.length, mustSpin]);


  if (!wheelData.length) {
    return (
        <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">No hay premios configurados para esta ruleta.</p>
        </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center gap-8">
      <Wheel
        mustStartSpinning={mustSpin}
        prizeNumber={prizeNumber}
        data={wheelData}
        onStopSpinning={() => {
          setMustSpin(false);
          // Opcional: limpiar el spinRequest en la base de datos después de girar
          // updateDoc(doc(db, 'games', gameId), { spinRequest: null });
        }}
        backgroundColors={['#ACBFA4', '#F4F4F2', '#D3BFA8']}
        textColors={['#000000']}
        outerBorderColor={'#8A9A80'}
        outerBorderWidth={10}
        innerRadius={15}
        innerBorderColor={'#8A9A80'}
        innerBorderWidth={20}
        radiusLineColor={'#8A9A80'}
        radiusLineWidth={2}
        fontSize={16}
        textDistance={60}
      />
      {/* El botón para girar manualmente se elimina, ahora es automático */}
    </div>
  );
}
