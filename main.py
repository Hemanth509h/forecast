from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, ConfigDict
from typing import List
from datetime import datetime
from server.storage import storage
import os
import openai
import json
import uuid

app = FastAPI()

# Session setup
SECRET_KEY = os.getenv("SESSION_SECRET", "default-secret-key")
SESSION_COOKIE_NAME = "trendcast_session_id"

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
    model_config = ConfigDict(populate_by_name=True)
    
    date: datetime
    amount: str
    product_category: str = Field(alias="productCategory")
    region: str

class ForecastGenerate(BaseModel):
    months: int
    method: str

class AIMapRequest(BaseModel):
    headers: List[str]
    sampleRows: List[List[str]]

def get_session_id(request: Request, response: Response) -> str:
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_id:
        session_id = str(uuid.uuid4())
        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=session_id,
            max_age=86400,  # 1 day in seconds
            httponly=True,
            samesite="lax"
        )
    return session_id

@app.post("/api/sales/ai-map")
async def ai_map(req: AIMapRequest):
    try:
        response = client.chat.completions.create(
            model="gpt-5",
            messages=[
                {
                    "role": "system",
                    "content": "You are a data mapping expert. Map the given CSV headers to our internal schema: date, amount, productCategory, region. Note that currency is in Indian Rupees (₹). Return a JSON object mapping each internal field to the index (0-based) of the corresponding CSV header. If a field cannot be mapped, omit it."
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
async def get_sales(request: Request, response: Response):
    session_id = get_session_id(request, response)
    sales = await storage.get_sales(session_id)
    return [
        {
            "id": s.id,
            "date": s.date,
            "amount": str(s.amount),
            "productCategory": s.product_category,
            "region": s.region
        } for s in sales
    ]

@app.post("/api/sales")
async def create_sale(request: Request, response: Response, sale: SaleCreate):
    session_id = get_session_id(request, response)
    data = sale.model_dump(by_alias=True)
    storage_data = {
        "date": data["date"],
        "amount": data["amount"],
        "product_category": data["productCategory"],
        "region": data["region"]
    }
    new_sale = await storage.create_sale(session_id, storage_data)
    return {
        "id": new_sale.id,
        "date": new_sale.date,
        "amount": str(new_sale.amount),
        "productCategory": new_sale.product_category,
        "region": new_sale.region
    }

@app.post("/api/sales/bulk")
async def bulk_create_sales(request: Request, response: Response, sales: List[SaleCreate]):
    session_id = get_session_id(request, response)
    storage_list = []
    for s in sales:
        data = s.model_dump(by_alias=True)
        storage_list.append({
            "date": data["date"],
            "amount": data["amount"],
            "product_category": data["productCategory"],
            "region": data["region"]
        })
    count = await storage.create_sales(session_id, storage_list)
    return {"count": count}

@app.post("/api/sales/clear")
async def clear_sales(request: Request, response: Response):
    session_id = get_session_id(request, response)
    await storage.clear_sales(session_id)
    return {"message": "Data cleared successfully"}

@app.get("/api/forecasts")
async def get_forecasts(request: Request, response: Response):
    session_id = get_session_id(request, response)
    forecasts = await storage.get_forecasts(session_id)
    return [
        {
            "id": f.id,
            "forecastDate": f.forecast_date,
            "predictedAmount": str(f.predicted_amount),
            "modelName": f.model_name,
            "createdAt": f.created_at
        } for f in forecasts
    ]

@app.post("/api/forecasts/generate")
async def generate_forecast(request: Request, response: Response, input: ForecastGenerate):
    session_id = get_session_id(request, response)
    sales_data = await storage.get_sales(session_id)
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
            
    await storage.clear_forecasts(session_id)
    created = await storage.create_forecasts(session_id, forecasts)
    return [
        {
            "id": f.id,
            "forecastDate": f.forecast_date,
            "predictedAmount": str(f.predicted_amount),
            "modelName": f.model_name,
            "createdAt": f.created_at
        } for f in created
    ]

# Path to the bundled static files
dist_path = os.path.join(os.getcwd(), "dist", "public")

@app.get("/{full_path:path}")
async def serve_spa(request: Request, full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not Found")
    
    # Try to serve static assets first
    if full_path.startswith("assets/"):
        asset_file = os.path.join(dist_path, full_path)
        if os.path.isfile(asset_file):
            from fastapi.responses import FileResponse
            return FileResponse(asset_file)

    # Check if file exists directly in public/
    file_path = os.path.join(dist_path, full_path)
    if os.path.isfile(file_path):
        from fastapi.responses import FileResponse
        return FileResponse(file_path)
    
    # Fallback to index.html for client-side routing
    index_path = os.path.join(dist_path, "index.html")
    if os.path.isfile(index_path):
        from fastapi.responses import FileResponse
        return FileResponse(index_path)
        
    raise HTTPException(status_code=404, detail="Static files not found. Build is required.")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)
