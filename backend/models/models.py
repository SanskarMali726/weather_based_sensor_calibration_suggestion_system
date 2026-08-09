"""
SQLAlchemy ORM models.

Tables: Weather, Recommendation, Alert. Recommendation history is simply
the Recommendation table queried in reverse chronological order, so no
separate History table duplicates the data.
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from database.db import Base


class Weather(Base):
    __tablename__ = "weather"

    id = Column(Integer, primary_key=True, index=True)
    city = Column(String, index=True, default="Default Sector")
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    wind_speed = Column(Float, nullable=False)
    rainfall = Column(Float, nullable=False)
    pressure = Column(Float, nullable=False)
    cloud_cover = Column(Float, default=0.0)
    visibility = Column(Float, default=10.0)
    storm = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    recommendations = relationship("Recommendation", back_populates="weather")


class Recommendation(Base):
    __tablename__ = "recommendation"

    id = Column(Integer, primary_key=True, index=True)
    weather_id = Column(Integer, ForeignKey("weather.id"), nullable=False)
    city = Column(String, index=True, default="Default Sector")
    sensitivity = Column(String, nullable=False)      # LOW | MEDIUM | HIGH
    risk_score = Column(Integer, nullable=False)       # 0-100
    risk_level = Column(String, nullable=False)         # LOW | MEDIUM | HIGH
    confidence = Column(Integer, nullable=False)        # 0-100, AI confidence score
    reason = Column(String, nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow, index=True)

    weather = relationship("Weather", back_populates="recommendations")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    city = Column(String, index=True, default="Default Sector")
    type = Column(String, nullable=False)      # e.g. "High Wind", "Storm Warning"
    message = Column(String, nullable=False)
    priority = Column(String, nullable=False)  # LOW | MEDIUM | HIGH | CRITICAL
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
