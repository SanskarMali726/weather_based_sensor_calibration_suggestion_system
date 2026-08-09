"""
Fetches live weather data from Open-Meteo (https://open-meteo.com), which
requires no API key. Falls back to a small set of preset city coordinates;
pass explicit lat/lon for any other location.
"""
import httpx

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

CITY_COORDS = {
    "Default Sector": (18.648342, 73.761462),   # New Delhi, used as a generic default
    "Sector 4 - North Perimeter": (18.648342, 73.761462),
    "Sector 7 - East Fence Line": (19.0760, 72.8777),   # Mumbai
    "Sector 2 - Coastal Gate": (29.8683, 121.5440),        # Chennai
    "Sector 9 - Ridge Watchtower": (30.7333, 79.0667),     # Uttarakhand hills
}


async def fetch_live_weather(city: str = "Default Sector", lat: float = None, lon: float = None) -> dict:
    """Fetch current weather for a city (or explicit coordinates) from Open-Meteo."""
    if lat is None or lon is None:
        lat, lon = CITY_COORDS.get(city, CITY_COORDS["Default Sector"])

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": ",".join([
            "temperature_2m", "relative_humidity_2m", "precipitation",
            "rain", "surface_pressure", "cloud_cover", "wind_speed_10m",
            "weather_code", "visibility",
        ]),
        "timezone": "auto",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(OPEN_METEO_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    current = data.get("current", {})
    storm_codes = {95, 96, 99}  # Open-Meteo WMO codes for thunderstorm
    weather_code = current.get("weather_code", 0)

    return {
        "city": city,
        "temperature": current.get("temperature_2m", 25.0),
        "humidity": current.get("relative_humidity_2m", 50.0),
        "wind_speed": current.get("wind_speed_10m", 10.0),
        "rainfall": current.get("rain", current.get("precipitation", 0.0)) or 0.0,
        "pressure": current.get("surface_pressure", 1013.0),
        "cloud_cover": current.get("cloud_cover", 0.0),
        "visibility": (current.get("visibility", 10000) or 10000) / 1000,  # metres -> km
        "storm": weather_code in storm_codes,
    }


async def fetch_forecast(city: str = "Default Sector", lat: float = None, lon: float = None, hours: int = 24) -> dict:
    """Fetch an hourly forecast for the next N hours."""
    if lat is None or lon is None:
        lat, lon = CITY_COORDS.get(city, CITY_COORDS["Default Sector"])

    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code",
        "forecast_hours": hours,
        "timezone": "auto",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(OPEN_METEO_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    hourly = data.get("hourly", {})
    times = hourly.get("time", [])
    out = []
    for i, t in enumerate(times):
        out.append({
            "time": t,
            "temperature": hourly.get("temperature_2m", [None] * len(times))[i],
            "humidity": hourly.get("relative_humidity_2m", [None] * len(times))[i],
            "precipitation": hourly.get("precipitation", [None] * len(times))[i],
            "wind_speed": hourly.get("wind_speed_10m", [None] * len(times))[i],
        })
    return {"city": city, "forecast": out}
