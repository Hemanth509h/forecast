import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { format, parseISO } from "date-fns";
import type { Sale, Forecast } from "@shared/schema";

interface SalesChartProps {
  salesData?: Sale[];
  forecastData?: Forecast[];
  isLoading: boolean;
}

export function SalesChart({ salesData = [], forecastData = [], isLoading }: SalesChartProps) {
  const chartData = useMemo(() => {
    // Combine and sort data
    const salesPoints = salesData.map(s => ({
      date: new Date(s.date).getTime(),
      displayDate: format(new Date(s.date), 'MMM yyyy'),
      amount: Number(s.amount),
      type: 'historical'
    }));

    const forecastPoints = forecastData.map(f => ({
      date: new Date(f.forecastDate).getTime(),
      displayDate: format(new Date(f.forecastDate), 'MMM yyyy'),
      forecast: Number(f.predictedAmount),
      type: 'forecast'
    }));

    // Create a unified timeline map
    const timeline = new Map();
    
    salesPoints.forEach(p => {
      const key = p.displayDate;
      if (!timeline.has(key)) timeline.set(key, { name: key, originalDate: p.date });
      timeline.get(key).amount = (timeline.get(key).amount || 0) + p.amount;
    });

    forecastPoints.forEach(p => {
      const key = p.displayDate;
      if (!timeline.has(key)) timeline.set(key, { name: key, originalDate: p.date });
      timeline.get(key).forecast = p.forecast;
    });

    return Array.from(timeline.values()).sort((a, b) => a.originalDate - b.originalDate);
  }, [salesData, forecastData]);

  if (isLoading) {
    return (
      <div className="h-[400px] w-full bg-card rounded-2xl animate-pulse flex items-center justify-center border border-border/50">
        <span className="text-muted-foreground font-medium">Loading chart data...</span>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[400px] w-full bg-card rounded-2xl flex flex-col items-center justify-center border border-dashed border-border p-8 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground">No data available</h3>
        <p className="text-muted-foreground max-w-sm mt-2">Add sales records to visualize historical trends and generate future forecasts.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
      <h3 className="text-lg font-bold font-display text-foreground mb-6">Revenue Trajectory</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis 
            dataKey="name" 
            stroke="hsl(var(--muted-foreground))" 
            tick={{ fontSize: 12 }}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(val) => `₹${val}`}
            tick={{ fontSize: 12 }}
            axisLine={false}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              borderColor: 'hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
            formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Line
            name="Historical Sales"
            type="monotone"
            dataKey="amount"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
          <Line
            name="Forecasted Revenue"
            type="monotone"
            dataKey="forecast"
            stroke="hsl(var(--accent))"
            strokeWidth={3}
            strokeDasharray="5 5"
            dot={{ r: 4, fill: "hsl(var(--accent))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
