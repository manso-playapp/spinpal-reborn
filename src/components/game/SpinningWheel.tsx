
'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot, updateDoc, deleteField } from 'firebase/firestore';
// import { OptimizedImage } from './OptimizedImage';
import * as LucideIcons from 'lucide-react';

type IconName = keyof typeof LucideIcons;

interface Segment {
  id?: string;
  name: string;
  formalName?: string;
  color?: string;
  isRealPrize?: boolean;
  probability?: number;
  useStockControl?: boolean;
  quantity?: number | null;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  letterSpacingLineTwo?: number;
  distanceFromCenter?: number;
  iconUrl?: string;
  iconName?: string;
  iconScale?: number;
}

interface SpinningWheelProps {
  segments: Segment[];
  gameId: string;
  onSpinEnd: (result: { name: string; isRealPrize: boolean }) => void;
  isDemoMode?: boolean;
  wheelScale?: number;
  config?: {
    borderImage?: string;
    borderScale?: number;
    centerImage?: string;
    centerScale?: number;
    strokeWidth?: number;
    strokeColor?: string;
  };
}

const VIEWBOX_SIZE = 500;
const WHEEL_RADIUS = VIEWBOX_SIZE / 2;
const POINTER_ANGLE = 270;

const capitalize = (s: string) => {
    if (typeof s !== 'string' || !s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/-(\w)/g, (_, c) => c.toUpperCase());
};

