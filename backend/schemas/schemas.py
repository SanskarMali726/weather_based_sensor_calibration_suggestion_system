"""Pydantic schemas for request validation and response serialization."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class WeatherBase(BaseModel):
    city: str = "Default Sector"
    temperature: float
    humidity: float
    wind_speed: float
    rainfall: float
    pressure: float
    cloud_cover: float = 0.0
    visibility: float = 10.0
    storm: bool = False


class WeatherOut(WeatherBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True


class RecommendRequest(BaseModel):
    """Optional manual override. If omitted, the latest fetched weather for the city is used."""
    city: str = "Default Sector"
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    wind_speed: Optional[float] = None
    rainfall: Optional[float] = None
    pressure: Optional[float] = None
    cloud_cover: Optional[float] = None
    visibility: Optional[float] = None
    storm: Optional[bool] = None


class RecommendationOut(BaseModel):
    id: int
    weather_id: int
    city: str
    sensitivity: str
    risk_score: int = Field(ge=0, le=100)
    risk_level: str
    confidence: int = Field(ge=0, le=100)
    reason: str
    generated_at: datetime

    class Config:
        from_attributes = True


class AlertOut(BaseModel):
    id: int
    city: str
    type: str
    message: str
    priority: str
    created_at: datetime

    class Config:
        from_attributes = True


class AnalyticsOut(BaseModel):
    total_readings: int
    average_risk: float
    sensitivity_distribution: dict
    risk_trend: List[dict]
    weather_trend: List[dict]
    active_alerts: int


class ReportOut(BaseModel):
    city: str
    generated_at: datetime
    current_weather: WeatherOut
    recommendation: RecommendationOut
