import type { Context, Setting, Slot } from "~/engine/types";
import { MAX_OFFERS } from "~/engine/config";
import { checkSlot } from "~/engine/rules";
import { findVenue, settingOf } from "~/engine/venues";
import { addDays } from "~/lib/time";

// Slots near the request that pass every rule: every open hour that day
// at each venue for the activity, then the same slot the next day.
// The closest comes first, then the closest outdoor one, so a hot 4 PM
// becomes "indoor at 4, or outdoor at 8" instead of a plain no.
export async function findOffers(
  request: Slot,
  groupSize: number,
  setting: Setting | undefined,
  ctx: Context,
): Promise<Slot[]> {
  const requested = findVenue(request.venueId, ctx.venues);
  const venues = [
    requested,
    ...ctx.venues.filter(
      (venue) =>
        venue.activity === requested.activity &&
        venue.id !== requested.id &&
        (!setting || settingOf(venue) === setting),
    ),
  ];

  const candidates: Slot[] = [];
  for (const venue of venues) {
    for (let hour = venue.opensAt; hour < venue.closesAt; hour++) {
      const isRequest = venue.id === request.venueId && hour === request.hour;
      if (!isRequest) {
        candidates.push({ ...request, venueId: venue.id, hour });
      }
    }
  }
  candidates.push({ ...request, date: addDays(request.date, 1) });

  const passing: Slot[] = [];
  for (const slot of candidates) {
    if (!(await checkSlot(slot, groupSize, ctx))) passing.push(slot);
  }
  // sort keeps the original order on ties, so the requested venue wins.
  passing.sort((a, b) => distance(a, request) - distance(b, request));

  const [closest] = passing;
  if (!closest) return [];
  const outdoor = passing.find(
    (slot) => slot !== closest && findVenue(slot.venueId, ctx.venues).outdoor,
  );
  const rest = passing.filter((slot) => slot !== closest && slot !== outdoor);
  return [closest, ...(outdoor ? [outdoor] : []), ...rest].slice(0, MAX_OFFERS);
}

// Hours away from the request. Another day counts as a full day away.
function distance(slot: Slot, request: Slot) {
  const days = slot.date === request.date ? 0 : 24;
  return Math.abs(slot.hour - request.hour) + days;
}
