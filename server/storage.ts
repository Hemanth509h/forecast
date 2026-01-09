import { db } from "./db";
import { sales, forecasts, type Sale, type InsertSale, type Forecast, type InsertForecast } from "@shared/schema";
import { desc } from "drizzle-orm";

export interface IStorage {
  getSales(): Promise<Sale[]>;
  createSale(sale: InsertSale): Promise<Sale>;
  createSales(salesList: InsertSale[]): Promise<number>;
  getForecasts(): Promise<Forecast[]>;
  createForecast(forecast: InsertForecast): Promise<Forecast>;
  clearForecasts(): Promise<void>;
  createForecasts(forecastsList: InsertForecast[]): Promise<Forecast[]>;
}

export class DatabaseStorage implements IStorage {
  async getSales(): Promise<Sale[]> {
    return await db.select().from(sales).orderBy(desc(sales.date));
  }

  async createSale(insertSale: InsertSale): Promise<Sale> {
    const [newSale] = await db.insert(sales).values(insertSale).returning();
    return newSale;
  }

  async createSales(insertSalesList: InsertSale[]): Promise<number> {
    if (insertSalesList.length === 0) return 0;
    const result = await db.insert(sales).values(insertSalesList).returning();
    return result.length;
  }

  async getForecasts(): Promise<Forecast[]> {
    return await db.select().from(forecasts).orderBy(desc(forecasts.forecastDate));
  }

  async createForecast(insertForecast: InsertForecast): Promise<Forecast> {
    const [newForecast] = await db.insert(forecasts).values(insertForecast).returning();
    return newForecast;
  }

  async clearForecasts(): Promise<void> {
    await db.delete(forecasts);
  }

  async createForecasts(forecastsList: InsertForecast[]): Promise<Forecast[]> {
    if (forecastsList.length === 0) return [];
    return await db.insert(forecasts).values(forecastsList).returning();
  }
}

export const storage = new DatabaseStorage();
