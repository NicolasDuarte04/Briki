// src/components/Policies/charts/DistributionChart.tsx
"use client";

import React from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Users, FileText, Shield, Building2 } from "lucide-react";

// Dynamically import ReactApexChart to avoid SSR issues
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Cargando gráfica...</div>
    </div>
  ),
});

// ============================================================================
// ICON VARIANTS - Definidos internamente para evitar pasar funciones como props
// ============================================================================

type IconVariant = 'coverage' | 'insurer' | 'policy' | 'default';

const ICON_MAP: Record<IconVariant, React.ElementType> = {
  coverage: PieChart,
  insurer: Users,
  policy: Shield,
  default: FileText,
};

// ============================================================================
// TYPES
// ============================================================================

interface DistributionItem {
  label: string;
  value: number;
  percentage: number;
}

interface DistributionChartProps {
  title: string;
  /** Variant para seleccionar el icono (evita pasar funciones de Server a Client) */
  variant?: IconVariant;
  description?: string;
  items: DistributionItem[];
  type?: "donut" | "pie";
  colors?: string[];
}

const DEFAULT_COLORS = [
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#f59e0b", // amber-500
  "#ec4899", // pink-500
  "#10b981", // emerald-500
  "#f97316", // orange-500
  "#6366f1", // indigo-500
];

export function DistributionChart({
  title,
  variant = 'default',
  description,
  items,
  type = "donut",
  colors = DEFAULT_COLORS,
}: DistributionChartProps) {
  // Resolver el icono basado en el variant (evita pasar funciones como props)
  const Icon = ICON_MAP[variant];
  const series = items.map((item) => item.value);
  const labels = items.map((item) => item.label);

  const options: ApexOptions = {
    chart: {
      fontFamily: "inherit",
      type: type,
      height: 300,
    },
    colors: colors.slice(0, items.length),
    labels: labels,
    legend: {
      position: "bottom",
      horizontalAlign: "center",
      fontSize: "13px",
      markers: {
        size: 8,
        strokeWidth: 0,
        offsetX: -3,
      },
      itemMargin: {
        horizontal: 12,
        vertical: 8,
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "14px",
              fontWeight: 500,
              color: "hsl(var(--muted-foreground))",
            },
            value: {
              show: true,
              fontSize: "24px",
              fontWeight: 700,
              color: "hsl(var(--foreground))",
              formatter: (val: string) => val,
            },
            total: {
              show: true,
              label: "Total",
              fontSize: "14px",
              fontWeight: 500,
              color: "hsl(var(--muted-foreground))",
              formatter: (w) => {
                const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                return total.toString();
              },
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      y: {
        formatter: (val: number, opts: any) => {
          const percent = items[opts.seriesIndex]?.percentage || 0;
          return `${val} (${percent.toFixed(1)}%)`;
        },
      },
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["hsl(var(--background))"],
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: {
            height: 280,
          },
          legend: {
            position: "bottom",
            fontSize: "11px",
          },
        },
      },
    ],
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Sin datos disponibles
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ReactApexChart
          options={options}
          series={series}
          type={type}
          height={300}
        />
      </CardContent>
    </Card>
  );
}
