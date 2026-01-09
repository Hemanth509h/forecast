import { pgTable, text, serial, decimal, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  amount: decimal("amount").notNull(),
  productCategory: text("product_category").notNull(),
  region: text("region").notNull(),
});

export const forecasts = pgTable("forecasts", {
  id: serial("id").primaryKey(),
  forecastDate: timestamp("forecast_date").notNull(),
  predictedAmount: decimal("predicted_amount").notNull(),
  modelName: text("model_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSaleSchema = z.object({
  date: z.coerce.date(),
  amount: z.string(),
  productCategory: z.string(),
  region: z.string(),
});
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof sales.$inferSelect;

export const insertForecastSchema = z.object({
  forecastDate: z.coerce.date(),
  predictedAmount: z.string(),
  modelName: z.string(),
});
export type InsertForecast = z.infer<typeof insertForecastSchema>;
export type Forecast = typeof forecasts.$inferSelect;
