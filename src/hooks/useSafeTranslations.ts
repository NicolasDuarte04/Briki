// src/hooks/useSafeTranslations.ts
import { useTranslations } from 'next-intl';

export function useSafeTranslations(namespace?: string) {
  const t = useTranslations(namespace);
  
  return {
    t: (key: string, values?: Record<string, any>, fallback?: string): string => {
      try {
        const result = t(key as any, values);
        // Si next-intl devuelve la clave literal, usamos el fallback
        if (result === key || result === `${namespace ? `${namespace}.` : ''}${key}`) {
          return fallback || key;
        }
        return result;
      } catch (error) {
        // Silenciar errores de MISSING_MESSAGE para evitar spam en consola
        if (error && typeof error === 'object' && 'code' in error && error.code === 'MISSING_MESSAGE') {
          return fallback || key;
        }
        console.warn(`[useSafeTranslations] Error resolving key "${key}":`, error);
        return fallback || key;
      }
    },
    
    tRaw: (key: string, fallback: any = []): any => {
      try {
        return t.raw(key as any);
      } catch (error) {
        // Silenciar errores de MISSING_MESSAGE para evitar spam en consola
        if (error && typeof error === 'object' && 'code' in error && error.code === 'MISSING_MESSAGE') {
          return fallback;
        }
        console.warn(`[useSafeTranslations] Error resolving raw key "${key}":`, error);
        return fallback;
      }
    }
  };
}