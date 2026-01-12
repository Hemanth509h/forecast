import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

export interface Forecast {
  id: number;
  forecastDate: string;
  predictedAmount: string;
  modelName: string;
  createdAt: string;
}

export interface ForecastResponse {
  forecasts: Forecast[];
  metrics: {
    growthProjection: number;
    modelConfidence: number;
  };
}

export function useForecasts() {
  return useQuery<ForecastResponse>({
    queryKey: ["/api/forecasts"],
  });
}

export function useGenerateForecast() {
  return useMutation({
    mutationFn: async (data: { months: number; method: string }) => {
      const res = await apiRequest("POST", "/api/forecasts/generate", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forecasts"] });
    },
  });
}
