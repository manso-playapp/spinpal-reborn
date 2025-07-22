
'use client';

import React, { useEffect, useState } from 'react';

const Confetti = () => {
  const [pieces, setPieces] = useState<any[]>([]);

  useEffect(() => {
    const newPieces = Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage
      y: 100 + Math.random() * 100, // start from bottom
      angle: Math.random() * 360,
      speed: 5 + Math.random() * 5, // vertical speed
      rotationSpeed: (Math.random() - 0.5) * 10,
      color: `hsl(${Math.random() * 360}, 90%, 60%)`,
      size: 5 + Math.random() * 5,
    }));
    setPieces(newPieces);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 100,
      }}
    >
      {pieces.map((piece) => (
        <div
          key={piece.id}
          style={{
            position: 'absolute',
            left: `${piece.x}%`,
            bottom: 0,
            width: `${piece.size}px`,
            height: `${piece.size * 1.5}px`,
            backgroundColor: piece.color,
            animation: `fall ${piece.speed}s linear infinite`,
            animationDelay: `${Math.random() * 2}s`,
            transform: `rotate(${piece.angle}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes fall {
          to {
            transform: translateY(-110vh) rotate(720deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Confetti;
