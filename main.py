from fastapi import FastAPI, HTTPException, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from server.storage import storage
import os
import openai
import json
from decimal import Decimal

app = FastAPI()

# Setup OpenAI
client = openai.OpenAI(
    api_key=os.getenv("AI_INTEGRATIONS_OPENAI_API_KEY"),
    base_url=os.getenv("AI_INTEGRATIONS_OPENAI_BASE_URL")
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SaleCreate(BaseModel):
    date: datetime
    amount: str
    product_category: str
    region: str

class ForecastGenerate(BaseModel):
    months: int
    method: str

class AIMapRequest(BaseModel):
    headers: List[str]
    sampleRows: List[List[str]]

@app.post("/api/sales/ai-map")
async def ai_map(req: AIMapRequest):
    try:
        response = client.chat.completions.create(
            model="gpt-5",
            messages=[
                {
                    "role": "system",
                    "content": "You are a data mapping expert. Map the given CSV headers to our internal schema: date, amount, product_category, region. Note that currency is in Indian Rupees (₹). Return a JSON object mapping each internal field to the index (0-based) of the corresponding CSV header. If a field cannot be mapped, omit it."
                },
                {
                    "role": "user",
                    "content": f"Headers: {', '.join(req.headers)}\nSample Data: {json.dumps(req.sampleRows)}"
                }
            ],
            response_format={ "type": "json_object" }
        )
        return json.loads(response.choices[0].message.content or "{}")
    except Exception as e:
        print(f"AI Mapping error: {e}")
        raise HTTPException(status_code=500, detail="Failed to map headers with AI")

@app.get("/api/sales")
async def get_sales():
    return await storage.get_sales()

@app.post("/api/sales")
async def create_sale(sale: SaleCreate):
    return await storage.create_sale(sale.dict())

@app.post("/api/sales/bulk")
async def bulk_create_sales(sales: List[SaleCreate]):
    count = await storage.create_sales([s.dict() for s in sales])
    return {"count": count}

@app.post("/api/sales/clear")
async def clear_sales():
    await storage.clear_sales()
    return {"message": "Data cleared successfully"}

@app.get("/api/forecasts")
async def get_forecasts():
    return await storage.get_forecasts()

@app.post("/api/forecasts/generate")
async def generate_forecast(input: ForecastGenerate):
    sales_data = await storage.get_sales()
    if len(sales_data) < 2:
        raise HTTPException(status_code=400, detail="Not enough historical data to generate forecast")
    
    months = input.months
    method = input.method
    
    monthly_sales = {}
    for sale in sales_data:
        key = sale.date.strftime("%Y-%m")
        monthly_sales[key] = monthly_sales.get(key, 0) + float(sale.amount)
    
    sorted_keys = sorted(monthly_sales.keys())
    last_key = sorted_keys[-1]
    last_date = datetime.strptime(last_key, "%Y-%m")
    
    forecasts = []
    model_name = "Linear Regression" if method == "regression" else "3-Month Moving Average" if method == "moving_average" else "Seasonal Naive"
    
    if method == "regression":
        n = len(sorted_keys)
        x = list(range(n))
        y = [monthly_sales[k] for k in sorted_keys]
        sum_x = sum(x)
        sum_y = sum(y)
        sum_xy = sum(xi * yi for xi, yi in zip(x, y))
        sum_xx = sum(xi * xi for xi in x)
        denominator = (n * sum_xx - sum_x**2)
        if denominator == 0:
            slope, intercept = 0, sum_y / n
        else:
            slope = (n * sum_xy - sum_x * sum_y) / denominator
            intercept = (sum_y - slope * sum_x) / n
        for i in range(1, months + 1):
            next_index = (n - 1) + i
            predicted = max(0.0, slope * next_index + intercept)
            year = last_date.year + (last_date.month + i - 1) // 12
            month = (last_date.month + i - 1) % 12 + 1
            forecasts.append({
                "forecast_date": datetime(year, month, 1),
                "predicted_amount": str(round(predicted, 2)),
                "model_name": model_name
            })
    else:
        avg_sale = sum(monthly_sales.values()) / len(monthly_sales)
        for i in range(1, months + 1):
            year = last_date.year + (last_date.month + i - 1) // 12
            month = (last_date.month + i - 1) % 12 + 1
            forecasts.append({
                "forecast_date": datetime(year, month, 1),
                "predicted_amount": str(round(avg_sale, 2)),
                "model_name": model_name
            })
            
    await storage.clear_forecasts()
    return await storage.create_forecasts(forecasts)

# Mount static files correctly
dist_path = os.path.join(os.getcwd(), "dist", "public")
if os.path.exists(dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")

@app.get("/{full_path:path}")
async def serve_spa(request: Request, full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not Found")
    
    dist_path = os.path.join(os.getcwd(), "dist", "public")
    file_path = os.path.join(dist_path, full_path)
    
    if os.path.isfile(file_path):
        from fastapi.responses import FileResponse
        return FileResponse(file_path)
    
    index_path = os.path.join(dist_path, "index.html")
    if os.path.isfile(index_path):
        from fastapi.responses import FileResponse
        return FileResponse(index_path)
        
    raise HTTPException(status_code=404, detail="Static files not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
