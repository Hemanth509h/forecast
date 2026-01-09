import { pgTable, text, serial, decimal, timestamp, integer } from "drizzle-orm/pg-core";

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
