import { useForecasts, useGenerateForecast } from "@/hooks/use-forecasts";
import { useSales } from "@/hooks/use-sales";
import { format } from "date-fns";
import { Wand2, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SalesChart } from "@/components/SalesChart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

export default function Forecasts() {
  const { data: forecasts, isLoading: isForecastsLoading } = useForecasts();
  const { data: sales, isLoading: isSalesLoading } = useSales();
  const generateForecast = useGenerateForecast();
  const { toast } = useToast();
  const [months, setMonths] = useState("6");

  const handleGenerate = () => {
    generateForecast.mutate(parseInt(months), {
      onSuccess: () => {
        toast({ title: "Forecast Generated", description: `Successfully projected ${months} months into the future.` });
      },
      onError: (error) => {
        toast({ 
          title: "Generation Failed", 
          description: error.message, 
          variant: "destructive" 
        });
      }
    });
  };

  const isLoading = isForecastsLoading || isSalesLoading;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">
            Predictive Forecasts
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-driven projections based on historical performance trends.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-card p-2 rounded-xl border border-border shadow-sm">
          <Select value={months} onValueChange={setMonths}>
            <SelectTrigger className="w-[140px] border-0 bg-transparent focus:ring-0">
              <SelectValue placeholder="Duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 Months</SelectItem>
              <SelectItem value="6">6 Months</SelectItem>
              <SelectItem value="12">12 Months</SelectItem>
              <SelectItem value="24">24 Months</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            onClick={handleGenerate} 
            disabled={generateForecast.isPending}
            className="bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/25"
          >
            {generateForecast.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Wand2 className="w-4 h-4 mr-2" />
            )}
            Generate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <SalesChart 
            salesData={sales} 
            forecastData={forecasts} 
            isLoading={isLoading} 
          />
          
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold font-display mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Forecast Data Points
            </h3>
            
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground font-medium uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Forecast Date</th>
                    <th className="px-4 py-3 text-left">Model</th>
                    <th className="px-4 py-3 text-right">Predicted Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {forecasts?.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                        No forecast data generated yet.
                      </td>
                    </tr>
                  ) : (
                    forecasts?.slice(0, 10).map((f) => (
                      <tr key={f.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">
                          {format(new Date(f.forecastDate), 'MMMM yyyy')}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                          {f.modelName}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-accent font-semibold">
                          ${Number(f.predictedAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {forecasts && forecasts.length > 10 && (
                <div className="p-2 text-center text-xs text-muted-foreground bg-muted/20">
                  Showing first 10 projections
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-xl">
            <h3 className="text-xl font-bold font-display mb-2">Model Parameters</h3>
            <p className="text-slate-300 text-sm mb-6">
              Current configuration used for projection analysis.
            </p>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-sm opacity-70">Algorithm</span>
                <span className="font-mono text-sm bg-white/10 px-2 py-1 rounded">ARIMA-X</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-sm opacity-70">Seasonality</span>
                <span className="font-mono text-sm text-green-400">Detected</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-sm opacity-70">Trend Factor</span>
                <span className="font-mono text-sm text-blue-400">Positive (+4.2%)</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
             <h4 className="font-semibold mb-2">Confidence Interval</h4>
             <p className="text-sm text-muted-foreground mb-4">
               The shaded area in the projection represents the 95% confidence interval for the predicted values.
             </p>
             <div className="h-24 flex items-end justify-center gap-1 border-b border-border pb-1">
                <div className="w-4 bg-primary/20 h-10 rounded-t-sm" />
                <div className="w-4 bg-primary/30 h-14 rounded-t-sm" />
                <div className="w-4 bg-primary/40 h-12 rounded-t-sm" />
                <div className="w-4 bg-primary/60 h-16 rounded-t-sm" />
                <div className="w-4 bg-accent/40 h-20 rounded-t-sm animate-pulse" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
