'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { Button } from '../ui/button';
import { RotateCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Segment {
  name: string;
  probability?: number;
  color?: string;
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

const WheelPointer = () => (
    <svg className="roulette-pointer" viewBox="0 0 100 140">
        <defs>
            <linearGradient id="pointer-gold" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: '#fdeec9', stopOpacity: 1}} />
                <stop offset="100%" style={{stopColor: '#c5a02d', stopOpacity: 1}} />
            </linearGradient>
            <linearGradient id="pointer-wood" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: '#8c4205', stopOpacity: 1}} />
                <stop offset="100%" style={{stopColor: '#592a02', stopOpacity: 1}} />
            </linearGradient>
        </defs>
        <path d="M50 0 L10 50 C10 50, 0 110, 50 140 C100 110, 90 50, 90 50 Z" fill="url(#pointer-wood)" />
        <path d="M50 10 L20 55 C20 55, 10 105, 50 130 C90 105, 80 55, 80 55 Z" stroke="#c5a02d" strokeWidth="3" fill="transparent" />
        <circle cx="50" cy="50" r="25" fill="url(#pointer-gold)" stroke="#8c6a0c" strokeWidth="3" />
    </svg>
);

const GoldPin = () => (
    <svg viewBox="0 0 10 10">
        <circle cx="5" cy="5" r="4" fill="url(#pointer-gold)" />
    </svg>
)

export default function SpinningWheel({ segments, gameId, isDemoMode = false }: SpinningWheelProps) {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  const segmentCount = useMemo(() => segments.length, [segments]);
  const segmentAngle = useMemo(() => 360 / segmentCount, [segmentCount]);

  const calculatePrizeNumber = useCallback(() => {
    // This logic remains the same
    const probabilities = segments.map(s => s.probability);
    const definedProbabilities = probabilities.filter(p => typeof p === 'number' && p >= 0) as number[];
    const sumOfDefinedProbabilities = definedProbabilities.reduce((sum, p) => sum + p, 0);
    const segmentsWithoutProbability = probabilities.filter(p => p === undefined || p === null).length;
    let remainingProbability = 100 - sumOfDefinedProbabilities;
    if (remainingProbability < 0) remainingProbability = 0;
    const probabilityForUndefined = segmentsWithoutProbability > 0 ? remainingProbability / segmentsWithoutProbability : 0;
    const finalProbabilities = probabilities.map(p => (p === undefined || p === null) ? probabilityForUndefined : (p as number));
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
    return segments.length - 1;
  }, [segments]);

  const spin = useCallback(() => {
      const newPrizeNumber = calculatePrizeNumber();
      setPrizeNumber(newPrizeNumber);

      const baseRotation = 360 * 5; // 5 full spins
      const prizeAngle = newPrizeNumber * segmentAngle;
      const randomOffset = Math.random() * (segmentAngle * 0.8) + (segmentAngle * 0.1); // Land somewhere within the segment
      const newRotation = baseRotation + (360 - prizeAngle) - randomOffset;
      
      setRotation(prev => prev + newRotation);
      setIsSpinning(true);
      
      setTimeout(() => {
        setIsSpinning(false);
        handleStopSpinning(newPrizeNumber);
      }, 7000); // Must match transition duration in CSS
  }, [calculatePrizeNumber, segmentAngle]);

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
          if(!isSpinning) {
            spin();
          }
        }
      }
    });
    return () => unsubscribe();
  }, [gameId, isDemoMode, spin, isSpinning]);


  const handleDemoSpin = () => {
    if (!isSpinning) {
      spin();
    }
  };

  const handleStopSpinning = async (stoppedPrizeNumber: number) => {
    if (!isDemoMode) {
        const gameRef = doc(db, 'games', gameId);
        try {
            const winningSegment = segments[stoppedPrizeNumber];
            const updateData: { prizesAwarded?: any } = {};

            if (isPrize(winningSegment.name)) {
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

  if (!segments || segments.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Skeleton className="w-[400px] h-[400px] rounded-full" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center gap-8">
      <div className="roulette-container">
        <WheelPointer />
        <div 
            className="roulette-wheel-container" 
            style={{ transform: `rotate(${rotation}deg)` }}
        >
          <ul className="roulette-wheel">
            {segments.map((segment, index) => {
                const rotation = segmentAngle * index;
                const textRotation = segmentAngle / 2;
                return (
                    <li 
                        key={index}
                        className="roulette-segment"
                        style={{ 
                            transform: `rotate(${rotation}deg)`,
                            background: segment.color || '#cccccc' 
                        }}
                    >
                        <span 
                            className="roulette-segment-label"
                            style={{ transform: `rotate(${textRotation}deg)`}}
                        >
                            {segment.name}
                        </span>
                    </li>
                );
            })}
          </ul>
          {segments.map((_, index) => {
              const lightAngle = (segmentAngle * index) * (Math.PI / 180);
              const radius = 188; // half of container width minus padding/border
              const x = radius * Math.cos(lightAngle) + radius;
              const y = radius * Math.sin(lightAngle) + radius;
              return (
                  <div 
                      key={`light-${index}`} 
                      className="roulette-light" 
                      style={{ 
                          top: `${y}px`, 
                          left: `${x}px`, 
                          transform: 'translate(-50%, -50%)' 
                      }}
                  />
              );
          })}
          {segments.map((_, index) => {
              const pinAngle = segmentAngle * index + segmentAngle / 2;
              const radius = 150;
              return (
                  <div
                    key={`pin-${index}`}
                    className="roulette-pin"
                    style={{
                        transform: `translate(-50%, -50%) rotate(${pinAngle}deg) translateX(${radius}px)`
                    }}
                  >
                      <GoldPin />
                  </div>
              )
          })}
        </div>
        <div className="roulette-center"></div>
      </div>
      {isDemoMode && (
        <Button onClick={handleDemoSpin} disabled={isSpinning}>
          <RotateCw className="mr-2 h-4 w-4" />
          {isSpinning ? 'Girando...' : 'Girar en modo Demo'}
        </Button>
      )}
    </div>
  );
}
