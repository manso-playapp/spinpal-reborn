
'use client';

import React, { useState } from 'react';

const createPieces = () =>
  Array.from({ length: 150 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 100,
    angle: Math.random() * 360,
    speed: 5 + Math.random() * 5,
    rotationSpeed: (Math.random() - 0.5) * 10,
    color: `hsl(${Math.random() * 360}, 90%, 60%)`,
    size: 5 + Math.random() * 5,
    delay: Math.random() * 2,
  }));

const Confetti = () => {
  const [pieces] = useState(createPieces);

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
            top: 0,
            width: `${piece.size}px`,
            height: `${piece.size * 1.5}px`,
            backgroundColor: piece.color,
            animation: `fall ${piece.speed}s linear infinite`,
            animationDelay: `${piece.delay}s`,
            transform: `rotate(${piece.angle}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes fall {
          to {
            transform: translateY(110vh) rotate(720deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Confetti;
