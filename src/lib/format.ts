// "Sat 24 Oct"
export function shortDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

// Minutes after midnight as "8 PM" or "9:30 PM".
export function clockTime(minutes: number) {
  const hour = Math.floor(minutes / 60) % 24;
  const rest = minutes % 60;
  const suffix = hour < 12 ? "AM" : "PM";
  const twelveHour = hour % 12 || 12;
  return rest
    ? `${twelveHour}:${String(rest).padStart(2, "0")} ${suffix}`
    : `${twelveHour} ${suffix}`;
}

export function peopleText(count: number) {
  return count === 1 ? "1 person" : `${count} people`;
}
