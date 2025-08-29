'use client';

import { useState, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({ src, alt, className = '', onLoad, onError }: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Actualizar el src si cambia externamente
    setImageSrc(src);
  }, [src]);

  const handleError = () => {
    console.error(`Error loading image: ${imageSrc}`);
    setHasError(true);
    
    // Intenta usar la URL directa si hay un error
    if (imageSrc.includes('mansoestudiocreativo.com')) {
      const newSrc = imageSrc.replace('http://', 'https://');
      console.log('Trying with HTTPS:', newSrc);
      setImageSrc(newSrc);
    }
    
    onError?.();
  };

  const handleLoad = () => {
    console.log(`Image loaded successfully:`, imageSrc);
    onLoad?.();
  };

  return (
    <>
      <img
        src={imageSrc}
        alt={alt}
        className={className}
        onError={handleError}
        onLoad={handleLoad}
        loading="eager"
        decoding="sync"
        crossOrigin="anonymous"
        style={{
          objectFit: 'contain',
          imageRendering: 'crisp-edges',
        }}
      />
      {hasError && (
        <div
          className={`${className} bg-transparent flex items-center justify-center`}
          style={{
            backgroundImage: `url("${imageSrc}")`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
          }}
        />
      )}
    </>
  );
}
