# 🌦️ Weather-Based Sensor Calibration Suggestion System

> **A-1 Launchpad Case Study Challenge 2026**

An AI-powered decision-support system for **Perimeter Intrusion Detection Systems (PIDS)** that analyzes live weather conditions and recommends sensor sensitivity levels to help reduce weather-related false alarms.

## 🎯 Problem

Strong wind, heavy rainfall, storms, humidity, and extreme temperatures can affect perimeter sensors and increase false alarms.

The system provides operators with:

**Live Weather → Risk Analysis → Sensor Recommendation → Alerts & Analytics**

> The prototype provides recommendations to operators; it does not directly control physical PIDS hardware.

## ✨ Key Features

- 🌤️ Live weather monitoring using **Open-Meteo**
- 🤖 Hybrid **AI + rule-based risk analysis**
- 🎯 Sensor sensitivity: **LOW / MEDIUM / HIGH**
- 📊 Risk score and risk level
- 💡 Explanation for every recommendation
- 🚨 Weather-based alerts
- 📈 Analytics and charts
- 🕘 Recommendation history
- 📄 PDF report generation
- 🌗 Dark / Light dashboard
- 🔄 Automatic data refresh

## 🧠 AI Recommendation Engine

The system uses a **Random Forest regression model** with a rule-based fallback.

### Input Parameters

- Temperature
- Humidity
- Wind Speed
- Rainfall
- Pressure
- Cloud Cover
- Visibility
- Storm condition

### Recommendation

```text
High environmental risk
        ↓
LOW sensitivity

Moderate risk
        ↓
MEDIUM sensitivity

Low environmental risk
        ↓
HIGH sensitivity
```

The ML model is currently trained on **synthetic weather scenarios**. Real PIDS alarm and weather history would be required for production-grade ML training.

## 🏗️ Architecture

```text
Operator
   ↓
React Dashboard
   ↓
FastAPI REST API
   ├── Open-Meteo Weather API
   ├── AI Recommendation Engine
   ├── Analytics & Alerts
   ├── PDF Reports
   └── Database
```

## 🛠️ Tech Stack

**Frontend**
- React
- Vite
- Recharts
- Lucide React

**Backend**
- Python
- FastAPI
- SQLAlchemy
- Pydantic
- HTTPX
- ReportLab

**AI/ML**
- Scikit-learn
- Random Forest
- NumPy
- Joblib

**Database**
- SQLite
- PostgreSQL supported

## 📁 Project Structure

```text
weather_based_sensor_calibration_suggestion_system/
│
├── backend/
│   ├── ai/
│   ├── database/
│   ├── models/
│   ├── routes/
│   ├── schemas/
│   ├── services/
│   ├── app.py
│   └── requirements.txt
│
├── my-react-app/
│   ├── src/
│   ├── public/
│   └── package.json
│
└── README.md
```

## 🔌 Main API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Backend health check |
| GET | `/weather` | Current weather |
| GET | `/forecast` | Weather forecast |
| POST | `/recommend` | Generate recommendation |
| GET | `/history` | Recommendation history |
| GET | `/analytics` | Dashboard analytics |
| GET | `/alerts` | Active alerts |
| GET | `/report` | Generate PDF report |

Interactive API documentation is available at:

```text
http://localhost:8000/docs
```

## 🚀 Installation

### Backend

```bash
cd backend
python -m venv venv
```

Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run:

```bash
uvicorn app:app --reload --port 8000
```

### Frontend

Open another terminal:

```bash
cd my-react-app
npm install
npm run dev
```

Frontend normally runs at:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:8000
```

## 📊 Example

```text
Wind Speed : 42 km/h
Rainfall   : Heavy
Humidity   : 86%
Storm      : Yes

        ↓

Risk Level : HIGH
Risk Score : 88
Sensitivity: LOW

Reason:
High wind and rainfall can increase environmental
movement and false intrusion events.
```

## 🌍 Real-World Applications

The concept can be applied to:

- Airports
- Defense facilities
- Power plants
- Oil & gas facilities
- Ports
- Industrial facilities
- Solar farms
- Large warehouses

## 🚀 Future Scope

- Real PIDS hardware integration
- Multi-zone sensor monitoring
- Training with real historical alarm data
- Forecast-based recommendations
- Operator approval workflow
- Automatic calibration through secure PIDS APIs

## 🏆 Case Study Alignment

The project addresses the A-1 Launchpad requirements for:

- Live weather data
- Weather parameter analysis
- Sensor sensitivity recommendations
- Operator dashboard
- Analytics and reports
- API integration
- Database storage
- AI/ML-based decision support

## 👥 Team

**A-1 Launchpad Case Study Challenge 2026**

Team: `RedX`

Member 1: `Sai Ishwar Ingale`

Member 2: `Sanskar Laxman Mali`

College: `DYPCOE Akurdi Pune`

## 🔗 Links

**GitHub:**  
https://github.com/SanskarMali726/weather_based_sensor_calibration_suggestion_system


**Demo Video:**  https://www.youtube.com/watch?v=abrOQE9n7Kw

## 🙏 Acknowledgements

- [Open-Meteo](https://open-meteo.com/) — Weather data
- React / Vite
- FastAPI
- SQLAlchemy
- Scikit-learn
- Recharts
- ReportLab

---

<p align="center">
  <strong>Weather-Aware Decision Support for Perimeter Security</strong>
</p>
