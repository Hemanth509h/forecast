import { Link, useLocation } from "wouter";
import { LayoutDashboard, TrendingUp, TableProperties, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Sales Data", href: "/sales", icon: TableProperties },
  { label: "Forecasts", href: "/forecasts", icon: TrendingUp },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-card border-r border-border sticky top-0">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <LineChart className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight font-display text-foreground">
            TrendCast
          </h1>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              isActive 
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}>
              <item.icon className={cn(
                "w-5 h-5 transition-transform duration-200 group-hover:scale-110",
                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
              )} />
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-border/50">
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-foreground mb-1">Pro Tip</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Generate forecasts regularly to keep predictions accurate with latest sales data.
          </p>
        </div>
      </div>
    </aside>
  );
}
