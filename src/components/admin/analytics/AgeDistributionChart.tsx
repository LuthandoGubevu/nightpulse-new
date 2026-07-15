
"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface AgeDistributionChartProps {
  data: { name: string; percent: number }[]; // Example: { name: "18-24", percent: 32.5 }
}

const chartConfig = {
  percent: {
    label: "% of Visitors",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function AgeDistributionChart({ data }: AgeDistributionChartProps) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-72 text-muted-foreground">No age data available yet.</div>;
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={40}
            tickFormatter={(value) => `${value}%`}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" formatter={(value) => [`${value}%`, "Share"]} />}
          />
          <Bar dataKey="percent" fill="var(--color-percent)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
