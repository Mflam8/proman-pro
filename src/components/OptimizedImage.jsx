import React, { useState } from 'react';

export default function OptimizedImage({ 
  src, 
  alt, 
  width, 
  height, 
  className = '', 
  priority = false,
  objectFit = 'cover',
  aspectRatio = null 
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const containerStyle = aspectRatio ? {
    position: 'relative',
    width: '100%',
    paddingBottom: aspectRatio
  } : {};

  const imageStyle = aspectRatio ? {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit
  } : {
    objectFit
  };

  return (
    <div style={containerStyle} className={aspectRatio ? '' : className}>
      {!hasError ? (
        <>
          {!isLoaded && (
            <div 
              className={`${aspectRatio ? 'absolute inset-0' : 'w-full h-full'} bg-gray-200 animate-pulse`}
              style={aspectRatio ? {} : { width, height }}
            />
          )}
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={`${aspectRatio ? 'absolute inset-0' : className} ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            } transition-opacity duration-300`}
            style={imageStyle}
          />
        </>
      ) : (
        <div 
          className={`${aspectRatio ? 'absolute inset-0' : className} bg-gray-200 flex items-center justify-center`}
          style={aspectRatio ? {} : { width, height }}
        >
          <span className="text-gray-400 text-sm">Imagen no disponible</span>
        </div>
      )}
    </div>
  );
}