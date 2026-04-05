import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CountryFlagProps {
  emoji?: string | null;
  countryName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-5xl',
  xl: 'text-6xl',
};

export const CountryFlag = ({ 
  emoji, 
  countryName, 
  size = 'md',
  className 
}: CountryFlagProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={cn("relative inline-block", className)}>
      {/* Loading State */}
      {!isLoaded && (
        <div className={cn(
          "bg-gray-200 rounded-full animate-pulse",
          size === 'sm' && "w-8 h-8",
          size === 'md' && "w-12 h-12",
          size === 'lg' && "w-16 h-16",
          size === 'xl' && "w-20 h-20"
        )} />
      )}
      
      {/* Flag Emoji */}
      <span 
        className={cn(
          sizeClasses[size],
          !isLoaded && "hidden",
          "transition-opacity duration-300"
        )}
        onLoad={() => setIsLoaded(true)}
        role="img"
        aria-label={`${countryName} flag`}
      >
        {emoji || '🏳️'}
      </span>
    </div>
  );
};