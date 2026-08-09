from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database.db import get_db
from models.models import Weather
from schemas.schemas import WeatherOut
from services.weather_service import fetch_live_weather, fetch_forecast

router = APIRouter(tags=["Weather"])


@router.get("/weather", response_model=WeatherOut)
async def get_weather(city: str = Query("Default Sector"), db: Session = Depends(get_db)):
    """Fetch live weather for a city, persist it, and return the reading."""
    try:
        live = await fetch_live_weather(city=city)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach weather provider: {exc}")

    record = Weather(
        city=live["city"],
        temperature=live["temperature"],
        humidity=live["humidity"],
        wind_speed=live["wind_speed"],
        rainfall=live["rainfall"],
        pressure=live["pressure"],
        cloud_cover=live["cloud_cover"],
        visibility=live["visibility"],
        storm=live["storm"],
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/forecast")
async def get_forecast(city: str = Query("Default Sector"), hours: int = Query(24, le=48)):
    """Fetch an hourly forecast for the next N hours (default 24, max 48)."""
    try:
        return await fetch_forecast(city=city, hours=hours)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach weather provider: {exc}")
