import httpx

from settings import settings


async def get_current_weather():
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": settings.weather_lat,
        "longitude": settings.weather_lon,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,surface_pressure,wind_speed_10m,weather_code",
        "timezone": settings.weather_timezone,
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            current = response.json()["current"]
            return {
                "temp": round(current["temperature_2m"]),
                "feels_like": round(current["apparent_temperature"]),
                "humidity": current["relative_humidity_2m"],
                "pressure": round(current["surface_pressure"]),
                "wind_speed": round(current["wind_speed_10m"]),
                "precipitation": current["precipitation"],
                "condition_code": current["weather_code"],
            }
        except Exception as exc:
            print(f"Weather API error: {exc}")
            return None
