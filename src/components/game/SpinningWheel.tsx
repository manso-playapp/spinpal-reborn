'use client';

import { useState, useEffect } from 'react';
import { Wheel } from 'react-custom-roulette';

interface Segment {
  name: string;
}

interface SpinningWheelProps {
  segments: Segment[];
}

const formatSegmentsForWheel = (segments: Segment[]) => {
  return segments.map((segment) => ({
    option: segment.name,
    // Aquí podrías agregar colores y otros estilos más adelante
  }));
};

export default function SpinningWheel({ segments }: SpinningWheelProps) {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [wheelData, setWheelData] = useState<{ option: string }[]>([]);

  useEffect(() => {
    // Para evitar problemas de hidratación, procesamos los segmentos en el cliente
    const formattedSegments = formatSegmentsForWheel(segments);
    setWheelData(formattedSegments);
  }, [segments]);


  // Por ahora, la ruleta no girará. Esto lo implementaremos más adelante.
  const handleSpinClick = () => {
    if (!mustSpin && wheelData.length > 0) {
      const newPrizeNumber = Math.floor(Math.random() * wheelData.length);
      setPrizeNumber(newPrizeNumber);
      setMustSpin(true);
    }
  };

  if (!wheelData.length) {
    return (
        <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">No hay premios configurados para esta ruleta.</p>
        </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center">
      <Wheel
        mustStartSpinning={mustSpin}
        prizeNumber={prizeNumber}
        data={wheelData}
        onStopSpinning={() => {
          setMustSpin(false);
          // Aquí manejaremos la lógica del premio más adelante
        }}
        backgroundColors={['#ACBFA4', '#F4F4F2', '#D3BFA8']}
        textColors={['#000000']}
        outerBorderColor={'#8A9A80'}
        outerBorderWidth={10}
        innerRadius={15}
        innerBorderColor={'#8A9A80'}
        innerBorderWidth={20}
        radiusLineColor={'#8A9A80'}
        radiusLineWidth={2}
        fontSize={16}
        textDistance={60}
      />
      {/* El botón para girar se añadirá más adelante */}
    </div>
  );
}
