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

const getClipPath = (angle: number) => {
  const rads = (angle * Math.PI) / 180;
  let x = 50 + 50 * Math.tan(rads);

  if (angle <= 90) {
    return `polygon(50% 50%, 50% 0, 100% 0, 100% ${x}%)`;
  }
  if (angle > 90 && angle <= 180) {
     x = 50 - 50 * Math.tan((angle - 90) * Math.PI / 180);
    return `polygon(50% 50%, 50% 0, 100% 0, 100% 100%, ${x}% 100%)`;
  }
   if (angle > 180 && angle <= 270) {
    x = 50 - 50 * Math.tan((angle - 180) * Math.PI / 180);
    return `polygon(50% 50%, 50% 0, 100% 0, 100% 100%, 0 100%, 0 ${x}%)`;
  }
  // angle > 270
  x = 50 + 50 * Math.tan((angle - 270) * Math.PI / 180);
  return `polygon(50% 50%, 50% 0, 100% 0, 100% 100%, 0 100%, 0 0, ${x}% 0)`;
};


export default function SpinningWheel({ segments: initialSegments, gameId, isDemoMode = false, config = {} }: SpinningWheelProps) {
  const [mustSpin, setMustSpin] = useState(false);
  const [rotation, setRotation] = useState(0);

  const totalProbability = useMemo(() => initialSegments.reduce((acc, seg) => acc + (seg.probability || 0), 0), [initialSegments]);
  
  const normalizedSegments = useMemo(() => {
    if (!initialSegments || initialSegments.length === 0) return [];
    if (totalProbability === 0) {
      const equalProb = 100 / initialSegments.length;
      return initialSegments.map(seg => ({ ...seg, probability: equalProb }));
    }
    return initialSegments.map(seg => ({ ...seg, probability: ((seg.probability || 0) / totalProbability) * 100 }));
  }, [initialSegments, totalProbability]);


  const getWinningSegmentIndex = useCallback(() => {
    if (normalizedSegments.length === 0) return 0;
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
    if (!mustSpin && normalizedSegments.length > 0) {
      const winningIndex = getWinningSegmentIndex();
      
      let totalAngle = 0;
      for (let i = 0; i < winningIndex; i++) {
        totalAngle += ((normalizedSegments[i].probability || 0) / 100) * 360;
      }
      
      const segmentAngle = ((normalizedSegments[winningIndex].probability || 0) / 100) * 360;
      const randomAngleWithinSegment = Math.random() * segmentAngle * 0.8 + (segmentAngle * 0.1); // Land between 10% and 90% of segment width
      
      const targetRotation = 360 - (totalAngle + randomAngleWithinSegment);
      const fullSpins = 5 * 360;
      
      setRotation(rotation + fullSpins + targetRotation);
      setMustSpin(true);

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
  };

  let accumulatedAngle = 0;

  return (
    <div className="relative flex flex-col items-center justify-center gap-8">
      <div className="roulette-container">
        <div className="roulette-pointer">
           <svg width="60" height="72" viewBox="0 0 71 85" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="pointer-gold" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{stopColor: '#FFD700', stopOpacity: 1}} />
                    <stop offset="100%" style={{stopColor: '#B8860B', stopOpacity: 1}} />
                </linearGradient>
                <filter id="pointer-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
                </filter>
            </defs>
            <path d="M35.5 84.5L70.5 35.5H0.5L35.5 84.5Z" fill="url(#pointer-gold)" filter="url(#pointer-shadow)"/>
            <circle cx="35.5" cy="35.5" r="25" fill="#F5F5DC" stroke="url(#pointer-gold)" strokeWidth="5"/>
            <circle cx="35.5" cy="35.5" r="5" fill="url(#pointer-gold)" />
            </svg>
        </div>
        <div className="roulette-wheel-container" style={wheelStyle} onTransitionEnd={() => setMustSpin(false)}>
            <div className="roulette-wheel-border" style={{
                '--outer-border-width': `${config.outerBorderWidth || 0}px`,
                '--inner-border-width': `${config.innerBorderWidth || 0}px`,
                '--outer-border-color': config.outerBorderColor,
                '--inner-border-color': config.innerBorderColor,
            } as React.CSSProperties}></div>
          {normalizedSegments.map((segment, index) => {
            const segmentAngle = 360 * ((segment.probability || 0) / 100);
            const segmentStyle = { transform: `rotate(${accumulatedAngle}deg)` };
            
            const textAngle = -(segmentAngle / 2);
            const textDistance = config.textDistance ? `${config.textDistance / 2}%` : '40%';
            
            const labelStyle: React.CSSProperties = {
                transform: `translateX(${textDistance}) rotate(${textAngle}deg)`,
                fontSize: `${config.fontSize || 16}px`,
                color: config.fontColor || '#000',
                width: '50%',
                height: '100%',
            };
            
            const pinAngle = accumulatedAngle;
            accumulatedAngle += segmentAngle;

            return (
              <React.Fragment key={index}>
                <div className="roulette-segment" style={segmentStyle}>
                    <div className="roulette-segment-inner" style={{'--segment-color': segment.color, clipPath: getClipPath(segmentAngle)} as React.CSSProperties} />
                    <div className="roulette-segment-label" style={labelStyle}>
                        <span>{segment.name}</span>
                    </div>
                </div>
                 <div className="roulette-pin" style={{ transform: `rotate(${pinAngle}deg)` }}></div>
              </React.Fragment>
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
