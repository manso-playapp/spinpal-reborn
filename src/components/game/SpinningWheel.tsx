'use client';

import { useState, useEffect, useCallback } from 'react';
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
  probability?: number;
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

const nonPrizeKeywords = ['intenta', 'suerte', 'nada', 'pierde'];

const normalizeText = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const isPrize = (option: string) => {
  const normalizedOption = normalizeText(option);
  return !nonPrizeKeywords.some(keyword => normalizedOption.includes(keyword));
};

export default function SpinningWheel({ segments, gameId, isDemoMode = false }: SpinningWheelProps) {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);

  const wheelData = formatSegmentsForWheel(segments);

  const calculatePrizeNumber = useCallback(() => {
    const probabilities = segments.map(s => s.probability);

    const definedProbabilities = probabilities.filter(p => typeof p === 'number' && p >= 0) as number[];
    const sumOfDefinedProbabilities = definedProbabilities.reduce((sum, p) => sum + p, 0);

    const segmentsWithoutProbability = probabilities.filter(p => p === undefined || p === null).length;
    
    let remainingProbability = 100 - sumOfDefinedProbabilities;
    if (remainingProbability < 0) remainingProbability = 0; // Ensure it's not negative

    const probabilityForUndefined = segmentsWithoutProbability > 0 ? remainingProbability / segmentsWithoutProbability : 0;

    const finalProbabilities = probabilities.map(p => (p === undefined || p === null) ? probabilityForUndefined : (p as number));
    
    // Normalize probabilities to ensure they sum to 100, handling potential floating point inaccuracies
    const totalProbability = finalProbabilities.reduce((sum, p) => sum + p, 0);
    const normalizedProbabilities = finalProbabilities.map(p => (p / totalProbability) * 100);

    const random = Math.random() * 100;
    let cumulativeProbability = 0;

    for (let i = 0; i < normalizedProbabilities.length; i++) {
        cumulativeProbability += normalizedProbabilities[i];
        if (random < cumulativeProbability) {
            return i;
        }
    }

    // Fallback to last segment in case of rounding errors
    return segments.length - 1;

  }, [segments]);

  useEffect(() => {
    if (!gameId || isDemoMode) return;

    const gameRef = doc(db, 'games', gameId);
    let currentSpinRequestTime: number | null = null;

    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const spinRequest = data.spinRequest;

        if (spinRequest && spinRequest.timestamp?.toMillis() !== currentSpinRequestTime) {
          currentSpinRequestTime = spinRequest.timestamp.toMillis();
          const newPrizeNumber = calculatePrizeNumber();
          setPrizeNumber(newPrizeNumber);
          setMustSpin(true);
        }
      }
    });

    return () => unsubscribe();
  }, [gameId, isDemoMode, calculatePrizeNumber]);


  const handleDemoSpin = () => {
    if (!mustSpin) {
      const newPrizeNumber = calculatePrizeNumber();
      setPrizeNumber(newPrizeNumber);
      setMustSpin(true);
    }
  };

  const handleStopSpinning = async () => {
    setMustSpin(false);
    
    if (!isDemoMode) {
        const gameRef = doc(db, 'games', gameId);
        try {
            const winningSegment = wheelData[prizeNumber];
            const updateData: { prizesAwarded?: any } = {};

            if (isPrize(winningSegment.option)) {
                updateData.prizesAwarded = increment(1);
            }
            
            await updateDoc(gameRef, { 
                ...updateData,
                spinRequest: null 
            });

        } catch (error) {
            console.error("Error updating game state after spin:", error);
        }
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
