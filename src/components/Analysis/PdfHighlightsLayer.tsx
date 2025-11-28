"use client";

import React, { useMemo } from 'react';
import { PolicyPageReference } from '@/lib/types';
import {
    detectCoordinateSystem,
    convertCoordinatesToPixels,
    TextCoordinate,
    CoordinateSystemInfo
} from '@/lib/pdf/coordinateUtils';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface PdfHighlightsLayerProps {
    references: PolicyPageReference[];
    pageNumber: number;
    pageDimensions: { width: number; height: number } | null;
    scale: number;
    selectedFieldName?: string | null; // ✅ NUEVO
}

export function PdfHighlightsLayer({
    references,
    pageNumber,
    pageDimensions,
    scale,
    selectedFieldName // ✅ NUEVO
}: PdfHighlightsLayerProps) {
    // 1. Detectar sistema de coordenadas basado en TODAS las referencias
    // Esto asegura una detección más robusta que hacerlo solo por página
    const systemInfo = useMemo<CoordinateSystemInfo>(() => {
        const allCoords: TextCoordinate[] = references
            .filter(ref => ref.boundingBox)
            .map(ref => ({
                text: ref.fieldName, // Dummy text
                page: ref.pageNumber,
                x: ref.boundingBox!.x,
                y: ref.boundingBox!.y,
                width: ref.boundingBox!.width,
                height: ref.boundingBox!.height
            }));

        return detectCoordinateSystem(allCoords);
    }, [references]);

    // 2. Filtrar referencias de la página actual
    const pageReferences = useMemo(() => {
        return references.filter(ref => ref.pageNumber === pageNumber && ref.boundingBox);
    }, [references, pageNumber]);

    if (!pageDimensions || pageReferences.length === 0) {
        return null;
    }

    return (
        <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
                width: pageDimensions.width,
                height: pageDimensions.height
            }}
        >
            <TooltipProvider>
                {pageReferences.map((ref) => {
                    if (!ref.boundingBox) return null;

                    // 3. Convertir coordenadas a píxeles web
                    const pixelBox = convertCoordinatesToPixels(
                        ref.boundingBox,
                        systemInfo,
                        pageDimensions
                    );

                    const isSelected = ref.fieldName === selectedFieldName; // ✅ NUEVO

                    return (
                        <Tooltip key={ref.id}>
                            <TooltipTrigger asChild>
                                <div
                                    className={cn(
                                        "absolute border-2 transition-colors cursor-pointer pointer-events-auto rounded-sm",
                                        "animate-in fade-in duration-300",
                                        // ✅ Estilos condicionales
                                        isSelected
                                            ? "border-yellow-500 bg-yellow-500/30 ring-2 ring-yellow-500 z-20"
                                            : "border-primary/50 bg-primary/10 hover:bg-primary/20 z-10"
                                    )}
                                    style={{
                                        left: pixelBox.x,
                                        top: pixelBox.y,
                                        width: pixelBox.width,
                                        height: pixelBox.height,
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        console.log('🎯 Highlight clicked:', ref.fieldName);
                                        // TODO: Scroll to finding in list
                                    }}
                                />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                <p className="font-semibold">{ref.fieldName}</p>
                                <p className="text-xs text-muted-foreground">
                                    Confianza: {(ref.confidence * 100).toFixed(0)}%
                                </p>
                                {ref.fieldValue && (
                                    <p className="text-xs mt-1 border-t pt-1 max-w-[200px] truncate">
                                        {ref.fieldValue}
                                    </p>
                                )}
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </TooltipProvider>
        </div>
    );
}
