'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface LoadingScreenProps {
  isLoading: boolean;
  onComplete?: () => void;
  duration?: number;
}

export default function LoadingScreen({ 
  isLoading, 
  onComplete, 
  duration = 2000 
}: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(isLoading);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      // Fade out animation
      const fadeOutTimer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      
      return () => clearTimeout(fadeOutTimer);
    } else {
      setIsVisible(true);
      setProgress(0);
      
      // Progress animation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            onComplete?.();
            return 100;
          }
          return prev + 2;
        });
      }, duration / 50);

      return () => clearInterval(progressInterval);
    }
  }, [isLoading, onComplete, duration]);

  if (!isVisible) return null;

  return (
    <div className={`
      fixed inset-0 z-[9999] 
      bg-white 
      transition-opacity duration-300 ease-out
      ${isLoading ? 'opacity-100' : 'opacity-0'}
    `} role="dialog" aria-label="Cargando aplicación Briki" aria-modal="true">
      <div className="h-full flex flex-col items-center justify-center">
        {/* Logo and Brand Name - Side by Side */}
        <header className="flex items-center gap-6 mb-12">
          <Image
            src="/brand/briki-logo-2.png"
            alt="Briki"
            width={80}
            height={80}
            priority
            className="animate-fade-in"
          />
          <h1 className="text-7xl font-bold text-briki-gradient font-sans animate-fade-in-delay">
            Briki
          </h1>
        </header>

        {/* Loading Progress Bar */}
        <div className="w-64 h-1 bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-label="Progreso de carga" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div 
            className="h-full bg-gradient-to-r from-[#38BDF8] via-[#0EA5E9] to-[#0284C7] rounded-full transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
