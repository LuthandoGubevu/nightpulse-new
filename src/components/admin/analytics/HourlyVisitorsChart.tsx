
"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

interface HourlyVisitorsChartProps {
  data: { name: string; visitors: number }[]; // Example: { name: "10:00", visitors: 150 }
}

const chartConfig = {
  visitors: {
    label: "Visitors",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function HourlyVisitorsChart({ data }: HourlyVisitorsChartProps) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-72 text-muted-foreground">No hourly data available.</div>;
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="name" 
            tickLine={false} 
            axisLine={false} 
            tickMargin={8} 
            // interval={2} // Show every 2 hours for less clutter
            // tickFormatter={(value) => value.substring(0, 2)}
          />
          <YAxis 
            tickLine={false} 
            axisLine={false} 
            tickMargin={8}
            width={30}
          />
           <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Legend />
          <Bar dataKey="visitors" fill="var(--color-visitors)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
