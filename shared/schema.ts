import { pgTable, text, serial, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
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

export const insertSaleSchema = createInsertSchema(sales).omit({ id: true });
export const insertForecastSchema = createInsertSchema(forecasts).omit({ id: true, createdAt: true });

export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Forecast = typeof forecasts.$inferSelect;
export type InsertForecast = z.infer<typeof insertForecastSchema>;

export type GenerateForecastRequest = {
  months: number;
};
