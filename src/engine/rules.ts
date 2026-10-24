import type { Context, Failure, HourWeather, Slot } from "~/engine/types";
import {
  BOOKING_MINUTES,
  FORECAST_DAYS,
  WEATHER_LIMITS,
} from "~/engine/config";
import { findVenue } from "~/engine/venues";
import { addDays } from "~/lib/time";

export function checkDate(date: string, ctx: Context): Failure | null {
  if (date < ctx.today) return { rule: "past" };
  if (date >= addDays(ctx.today, FORECAST_DAYS)) return { rule: "too_far" };
  return null;
}

// Every rule a slot must pass, cheapest first. Weather is checked last
// because it may need a forecast.
export async function checkSlot(
  slot: Slot,
  groupSize: number,
  ctx: Context,
): Promise<Failure | null> {
  const venue = findVenue(slot.venueId, ctx.venues);
  const minutes = BOOKING_MINUTES[venue.activity];
  const start = slot.hour * 60;

  const dateFailure = checkDate(slot.date, ctx);
  if (dateFailure) return dateFailure;
  const now = await ctx.nowIn(slot.city);
  if (
    slot.date < now.date ||
    (slot.date === now.date && slot.hour <= now.hour)
  ) {
    return { rule: "past" };
  }
  if (groupSize < 1 || groupSize > venue.capacity) {
    return { rule: "too_many", capacity: venue.capacity };
  }
  if (slot.hour < venue.opensAt || start + minutes > venue.closesAt * 60) {
    return { rule: "closed", opensAt: venue.opensAt, closesAt: venue.closesAt };
  }
  const taken = ctx.bookings.some(
    (booking) =>
      booking.venueId === venue.id &&
      booking.city === slot.city &&
      booking.date === slot.date &&
      booking.hour * 60 < start + minutes &&
      start < booking.hour * 60 + booking.minutes,
  );
  if (taken) return { rule: "taken" };

  return venue.outdoor ? checkWeather(slot, minutes, ctx) : null;
}

function weatherFailure(weather: HourWeather): Failure | null {
  if (weather.apparentTemperature > WEATHER_LIMITS.maxApparentTemperature) {
    return { rule: "heat", weather };
  }
  if (weather.apparentTemperature < WEATHER_LIMITS.minApparentTemperature) {
    return { rule: "cold", weather };
  }
  if (weather.windSpeed > WEATHER_LIMITS.windSpeed) {
    return { rule: "wind", weather };
  }
  if (weather.rainChance > WEATHER_LIMITS.rainChance) {
    return { rule: "rain", weather };
  }
  return null;
}

// Every hour the booking covers must be fine, not just the first.
async function checkWeather(
  slot: Slot,
  minutes: number,
  ctx: Context,
): Promise<Failure | null> {
  for (let offset = 0; offset < Math.ceil(minutes / 60); offset++) {
    const hour = slot.hour + offset;
    const weather = await ctx.getWeather(slot.city, slot.date, hour);
    if (!weather) return { rule: "no_forecast" };
    const failure = weatherFailure(weather);
    if (failure) return failure;
  }
  return null;
}
