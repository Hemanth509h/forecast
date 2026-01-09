import { useState, useRef } from "react";
import { useSales, useCreateSale, useBulkCreateSales } from "@/hooks/use-sales";
import { format } from "date-fns";
import { Plus, Search, Filter, Loader2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertSaleSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// Extend schema for form validation
const formSchema = insertSaleSchema.extend({
  amount: z.coerce.string().min(1, "Amount must be positive"),
  date: z.coerce.date(),
});

type FormData = z.infer<typeof formSchema>;

export default function SalesData() {
  const { data: sales, isLoading } = useSales();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const bulkCreate = useBulkCreateSales();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Filter sales
  const filteredSales = sales?.filter(s => 
    s.productCategory.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.region.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      const rawHeaders = lines[0].split(",").map(h => h.trim());
      const sampleRows = lines.slice(1, 6).map(l => l.split(",").map(v => v.trim()));

      toast({ title: "AI Mapping", description: "Analyzing dataset structure with AI..." });

      try {
        const aiResponse = await fetch("/api/sales/ai-map", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headers: rawHeaders, sampleRows })
        });
        
        const mapping = await aiResponse.json();
        const headers = rawHeaders.map(h => h.toLowerCase());

        const salesToImport = lines.slice(1).map(line => {
          const values = line.split(",").map(v => v.trim());
          const entry: any = {};
          
          // Use AI mapping if available, otherwise fallback to existing logic
          const dateIdx = mapping.date !== undefined ? mapping.date : headers.indexOf("date");
          const amountIdx = mapping.amount !== undefined ? mapping.amount : headers.findIndex(h => ["amount", "amount ($)", "weekly_sales", "item_mrp"].includes(h));
          const categoryIdx = mapping.productCategory !== undefined ? mapping.productCategory : headers.findIndex(h => ["category", "item_type", "store"].includes(h));
          const regionIdx = mapping.region !== undefined ? mapping.region : headers.findIndex(h => ["region", "outlet_identifier", "store"].includes(h));

          // Date processing
          if (dateIdx !== -1 && values[dateIdx]) {
            const dateStr = values[dateIdx];
            const parts = dateStr.split(/[-/]/);
            let date: Date;
            if (parts.length === 3) {
              const p0 = parseInt(parts[0], 10);
              const p1 = parseInt(parts[1], 10);
              const p2 = parseInt(parts[2], 10);
              if (parts[0].length === 4) date = new Date(p0, p1 - 1, p2);
              else date = new Date(p2, p1 - 1, p0);
            } else {
              date = new Date(dateStr);
            }
            if (!isNaN(date.getTime())) entry.date = date.toISOString();
          }

          // Amount
          if (amountIdx !== -1) entry.amount = String(values[amountIdx]).replace(/[^0-9.]/g, '');
          
          // Category & Region
          if (categoryIdx !== -1) entry.productCategory = values[categoryIdx];
          if (regionIdx !== -1) entry.region = values[regionIdx];

          if (entry.date && entry.amount) {
            if (!entry.productCategory) entry.productCategory = "General";
            if (!entry.region) entry.region = "Default";
            return entry;
          }
          return null;
        }).filter(Boolean);

        if (salesToImport.length === 0) {
          toast({ title: "Import Failed", description: "No valid data found after AI analysis.", variant: "destructive" });
          return;
        }

        const CHUNK_SIZE = 500;
        let importedCount = 0;
        for (let i = 0; i < salesToImport.length; i += CHUNK_SIZE) {
          const chunk = salesToImport.slice(i, i + CHUNK_SIZE);
          const res = await bulkCreate.mutateAsync(chunk);
          importedCount += res.count;
        }
        toast({ title: "Import Complete", description: `Successfully imported ${importedCount} records using AI mapping.` });
      } catch (err: any) {
        console.error("AI Import failed:", err);
        toast({ title: "Import Failed", description: err.message || "AI mapping failed", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Sales Registry</h1>
          <p className="text-muted-foreground mt-2">Manage and track your historical sales data points.</p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <CreateSaleDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/30">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by category or region..." 
              className="pl-10 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" /> Filter
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-medium uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Product Category</th>
                <th className="px-6 py-4">Region</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading data...
                  </td>
                </tr>
              ) : filteredSales?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    No sales records found. Add your first sale!
                  </td>
                </tr>
              ) : (
                filteredSales?.map((sale) => (
                  <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{format(new Date(sale.date), 'MMM dd, yyyy')}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {sale.productCategory}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{sale.region}</td>
                    <td className="px-6 py-4 text-right font-mono font-medium">
                      ${Number(sale.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CreateSaleDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const createSale = useCreateSale();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      amount: "0",
      productCategory: "",
      region: ""
    }
  });

  const onSubmit = (data: FormData) => {
    createSale.mutate(data, {
      onSuccess: () => {
        toast({ title: "Success", description: "Sale record added successfully" });
        onOpenChange(false);
        form.reset();
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
          <Plus className="h-4 w-4" /> Add Record
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Sale</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Input type="date" {...form.register("date")} />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount ($)</label>
            <Input 
              type="number" 
              step="0.01" 
              placeholder="0.00" 
              {...form.register("amount")} 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Input placeholder="Electronics, Clothing..." {...form.register("productCategory")} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Region</label>
            <Input placeholder="North America, Europe..." {...form.register("region")} />
          </div>

          <Button type="submit" className="w-full mt-4" disabled={createSale.isPending}>
            {createSale.isPending ? "Creating..." : "Create Record"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
