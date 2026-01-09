import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type InsertSale } from "@shared/schema";

export function useSales() {
  return useQuery({
    queryKey: [api.sales.list.path],
    queryFn: async () => {
      const res = await fetch(api.sales.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sales data");
      return api.sales.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertSale) => {
      const payload = {
        ...data,
        amount: Number(data.amount),
        date: new Date(data.date).toISOString()
      };

      const res = await fetch(api.sales.create.path, {
        method: api.sales.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.sales.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create sale record");
      }
      return api.sales.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sales.list.path] });
    },
  });
}

export function useBulkCreateSales() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertSale[]) => {
      const res = await fetch(api.sales.bulkCreate.path, {
        method: api.sales.bulkCreate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to bulk import sales data");
      }
      return api.sales.bulkCreate.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sales.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.forecasts.list.path] });
    },
  });
}
