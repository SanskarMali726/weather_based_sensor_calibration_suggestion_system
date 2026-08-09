"""
AI-Powered Weather-Based Sensor Calibration Suggestion System — backend.

Run locally:
    uvicorn app:app --reload --port 8000

Interactive API docs are then available at http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.db import init_db
from routes import weather, recommend, history, analytics, alerts, report

app = FastAPI(
    title="AI-Powered Weather-Based Sensor Calibration Suggestion System",
    description="Analyzes live weather conditions and recommends sensor sensitivity for a Perimeter Intrusion Detection System (PIDS).",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to the deployed frontend origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "sensor-calibration-backend"}


app.include_router(weather.router)
app.include_router(recommend.router)
app.include_router(history.router)
app.include_router(analytics.router)
app.include_router(alerts.router)
app.include_router(report.router)
