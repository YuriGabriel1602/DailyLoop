import httpx

# Coordenadas: Porto Alegre (Pode ajustar se necessário)
LAT = "-30.0346"
LON = "-51.2177"

async def get_current_weather():
    # URL da API Open-Meteo (Gratuita e sem chave)
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": LAT,
        "longitude": LON,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,surface_pressure,wind_speed_10m,weather_code",
        "timezone": "America/Sao_Paulo"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            c = data["current"]
            
            # Mapeamento limpo para o Frontend
            return {
                "temp": round(c["temperature_2m"]),
                "feels_like": round(c["apparent_temperature"]),
                "humidity": c["relative_humidity_2m"],
                "pressure": round(c["surface_pressure"]),
                "wind_speed": round(c["wind_speed_10m"]),
                "precipitation": c["precipitation"],
                "condition_code": c["weather_code"]
            }
        except Exception as e:
            print(f"Erro Weather API: {e}")
            return None # Retorna nulo para o front tratar
