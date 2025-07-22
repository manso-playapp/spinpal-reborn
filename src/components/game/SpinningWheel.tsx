
'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot, updateDoc, deleteField } from 'firebase/firestore';
import Image from 'next/image';

interface Segment {
  id?: string;
  name: string;
  color?: string;
  isRealPrize?: boolean;
  probability?: number;
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
  onSpinEnd: (result: { name: string; isRealPrize: boolean }) => void;
  isDemoMode?: boolean;
  config?: {
    borderImage?: string;
    borderScale?: number;
    centerImage?: string;
    centerScale?: number;
  };
}

const VIEWBOX_SIZE = 500;
const WHEEL_RADIUS = VIEWBOX_SIZE / 2;
// The pointer is at the top, which is 270 degrees in a standard cartesian plane (0 at 3 o'clock).
const POINTER_ANGLE = 270;

export default function SpinningWheel({ segments: initialSegments, gameId, onSpinEnd, isDemoMode = false, config = {} }: SpinningWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [winningSegmentId, setWinningSegmentId] = useState<string | null>(null);
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

  const segments = useMemo(() => initialSegments, [initialSegments]);

  const handleSpinClick = useCallback(async (spinRequestData) => {
    if (isSpinningRef.current || !segments || segments.length === 0) return;
  
    const { winningId } = spinRequestData;
    const winningIndex = segments.findIndex(s => s.id === winningId);
    
    if (winningIndex === -1) {
        console.error("Error: Winning segment ID not found in the current segments array.", spinRequestData);
        const gameRef = doc(db, 'games', gameId);
        await updateDoc(gameRef, { spinRequest: deleteField() });
        return;
    }
    
    const winningSegment = segments[winningIndex];
  
    setIsSpinning(true);
    
    const segmentCount = segments.length;
    const segmentAngle = 360 / segmentCount;
    
    // Calculate the middle angle of the winning segment.
    const winningSegmentMiddleAngle = (winningIndex * segmentAngle) + (segmentAngle / 2);

    // Calculate the rotation needed to align the middle of the winning segment with the pointer.
    // We subtract from POINTER_ANGLE to align correctly.
    const angleToAlign = POINTER_ANGLE - winningSegmentMiddleAngle;

    // Add a random number of full spins for variety.
    const fullSpins = (6 + Math.random() * 2) * 360; 
  
    // The final rotation is the current rotation plus the new spin distance.
    const finalRotation = rotation + fullSpins + angleToAlign;
    
    setRotation(finalRotation);
  
    const gameRef = doc(db, 'games', gameId);
    
    setTimeout(async () => {
      // Announce winner visually by blinking, which now happens after the spin.
      setWinningSegmentId(winningId);
  
      setIsSpinning(false);
      onSpinEnd({ name: winningSegment.name, isRealPrize: !!winningSegment.isRealPrize });
  
      // Clean up the spin request.
      try {
        await updateDoc(gameRef, { spinRequest: deleteField() });
      } catch (error) {
        console.error("Error cleaning up spinRequest field:", error);
      }
       // Stop blinking after a few seconds.
      setTimeout(() => {
        setWinningSegmentId(null);
      }, 4000); 
  
    }, 7000); // This duration must match the CSS transition duration for a smooth stop.
  
  }, [segments, gameId, onSpinEnd, rotation]);

  const spinHandlerRef = useRef(handleSpinClick);
  useEffect(() => {
    spinHandlerRef.current = handleSpinClick;
  }, [handleSpinClick]);


  useEffect(() => {
    if (isDemoMode) return; // Do not listen for spins in demo/preview mode

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
                    spinHandlerRef.current(spinRequest);
                }
            }
        }
      }
    });
    return () => unsubscribe();
  }, [gameId, isDemoMode]);


  const wheelStyle: React.CSSProperties = {
    transition: 'transform 7s cubic-bezier(0.1, 0.5, 0.2, 1)',
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'center center',
  };

  if (!shouldRender || !segments) {
    return <div className="w-full max-w-md aspect-square bg-muted rounded-full animate-pulse" />;
  }

  const segmentCount = segments.length;
  if (segmentCount === 0) return null;
  const segmentAngle = 360 / segmentCount;

  const getCoordinatesForAngle = (angle: number, radius: number) => {
    const x = WHEEL_RADIUS + radius * Math.cos(angle * Math.PI / 180);
    const y = WHEEL_RADIUS + radius * Math.sin(angle * Math.PI / 180);
    return [x, y];
  };

  return (
    <div className="relative flex flex-col items-center justify-center gap-8">
      <div className="relative w-full max-w-md aspect-square">
        <style>
            {`
            @keyframes blink-winner {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }
            .blinking-winner {
                animation: blink-winner 0.5s infinite;
            }
            `}
        </style>
        
        {/* Layer 1: Spinning Wheel SVG (Bottom) */}
        <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 z-0" style={wheelStyle}>
              <svg viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} className="w-full h-full" style={{ transformOrigin: 'center center' }}>
                <g style={{ transformOrigin: 'center center' }}>
                  {segments.map((segment, index) => {
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
                      <g key={segment.id || index} className={winningSegmentId === segment.id ? 'blinking-winner' : ''}>
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
    </div>
  );
}
