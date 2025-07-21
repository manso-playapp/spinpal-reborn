'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { Button } from '../ui/button';
import { RotateCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Wheel } from 'react-custom-roulette';

interface Segment {
  name: string;
}

interface SpinningWheelProps {
  segments: Segment[];
  gameId: string;
  isDemoMode?: boolean;
}

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

export default function SpinningWheel({ segments: initialSegments, gameId, isDemoMode = false }: SpinningWheelProps) {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [rouletteData, setRouletteData] = useState<{ option: string }[]>([]);

  useEffect(() => {
    const data = initialSegments.map(segment => ({ option: segment.name }));
    setRouletteData(data);
  }, [initialSegments]);

  const handleSpinClick = useCallback(() => {
    if (!mustSpin) {
      const newPrizeNumber = Math.floor(Math.random() * rouletteData.length);
      setPrizeNumber(newPrizeNumber);
      setMustSpin(true);
    }
  }, [mustSpin, rouletteData.length]);

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
          if(!mustSpin) {
            handleSpinClick();
          }
        }
      }
    });
    return () => unsubscribe();
  }, [gameId, isDemoMode, handleSpinClick, mustSpin]);

  const handleStopSpinning = async () => {
    setMustSpin(false);
    if (!isDemoMode) {
        const gameRef = doc(db, 'games', gameId);
        try {
            const winningSegment = initialSegments[prizeNumber];
            const updateData: { prizesAwarded?: any } = {};

            if (winningSegment && isPrize(winningSegment.name)) {
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

  if (!rouletteData || rouletteData.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Skeleton className="w-[400px] h-[400px] rounded-full" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center gap-8">
        <Wheel
            mustStartSpinning={mustSpin}
            prizeNumber={prizeNumber}
            data={rouletteData}
            onStopSpinning={handleStopSpinning}
        />
      {isDemoMode && (
        <Button onClick={handleSpinClick} disabled={mustSpin}>
          <RotateCw className="mr-2 h-4 w-4" />
          {mustSpin ? 'Girando...' : 'Girar en modo Demo'}
        </Button>
      )}
    </div>
  );
}
