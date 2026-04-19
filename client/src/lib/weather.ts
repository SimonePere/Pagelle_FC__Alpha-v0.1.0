/**
 * Wrapper per Open-Meteo (https://open-meteo.com).
 * Servizio gratuito, NO API key richiesta, no rate limit consumer.
 */

export interface WeatherSnapshot {
  temperatureC: number;
  weatherCode: number;
  description: string;
  icon: string; // emoji semplice
  city: string;
}

interface GeoResult {
  latitude: number;
  longitude: number;
  name: string;
  country?: string;
}

async function geocode(city: string): Promise<GeoResult | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city
  )}&count=1&language=it&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  return data.results[0];
}

/**
 * Mappa WMO weather code -> { description italiana, emoji }.
 * Reference: https://open-meteo.com/en/docs (sezione Weather variable documentation)
 */
function describeCode(code: number): { description: string; icon: string } {
  if (code === 0) return { description: "Sereno", icon: "☀️" };
  if ([1, 2].includes(code)) return { description: "Poco nuvoloso", icon: "🌤️" };
  if (code === 3) return { description: "Nuvoloso", icon: "☁️" };
  if ([45, 48].includes(code)) return { description: "Nebbia", icon: "🌫️" };
  if ([51, 53, 55, 56, 57].includes(code)) return { description: "Pioggerella", icon: "🌦️" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return { description: "Pioggia", icon: "🌧️" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { description: "Neve", icon: "❄️" };
  if ([95, 96, 99].includes(code)) return { description: "Temporale", icon: "⛈️" };
  return { description: "Variabile", icon: "🌥️" };
}

export async function getCurrentWeather(city: string): Promise<WeatherSnapshot | null> {
  try {
    const geo = await geocode(city);
    if (!geo) return null;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m,weather_code&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const code = data.current?.weather_code ?? 0;
    const desc = describeCode(code);
    return {
      temperatureC: Math.round(data.current?.temperature_2m ?? 0),
      weatherCode: code,
      description: desc.description,
      icon: desc.icon,
      city: geo.name,
    };
  } catch (e) {
    console.error("[weather] getCurrentWeather error", e);
    return null;
  }
}

/**
 * Restituisce un riassunto previsto per una specifica data (YYYY-MM-DD).
 * Open-Meteo supporta forecast fino a ~16 giorni.
 */
export async function getForecastForDate(
  city: string,
  dateISO: string
): Promise<WeatherSnapshot | null> {
  try {
    const geo = await geocode(city);
    if (!geo) return null;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&daily=temperature_2m_max,weather_code&start_date=${dateISO}&end_date=${dateISO}&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.daily?.time?.length) return null;
    const code = data.daily.weather_code?.[0] ?? 0;
    const temp = data.daily.temperature_2m_max?.[0] ?? 0;
    const desc = describeCode(code);
    return {
      temperatureC: Math.round(temp),
      weatherCode: code,
      description: desc.description,
      icon: desc.icon,
      city: geo.name,
    };
  } catch (e) {
    console.error("[weather] getForecastForDate error", e);
    return null;
  }
}

/** Verifica che la data sia entro la finestra di forecast supportata (16 giorni). */
export function isWithinForecastWindow(dateISO: string): boolean {
  const target = new Date(dateISO).getTime();
  const now = Date.now();
  const sixteenDays = 16 * 24 * 60 * 60 * 1000;
  return target >= now - 24 * 60 * 60 * 1000 && target <= now + sixteenDays;
}
