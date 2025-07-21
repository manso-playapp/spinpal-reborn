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

interface WheelConfig {
  outerBorderColor?: string;
  outerBorderWidth?: number;
  innerBorderColor?: string;
  innerBorderWidth?: number;
  radiusLineColor?: string;
  radiusLineWidth?: number;
  fontColor?: string;
  fontSize?: number;
  textDistance?: number;
}

interface SpinningWheelProps {
  segments: Segment[];
  gameId: string;
  isDemoMode?: boolean;
  config?: WheelConfig;
}

// Function to calculate the coordinates for the clip-path polygon
const getClipPath = (angle: number) => {
    const rads = (angle * Math.PI) / 180;
    const x = 50 + 50 * Math.tan(rads);
    if (angle <= 90) {
        return `polygon(50% 50%, 100% 0, 100% ${x}%)`;
    }
    if (angle <= 180) {
        return `polygon(50% 50%, 100% 0, 100% 100%, ${100 - x}% 100%)`;
    }
    if (angle <= 270) {
        return `polygon(50% 50%, 100% 0, 100% 100%, 0 100%, 0 ${100 - x}%)`;
    }
    return `polygon(50% 50%, 100% 0, 100% 100%, 0 100%, 0 0, ${x}% 0)`;
};


export default function SpinningWheel({ segments: initialSegments, gameId, isDemoMode = false, config = {} }: SpinningWheelProps) {
  const [mustSpin, setMustSpin] = useState(false);
  const [rotation, setRotation] = useState(0);

  const totalProbability = useMemo(() => initialSegments.reduce((acc, seg) => acc + (seg.probability || 0), 0), [initialSegments]);
  
  const normalizedSegments = useMemo(() => {
    if (totalProbability === 0) {
      // If no probabilities, distribute equally
      const equalProb = 100 / initialSegments.length;
      return initialSegments.map(seg => ({ ...seg, probability: equalProb }));
    }
    // Normalize probabilities to sum to 100
    return initialSegments.map(seg => ({ ...seg, probability: ((seg.probability || 0) / totalProbability) * 100 }));
  }, [initialSegments, totalProbability]);


  const getWinningSegmentIndex = useCallback(() => {
    const random = Math.random() * 100;
    let accumulatedProb = 0;
    for (let i = 0; i < normalizedSegments.length; i++) {
        accumulatedProb += normalizedSegments[i].probability || 0;
        if (random < accumulatedProb) {
            return i;
        }
    }
    return normalizedSegments.length - 1;
  }, [normalizedSegments]);
  
  
  const handleSpinClick = useCallback(() => {
    if (!mustSpin) {
      const winningIndex = getWinningSegmentIndex();
      
      let totalAngle = 0;
      for (let i = 0; i < winningIndex; i++) {
        totalAngle += (normalizedSegments[i].probability / 100) * 360;
      }
      
      const segmentAngle = (normalizedSegments[winningIndex].probability / 100) * 360;
      const randomAngleWithinSegment = Math.random() * segmentAngle;
      
      const targetRotation = 360 - (totalAngle + randomAngleWithinSegment);
      const fullSpins = 5 * 360;
      
      setRotation(rotation + fullSpins + targetRotation);
      setMustSpin(true);

      // After spin, check if it was a real prize and update firestore
       if (!isDemoMode) {
        const winningSegment = initialSegments[winningIndex];
        if (winningSegment && winningSegment.isRealPrize) {
          const gameRef = doc(db, 'games', gameId);
          updateDoc(gameRef, { prizesAwarded: increment(1) }).catch(console.error);
        }
      }
    }
  }, [mustSpin, normalizedSegments, rotation, getWinningSegmentIndex, isDemoMode, gameId, initialSegments]);


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
  

  const wheelStyle: React.CSSProperties = {
    transform: `rotate(${rotation}deg)`,
    borderColor: config.outerBorderColor,
    borderWidth: `${config.outerBorderWidth || 0}px`,
    borderStyle: 'solid',
    boxShadow: `inset 0 0 0 ${config.innerBorderWidth || 0}px ${config.innerBorderColor || 'transparent'}`,
  };

  let accumulatedAngle = 0;

  return (
    <div className="relative flex flex-col items-center justify-center gap-8">
      <div className="roulette-container">
        <div className="roulette-pointer">
          <svg viewBox="0 0 55 66" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M54.1223 27.5001C54.1223 42.6877 42.6877 54.1224 27.5 54.1224C12.3122 54.1224 0.877563 42.6877 0.877563 27.5001C0.877563 12.3123 12.3122 0.877686 27.5 0.877686C42.6877 0.877686 54.1223 12.3123 54.1223 27.5001Z" fill="#F0F0F0" />
            <path d="M27.5 65.1251L54.5 27.6251H0.5L27.5 65.1251Z" className="roulette-pointer-body" />
          </svg>
        </div>
        <div 
            className="roulette-wheel-container" 
            style={wheelStyle}
            onTransitionEnd={() => setMustSpin(false)}
        >
          {normalizedSegments.map((segment, index) => {
            const segmentAngle = 360 * (segment.probability / 100);
            const segmentStyle = {
              transform: `rotate(${accumulatedAngle}deg)`,
            };
            
            const textAngle = -(segmentAngle / 2);
            const textDistance = config.textDistance ? `${config.textDistance / 2}%` : '40%';
            
            const labelStyle: React.CSSProperties = {
                transform: `translateX(${textDistance}) rotate(${textAngle}deg)`,
                fontSize: `${config.fontSize || 16}px`,
                color: config.fontColor || '#000',
                width: '50%',
                height: '100%',
            };

            const innerStyle: React.CSSProperties = {
                '--segment-color': segment.color,
                clipPath: getClipPath(segmentAngle),
            } as React.CSSProperties;

            const currentAccumulatedAngle = accumulatedAngle;
            accumulatedAngle += segmentAngle;

            return (
              <div key={index} className="roulette-segment" style={segmentStyle}>
                 <div className="roulette-segment-inner" style={innerStyle} />
                 <div style={{
                     position: 'absolute',
                     width: '100%',
                     height: '100%',
                     borderLeft: `${config.radiusLineWidth || 0}px solid ${config.radiusLineColor || 'transparent'}`,
                     boxSizing: 'border-box'
                 }}/>
                <div className="roulette-segment-label" style={labelStyle}>
                  <span>{segment.name}</span>
                </div>
              </div>
            );
          })}
           <div className="roulette-center"></div>
        </div>
      </div>
      {isDemoMode && (
        <Button onClick={handleSpinClick} disabled={mustSpin}>
          <RotateCw className="mr-2 h-4 w-4" />
          {mustSpin ? 'Girando...' : 'Girar en modo Demo'}
        </Button>
      )}
    </div>
  );
}
