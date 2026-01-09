import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useForecasts() {
  return useQuery({
    queryKey: [api.forecasts.list.path],
    queryFn: async () => {
      const res = await fetch(api.forecasts.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch forecasts");
      return api.forecasts.list.responses[200].parse(await res.json());
    },
  });
}

export function useGenerateForecast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (months: number) => {
      const res = await fetch(api.forecasts.generate.path, {
        method: api.forecasts.generate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to generate forecast");
      return api.forecasts.generate.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.forecasts.list.path] });
    },
  });
}
