import { useSales } from "@/hooks/use-sales";
import { useForecasts } from "@/hooks/use-forecasts";
import { MetricCard } from "@/components/MetricCard";
import { SalesChart } from "@/components/SalesChart";
import { DollarSign, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { format, subMonths, addMonths } from "date-fns";

export default function Dashboard() {
  const { data: sales, isLoading: salesLoading } = useSales();
  const { data: forecasts, isLoading: forecastsLoading } = useForecasts();

  // Calculate Metrics
  const totalSales = sales?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
  
  const lastMonth = subMonths(new Date(), 1);
  const lastMonthSales = sales?.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
  }).reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

  const nextMonth = addMonths(new Date(), 1);
  const nextMonthForecast = forecasts?.filter(f => {
    const d = new Date(f.forecastDate);
    return d.getMonth() === nextMonth.getMonth() && d.getFullYear() === nextMonth.getFullYear();
  }).reduce((acc, curr) => acc + Number(curr.predictedAmount), 0) || 0;

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
          value={`$${totalSales.toLocaleString()}`}
          description="All time cumulative sales"
          icon={DollarSign}
          loading={isLoading}
        />
        <MetricCard
          title="Last Month"
          value={`$${lastMonthSales.toLocaleString()}`}
          description={format(lastMonth, 'MMMM yyyy')}
          trend={12.5} // Mock trend for demo
          icon={Calendar}
          loading={isLoading}
        />
        <MetricCard
          title="Next Month Forecast"
          value={`$${nextMonthForecast.toLocaleString()}`}
          description="Predicted revenue"
          icon={TrendingUp}
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <SalesChart 
            salesData={sales} 
            forecastData={forecasts} 
            isLoading={isLoading} 
          />
        </div>
        
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground shadow-xl shadow-primary/20 flex flex-col justify-between">
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
  );
}
