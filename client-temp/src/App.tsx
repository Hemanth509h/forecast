import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/Sidebar";
import NotFound from "@/pages/not-found";

// Pages
import Dashboard from "@/pages/Dashboard";
import SalesData from "@/pages/SalesData";
import Forecasts from "@/pages/Forecasts";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/sales" component={SalesData} />
      <Route path="/forecasts" component={Forecasts} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex min-h-screen bg-background text-foreground font-sans">
          <Sidebar />
          <main className="flex-1 p-4 md:p-8 lg:p-10 overflow-y-auto h-screen w-full">
            <div className="max-w-7xl mx-auto">
              <Router />
            </div>
          </main>
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
