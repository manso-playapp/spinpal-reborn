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
  isRealPrize?: boolean;
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

export default function SpinningWheel({ segments: initialSegments, gameId, isDemoMode = false }: SpinningWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  const segments = useMemo(() => {
    const totalProb = initialSegments.reduce((sum, s) => sum + (s.probability || 0), 0);
    if (totalProb <= 0) {
      const equalProb = 100 / initialSegments.length;
      return initialSegments.map(s => ({ ...s, probability: equalProb }));
    }
    if (Math.abs(totalProb - 100) > 0.01) {
        const scale = 100 / totalProb;
        return initialSegments.map(s => ({...s, probability: (s.probability || 0) * scale}));
    }
    return initialSegments;
  }, [initialSegments]);

  const wheelData = useMemo(() => {
    let cumulativeAngle = 0;
    const segmentsWithAngles = segments.map(segment => {
        const angle = (segment.probability || 0) * 3.6; // 1% = 3.6 degrees
        const startAngle = cumulativeAngle;
        cumulativeAngle += angle;
        const endAngle = cumulativeAngle;
        return { ...segment, angle, startAngle, endAngle };
    });

    return {
        segments: segmentsWithAngles,
        pins: segmentsWithAngles.map(s => s.endAngle),
    };
  }, [segments]);

  const calculatePrizeNumber = useCallback(() => {
    const random = Math.random() * 100;
    let cumulativeProbability = 0;
    for (let i = 0; i < segments.length; i++) {
        cumulativeProbability += (segments[i].probability || 0);
        if (random < cumulativeProbability) {
            return i;
        }
    }
    return segments.length - 1;
  }, [segments]);

  const spin = useCallback(() => {
      const newPrizeNumber = calculatePrizeNumber();
      const winningSegment = wheelData.segments[newPrizeNumber];

      const baseRotation = 360 * 7; 
      const middleOfSegment = winningSegment.startAngle + (winningSegment.angle / 2);
      
      const pointerCorrection = 90; // The pointer is at the top (90 deg), not at the right (0 deg)
      const randomOffset = (Math.random() - 0.5) * winningSegment.angle * 0.8;
      
      const targetRotation = 360 - (middleOfSegment + randomOffset) + pointerCorrection;
      
      const newRotation = baseRotation + targetRotation;
      
      setRotation(prev => prev + newRotation);
      setIsSpinning(true);
      
      setTimeout(() => {
        setIsSpinning(false);
        handleStopSpinning(newPrizeNumber);
      }, 7000);
  }, [calculatePrizeNumber, wheelData.segments]);

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

  if (!segments || segments.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Skeleton className="w-[400px] h-[400px] rounded-full" />
      </div>
    );
  }
  
  function getSegmentClipPath(angle: number) {
      if (angle > 180) {
        return 'polygon(50% 50%, 0% 0%, 100% 0, 100% 100%, 0% 100%)';
      }
      const rad = (angle * Math.PI) / 180;
      const x = 50 + 50 * Math.tan(rad - Math.PI / 2);
      return `polygon(50% 50%, 50% 0, ${x}% 0)`;
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
            {wheelData.segments.map((segment, index) => {
                const textRotation = segment.angle / 2;
                const clipPath = getSegmentClipPath(segment.angle);
                
                return (
                    <li 
                        key={index}
                        className="roulette-segment"
                        style={{ 
                            transform: `rotate(${segment.startAngle}deg)`,
                            clipPath: clipPath,
                            background: `radial-gradient(circle at 50% 100%, ${segment.color}BF, ${segment.color})`
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
          {wheelData.segments.map((_, index) => {
              const lightAngle = (index * (360 / wheelData.segments.length)) * (Math.PI / 180);
              const radius = 188;
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
          {wheelData.pins.map((pinAngle, index) => {
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
