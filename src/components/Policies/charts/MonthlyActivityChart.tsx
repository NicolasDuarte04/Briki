// src/components/Policies/charts/MonthlyActivityChart.tsx
"use client";

import React from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

// Dynamically import ReactApexChart to avoid SSR issues
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Cargando gráfica...</div>
    </div>
  ),
});

interface MonthlyData {
  month: string;
  count: number;
  year: number;
}

interface MonthlyActivityChartProps {
  data: MonthlyData[];
  currentMonthCount: number;
  previousMonthCount: number;
  currentMonthName: string;
  previousMonthName: string;
}

export function MonthlyActivityChart({
  data,
  currentMonthCount,
  previousMonthCount,
  currentMonthName,
  previousMonthName,
}: MonthlyActivityChartProps) {
  const percentChange = previousMonthCount > 0
    ? Math.round(((currentMonthCount - previousMonthCount) / previousMonthCount) * 100)
    : currentMonthCount > 0 ? 100 : 0;

  const options: ApexOptions = {
    chart: {
      fontFamily: "inherit",
      type: "bar",
      height: 280,
      toolbar: { show: false },
      sparkline: { enabled: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "60%",
        borderRadius: 6,
        borderRadiusApplication: "end",
      },
    },
    colors: ["hsl(var(--primary))"],
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val.toString(),
      offsetY: -20,
      style: {
        fontSize: "12px",
        colors: ["hsl(var(--muted-foreground))"],
      },
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: data.map((d) => d.month),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          fontSize: "12px",
          colors: "hsl(var(--muted-foreground))",
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
          colors: "hsl(var(--muted-foreground))",
        },
      },
    },
    fill: {
      opacity: 1,
      type: "gradient",
      gradient: {
        shade: "light",
        type: "vertical",
        shadeIntensity: 0.25,
        opacityFrom: 1,
        opacityTo: 0.85,
        stops: [0, 100],
      },
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val} pólizas`,
      },
    },
    grid: {
      borderColor: "hsl(var(--border))",
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
  };

  const series = [
    {
      name: "Pólizas",
      data: data.map((d) => d.count),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Actividad por Mes
            </CardTitle>
            <CardDescription>Pólizas analizadas en los últimos 6 meses</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{currentMonthCount}</p>
            <p className="text-xs text-muted-foreground">en {currentMonthName}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Chart */}
        <div className="w-full">
          <ReactApexChart
            options={options}
            series={series}
            type="bar"
            height={280}
          />
        </div>

        {/* Comparison Footer */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <div className="flex items-center gap-2">
            {percentChange >= 0 ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">+{percentChange}%</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">{percentChange}%</span>
              </div>
            )}
            <span className="text-sm text-muted-foreground">vs mes anterior</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {previousMonthCount} pólizas en {previousMonthName}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
