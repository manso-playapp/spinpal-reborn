'use client';

import { useState } from 'react';
import Image from 'next/image';

interface GameImageProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean;
  quality?: number;
}

export function GameImage({ 
  src, 
  alt, 
  className = '', 
  onLoad, 
  onError,
  priority = false,
  quality = 75
}: GameImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleError = () => {
    console.error(`Error loading image: ${src}`);
    setHasError(true);
    onError?.();
  };

  const handleLoad = (event: any) => {
    console.log(`Image loaded successfully: ${src}`);
    setIsLoaded(true);
    onLoad?.();
  };

  if (hasError) {
    return (
      <div 
        className={`${className} bg-gray-200 flex items-center justify-center`}
        style={{
          backgroundImage: `url("${src}")`,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'contain'
        }}
      >
        <span className="text-sm text-gray-500">Error loading image</span>
      </div>
    );
  }

  return (
    <picture className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
      <source
        srcSet={src.replace(/\.(png|jpg|jpeg)$/, '.webp')}
        type="image/webp"
      />
      <img
        src={src}
        alt={alt}
        className={className}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        onError={handleError}
        onLoad={handleLoad}
        style={{
          imageRendering: 'crisp-edges',
        }}
      />
    </picture>
  );
}
