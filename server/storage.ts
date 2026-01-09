import { type Sale, type InsertSale, type Forecast, type InsertForecast } from "@shared/schema";

export interface IStorage {
  getSales(): Promise<Sale[]>;
  createSale(sale: InsertSale): Promise<Sale>;
  createSales(salesList: InsertSale[]): Promise<number>;
  getForecasts(): Promise<Forecast[]>;
  createForecast(forecast: InsertForecast): Promise<Forecast>;
  clearForecasts(): Promise<void>;
  createForecasts(forecastsList: InsertForecast[]): Promise<Forecast[]>;
}

export class MemStorage implements IStorage {
  private sales: Sale[] = [];
  private forecasts: Forecast[] = [];
  private currentSaleId = 1;
  private currentForecastId = 1;

  async getSales(): Promise<Sale[]> {
    return [...this.sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async createSale(insertSale: InsertSale): Promise<Sale> {
    const newSale: Sale = { ...insertSale, id: this.currentSaleId++ };
    this.sales.push(newSale);
    return newSale;
  }

  async createSales(insertSalesList: InsertSale[]): Promise<number> {
    // Clear existing data for "temporary" behavior
    this.sales = [];
    this.forecasts = [];
    
    const newSales = insertSalesList.map(s => ({
      ...s,
      id: this.currentSaleId++
    }));
    this.sales.push(...newSales);
    return newSales.length;
  }

  async getForecasts(): Promise<Forecast[]> {
    return [...this.forecasts].sort((a, b) => new Date(b.forecastDate).getTime() - new Date(a.forecastDate).getTime());
  }

  async createForecast(insertForecast: InsertForecast): Promise<Forecast> {
    const newForecast: Forecast = { 
      ...insertForecast, 
      id: this.currentForecastId++,
      createdAt: new Date()
    };
    this.forecasts.push(newForecast);
    return newForecast;
  }

  async clearForecasts(): Promise<void> {
    this.forecasts = [];
  }

  async createForecasts(forecastsList: InsertForecast[]): Promise<Forecast[]> {
    const newForecasts = forecastsList.map(f => ({
      ...f,
      id: this.currentForecastId++,
      createdAt: new Date()
    }));
    this.forecasts.push(...newForecasts);
    return newForecasts;
  }

  async clearSales(): Promise<void> {
    this.sales = [];
    this.forecasts = [];
  }
}

export const storage = new MemStorage();
