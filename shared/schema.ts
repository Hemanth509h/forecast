import { pgTable, text, serial, decimal, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

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

export const insertSaleSchema = createInsertSchema(sales).extend({
  date: z.coerce.date(),
  amount: z.coerce.string() // Ensure it stays as string for decimal type
}).omit({ id: true });

export const insertSalesSchema = z.array(insertSaleSchema);

export const insertForecastSchema = createInsertSchema(forecasts).extend({
  forecastDate: z.coerce.date(),
  predictedAmount: z.coerce.string()
}).omit({ id: true, createdAt: true });
