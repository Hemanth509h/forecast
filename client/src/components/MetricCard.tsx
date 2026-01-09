import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  trend?: number; // Percentage change
  description?: string;
  icon?: React.ElementType;
  loading?: boolean;
}

export function MetricCard({ title, value, trend, description, icon: Icon, loading }: MetricCardProps) {
  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm animate-pulse h-40">
        <div className="h-4 w-24 bg-muted rounded mb-4" />
        <div className="h-8 w-32 bg-muted rounded mb-2" />
        <div className="h-4 w-40 bg-muted rounded" />
      </div>
    );
  }

  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;

  return (
    <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-muted-foreground font-display uppercase tracking-wider">
          {title}
        </h3>
        {Icon && (
          <div className="p-2 bg-primary/5 rounded-lg text-primary group-hover:scale-110 transition-transform duration-200">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold text-foreground font-display tracking-tight">
          {value}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm">
        {trend !== undefined && (
          <div className={cn(
            "flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
            isPositive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : 
            isNegative ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
            "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
          )}>
            {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : 
             isNegative ? <ArrowDownRight className="w-3 h-3 mr-1" /> : 
             <Minus className="w-3 h-3 mr-1" />}
            {Math.abs(trend)}%
          </div>
        )}
        {description && (
          <span className="text-muted-foreground text-xs">{description}</span>
        )}
      </div>
    </div>
  );
}
