'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { Button } from '../ui/button';
import { RotateCw } from 'lucide-react';
import Image from 'next/image';

interface Segment {
  name: string;
  color?: string;
  isRealPrize?: boolean;
  probability?: number;
}

interface SpinningWheelProps {
  segments: Segment[];
  gameId: string;
  isDemoMode?: boolean;
  config?: any;
}

const VIEWBOX_SIZE = 500;
const WHEEL_RADIUS = 200; // Adjusted for the image border
const TEXT_RADIUS = 150;

export default function SpinningWheel({ segments: initialSegments, gameId, isDemoMode = false, config = {} }: SpinningWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  const normalizedSegments = useMemo(() => {
    if (!initialSegments || initialSegments.length === 0) return [];

    const realPrizeSegments = initialSegments.filter(s => s.isRealPrize);
    const nonRealPrizeSegments = initialSegments.filter(s => !s.isRealPrize);
    
    const realPrizeTotalProbability = realPrizeSegments.reduce((acc, seg) => acc + (seg.probability || 0), 0);
    const remainingProbability = Math.max(0, 100 - realPrizeTotalProbability);
    
    let nonRealPrizeProb = 0;
    if (nonRealPrizeSegments.length > 0) {
        nonRealPrizeProb = remainingProbability / nonRealPrizeSegments.length;
    }

    return initialSegments.map(seg => ({
      ...seg,
      finalProbability: seg.isRealPrize ? (seg.probability || 0) : nonRealPrizeProb
    }));
  }, [initialSegments]);

  const getWinningSegmentIndex = useCallback(() => {
    if (normalizedSegments.length === 0) return 0;
    const random = Math.random() * 100;
    let accumulatedProb = 0;
    
    const totalProb = normalizedSegments.reduce((sum, s) => sum + (s.finalProbability || 0), 0);
    const scaleFactor = totalProb > 0 ? 100 / totalProb : 0;

    for (let i = 0; i < normalizedSegments.length; i++) {
        accumulatedProb += (normalizedSegments[i].finalProbability || 0) * scaleFactor;
        if (random < accumulatedProb) {
            return i;
        }
    }
    return normalizedSegments.length - 1;
  }, [normalizedSegments]);

  const handleSpinClick = useCallback(() => {
    if (isSpinning || normalizedSegments.length === 0) return;

    setIsSpinning(true);
    const winningIndex = getWinningSegmentIndex();
    const segmentCount = normalizedSegments.length;
    const segmentAngle = 360 / segmentCount;
    
    const targetAngle = 360 - (winningIndex * segmentAngle + segmentAngle / 2);

    const fullSpins = 5 * 360;
    const finalRotation = fullSpins + targetAngle;

    setRotation(prev => prev + finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      if (!isDemoMode) {
        const winningSegment = normalizedSegments[winningIndex];
        if (winningSegment && winningSegment.isRealPrize) {
          const gameRef = doc(db, 'games', gameId);
          updateDoc(gameRef, { prizesAwarded: increment(1) }).catch(console.error);
        }
      }
    }, 7000); // Match transition duration

  }, [isSpinning, normalizedSegments, gameId, isDemoMode, getWinningSegmentIndex]);

  useEffect(() => {
    if (!gameId || isDemoMode) return;

    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().spinRequest) {
        if (!isSpinning) {
          handleSpinClick();
        }
      }
    });
    return () => unsubscribe();
  }, [gameId, isDemoMode, handleSpinClick, isSpinning]);

  const wheelStyle: React.CSSProperties = {
    transition: 'transform 7s cubic-bezier(0.2, 0.8, 0.3, 1)',
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'center center',
  };

  const segmentCount = normalizedSegments.length;
  const segmentAngle = 360 / segmentCount;

  const getCoordinatesForAngle = (angle: number, radius: number) => {
    const x = VIEWBOX_SIZE / 2 + radius * Math.cos(angle * Math.PI / 180);
    const y = VIEWBOX_SIZE / 2 + radius * Math.sin(angle * Math.PI / 180);
    return [x, y];
  };

  return (
    <div className="relative flex flex-col items-center justify-center gap-8">
      <div className="relative w-full max-w-md aspect-square">
        {/* Layer 1: Border Image (Bottom) */}
        <div className="absolute inset-0 z-0">
            <Image
                src="https://placehold.co/500x500.png"
                alt="Roulette Border"
                width={500}
                height={500}
                layout="responsive"
                data-ai-hint="roulette border"
            />
        </div>

        {/* Layer 2: Spinning Segments (Middle) */}
        <div className="absolute inset-0 z-10" style={wheelStyle}>
          <svg viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} className="w-full h-full">
              {normalizedSegments.map((segment, index) => {
                const startAngle = index * segmentAngle - 90;
                const endAngle = startAngle + segmentAngle;

                const [startX, startY] = getCoordinatesForAngle(startAngle, WHEEL_RADIUS);
                const [endX, endY] = getCoordinatesForAngle(endAngle, WHEEL_RADIUS);

                const largeArcFlag = segmentAngle > 180 ? 1 : 0;
                const pathData = `M ${VIEWBOX_SIZE / 2},${VIEWBOX_SIZE / 2} L ${startX},${startY} A ${WHEEL_RADIUS},${WHEEL_RADIUS} 0 ${largeArcFlag} 1 ${endX},${endY} Z`;
                
                const textAngle = startAngle + segmentAngle / 2;
                const textPathId = `text-path-${index}`;
                const [textPathStartX, textPathStartY] = getCoordinatesForAngle(textAngle - (segmentAngle / 2.2), TEXT_RADIUS);
                const [textPathEndX, textPathEndY] = getCoordinatesForAngle(textAngle + (segmentAngle / 2.2), TEXT_RADIUS);
                const textPathData = `M ${textPathStartX},${textPathStartY} A ${TEXT_RADIUS},${TEXT_RADIUS} 0 0 1 ${textPathEndX},${textPathEndY}`;

                return (
                  <g key={index}>
                    <defs>
                      <path id={textPathId} d={textPathData} />
                    </defs>
                    <path d={pathData} fill={segment.color || '#ffffff'} stroke="#BDB76B" strokeWidth="1" />
                    <text 
                      fill="#000" 
                      fontSize="16" 
                      fontWeight="700" 
                      letterSpacing="0.5"
                      style={{ fontFamily: "'PT Sans', sans-serif" }}
                    >
                      <textPath href={`#${textPathId}`} startOffset="50%" textAnchor="middle">
                          {segment.name}
                      </textPath>
                    </text>
                  </g>
                );
              })}
          </svg>
        </div>
        
        {/* Layer 3: Center/Pointer Image (Top) */}
        <div className="absolute inset-0 z-20 pointer-events-none">
             <Image
                src="https://placehold.co/500x500.png"
                alt="Roulette Pointer and Center"
                width={500}
                height={500}
                layout="responsive"
                data-ai-hint="roulette pointer"
            />
        </div>

      </div>

      {isDemoMode && (
        <Button onClick={handleSpinClick} disabled={isSpinning}>
          <RotateCw className="mr-2 h-4 w-4" />
          {isSpinning ? 'Girando...' : 'Girar en modo Demo'}
        </Button>
      )}
    </div>
  );
}
