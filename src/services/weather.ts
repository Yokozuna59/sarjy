import * as z from "zod";

export interface Place {
  name: string;
  latitude: number;
  longitude: number;
}

export interface DayForecast {
  high: number;
  low: number;
  rainChance: number;
}

const geocodingSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
      }),
    )
    .optional(),
});

const forecastSchema = z.object({
  daily: z.object({
    temperature_2m_max: z.array(z.number()).min(1),
    temperature_2m_min: z.array(z.number()).min(1),
    precipitation_probability_max: z.array(z.number().nullable()).min(1),
  }),
});

const HOUR = 60 * 60 * 1000;
const cache = new Map<string, { expires: number; data: unknown }>();

export async function geocode(name: string): Promise<Place | null> {
  const params = new URLSearchParams({ name, count: "1", language: "en" });
  const data = await fetchJson(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`,
  );
  return geocodingSchema.parse(data).results?.[0] ?? null;
}

export async function getDayForecast(
  place: Place,
  date: string,
): Promise<DayForecast> {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    start_date: date,
    end_date: date,
  });
  const data = await fetchJson(
    `https://api.open-meteo.com/v1/forecast?${params}`,
  );
  const { daily } = forecastSchema.parse(data);
  return {
    high: daily.temperature_2m_max[0],
    low: daily.temperature_2m_min[0],
    rainChance: daily.precipitation_probability_max[0] ?? 0,
  };
}

async function fetchJson(url: string): Promise<unknown> {
  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) return cached.data;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo answered ${response.status}`);
  }
  const data = await response.json();
  cache.set(url, { expires: Date.now() + HOUR, data });
  return data;
}
