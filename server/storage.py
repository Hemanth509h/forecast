from datetime import datetime
from typing import List, Optional
from server.models import Sale, Forecast
from decimal import Decimal

class MemStorage:
    def __init__(self):
        self.sales: List[Sale] = []
        self.forecasts: List[Forecast] = []
        self.current_sale_id = 1
        self.current_forecast_id = 1

    async def get_sales(self) -> List[Sale]:
        return sorted(self.sales, key=lambda x: x.date, reverse=True)

    async def create_sale(self, sale_data: dict) -> Sale:
        new_sale = Sale(id=self.current_sale_id, **sale_data)
        self.current_sale_id += 1
        self.sales.append(new_sale)
        return new_sale

    async def create_sales(self, sales_list: List[dict]) -> int:
        # Volatile storage: reset on every bulk import as requested
        self.sales = []
        self.forecasts = []
        self.current_sale_id = 1
        self.current_forecast_id = 1
        
        for s in sales_list:
            new_sale = Sale(id=self.current_sale_id, **s)
            self.current_sale_id += 1
            self.sales.append(new_sale)
        return len(sales_list)

    async def get_forecasts(self) -> List[Forecast]:
        return sorted(self.forecasts, key=lambda x: x.forecast_date, reverse=True)

    async def create_forecasts(self, forecasts_list: List[dict]) -> List[Forecast]:
        new_forecasts = []
        for f in forecasts_list:
            new_forecast = Forecast(id=self.current_forecast_id, created_at=datetime.now(), **f)
            self.current_forecast_id += 1
            self.forecasts.append(new_forecast)
            new_forecasts.append(new_forecast)
        return new_forecasts

    async def clear_forecasts(self):
        self.forecasts = []

    async def clear_sales(self):
        self.sales = []
        self.forecasts = []

storage = MemStorage()
