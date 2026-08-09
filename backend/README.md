# Sensor Calibration Backend

FastAPI backend for the AI-Powered Weather-Based Sensor Calibration Suggestion System.

## Setup

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

Docs: http://localhost:8000/docs
SQLite database file `sensor_calibration.db` is created automatically on first run.

To use PostgreSQL instead, set an environment variable before starting:

```bash
export DATABASE_URL="postgresql://user:password@host:5432/sensor_calibration"
```

## API

| Method | Endpoint       | Description                                             |
|--------|----------------|-----------------------------------------------------------|
| GET    | `/weather`     | Fetch and store live weather for a city (Open-Meteo)     |
| GET    | `/forecast`    | Hourly forecast, up to 48 hours ahead                    |
| POST   | `/recommend`   | Run the AI engine and store a recommendation + alerts    |
| GET    | `/history`     | Recommendation history, filterable by city / search text |
| GET    | `/analytics`   | Aggregated stats, risk trend, weather trend               |
| GET    | `/alerts`      | Active alerts, filterable by city                         |
| GET    | `/report`      | Downloadable PDF summary for the latest recommendation    |

## Recommendation logic

Implemented in `ai/engine.py`. Weighted rule-based scoring over wind speed,
rainfall, storm presence, humidity, temperature, and visibility produces a
risk score (0-100), which maps to a sensitivity tier:

- Risk ≥ 65 → **LOW** sensitivity
- Risk 32–64 → **MEDIUM** sensitivity
- Risk < 32 → **HIGH** sensitivity

`generate_recommendation()` is the single call site the routes depend on, so
swapping in a trained ML model later requires no route changes.

## Folder structure

```
backend/
├── app.py                 FastAPI entrypoint, CORS, router registration
├── routes/                One module per endpoint group
├── models/models.py       SQLAlchemy ORM tables (Weather, Recommendation, Alert)
├── schemas/schemas.py     Pydantic request/response models
├── database/db.py         Engine, session, init_db()
├── ai/engine.py            Recommendation + alert generation logic
├── services/
│   ├── weather_service.py    Open-Meteo live weather + forecast client
│   ├── analytics_service.py  Aggregation queries for /analytics
│   └── report_service.py     PDF report builder (reportlab)
└── requirements.txt
```
