
'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot, updateDoc, increment, deleteField, serverTimestamp } from 'firebase/firestore';
import { Button } from '../ui/button';
import { RotateCw } from 'lucide-react';
import Image from 'next/image';
import { sendPrizeNotification } from '@/ai/flows/prize-notification-flow';

interface Segment {
  id?: string;
  name: string;
  color?: string;
  isRealPrize?: boolean;
  probability?: number;
  finalProbability?: number; // Calculated probability
  // New text and icon fields
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  distanceFromCenter?: number;
  iconUrl?: string;
  iconScale?: number;
}


interface SpinningWheelProps {
  segments: Segment[];
  gameId: string;
  isDemoMode?: boolean;
  showDemoButton?: boolean;
  config?: {
    borderImage?: string;
    borderScale?: number;
    centerImage?: string;
    centerScale?: number;
  };
  onSpinEnd: (result: { name: string; isRealPrize: boolean }) => void;
}

const VIEWBOX_SIZE = 500;
const WHEEL_RADIUS = VIEWBOX_SIZE / 2;

export default function SpinningWheel({ segments: initialSegments, gameId, isDemoMode = false, showDemoButton = false, config = {}, onSpinEnd }: SpinningWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const spinRequestTimestamp = useRef<number | null>(null);
  
  const isSpinningRef = useRef(isSpinning);
  useEffect(() => {
    isSpinningRef.current = isSpinning;
  }, [isSpinning]);

  const borderImage = config?.borderImage || "";
  const centerImage = config?.centerImage || "";
  const borderScale = config?.borderScale || 1;
  const centerScale = config?.centerScale || 1;

  useEffect(() => {
    setShouldRender(true);
  }, []);

  const normalizedSegments = useMemo(() => {
    if (!initialSegments || initialSegments.length === 0) return [];

    const realPrizeSegments = initialSegments.filter(s => s.isRealPrize);
    const nonRealPrizeSegments = initialSegments.filter(s => !s.isRealPrize);
    
    const realPrizeTotalProbability = realPrizeSegments.reduce((acc, seg) => acc + (seg.probability || 0), 0);
    const remainingProbability = Math.max(0, 100 - realPrizeTotalProbability);
    
    let nonRealPrizeProb = 0;
    if (nonRealPrizeSegments.length > 0) {
        nonRealPrizeProb = remainingProbability / nonRealPrizeSegments.length;
    } else if (realPrizeTotalProbability > 0 && realPrizeTotalProbability < 100) {
        // Distribute remaining probability among real prizes if no non-real prizes exist
        const adjustment = remainingProbability / realPrizeSegments.length;
        return initialSegments.map(seg => ({
            ...seg,
            finalProbability: seg.isRealPrize ? (seg.probability || 0) + adjustment : 0
        }));
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
    
    for (let i = 0; i < normalizedSegments.length; i++) {
        accumulatedProb += (normalizedSegments[i].finalProbability || 0);
        if (random < accumulatedProb) {
            return i;
        }
    }
    return normalizedSegments.length - 1; // Fallback
  }, [normalizedSegments]);

  const handleSpinClick = useCallback(async (customerId?: string) => {
    if (isSpinningRef.current || normalizedSegments.length === 0) return;

    setIsSpinning(true);
    
    const winningIndex = getWinningSegmentIndex();
    const winningSegment = normalizedSegments[winningIndex];
    
    const segmentCount = normalizedSegments.length;
    const segmentAngle = 360 / segmentCount;
    
    const targetAngle = 360 - (winningIndex * segmentAngle + segmentAngle / 2);
    
    const fullSpins = 5 * 360;
    const newRotation = rotation + fullSpins + targetAngle;
    
    setRotation(newRotation);

    const gameRef = doc(db, 'games', gameId);
    
    // DELAY WRITING THE RESULT to create suspense on mobile
    setTimeout(() => {
        if (customerId) {
            updateDoc(gameRef, {
                lastResult: {
                    name: winningSegment.name,
                    isRealPrize: !!winningSegment.isRealPrize,
                    customerId: customerId,
                    timestamp: serverTimestamp(),
                }
            });
        }
    }, 1000); // 1 second delay

    setTimeout(async () => {
      setIsSpinning(false);
      
      try {
        await updateDoc(gameRef, { spinRequest: deleteField() });
      } catch (error) {
        console.error("DIAGNÓSTICO: ¡ERROR AL LIMPIAR spinRequest!", error);
      }
      
      onSpinEnd({ name: winningSegment.name, isRealPrize: !!winningSegment.isRealPrize });

      if (!isDemoMode && winningSegment?.isRealPrize && customerId) {
        try {
            await updateDoc(gameRef, { prizesAwarded: increment(1) });
            
            await sendPrizeNotification({
                gameId: gameId,
                customerId: customerId,
                prizeName: winningSegment.name,
            });

        } catch (error) {
            console.error("DIAGNÓSTICO: ¡ERROR al actualizar premios o notificar!", error);
        }
      }
    }, 7000); // Match transition duration

  }, [normalizedSegments, gameId, isDemoMode, getWinningSegmentIndex, rotation, onSpinEnd]);

  const spinHandlerRef = useRef(handleSpinClick);
  useEffect(() => {
    spinHandlerRef.current = handleSpinClick;
  }, [handleSpinClick]);


  useEffect(() => {
    if (!gameId || isDemoMode) return;

    const gameRef = doc(db, 'games', gameId);
    
    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const spinRequest = data.spinRequest;
        
        if (spinRequest && spinRequest.timestamp) {
            const newSpinTime = spinRequest.timestamp.toMillis();
            if (newSpinTime !== spinRequestTimestamp.current) {
                spinRequestTimestamp.current = newSpinTime;
                if (!isSpinningRef.current) {
                    spinHandlerRef.current(spinRequest.customerId);
                }
            }
        }
      }
    });
    return () => unsubscribe();
  }, [gameId, isDemoMode]);


  const wheelStyle: React.CSSProperties = {
    transition: 'transform 7s cubic-bezier(0.2, 0.8, 0.3, 1)',
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'center center',
  };

  if (!shouldRender) {
    return <div className="w-full max-w-md aspect-square bg-muted rounded-full animate-pulse" />;
  }

  const segmentCount = normalizedSegments.length;
  const segmentAngle = 360 / segmentCount;

  const getCoordinatesForAngle = (angle: number, radius: number) => {
    const x = WHEEL_RADIUS + radius * Math.cos(angle * Math.PI / 180);
    const y = WHEEL_RADIUS + radius * Math.sin(angle * Math.PI / 180);
    return [x, y];
  };

  return (
    <div className="relative flex flex-col items-center justify-center gap-8">
      <div className="relative w-full max-w-md aspect-square">
        
        {/* Layer 1: Spinning Wheel SVG (Bottom) */}
        <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 z-0" style={wheelStyle}>
              <svg viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} className="w-full h-full" style={{ transformOrigin: 'center center', transform: 'rotate(-90deg)' }}>
                <g style={{ transformOrigin: 'center center' }}>
                  {normalizedSegments.map((segment, index) => {
                    const startAngle = index * segmentAngle;
                    const endAngle = startAngle + segmentAngle;

                    const [startX, startY] = getCoordinatesForAngle(startAngle, WHEEL_RADIUS);
                    const [endX, endY] = getCoordinatesForAngle(endAngle, WHEEL_RADIUS);

                    const largeArcFlag = segmentAngle > 180 ? 1 : 0;
                    const pathData = `M ${WHEEL_RADIUS},${WHEEL_RADIUS} L ${startX},${startY} A ${WHEEL_RADIUS},${WHEEL_RADIUS} 0 ${largeArcFlag} 1 ${endX},${endY} Z`;
                    
                    const textRadius = WHEEL_RADIUS * (segment.distanceFromCenter || 0.7);
                    const textAngle = startAngle + segmentAngle / 2;
                    const textPathId = `text-path-${index}`;
                    const [textPathStartX, textPathStartY] = getCoordinatesForAngle(textAngle - (segmentAngle / 2.2), textRadius);
                    const [textPathEndX, textPathEndY] = getCoordinatesForAngle(textAngle + (segmentAngle / 2.2), textRadius);
                    const textPathData = `M ${textPathStartX},${textPathStartY} A ${textRadius},${textRadius} 0 0 1 ${textPathEndX},${textPathEndY}`;
                    
                    const nameParts = (segment.name || "").toUpperCase().split(',');

                    // Icon positioning
                    const iconAngle = textAngle * Math.PI / 180;
                    const iconRadius = textRadius * 0.6; // Position icon closer to center than text
                    const iconSize = 40 * (segment.iconScale || 1);
                    const iconX = WHEEL_RADIUS + iconRadius * Math.cos(iconAngle) - iconSize / 2;
                    const iconY = WHEEL_RADIUS + iconRadius * Math.sin(iconAngle) - iconSize / 2;
                    const iconRotation = textAngle + 90;

                    return (
                      <g key={segment.id || index}>
                        <defs>
                          <path id={textPathId} d={textPathData} />
                        </defs>
                        <path d={pathData} fill={segment.color || '#ffffff'} stroke="#000" strokeWidth="0.5" />
                        
                        {segment.iconUrl && (
                          <image
                            href={segment.iconUrl}
                            x={iconX}
                            y={iconY}
                            height={iconSize}
                            width={iconSize}
                            transform={`rotate(${iconRotation} ${iconX + iconSize/2} ${iconY + iconSize/2})`}
                          />
                        )}

                        <text 
                          fill={segment.textColor || '#FFFFFF'}
                          fontSize={segment.fontSize || 16}
                          fontFamily={segment.fontFamily || "'PT Sans', sans-serif"}
                          letterSpacing={segment.letterSpacing || 0.5}
                          style={{
                            lineHeight: segment.lineHeight || 1,
                          }}
                        >
                          <textPath href={`#${textPathId}`} startOffset="50%" textAnchor="middle">
                            {nameParts.map((part, i) => (
                              <tspan
                                key={i}
                                x="0"
                                dy={i === 0 ? '-0.3em' : `${(segment.lineHeight || 1)}em`}
                              >
                                {part.trim()}
                              </tspan>
                            ))}
                          </textPath>
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
        </div>
        
        {/* Layer 2: Border Image (Middle) */}
        {borderImage && (
            <div 
            className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
            style={{ transform: `scale(${borderScale})`}}
            >
            <Image
                src={borderImage}
                alt="Roulette Border"
                width={500}
                height={500}
                className="object-contain"
                data-ai-hint="roulette border"
                unoptimized
            />
            </div>
        )}
        
        {/* Layer 3: Center/Pointer Image (Top) */}
        {centerImage && (
            <div 
            className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center"
            style={{ transform: `scale(${centerScale})`}}
            >
            <Image
                src={centerImage}
                alt="Roulette Pointer and Center"
                width={500}
                height={500}
                className="object-contain"
                data-ai-hint="roulette pointer"
                unoptimized
            />
            </div>
        )}
      </div>

      {isDemoMode && showDemoButton && (
        <Button onClick={() => handleSpinClick()} disabled={isSpinning}>
          <RotateCw className="mr-2 h-4 w-4" />
          {isSpinning ? 'Girando...' : 'Girar en modo Demo'}
        </Button>
      )}
    </div>
  );
}
