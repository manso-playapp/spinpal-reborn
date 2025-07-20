'use client';

import { useState, useEffect } from 'react';
import { Wheel } from 'react-custom-roulette';
import { Button } from '@/components/ui/button';

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
    <div className="relative flex flex-col items-center justify-center gap-8">
      <Wheel
        mustStartSpinning={mustSpin}
        prizeNumber={prizeNumber}
        data={wheelData}
        onStopSpinning={() => {
          setMustSpin(false);
          // Mostramos el premio en una alerta simple
          alert(`¡Felicidades! Ganaste: ${wheelData[prizeNumber].option}`);
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
      <Button onClick={handleSpinClick} disabled={mustSpin} size="lg">
        {mustSpin ? 'Girando...' : '¡Girar la ruleta!'}
      </Button>
    </div>
  );
}
