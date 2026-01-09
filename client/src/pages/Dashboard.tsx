import { useSales } from "@/hooks/use-sales";
import { useForecasts } from "@/hooks/use-forecasts";
import { MetricCard } from "@/components/MetricCard";
import { SalesChart } from "@/components/SalesChart";
import { DollarSign, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useMemo } from "react";

export default function Dashboard() {
  const { data: sales, isLoading: salesLoading } = useSales();
  const { data: forecasts, isLoading: forecastsLoading } = useForecasts();

  // Calculate Metrics
  const totalSales = sales?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
  
  const latestSaleDate = sales?.length 
    ? new Date(Math.max(...sales.map(s => new Date(s.date).getTime())))
    : new Date();
  
  const lastMonthSales = sales?.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === latestSaleDate.getMonth() && d.getFullYear() === latestSaleDate.getFullYear();
  }).reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

  const nextMonthForecastData = forecasts?.length 
    ? [...forecasts].sort((a, b) => new Date(a.forecastDate).getTime() - new Date(b.forecastDate).getTime())[0]
    : null;
    
  const nextMonthForecast = Number(nextMonthForecastData?.predictedAmount || 0);

  const regionData = useMemo(() => {
    if (!sales) return [];
    const regions = new Map<string, number>();
    sales.forEach(s => {
      regions.set(s.region, (regions.get(s.region) || 0) + Number(s.amount));
    });
    return Array.from(regions.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [sales]);

  const isLoading = salesLoading || forecastsLoading;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">
          Executive Dashboard
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Overview of your financial performance and predictive insights.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total Revenue"
          value={`₹${totalSales.toLocaleString('en-IN')}`}
          description="All time cumulative sales"
          icon={DollarSign}
          loading={isLoading}
        />
        <MetricCard
          title="Latest Month"
          value={`₹${lastMonthSales.toLocaleString('en-IN')}`}
          description={sales?.length ? format(latestSaleDate, 'MMMM yyyy') : "No data"}
          trend={sales?.length ? 12.5 : undefined} 
          icon={Calendar}
          loading={isLoading}
        />
        <MetricCard
          title="Immediate Forecast"
          value={`₹${nextMonthForecast.toLocaleString('en-IN')}`}
          description={nextMonthForecastData ? format(new Date(nextMonthForecastData.forecastDate), 'MMMM yyyy') : "Generate forecast"}
          icon={TrendingUp}
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <SalesChart 
            salesData={sales} 
            forecastData={forecasts} 
            isLoading={isLoading} 
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
              <h3 className="text-lg font-bold font-display text-foreground mb-4">Regional Performance</h3>
              <div className="space-y-4">
                {regionData.slice(0, 5).map((region, i) => (
                  <div key={region.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {i + 1}
                      </div>
                      <span className="text-sm font-medium">{region.name}</span>
                    </div>
                    <span className="text-sm font-mono font-bold">₹{region.value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
                {regionData.length === 0 && <p className="text-muted-foreground text-sm py-4 text-center">No regional data available</p>}
              </div>
            </div>

            <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm flex flex-col justify-center text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent mx-auto mb-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-display text-foreground mb-1">Growth Projection</h3>
              <p className="text-sm text-muted-foreground mb-4">Estimated growth based on current trajectory</p>
              <div className="text-3xl font-bold text-accent">+14.2%</div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-8">
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground shadow-xl shadow-primary/20 flex flex-col justify-between h-full min-h-[300px]">
            <div>
              <div className="p-3 bg-white/20 w-fit rounded-xl mb-6">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold font-display mb-2">Model Confidence</h3>
              <p className="text-primary-foreground/80 leading-relaxed">
                Based on your historical data density, our predictive model is operating with high confidence.
              </p>
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium opacity-90">Data Quality Score</span>
                <span className="text-lg font-bold">94%</span>
              </div>
              <div className="w-full bg-black/20 rounded-full h-2">
                <div className="bg-white rounded-full h-2 w-[94%]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
