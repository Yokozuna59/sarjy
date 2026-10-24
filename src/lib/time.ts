const TIME_ZONE = "Asia/Riyadh";

// The formats the LLM is asked for: YYYY-MM-DD and 24-hour HH:MM.
export const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_FORMAT = /^([01]\d|2[0-3]):[0-5]\d$/;

// YYYY-MM-DD in a time zone (Riyadh by default), wherever the server runs.
export function today(timeZone = TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export function currentHour(timeZone = TIME_ZONE): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  }).format(new Date());
  return Number(hour);
}

export function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

// "Saturday"
export function weekday(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

// "Sat 24 Oct"
export function shortDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

// Minutes after midnight as "8 PM", "9:30 PM", "noon" or "midnight".
export function clockTime(minutes: number): string {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  if (minute === 0 && hour === 0) return "midnight";
  if (minute === 0 && hour === 12) return "noon";
  const suffix = hour < 12 ? "AM" : "PM";
  const twelveHour = hour % 12 || 12;
  return minute
    ? `${twelveHour}:${String(minute).padStart(2, "0")} ${suffix}`
    : `${twelveHour} ${suffix}`;
}
