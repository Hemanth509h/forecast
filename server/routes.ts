import express, { type Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertSaleSchema } from "@shared/schema";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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
  // Increase payload limit for large CSV imports - must be placed BEFORE routes
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerChatRoutes(app);
  registerImageRoutes(app);

  app.post("/api/sales/ai-map", async (req, res) => {
    try {
      const { headers, sampleRows } = z.object({
        headers: z.array(z.string()),
        sampleRows: z.array(z.array(z.string()))
      }).parse(req.body);

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are a data mapping expert. Map the given CSV headers to our internal schema: date, amount, productCategory, region. Note that currency is in Indian Rupees (₹). Return a JSON object mapping each internal field to the index (0-based) of the corresponding CSV header. If a field cannot be mapped, omit it."
          },
          {
            role: "user",
            content: `Headers: ${headers.join(", ")}\nSample Data: ${JSON.stringify(sampleRows)}`
          }
        ],
        response_format: { type: "json_object" }
      });

      res.json(JSON.parse(response.choices[0].message.content || "{}"));
    } catch (error) {
      console.error("AI Mapping error:", error);
      res.status(500).json({ error: "Failed to map headers with AI" });
    }
  });

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

  app.post(api.sales.bulkCreate.path, async (req, res) => {
    try {
      const input = api.sales.bulkCreate.input.parse(req.body);
      const count = await storage.createSales(input);
      res.status(201).json({ count });
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

  app.post(api.sales.clear.path, async (req, res) => {
    await storage.clearSales();
    res.json({ message: "Data cleared successfully" });
  });

  app.get(api.forecasts.list.path, async (req, res) => {
    const forecasts = await storage.getForecasts();
    res.json(forecasts);
  });

  app.post(api.forecasts.generate.path, async (req, res) => {
    try {
      const { months, method } = api.forecasts.generate.input.parse(req.body);
      
      const salesData = await storage.getSales();
      if (salesData.length < 2) {
         return res.status(400).json({ message: "Not enough historical data to generate forecast (minimum 2 records required)." });
      }

      // Aggregate sales by month
      const monthlySalesMap = new Map<string, number>();
      salesData.forEach(sale => {
        const date = new Date(sale.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlySalesMap.set(key, (monthlySalesMap.get(key) || 0) + Number(sale.amount));
      });

      const sortedKeys = Array.from(monthlySalesMap.keys()).sort();
      const lastDateKey = sortedKeys[sortedKeys.length - 1];
      const [lastYear, lastMonth] = lastDateKey.split('-').map(Number);
      
      const forecasts = [];
      const modelName = method === 'regression' ? 'Linear Regression' : 
                        method === 'moving_average' ? '3-Month Moving Average' : 
                        'Seasonal Naive';

      if (method === 'regression') {
        const regressionData = sortedKeys.map((key, index) => ({
          x: index,
          y: monthlySalesMap.get(key) || 0
        }));
        
        const n = regressionData.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        for (const p of regressionData) {
          sumX += p.x; sumY += p.y; sumXY += p.x * p.y; sumXX += p.x * p.x;
        }
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        for (let i = 1; i <= months; i++) {
          const nextIndex = (sortedKeys.length - 1) + i;
          const predicted = Math.max(0, slope * nextIndex + intercept);
          forecasts.push({
            forecastDate: new Date(lastYear, lastMonth - 1 + i, 1),
            predictedAmount: predicted.toFixed(2),
            modelName
          });
        }
      } else if (method === 'moving_average') {
        let history = sortedKeys.map(k => monthlySalesMap.get(k) || 0);
        for (let i = 1; i <= months; i++) {
          const window = history.slice(-3);
          const avg = window.reduce((a, b) => a + b, 0) / window.length;
          history.push(avg);
          forecasts.push({
            forecastDate: new Date(lastYear, lastMonth - 1 + i, 1),
            predictedAmount: avg.toFixed(2),
            modelName
          });
        }
      } else { // seasonality - naive approach (match same month last year)
        for (let i = 1; i <= months; i++) {
          const targetDate = new Date(lastYear, lastMonth - 1 + i, 1);
          const lastYearMonth = `${targetDate.getFullYear() - 1}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
          const predicted = monthlySalesMap.get(lastYearMonth) || monthlySalesMap.get(lastDateKey) || 0;
          forecasts.push({
            forecastDate: targetDate,
            predictedAmount: Number(predicted).toFixed(2),
            modelName
          });
        }
      }
      
      await storage.clearForecasts();
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
  // No-op: Removed default data seeding per user request
  console.log("Skipping database seeding: waiting for user dataset import.");
}
