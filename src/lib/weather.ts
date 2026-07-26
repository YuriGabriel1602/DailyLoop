export interface WeatherLocation {
  lat: number;
  lon: number;
  city: string;
  source: "geo" | "fallback";
}

export interface CurrentWeather {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
}

const STORAGE_KEY = "dailyloop:weather-location";

const FALLBACK_LOCATION: WeatherLocation = {
  lat: -30.0346,
  lon: -51.2177,
  city: "Porto Alegre, BR",
  source: "fallback",
};

function getCachedLocation(): WeatherLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WeatherLocation) : null;
  } catch {
    return null;
  }
}

export function clearCachedLocation() {
  localStorage.removeItem(STORAGE_KEY);
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`,
    );
    if (!res.ok) throw new Error("reverse geocode failed");
    const data = await res.json();
    const city = data.city || data.locality;
    return city ? `${city}${data.countryCode ? `, ${data.countryCode}` : ""}` : "Sua localização";
  } catch {
    return "Sua localização";
  }
}

export async function resolveLocation(): Promise<WeatherLocation> {
  const cached = getCachedLocation();
  if (cached) return cached;

  if (!navigator.geolocation) return FALLBACK_LOCATION;

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
    });
    const { latitude, longitude } = position.coords;
    const city = await reverseGeocode(latitude, longitude);
    const location: WeatherLocation = { lat: latitude, lon: longitude, city, source: "geo" };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
    return location;
  } catch {
    return FALLBACK_LOCATION;
  }
}

export async function fetchCurrentWeather(lat: number, lon: number): Promise<CurrentWeather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("weather fetch failed");
  const data = await res.json();
  return {
    temperature: Math.round(data.current.temperature_2m),
    humidity: Math.round(data.current.relative_humidity_2m),
    windSpeed: Math.round(data.current.wind_speed_10m),
    weatherCode: data.current.weather_code,
  };
}

export interface ForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
}

export async function fetchForecast(lat: number, lon: number): Promise<ForecastDay[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=3&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("forecast fetch failed");
  const data = await res.json();
  return data.daily.time.map((date: string, i: number) => ({
    date,
    tempMax: Math.round(data.daily.temperature_2m_max[i]),
    tempMin: Math.round(data.daily.temperature_2m_min[i]),
    weatherCode: data.daily.weather_code[i],
  }));
}

// WMO weather interpretation codes: https://open-meteo.com/en/docs
export function describeWeatherCode(code: number): { label: string; icon: "sun" | "cloud-sun" | "cloud" | "fog" | "drizzle" | "rain" | "snow" | "storm" } {
  if (code === 0) return { label: "Céu limpo", icon: "sun" };
  if (code === 1) return { label: "Poucas nuvens", icon: "cloud-sun" };
  if (code === 2) return { label: "Parcialmente nublado", icon: "cloud-sun" };
  if (code === 3) return { label: "Nublado", icon: "cloud" };
  if (code === 45 || code === 48) return { label: "Neblina", icon: "fog" };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: "Garoa", icon: "drizzle" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: "Chuva", icon: "rain" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: "Neve", icon: "snow" };
  if ([95, 96, 99].includes(code)) return { label: "Trovoada", icon: "storm" };
  return { label: "Tempo indefinido", icon: "cloud" };
}
