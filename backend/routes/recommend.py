from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.db import get_db
from models.models import Weather, Recommendation, Alert
from schemas.schemas import RecommendRequest, RecommendationOut
from ai.engine import generate_recommendation, generate_alerts
from services.weather_service import fetch_live_weather

router = APIRouter(tags=["Recommendation"])


@router.post("/recommend", response_model=RecommendationOut)
async def recommend(payload: RecommendRequest, db: Session = Depends(get_db)):
    """
    Generate a sensor sensitivity recommendation.

    If any weather field is omitted in the request body, live weather for
    `city` is fetched automatically before scoring.
    """
    fields = ["temperature", "humidity", "wind_speed", "rainfall", "pressure", "cloud_cover", "visibility", "storm"]
    missing = any(getattr(payload, f) is None for f in fields)

    if missing:
        try:
            live = await fetch_live_weather(city=payload.city)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Could not reach weather provider: {exc}")
        values = {f: (getattr(payload, f) if getattr(payload, f) is not None else live[f]) for f in fields}
    else:
        values = {f: getattr(payload, f) for f in fields}

    weather = Weather(city=payload.city, **values)
    db.add(weather)
    db.commit()
    db.refresh(weather)

    result = generate_recommendation(
        temperature=weather.temperature,
        humidity=weather.humidity,
        wind_speed=weather.wind_speed,
        rainfall=weather.rainfall,
        pressure=weather.pressure,
        cloud_cover=weather.cloud_cover,
        visibility=weather.visibility,
        storm=weather.storm,
    )

    recommendation = Recommendation(
        weather_id=weather.id,
        city=payload.city,
        sensitivity=result.sensitivity,
        risk_score=result.risk_score,
        risk_level=result.risk_level,
        confidence=result.confidence,
        reason=result.reason,
    )
    db.add(recommendation)
    db.commit()
    db.refresh(recommendation)

    for alert_data in generate_alerts(payload.city, weather, result.risk_score):
        db.add(Alert(**alert_data))
    db.commit()

    return recommendation
