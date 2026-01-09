import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertSaleSchema } from "@shared/schema";

// Simple linear regression helper
function calculateLinearRegression(data: { x: number; y: number }[]) {
  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (const point of data) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get(api.sales.list.path, async (req, res) => {
    const sales = await storage.getSales();
    res.json(sales);
  });

  app.post(api.sales.create.path, async (req, res) => {
    try {
      const input = api.sales.create.input.parse(req.body);
      // Ensure numeric types for decimal columns if needed, though Zod handles basic parsing
      // Drizzle expects strings or numbers for decimals, but typically strings to preserve precision
      // Our schema uses decimal which maps to string in JS usually, but let's just pass input.
      const sale = await storage.createSale(input);
      res.status(201).json(sale);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.forecasts.list.path, async (req, res) => {
    const forecasts = await storage.getForecasts();
    res.json(forecasts);
  });

  app.post(api.forecasts.generate.path, async (req, res) => {
    try {
      const { months } = api.forecasts.generate.input.parse(req.body);
      
      // Get all sales
      const sales = await storage.getSales();
      if (sales.length < 2) {
         // Need at least 2 points for regression
         return res.status(400).json({ message: "Not enough historical data to generate forecast (minimum 2 records required)." });
      }

      // Aggregate sales by month for the model
      const monthlySales = new Map<string, number>();
      
      sales.forEach(sale => {
        const date = new Date(sale.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const amount = Number(sale.amount);
        monthlySales.set(key, (monthlySales.get(key) || 0) + amount);
      });

      // Prepare data for regression (convert dates to numeric timestamps or indices)
      // We'll use a simple index 0, 1, 2... representing months sorted chronologically
      const sortedKeys = Array.from(monthlySales.keys()).sort();
      const regressionData = sortedKeys.map((key, index) => ({
        x: index,
        y: monthlySales.get(key) || 0,
        date: key
      }));

      const { slope, intercept } = calculateLinearRegression(regressionData);

      // Generate future points
      await storage.clearForecasts();
      
      const forecasts = [];
      const lastIndex = regressionData.length - 1;
      const lastDateKey = sortedKeys[lastIndex];
      const [lastYear, lastMonth] = lastDateKey.split('-').map(Number);
      
      for (let i = 1; i <= months; i++) {
        const nextIndex = lastIndex + i;
        const predictedAmount = slope * nextIndex + intercept;
        
        // Calculate next date
        const nextDate = new Date(lastYear, lastMonth - 1 + i, 1); // Month is 0-indexed in Date constructor
        
        forecasts.push({
          forecastDate: nextDate,
          predictedAmount: Math.max(0, predictedAmount).toFixed(2), // No negative sales
          modelName: 'Linear Regression'
        });
      }
      
      const createdForecasts = await storage.createForecasts(forecasts);
      res.json(createdForecasts);

    } catch (err) {
       if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Forecast error:", err);
      res.status(500).json({ message: "Failed to generate forecast" });
    }
  });

  // Start seeding in background
  seedDatabase().catch(err => console.error("Seeding failed:", err));

  return httpServer;
}

// Seed function
export async function seedDatabase() {
  const existingSales = await storage.getSales();
  if (existingSales.length === 0) {
    console.log("Seeding database with historical sales data...");
    const salesData = [];
    const categories = ["Electronics", "Clothing", "Home & Garden", "Books"];
    const regions = ["North", "South", "East", "West"];
    
    // Generate 12 months of data with a slight upward trend + random noise
    const today = new Date();
    for (let i = 12; i >= 1; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 15);
      const baseAmount = 10000 + (12 - i) * 500; // Upward trend
      
      // Add a few transactions per month
      for (let j = 0; j < 5; j++) {
         const variance = (Math.random() - 0.5) * 2000;
         salesData.push({
            date: date,
            amount: (baseAmount / 5 + variance).toFixed(2),
            productCategory: categories[Math.floor(Math.random() * categories.length)],
            region: regions[Math.floor(Math.random() * regions.length)]
         });
      }
    }
    
    for (const sale of salesData) {
      await storage.createSale(sale);
    }
    console.log("Seeding complete.");
  }
}
