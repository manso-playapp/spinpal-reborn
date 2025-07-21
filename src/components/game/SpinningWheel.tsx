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
  if (angle <= 0 || angle >= 360) {
    return 'none';
  }
  if (angle > 180) {
     // A trick to handle angles > 180 by creating a full circle mask and then cutting out the smaller angle.
     // This is complex and might be better handled by two halves.
     // For now, let's assume segments are <= 180 degrees.
     // A simple polygon for angles > 180 won't work as it can't be concave.
     // Let's stick to a method that works for angles up to 180 for simplicity for now.
     // This part of the logic might need a more robust solution if segments can be > 180 degrees.
  }
  const rads = (angle * Math.PI) / 180;
  const x = 50 + 50 * Math.tan(rads / 2);

  // We create a triangle pointing from the center to the edge.
  return `polygon(50% 50%, 50% 0, ${x}% 0)`;
};


export default function SpinningWheel({ segments: initialSegments, gameId, isDemoMode = false, config = {} }: SpinningWheelProps) {
  const [mustSpin, setMustSpin] = useState(false);
  const [rotation, setRotation] = useState(0);

  const totalProbability = useMemo(() => {
    const realPrizeSegments = initialSegments.filter(s => s.isRealPrize);
    return realPrizeSegments.reduce((acc, seg) => acc + (seg.probability || 0), 0)
  }, [initialSegments]);
  
  const normalizedSegments = useMemo(() => {
    if (!initialSegments || initialSegments.length === 0) return [];
    
    const realPrizeSegments = initialSegments.filter(s => s.isRealPrize);
    const nonPrizeSegments = initialSegments.filter(s => !s.isRealPrize);

    if (realPrizeSegments.length === 0) {
        // If no real prizes, distribute probability equally among all
        const equalProb = 100 / initialSegments.length;
        return initialSegments.map(seg => ({ ...seg, probability: equalProb }));
    }

    if (totalProbability === 0) {
      // If real prizes exist but have no probability, distribute equally among them
      const equalProb = 100 / realPrizeSegments.length;
      return initialSegments.map(seg => 
        seg.isRealPrize ? { ...seg, probability: equalProb } : { ...seg, probability: 0 }
      );
    }
    
    // Normalize real prizes based on their probability
    return initialSegments.map(seg => {
      if (!seg.isRealPrize) return { ...seg, probability: 0 };
      return { ...seg, probability: ((seg.probability || 0) / totalProbability) * 100 };
    });

  }, [initialSegments, totalProbability]);


  const getWinningSegmentIndex = useCallback(() => {
    const realPrizeIndices = initialSegments
      .map((seg, index) => (seg.isRealPrize ? index : -1))
      .filter(index => index !== -1);

    if (realPrizeIndices.length === 0) {
      // No real prizes, spin lands on any segment equally
      return Math.floor(Math.random() * initialSegments.length);
    }

    const random = Math.random() * 100;
    let accumulatedProb = 0;
    
    for (let i = 0; i < initialSegments.length; i++) {
      const segment = normalizedSegments.find(s => s.name === initialSegments[i].name);
      if(segment && segment.isRealPrize){
        accumulatedProb += segment.probability || 0;
        if (random < accumulatedProb) {
            return i;
        }
      }
    }
    
    // Fallback to the last real prize segment
    return realPrizeIndices[realPrizeIndices.length - 1];

  }, [initialSegments, normalizedSegments]);
  
  
  const handleSpinClick = useCallback(() => {
    if (!mustSpin && initialSegments.length > 0) {
      const winningIndex = getWinningSegmentIndex();
      const segmentCount = initialSegments.length;
      
      const segmentAngle = 360 / segmentCount;
      const targetAngle = winningIndex * segmentAngle;
      
      const randomAngleWithinSegment = Math.random() * segmentAngle * 0.8 + (segmentAngle * 0.1);
      
      const finalAngle = 360 - (targetAngle + randomAngleWithinSegment);
      
      const fullSpins = 5 * 360;
      
      setRotation(rotation + fullSpins + finalAngle);
      setMustSpin(true);

       if (!isDemoMode) {
        const winningSegment = initialSegments[winningIndex];
        // Only increment prize counter if it was a "real prize"
        if (winningSegment && winningSegment.isRealPrize) {
          const gameRef = doc(db, 'games', gameId);
          updateDoc(gameRef, { prizesAwarded: increment(1) }).catch(console.error);
        }
      }
    }
  }, [mustSpin, initialSegments, rotation, getWinningSegmentIndex, isDemoMode, gameId]);


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

  const segmentAngle = 360 / (initialSegments.length || 1);

  return (
    <div className="relative flex flex-col items-center justify-center gap-8">
      <div className="roulette-container" style={{'--wheel-size': '400px'} as React.CSSProperties}>
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
          {initialSegments.map((segment, index) => {
            const currentAngle = segmentAngle * index;
            const segmentStyle = { transform: `rotate(${currentAngle}deg)` };
            
            const textAngle = -(segmentAngle / 2);
            const textDistance = config.textDistance ? `${config.textDistance}%` : '25%'; // Use percentage for responsiveness
            
            const labelStyle: React.CSSProperties = {
                transform: `translateX(${textDistance}) rotate(${textAngle}deg)`,
                fontSize: `${config.fontSize || 14}px`,
                color: config.fontColor || '#000',
                width: '50%',
                height: '100%',
            };
            
            const pinAngle = currentAngle - (segmentAngle/2);

            return (
              <React.Fragment key={index}>
                <div className="roulette-segment" style={segmentStyle}>
                    <div 
                      className="roulette-segment-inner" 
                      style={{
                        '--segment-color': segment.color, 
                        clipPath: `polygon(50% 50%, 100% 0, 100% 100%)` /* Default to half circle if calc fails */,
                        transform: `rotate(${segmentAngle}deg)`
                      }}
                    />
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
