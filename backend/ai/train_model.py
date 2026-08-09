"""
Train the perimeter-risk regression model used by engine.py.

Run once (or whenever you want to regenerate the model):
    python train_model.py

It writes risk_model.joblib next to this file. engine.py loads that file
automatically at import time; if it's missing, engine.py just falls back
to its rule-based scorer, so the app keeps working either way.

Approach: there's no historical dataset of "correct" sensor sensitivity
decisions to learn from, so we bootstrap one. `engine._rule_based_risk`
already encodes the domain thresholds from the case study (high wind ->
lower sensitivity, heavy rain -> medium, etc). We sample a large number of
realistic synthetic weather readings, label each with that rule-based risk
score plus Gaussian noise (so the model learns a smoother relationship
instead of memorizing hard cutoffs), and train a RandomForestRegressor on
top. The result is a genuinely trained model whose behaviour still traces
back to documented domain logic — easy to explain in a report, and easy to
validate with a held-out test set.
"""
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

from engine import FEATURE_ORDER, _clamp, _rule_based_risk

N_SAMPLES = 6000
RNG = np.random.default_rng(42)


def make_dataset(n=N_SAMPLES):
    temperature = RNG.uniform(-5, 45, n)
    humidity = RNG.uniform(20, 100, n)
    wind_speed = np.clip(RNG.exponential(12, n), 0, 80)
    rainfall = np.clip(RNG.exponential(2.5, n), 0, 25)
    pressure = RNG.uniform(980, 1030, n)
    cloud_cover = RNG.uniform(0, 100, n)
    visibility = np.clip(RNG.exponential(6, n), 0.2, 15)
    storm = RNG.random(n) < 0.08

    X = np.column_stack([
        temperature, humidity, wind_speed, rainfall,
        pressure, cloud_cover, visibility, storm.astype(float),
    ])

    y = np.empty(n)
    for i in range(n):
        risk, _ = _rule_based_risk(
            temperature[i], humidity[i], wind_speed[i], rainfall[i],
            pressure[i], cloud_cover[i], visibility[i], bool(storm[i]),
        )
        noisy = risk + RNG.normal(0, 4)
        y[i] = _clamp(noisy, 2, 98)

    return X, y


def main():
    X, y = make_dataset()
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=200, max_depth=8, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    print(f"Validation MAE: {mae:.2f} risk points")
    print(f"Validation R^2: {r2:.3f}")
    print("Feature importances:")
    for name, imp in sorted(zip(FEATURE_ORDER, model.feature_importances_), key=lambda t: -t[1]):
        print(f"  {name:12s} {imp:.3f}")

    out_path = Path(__file__).resolve().parent / "risk_model.joblib"
    joblib.dump(model, out_path)
    print(f"Saved model to {out_path}")


if __name__ == "__main__":
    main()
