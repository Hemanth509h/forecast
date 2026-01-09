import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

export interface Sale {
  id: number;
  date: string;
  amount: string;
  productCategory: string;
  region: string;
}

export function useSales() {
  return useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });
}

export function useCreateSale() {
  return useMutation({
    mutationFn: async (data: { date: Date; amount: string; productCategory: string; region: string }) => {
      const res = await apiRequest("POST", "/api/sales", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
    },
  });
}

export function useBulkCreateSales() {
  return useMutation({
    mutationFn: async (sales: { date: string; amount: string; productCategory: string; region: string }[]) => {
      const res = await apiRequest("POST", "/api/sales/bulk", sales);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
    },
  });
}

export function useClearSales() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sales/clear", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/forecasts"] });
    },
  });
}
