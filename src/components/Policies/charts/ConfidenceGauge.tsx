// src/components/Policies/charts/ConfidenceGauge.tsx
"use client";

import React from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Target, TrendingUp, TrendingDown } from "lucide-react";

// Dynamically import ReactApexChart to avoid SSR issues
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Cargando gráfica...</div>
    </div>
  ),
});

interface ConfidenceGaugeProps {
  avgConfidence: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  total: number;
}

export function ConfidenceGauge({
  avgConfidence,
  highCount,
  mediumCount,
  lowCount,
  total,
}: ConfidenceGaugeProps) {
  // Determine color based on confidence level
  const getColor = () => {
    if (avgConfidence >= 80) return "#22c55e"; // green-500
    if (avgConfidence >= 50) return "#f59e0b"; // amber-500
    return "#ef4444"; // red-500
  };

  const series = [avgConfidence];
  
  const options: ApexOptions = {
    colors: [getColor()],
    chart: {
      fontFamily: "inherit",
      type: "radialBar",
      height: 250,
      sparkline: { enabled: true },
    },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        hollow: {
          size: "70%",
        },
        track: {
          background: "hsl(var(--muted))",
          strokeWidth: "100%",
          margin: 5,
        },
        dataLabels: {
          name: {
            show: true,
            fontSize: "14px",
            fontWeight: 500,
            color: "hsl(var(--muted-foreground))",
            offsetY: 20,
          },
          value: {
            fontSize: "32px",
            fontWeight: 700,
            color: "hsl(var(--foreground))",
            offsetY: -20,
            formatter: (val: number) => `${val.toFixed(0)}%`,
          },
        },
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "horizontal",
        shadeIntensity: 0.5,
        colorStops: [
          { offset: 0, color: getColor(), opacity: 1 },
          { offset: 100, color: getColor(), opacity: 0.8 },
        ],
      },
    },
    stroke: {
      lineCap: "round",
    },
    labels: ["Confianza Promedio"],
  };

  const highPercent = total > 0 ? ((highCount / total) * 100).toFixed(0) : "0";
  const mediumPercent = total > 0 ? ((mediumCount / total) * 100).toFixed(0) : "0";
  const lowPercent = total > 0 ? ((lowCount / total) * 100).toFixed(0) : "0";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5" />
          Confianza de Extracción
        </CardTitle>
        <CardDescription>Precisión promedio del análisis de IA</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Radial Chart */}
        <div className="flex justify-center">
          <ReactApexChart
            options={options}
            series={series}
            type="radialBar"
            height={250}
          />
        </div>

        {/* Status Badge */}
        <div className="flex justify-center -mt-4 mb-4">
          {avgConfidence >= 80 ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium dark:bg-green-900/30 dark:text-green-400">
              <TrendingUp className="h-3 w-3" />
              Excelente
            </span>
          ) : avgConfidence >= 50 ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium dark:bg-amber-900/30 dark:text-amber-400">
              Aceptable
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium dark:bg-red-900/30 dark:text-red-400">
              <TrendingDown className="h-3 w-3" />
              Requiere revisión
            </span>
          )}
        </div>

        {/* Distribution Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">Alta</span>
            </div>
            <p className="text-xl font-semibold">{highCount}</p>
            <p className="text-xs text-muted-foreground">{highPercent}%</p>
          </div>
          <div className="text-center border-x">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-xs text-muted-foreground">Media</span>
            </div>
            <p className="text-xl font-semibold">{mediumCount}</p>
            <p className="text-xs text-muted-foreground">{mediumPercent}%</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">Baja</span>
            </div>
            <p className="text-xl font-semibold">{lowCount}</p>
            <p className="text-xs text-muted-foreground">{lowPercent}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
