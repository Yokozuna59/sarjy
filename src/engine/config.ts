import type { Activity } from "~/engine/types";

// Forecasts are reliable for about a week.
export const FORECAST_DAYS = 7;

export const BOOKING_MINUTES: Record<Activity, number> = {
  padel: 60,
  football: 60,
  cafe: 90,
};

// Outdoor slots must stay within these for every hour they cover.
export const WEATHER_LIMITS = {
  maxApparentTemperature: 35,
  minApparentTemperature: 5,
  maxWindSpeed: 30,
  maxRainChance: 40,
};

export const MAX_OFFERS = 2;
