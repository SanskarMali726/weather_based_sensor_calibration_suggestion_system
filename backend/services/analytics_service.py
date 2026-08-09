"""Aggregates stored weather and recommendation records into analytics summaries."""
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.models import Recommendation, Weather, Alert


def build_analytics(db: Session, city: str = None, limit: int = 50) -> dict:
    rec_query = db.query(Recommendation)
    weather_query = db.query(Weather)
    alert_query = db.query(Alert)

    if city:
        rec_query = rec_query.filter(Recommendation.city == city)
        weather_query = weather_query.filter(Weather.city == city)
        alert_query = alert_query.filter(Alert.city == city)

    recommendations = rec_query.order_by(Recommendation.generated_at.desc()).limit(limit).all()
    weather_records = weather_query.order_by(Weather.timestamp.desc()).limit(limit).all()

    total = len(recommendations)
    avg_risk = round(sum(r.risk_score for r in recommendations) / total, 1) if total else 0.0

    distribution = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
    for r in recommendations:
        distribution[r.sensitivity] = distribution.get(r.sensitivity, 0) + 1

    risk_trend = [
        {"timestamp": r.generated_at.isoformat(), "risk_score": r.risk_score}
        for r in reversed(recommendations)
    ]

    weather_trend = [
        {
            "timestamp": w.timestamp.isoformat(),
            "temperature": w.temperature,
            "humidity": w.humidity,
            "wind_speed": w.wind_speed,
        }
        for w in reversed(weather_records)
    ]

    active_alerts = alert_query.count()

    return {
        "total_readings": total,
        "average_risk": avg_risk,
        "sensitivity_distribution": distribution,
        "risk_trend": risk_trend,
        "weather_trend": weather_trend,
        "active_alerts": active_alerts,
    }
