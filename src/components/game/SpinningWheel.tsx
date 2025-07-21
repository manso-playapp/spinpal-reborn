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
  config?: any;
}

const VIEWBOX_SIZE = 500;
const WHEEL_RADIUS = 180;
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
    const random = Math.random() * 100;
    let accumulatedProb = 0;
    
    // Handle floating point inaccuracies
    const totalProb = normalizedSegments.reduce((sum, s) => sum + (s.finalProbability || 0), 0);
    const scaleFactor = totalProb > 0 ? 100 / totalProb : 0;

    for (let i = 0; i < normalizedSegments.length; i++) {
        accumulatedProb += (normalizedSegments[i].finalProbability || 0) * scaleFactor;
        if (random < accumulatedProb) {
            return i;
        }
    }
    // Fallback to the last segment
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
    transformOrigin: `${VIEWBOX_SIZE / 2}px ${VIEWBOX_SIZE / 2}px`,
  };

  const segmentCount = normalizedSegments.length;
  const segmentAngle = 360 / segmentCount;

  const getCoordinatesForAngle = (angle: number, radius: number) => {
    const x = VIEWBOX_SIZE / 2 + radius * Math.cos(angle * Math.PI / 180);
    const y = VIEWBOX_SIZE / 2 + radius * Math.sin(angle * Math.PI / 180);
    return [x, y];
  };

  const borderLights = Array.from({ length: 24 }, (_, i) => {
    const angle = i * 15; // 360 / 24 = 15
    const [x, y] = getCoordinatesForAngle(angle, 235); // Place on the golden border
    return <circle key={`light-${i}`} cx={x} cy={y} r="4" fill="url(#gold-radial-gradient)" />;
  });

  return (
    <div className="relative flex flex-col items-center justify-center gap-8">
      <svg
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        className="w-full max-w-md"
      >
        <defs>
          <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#FFC400" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>
           <radialGradient id="gold-radial-gradient">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="30%" stopColor="#F0E68C" />
            <stop offset="100%" stopColor="#B8860B" />
          </radialGradient>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="5" stdDeviation="8" floodColor="#000000" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Outer Border */}
        <g filter="url(#shadow)">
          <circle cx={VIEWBOX_SIZE / 2} cy={VIEWBOX_SIZE / 2} r={VIEWBOX_SIZE/2 - 5} fill="url(#gold-gradient)" />
          <circle cx={VIEWBOX_SIZE / 2} cy={VIEWBOX_SIZE / 2} r={VIEWBOX_SIZE/2 - 15} fill="#F0E68C" />
          <circle cx={VIEWBOX_SIZE / 2} cy={VIEWBOX_SIZE / 2} r={WHEEL_RADIUS + 3} fill="#BDB76B" />
        </g>
        
        {/* Lights on border */}
        {borderLights}
        
        <g style={wheelStyle} onTransitionEnd={() => setIsSpinning(false)}>
          {normalizedSegments.map((segment, index) => {
            const startAngle = index * segmentAngle - 90; // Offset by -90 to start from top
            const endAngle = startAngle + segmentAngle;

            const [startX, startY] = getCoordinatesForAngle(startAngle, WHEEL_RADIUS);
            const [endX, endY] = getCoordinatesForAngle(endAngle, WHEEL_RADIUS);

            const largeArcFlag = segmentAngle > 180 ? 1 : 0;
            const pathData = `M ${VIEWBOX_SIZE / 2},${VIEWBOX_SIZE / 2} L ${startX},${startY} A ${WHEEL_RADIUS},${WHEEL_RADIUS} 0 ${largeArcFlag} 1 ${endX},${endY} Z`;
            
            // For text path
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
        </g>
        
        {/* Pointer - Moved BEFORE center pin to be underneath */}
        <g transform={`translate(${VIEWBOX_SIZE / 2 - 20}, ${VIEWBOX_SIZE / 2 - 220})`}>
          <path d="M 20 0 L 40 40 L 0 40 Z" fill="url(#gold-gradient)" filter="url(#shadow)"/>
        </g>

        {/* Center Pin - Rendered AFTER pointer to be on top */}
        <circle cx={VIEWBOX_SIZE / 2} cy={VIEWBOX_SIZE / 2} r="35" fill="url(#gold-radial-gradient)" stroke="#B8860B" strokeWidth="2" />
        <circle cx={VIEWBOX_SIZE / 2} cy={VIEWBOX_SIZE / 2} r="30" fill="url(#gold-gradient)" />

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