export default function SpinningWheel({ segments: initialSegments, gameId, onSpinEnd, isDemoMode = false, wheelScale = 1, config = {} }: SpinningWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningSegmentId, setWinningSegmentId] = useState<string | null>(null);

  const isSpinningRef = useRef(isSpinning);
  const currentRotationRef = useRef(0);
  const spinRequestTimestamp = useRef<number | null>(null);

  useEffect(() => {
    isSpinningRef.current = isSpinning;
  }, [isSpinning]);

  const borderImage = config?.borderImage || "";
  const centerImage = config?.centerImage || "";
  const borderScale = config?.borderScale || 1;
  const centerScale = config?.centerScale || 1;
  const strokeWidth = config?.strokeWidth ?? 1;
  const strokeColor = config?.strokeColor || '#000000';

  const segments = useMemo(() => initialSegments, [initialSegments]);

  const spinTheWheel = useCallback((spinRequestData: { winningId: string; [key: string]: any }) => {
  if (isSpinningRef.current || !segments || segments.length === 0) return;

  const { winningId } = spinRequestData;
  const winningIndex = segments.findIndex(s => s.id === winningId);

  if (winningIndex === -1) {
    console.error("Error: Winning segment ID not found in the current segments array.", { spinRequestData, segments });
    if (!isDemoMode && db) {
      const gameRef = doc(db, 'games', gameId);
      updateDoc(gameRef, { spinRequest: deleteField() });
    }
    return;
  }
    
    const winningSegment = segments[winningIndex];
    
    setIsSpinning(true);
    setWinningSegmentId(null);
    
    const segmentCount = segments.length;
    const segmentAngle = 360 / segmentCount;
    
    const winningSegmentStartAngle = winningIndex * segmentAngle;
    
    const padding = 0.10; 
    const randomOffsetInSegment = (segmentAngle * padding) + (Math.random() * (segmentAngle * (1 - padding * 2)));
    
    const randomizedTargetAngle = winningSegmentStartAngle + randomOffsetInSegment;
    
    const fullSpins = (Math.floor(Math.random() * 3) + 5) * 360;
    
    const finalRotation = fullSpins + currentRotationRef.current + (POINTER_ANGLE - randomizedTargetAngle);
    
    currentRotationRef.current = finalRotation;
    setRotation(finalRotation);
  
    
    setTimeout(async () => {
      setIsSpinning(false);
      const prizeNameToDisplay = winningSegment.formalName || winningSegment.name;
      onSpinEnd({ name: prizeNameToDisplay, isRealPrize: !!winningSegment.isRealPrize });
      setWinningSegmentId(winningId);
  
      if (!isDemoMode && db) {
          try {
            const gameRef = doc(db, 'games', gameId);
            await updateDoc(gameRef, { spinRequest: deleteField() });
          } catch (error) {
            console.error("Error cleaning up spinRequest field:", error);
          }
      }

      setTimeout(() => {
        setWinningSegmentId(null);
      }, 4000); 
  
    }, 10000);
  
  }, [segments, gameId, onSpinEnd, isDemoMode]);

  const spinHandlerRef = useRef(spinTheWheel);
  useEffect(() => {
    spinHandlerRef.current = spinTheWheel;
  }, [spinTheWheel]);
  
  useEffect(() => {
    // Si no hay db, seguimos mostrando la ruleta en modo estático
    if (!db) {
      console.warn('Firebase DB no disponible, ruleta en modo estático');
      return;
    }

    const gameRef = doc(db, 'games', gameId);

    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const spinRequest = data.spinRequest;

        if (spinRequest && spinRequest.timestamp) {
            const newSpinTime = spinRequest.timestamp.toMillis();
            if (newSpinTime !== spinRequestTimestamp.current && !isSpinningRef.current) {
                spinRequestTimestamp.current = newSpinTime;
                spinHandlerRef.current(spinRequest);
            }
        }
      }
    });
    return () => unsubscribe();
  }, [gameId]);


  const wheelStyle: React.CSSProperties = {
    transition: isSpinning ? 'transform 10s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none',
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'center center',
  };

  if (!segments) {
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
      <div className="relative w-full max-w-md aspect-square" style={{ transform: `scale(${wheelScale})` }}>
        <style>
            {`
            @keyframes blink-winner {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }
            .blinking-winner {
                animation: blink-winner 0.5s infinite;
            }
            .wheel-image {
              position: absolute;
              inset: 0;
              width: 100%;
              height: 100%;
              background-position: center;
              background-repeat: no-repeat;
              background-size: contain;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
              transform: translate3d(0, 0, 0);
              pointer-events: none;
            }
            `}
        </style>
        
        <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 z-0" style={wheelStyle}>
              <svg viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} className="w-full h-full" style={{ 
                transformOrigin: 'center center',
                shapeRendering: 'geometricPrecision',
                textRendering: 'geometricPrecision'
              }}>
                <g style={{ transformOrigin: 'center center' }}>
                  {segments.map((segment, index) => {
                    if (!segment.name || typeof segment.name !== 'string') return null;
                    const startAngle = index * segmentAngle;
                    const endAngle = startAngle + segmentAngle;

                    const [startX, startY] = getCoordinatesForAngle(startAngle, WHEEL_RADIUS);
                    const [endX, endY] = getCoordinatesForAngle(endAngle, WHEEL_RADIUS);

                    const largeArcFlag = segmentAngle > 180 ? 1 : 0;
                    const pathData = `M ${WHEEL_RADIUS},${WHEEL_RADIUS} L ${startX},${startY} A ${WHEEL_RADIUS},${WHEEL_RADIUS} 0 ${largeArcFlag} 1 ${endX},${endY} Z`;
                    
                    const textRadius = WHEEL_RADIUS * (segment.distanceFromCenter || 0.7);
                    const textAngle = startAngle + segmentAngle / 2;
                    const textPathId = `text-path-${segment.id || index}`;
                    
                    const textArcAngle = Math.min(segmentAngle, 90) * 0.9; 
                    const [textPathStartX, textPathStartY] = getCoordinatesForAngle(textAngle - textArcAngle / 2, textRadius);
                    const [textPathEndX, textPathEndY] = getCoordinatesForAngle(textAngle + textArcAngle / 2, textRadius);
                    const textPathData = `M ${textPathStartX},${textPathStartY} A ${textRadius},${textRadius} 0 0 1 ${textPathEndX},${textPathEndY}`;

                    const nameParts = (segment.name || "").toUpperCase().split(',');

                    // Position icon relative to text
                    const iconDistanceFactor = 0.6; // How far the icon is from the text (0.6 = 60% of text radius)
                    const iconRadius = textRadius * iconDistanceFactor;
                    const iconSize = 40 * (segment.iconScale || 1);
                    const iconAngleRad = textAngle * Math.PI / 180;
                    const iconX = WHEEL_RADIUS + iconRadius * Math.cos(iconAngleRad) - iconSize / 2;
                    const iconY = WHEEL_RADIUS + iconRadius * Math.sin(iconAngleRad) - iconSize / 2;
                    const iconRotation = textAngle + 90;

                    const [straightTextX, straightTextY] = getCoordinatesForAngle(textAngle, textRadius);

                    const iconName = segment.iconName ? capitalize(segment.iconName) as IconName : null;

                    const IconComponent = (iconName && LucideIcons[iconName]) ? (LucideIcons[iconName] as React.ElementType) : null;

                    return (
                      <g key={segment.id || index} className={winningSegmentId === segment.id ? 'blinking-winner' : ''}>
                        <defs>
                          <path id={textPathId} d={textPathData} />
                        </defs>
                        <path d={pathData} fill={segment.color || '#ffffff'} stroke={strokeColor} strokeWidth={strokeWidth} />
                        
                        {segment.iconUrl ? (
                          <foreignObject
                            x={iconX}
                            y={iconY}
                            width={iconSize}
                            height={iconSize}
                            transform={`rotate(${iconRotation} ${iconX + iconSize/2} ${iconY + iconSize/2})`}
                          >
                            <div className="w-full h-full" style={{
                              backgroundImage: `url(${segment.iconUrl})`,
                              backgroundSize: 'contain',
                              backgroundPosition: 'center',
                              backgroundRepeat: 'no-repeat',
                              imageOrientation: 'from-image',
                              transform: 'rotate(90deg)'
                            }} />
                          </foreignObject>
                        ) : (
                          IconComponent ? (
                            <foreignObject
                              x={iconX}
                              y={iconY}
                              width={iconSize}
                              height={iconSize}
                              transform={`rotate(${iconRotation} ${iconX + iconSize/2} ${iconY + iconSize/2})`}
                            >
                              <IconComponent
                                color={segment.textColor || '#FFFFFF'}
                                strokeWidth={2}
                                style={{ width: '100%', height: '100%' }}
                              />
                            </foreignObject>
                          ) : null
                        )}

                        <text 
                          fill={segment.textColor || '#FFFFFF'}
                          fontSize={segment.fontSize || 16}
                          fontFamily={segment.fontFamily || 'var(--font-bebas), Bebas Neue, cursive'}
                          style={{
                            lineHeight: segment.lineHeight || 1,
                            letterSpacing: segment.letterSpacing || 0.5,
                            paintOrder: 'stroke',
                            stroke: 'none',
                            fontSmooth: 'always',
                            textRendering: 'geometricPrecision'
                          }}
                          transform={`rotate(${textAngle + 90} ${straightTextX} ${straightTextY})`}
                          x={straightTextX}
                          y={straightTextY}
                          textAnchor="middle"
                        >
                          {nameParts.map((part, i) => (
                            <tspan
                              key={i}
                              x={straightTextX}
                              dy={i === 0 ? '0em' : `${(segment.lineHeight || 1)}em`}
                              style={ i > 0 ? { 
                                letterSpacing: segment.letterSpacingLineTwo ?? ((segment.letterSpacing || 0.5) * 1.1) 
                              } : {}}
                            >
                              {part.trim()}
                            </tspan>
                          ))}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
        </div>
        
        {borderImage && (
            <div 
              className="wheel-image z-10"
              style={{ 
                transform: `scale(${borderScale})`,
                backgroundImage: `url(${borderImage})`
              }}
            />
        )}
        
        {centerImage && (
            <div 
              className="wheel-image z-20"
              style={{ 
                transform: `scale(${centerScale})`,
                backgroundImage: `url(${centerImage})`
              }}
            />
        )}
      </div>
    </div>
  );
}
