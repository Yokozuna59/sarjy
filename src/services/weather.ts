import type { HourWeather } from "~/engine/types";
import * as z from "zod";

export interface Place {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
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
        timezone: z.string(),
        population: z.number().optional(),
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

const hourlySchema = z.object({
  hourly: z.object({
    apparent_temperature: z.array(z.number().nullable()),
    wind_speed_10m: z.array(z.number().nullable()),
    precipitation_probability: z.array(z.number().nullable()),
  }),
});

const HOUR = 60 * 60 * 1000;
const cache = new Map<string, { expires: number; data: unknown }>();

// The first match with a known population, so a misheard name doesn't land
// on a village of the same name ("Al Kabar" found one in Yemen).
export async function geocode(name: string): Promise<Place | null> {
  const params = new URLSearchParams({ name, count: "10", language: "en" });
  const data = await fetchJson(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`,
  );
  const { results = [] } = geocodingSchema.parse(data);
  return results.find((place) => place.population) ?? null;
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

// The day comes back in the place's local time, one value per hour, so
// the hour is the index. Every hour of a day shares one cached request.
export async function getHourWeather(
  latitude: number,
  longitude: number,
  date: string,
  hour: number,
): Promise<HourWeather | null> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: "apparent_temperature,wind_speed_10m,precipitation_probability",
    timezone: "auto",
    start_date: date,
    end_date: date,
  });
  const data = await fetchJson(
    `https://api.open-meteo.com/v1/forecast?${params}`,
  );
  const { hourly } = hourlySchema.parse(data);
  const apparentTemperature = hourly.apparent_temperature[hour];
  const windSpeed = hourly.wind_speed_10m[hour];
  if (apparentTemperature == null || windSpeed == null) return null;
  // Rounded here, so the rules check the same number Sarjy says.
  return {
    apparentTemperature: Math.round(apparentTemperature),
    windSpeed: Math.round(windSpeed),
    rainChance: hourly.precipitation_probability[hour] ?? 0,
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
