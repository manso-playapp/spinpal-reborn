'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { Button } from '../ui/button';
import { RotateCw } from 'lucide-react';

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
  isDemoMode?: boolean;
}

const formatSegmentsForWheel = (segments: Segment[]) => {
  if (!segments || segments.length === 0) {
    return [{ option: 'Premio?' }];
  }
  return segments.map((segment) => ({
    option: segment.name,
  }));
};

// Palabras clave para identificar un segmento que NO es un premio
const nonPrizeKeywords = ['intenta', 'suerte', 'nada', 'pierde'];

const normalizeText = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Eliminar acentos
};

const isPrize = (option: string) => {
  const normalizedOption = normalizeText(option);
  return !nonPrizeKeywords.some(keyword => normalizedOption.includes(keyword));
};

export default function SpinningWheel({ segments, gameId, isDemoMode = false }: SpinningWheelProps) {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);

  const wheelData = formatSegmentsForWheel(segments);

  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(db, 'games', gameId);
    let currentSpinRequestTime: number | null = null;

    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const spinRequest = data.spinRequest;

        // Check for a new spin request
        if (spinRequest && spinRequest.timestamp?.toMillis() !== currentSpinRequestTime) {
          currentSpinRequestTime = spinRequest.timestamp.toMillis();
          const newPrizeNumber = Math.floor(Math.random() * wheelData.length);
          setPrizeNumber(newPrizeNumber);
          setMustSpin(true);
        }
      }
    });

    return () => unsubscribe();
  }, [gameId, wheelData.length]);


  const handleDemoSpin = () => {
    if (!mustSpin) {
      const newPrizeNumber = Math.floor(Math.random() * wheelData.length);
      setPrizeNumber(newPrizeNumber);
      setMustSpin(true);
    }
  };

  const handleStopSpinning = async () => {
    setMustSpin(false);
    const gameRef = doc(db, 'games', gameId);
    
    try {
      const winningSegment = wheelData[prizeNumber];
      const updateData: { spinRequest: null, prizesAwarded?: any } = { spinRequest: null };

      // Si no es un giro de demo y el segmento es un premio, incrementamos el contador
      if (!isDemoMode && isPrize(winningSegment.option)) {
        updateData.prizesAwarded = increment(1);
      }
      
      await updateDoc(gameRef, updateData);
    } catch (error) {
      console.error("Error updating game state after spin:", error);
    }
  };

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
        onStopSpinning={handleStopSpinning}
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
      {isDemoMode && (
        <Button onClick={handleDemoSpin} disabled={mustSpin}>
          <RotateCw className="mr-2 h-4 w-4" />
          Girar en modo Demo
        </Button>
      )}
    </div>
  );
}
