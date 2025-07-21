'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { Button } from '../ui/button';
import { RotateCw } from 'lucide-react';

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
}

const VIEWBOX_SIZE = 500;
const WHEEL_RADIUS = 200;
const TEXT_RADIUS = 150;

export default function SpinningWheel({ segments: initialSegments, gameId, isDemoMode = false }: SpinningWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  const normalizedSegments = useMemo(() => {
    if (!initialSegments || initialSegments.length === 0) return [];

    const realPrizeSegments = initialSegments.filter(s => s.isRealPrize);
    const nonRealPrizeSegments = initialSegments.filter(s => !s.isRealPrize);

    const realPrizeTotalProbability = realPrizeSegments.reduce((acc, seg) => acc + (seg.probability || 0), 0);
    const remainingProbability = Math.max(0, 100 - realPrizeTotalProbability);

    const nonRealPrizeProb = nonRealPrizeSegments.length > 0 ? remainingProbability / nonRealPrizeSegments.length : 0;

    return initialSegments.map(seg => ({
      ...seg,
      finalProbability: seg.isRealPrize ? (seg.probability || 0) : nonRealPrizeProb
    }));
  }, [initialSegments]);

  const getWinningSegmentIndex = useCallback(() => {
    const random = Math.random() * 100;
    let accumulatedProb = 0;

    for (let i = 0; i < normalizedSegments.length; i++) {
      accumulatedProb += normalizedSegments[i].finalProbability || 0;
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

    // Angle to the middle of the winning segment
    const targetAngle = 360 - (winningIndex * segmentAngle + segmentAngle / 2);

    const fullSpins = 5 * 360;
    const finalRotation = fullSpins + targetAngle;

    setRotation(prev => prev + finalRotation);

    if (!isDemoMode) {
      const winningSegment = normalizedSegments[winningIndex];
      if (winningSegment && winningSegment.isRealPrize) {
        const gameRef = doc(db, 'games', gameId);
        updateDoc(gameRef, { prizesAwarded: increment(1) }).catch(console.error);
      }
    }
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
  };

  const segmentCount = normalizedSegments.length;
  const segmentAngle = 360 / segmentCount;

  // Function to calculate point on a circle
  const getCoordinatesForAngle = (angle: number, radius: number) => {
    const x = VIEWBOX_SIZE / 2 + radius * Math.cos(angle * Math.PI / 180);
    const y = VIEWBOX_SIZE / 2 + radius * Math.sin(angle * Math.PI / 180);
    return [x, y];
  };

  return (
    <div className="relative flex flex-col items-center justify-center gap-8">
      <svg
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        className="w-full max-w-md"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <defs>
          <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>
           <radialGradient id="center-pin-gradient">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="30%" stopColor="#F0E68C" />
            <stop offset="100%" stopColor="#B8860B" />
          </radialGradient>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#000000" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Outer Border */}
        <circle cx={VIEWBOX_SIZE / 2} cy={VIEWBOX_SIZE / 2} r={VIEWBOX_SIZE/2 - 5} fill="url(#gold-gradient)" filter="url(#shadow)" />
        <circle cx={VIEWBOX_SIZE / 2} cy={VIEWBOX_SIZE / 2} r={VIEWBOX_SIZE/2 - 20} fill="#F0E68C" />

        <g style={wheelStyle} onTransitionEnd={() => setIsSpinning(false)}>
          {normalizedSegments.map((segment, index) => {
            const startAngle = index * segmentAngle;
            const endAngle = startAngle + segmentAngle;

            const [startX, startY] = getCoordinatesForAngle(startAngle, WHEEL_RADIUS);
            const [endX, endY] = getCoordinatesForAngle(endAngle, WHEEL_RADIUS);

            const largeArcFlag = segmentAngle > 180 ? 1 : 0;
            const pathData = `M ${VIEWBOX_SIZE / 2},${VIEWBOX_SIZE / 2} L ${startX},${startY} A ${WHEEL_RADIUS},${WHEEL_RADIUS} 0 ${largeArcFlag} 1 ${endX},${endY} Z`;

            // For text path
            const textAngleStart = startAngle;
            const textAngleEnd = endAngle;
            const [textStartX, textStartY] = getCoordinatesForAngle(textAngleStart, TEXT_RADIUS);
            const [textEndX, textEndY] = getCoordinatesForAngle(textAngleEnd, TEXT_RADIUS);
            
            const textPathId = `text-path-${index}`;
            const textPathData = `M ${textStartX},${textStartY} A ${TEXT_RADIUS},${TEXT_RADIUS} 0 0 1 ${textEndX},${textEndY}`;

            return (
              <g key={index}>
                <defs>
                    <path id={textPathId} d={textPathData} />
                </defs>
                <path d={pathData} fill={segment.color || '#ffffff'} stroke="#BDB76B" strokeWidth="2" />
                <text fill="#000" fontSize="16" fontWeight="600" textAnchor="middle">
                    <textPath href={`#${textPathId}`} startOffset="50%">
                        {segment.name}
                    </textPath>
                </text>
              </g>
            );
          })}
        </g>
        
         {/* Separator Pins */}
        {normalizedSegments.map((_, index) => {
            const angle = index * segmentAngle;
            const [x, y] = getCoordinatesForAngle(angle, WHEEL_RADIUS);
            return (
                <circle key={`pin-${index}`} cx={x} cy={y} r="5" fill="url(#gold-gradient)" />
            )
        })}

        {/* Center Pin */}
        <circle cx={VIEWBOX_SIZE / 2} cy={VIEWBOX_SIZE / 2} r="30" fill="url(#center-pin-gradient)" />
        <circle cx={VIEWBOX_SIZE / 2} cy={VIEWBOX_SIZE / 2} r="25" fill="url(#gold-gradient)" />

        {/* Pointer */}
        <path d={`M ${VIEWBOX_SIZE / 2 - 20} 5 L ${VIEWBOX_SIZE / 2 + 20} 5 L ${VIEWBOX_SIZE / 2} 55 Z`} fill="url(#gold-gradient)" filter="url(#shadow)" />
      </svg>

      {isDemoMode && (
        <Button onClick={handleSpinClick} disabled={isSpinning}>
          <RotateCw className="mr-2 h-4 w-4" />
          {isSpinning ? 'Girando...' : 'Girar en modo Demo'}
        </Button>
      )}
    </div>
  );
}
