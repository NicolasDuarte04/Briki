"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SkipBack, SkipForward, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageNavigationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (pageNumber: number) => void;
  className?: string;
}

/**
 * PageNavigation Component
 * 
 * Componente de navegación directa para PDFs:
 * - Input numérico para ir a página específica
 * - Botones de primera/última página
 * - Barra de progreso visual
 * - Validación de entrada
 * 
 * Features:
 * - Enter para navegar
 * - Validación automática (rango 1-totalPages)
 * - Progreso visual con barra
 * - Atajos de teclado
 */
export function PageNavigation({
  currentPage,
  totalPages,
  onPageChange,
  className
}: PageNavigationProps) {
  const [inputValue, setInputValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Actualizar input cuando cambia la página actual
  useEffect(() => {
    if (!isFocused) {
      setInputValue(currentPage.toString());
    }
  }, [currentPage, isFocused]);

  // Calcular progreso (0-100)
  const progress = totalPages > 1 ? ((currentPage - 1) / (totalPages - 1)) * 100 : 0;

  /**
   * Manejar cambio en input
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Solo permitir números
    if (value === '' || /^\d+$/.test(value)) {
      setInputValue(value);
    }
  };

  /**
   * Manejar Enter en input
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      navigateToInputPage();
    } else if (e.key === 'Escape') {
      // Cancelar y restaurar valor actual
      setInputValue(currentPage.toString());
      inputRef.current?.blur();
    }
  };

  /**
   * Navegar a la página ingresada
   */
  const navigateToInputPage = () => {
    const pageNum = parseInt(inputValue, 10);
    
    if (isNaN(pageNum)) {
      // Si no es un número válido, restaurar valor actual
      setInputValue(currentPage.toString());
      return;
    }

    // Validar rango
    if (pageNum < 1 || pageNum > totalPages) {
      // Ajustar al rango válido
      const validPage = Math.max(1, Math.min(pageNum, totalPages));
      setInputValue(validPage.toString());
      onPageChange(validPage);
      return;
    }

    // Navegar a la página válida
    onPageChange(pageNum);
    inputRef.current?.blur();
  };

  /**
   * Navegar a primera página
   */
  const goToFirstPage = () => {
    onPageChange(1);
  };

  /**
   * Navegar a última página
   */
  const goToLastPage = () => {
    onPageChange(totalPages);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Controles de navegación */}
      <div className="flex items-center gap-2">
        {/* Botón primera página */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToFirstPage}
          disabled={currentPage === 1}
          title="Primera página"
          className="px-2"
        >
          <SkipBack className="h-3 w-3" />
        </Button>

        {/* Input de página */}
        <div className="flex items-center gap-1.5 flex-1">
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setIsFocused(true);
                inputRef.current?.select();
              }}
              onBlur={() => {
                setIsFocused(false);
                navigateToInputPage();
              }}
              className="w-14 h-8 text-center text-xs font-medium"
              placeholder={currentPage.toString()}
            />
          </div>
          
          <span className="text-xs text-muted-foreground">de</span>
          
          <span className="text-xs font-medium">{totalPages}</span>

          {/* Botón ir a página */}
          <Button
            variant="ghost"
            size="sm"
            onClick={navigateToInputPage}
            title="Ir a página"
            className="h-8 w-8 p-0"
          >
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>

        {/* Botón última página */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToLastPage}
          disabled={currentPage === totalPages}
          title="Última página"
          className="px-2"
        >
          <SkipForward className="h-3 w-3" />
        </Button>
      </div>

      {/* Barra de progreso visual */}
      <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
        
        {/* Marcador de posición actual */}
        <div
          className="absolute top-0 h-full w-0.5 bg-primary-foreground shadow-sm transition-all duration-300"
          style={{ left: `${progress}%` }}
        />
      </div>

      {/* Indicador de progreso texto */}
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Inicio</span>
        <span>{Math.round(progress)}%</span>
        <span>Fin</span>
      </div>
    </div>
  );
}

