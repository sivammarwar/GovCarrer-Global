import { useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  className?: string;
  containerClassName?: string;
}

export const OptimizedImage = ({ 
  src, 
  alt, 
  fallback = '/placeholder-image.png',
  className,
  containerClassName,
  ...props 
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      {/* Loading Skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      
      {/* Actual Image */}
      <img
        src={error ? fallback : src}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setError(true);
        }}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        {...props}
      />
    </div>
  );
};