'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import LoadingScreen from './LoadingScreen';

interface LoadingContextType {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

interface LoadingProviderProps {
  children: ReactNode;
}

export default function LoadingProvider({ children }: LoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial app loading simulation
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const startLoading = () => setIsLoading(true);
  const stopLoading = () => setIsLoading(false);

  const value = {
    isLoading,
    startLoading,
    stopLoading,
  };

  return (
    <LoadingContext.Provider value={value}>
      <LoadingScreen isLoading={isLoading} />
      {children}
    </LoadingContext.Provider>
  );
}
