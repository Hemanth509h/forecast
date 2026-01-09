from datetime import datetime, timedelta
from typing import List, Dict
from server.models import Sale, Forecast

class MemStorage:
    def __init__(self):
        # Store data by session_id
        self.sales_by_session: Dict[str, List[Sale]] = {}
        self.forecasts_by_session: Dict[str, List[Forecast]] = {}
        self.session_expiry: Dict[str, datetime] = {}
        
        self.current_sale_id = 1
        self.current_forecast_id = 1

    def _cleanup_expired_sessions(self):
        now = datetime.now()
        expired = [sid for sid, expiry in self.session_expiry.items() if now > expiry]
        for sid in expired:
            self.sales_by_session.pop(sid, None)
            self.forecasts_by_session.pop(sid, None)
            self.session_expiry.pop(sid, None)

    def _touch_session(self, session_id: str):
        self._cleanup_expired_sessions()
        # Set or update expiry to 1 day from now
        self.session_expiry[session_id] = datetime.now() + timedelta(days=1)
        if session_id not in self.sales_by_session:
            self.sales_by_session[session_id] = []
        if session_id not in self.forecasts_by_session:
            self.forecasts_by_session[session_id] = []

    async def get_sales(self, session_id: str) -> List[Sale]:
        self._touch_session(session_id)
        sales = self.sales_by_session.get(session_id, [])
        return sorted(sales, key=lambda x: x.date, reverse=True)

    async def create_sale(self, session_id: str, sale_data: dict) -> Sale:
        self._touch_session(session_id)
        new_sale = Sale(id=self.current_sale_id, **sale_data)
        self.current_sale_id += 1
        self.sales_by_session[session_id].append(new_sale)
        return new_sale

    async def create_sales(self, session_id: str, sales_list: List[dict]) -> int:
        self._touch_session(session_id)
        # Reset current session data on bulk import
        self.sales_by_session[session_id] = []
        self.forecasts_by_session[session_id] = []
        
        for s in sales_list:
            new_sale = Sale(id=self.current_sale_id, **s)
            self.current_sale_id += 1
            self.sales_by_session[session_id].append(new_sale)
        return len(sales_list)

    async def get_forecasts(self, session_id: str) -> List[Forecast]:
        self._touch_session(session_id)
        forecasts = self.forecasts_by_session.get(session_id, [])
        return sorted(forecasts, key=lambda x: x.forecast_date, reverse=True)

    async def create_forecasts(self, session_id: str, forecasts_list: List[dict]) -> List[Forecast]:
        self._touch_session(session_id)
        new_forecasts = []
        for f in forecasts_list:
            new_forecast = Forecast(id=self.current_forecast_id, created_at=datetime.now(), **f)
            self.current_forecast_id += 1
            self.forecasts_by_session[session_id].append(new_forecast)
            new_forecasts.append(new_forecast)
        return new_forecasts

    async def clear_forecasts(self, session_id: str):
        self._touch_session(session_id)
        self.forecasts_by_session[session_id] = []

    async def clear_sales(self, session_id: str):
        self._touch_session(session_id)
        self.sales_by_session[session_id] = []
        self.forecasts_by_session[session_id] = []

storage = MemStorage()
