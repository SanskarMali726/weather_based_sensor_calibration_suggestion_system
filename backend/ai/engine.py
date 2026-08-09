"""
AI Recommendation Engine.

Hybrid scoring model for the Perimeter Intrusion Detection System (PIDS):
a trained regression model predicts the risk score, with the original
rule-based scorer kept as (a) an automatic fallback if the trained model
file is missing or fails to load, and (b) the source of the human-readable
"reason" text and the label generator used to train the model in the
first place (see train_model.py).

`generate_recommendation()` is still the only function the routes depend
on, and its signature and return type (RecommendationResult) are
unchanged, so nothing calling this module needs to change.
"""
import logging
import random
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

# Order matters — train_model.py builds its feature matrix in this same order.
FEATURE_ORDER = [
    "temperature", "humidity", "wind_speed", "rainfall",
    "pressure", "cloud_cover", "visibility", "storm",
]

_MODEL_PATH = Path(__file__).resolve().parent / "risk_model.joblib"
_model = None
_model_load_error = None

try:
    import joblib
    if _MODEL_PATH.exists():
        _model = joblib.load(_MODEL_PATH)
    else:
        _model_load_error = f"no model file at {_MODEL_PATH} (run train_model.py to create it)"
except Exception as exc:  # pragma: no cover - defensive; keeps the API usable without sklearn installed
    _model = None
    _model_load_error = str(exc)

if _model is None:
    logger.warning("Trained risk model unavailable (%s) -- using rule-based scoring instead.", _model_load_error)


@dataclass
class RecommendationResult:
    sensitivity: str      # LOW | MEDIUM | HIGH
    risk_score: int        # 0-100
    risk_level: str         # LOW | MEDIUM | HIGH
    confidence: int          # 0-100
    reason: str


def _clamp(value, lo, hi):
    return max(lo, min(hi, value))


def _rule_based_risk(temperature, humidity, wind_speed, rainfall, pressure, cloud_cover, visibility, storm):
    """Domain-expert heuristic. Used as the fallback scorer when no trained
    model is available, to build the human-readable explanation regardless
    of which scorer produced the risk number, and to label the synthetic
    training set in train_model.py. Keep this in sync in only one place —
    everything else reads from it."""
    risk = 0
    reasons = []

    if wind_speed >= 35:
        risk += 34
        reasons.append(f"high wind ({wind_speed:.0f} km/h) increases vegetation and debris movement along the perimeter")
    elif wind_speed >= 20:
        risk += 16
        reasons.append(f"moderate wind ({wind_speed:.0f} km/h) may cause minor sensor drift")

    if rainfall >= 8:
        risk += 28
        reasons.append(f"heavy rainfall ({rainfall:.1f} mm/h) raises the chance of water-triggered false positives")
    elif rainfall >= 2:
        risk += 12
        reasons.append("light rain is present")

    if storm:
        risk += 30
        reasons.append("storm activity detected in the sector")

    if humidity >= 80:
        risk += 10
        reasons.append(f"high humidity ({humidity:.0f}%) can affect infrared sensor accuracy")

    if temperature >= 40 or temperature <= 2:
        risk += 10
        reasons.append(f"extreme temperature ({temperature:.0f}°C) is outside optimal sensor range")

    if visibility <= 3:
        risk += 8
        reasons.append(f"low visibility ({visibility:.1f} km) reduces confirmation reliability")

    return risk, reasons


def _bucket(risk: int):
    if risk >= 65:
        return "LOW", "HIGH"
    if risk >= 32:
        return "MEDIUM", "MEDIUM"
    return "HIGH", "LOW"


def generate_recommendation(
    temperature: float,
    humidity: float,
    wind_speed: float,
    rainfall: float,
    pressure: float,
    cloud_cover: float = 0.0,
    visibility: float = 10.0,
    storm: bool = False,
) -> RecommendationResult:
    rule_risk, reasons = _rule_based_risk(
        temperature, humidity, wind_speed, rainfall, pressure, cloud_cover, visibility, storm
    )

    model_used = False
    tree_spread = None

    if _model is not None:
        try:
            features = [[temperature, humidity, wind_speed, rainfall, pressure, cloud_cover, visibility, float(storm)]]
            predicted = float(_model.predict(features)[0])
            if hasattr(_model, "estimators_"):
                # Spread across the forest's individual trees is a cheap, honest
                # proxy for how confident the ensemble is about this reading.
                tree_preds = [float(t.predict(features)[0]) for t in _model.estimators_]
                tree_spread = max(tree_preds) - min(tree_preds)
            risk = int(_clamp(round(predicted), 2, 98))
            model_used = True
        except Exception:
            logger.exception("Model prediction failed, falling back to rule-based score for this request.")
            risk = int(_clamp(round(rule_risk + random.uniform(-2, 2)), 2, 98))
    else:
        risk = int(_clamp(round(rule_risk + random.uniform(-2, 2)), 2, 98))

    sensitivity, risk_level = _bucket(risk)

    if reasons:
        lead = reasons[0][0].upper() + reasons[0][1:]
        tail = f", combined with {' and '.join(reasons[1:])}" if len(reasons) > 1 else ""
        reason = (
            f"{lead}{tail}. Recommended sensor sensitivity is set to {sensitivity.lower()} "
            f"to reduce false intrusion alarms while preserving perimeter coverage."
        )
    else:
        reason = (
            "Conditions are within normal range across all monitored parameters. "
            "Sensitivity can remain at its highest setting for maximum detection coverage."
        )

    if model_used and tree_spread is not None:
        confidence = int(_clamp(round(96 - tree_spread * 1.3), 61, 98))
    else:
        confidence = int(_clamp(round(92 - risk * 0.15 + random.uniform(-3, 3)), 61, 98))

    return RecommendationResult(
        sensitivity=sensitivity,
        risk_score=risk,
        risk_level=risk_level,
        confidence=confidence,
        reason=reason,
    )


def generate_alerts(city: str, weather, risk_score: int):
    """Return a list of alert dicts derived from threshold breaches. Not persisted here."""
    alerts = []
    if weather.wind_speed >= 35:
        alerts.append({"city": city, "type": "High Wind", "message": f"Sustained wind at {weather.wind_speed:.0f} km/h", "priority": "HIGH"})
    if weather.rainfall >= 8:
        alerts.append({"city": city, "type": "Heavy Rain", "message": f"Rainfall at {weather.rainfall:.1f} mm/h", "priority": "HIGH"})
    if weather.storm:
        alerts.append({"city": city, "type": "Storm Warning", "message": "Active storm cell over sector", "priority": "CRITICAL"})
    if weather.temperature >= 40 or weather.temperature <= 2:
        alerts.append({"city": city, "type": "Extreme Temperature", "message": f"{weather.temperature:.0f}°C recorded", "priority": "MEDIUM"})
    if risk_score >= 75:
        alerts.append({"city": city, "type": "High Risk", "message": f"Risk score at {risk_score}", "priority": "CRITICAL"})
    return alerts
