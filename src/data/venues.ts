import type { Venue } from "~/engine/types";

// The engine gets its venues through ctx, so the list is passed in.
export function findVenue(venueId: string, venues: Venue[]): Venue {
  const venue = venues.find((each) => each.id === venueId);
  if (!venue) throw new Error(`Unknown venue: ${venueId}`);
  return venue;
}

// Fictional sample venues, shown as "Sample venue" in the UI. Every city
// has the same six, so the city's weather is what changes the booking.
export const VENUES: Venue[] = [
  {
    id: "padel-outdoor",
    name: "Open-air Padel Courts",
    activity: "padel",
    setting: "outdoor",
    opensAt: 8,
    closesAt: 24,
    capacity: 4,
  },
  {
    id: "padel-indoor",
    name: "Indoor Padel Club",
    activity: "padel",
    setting: "indoor",
    opensAt: 8,
    closesAt: 24,
    capacity: 4,
  },
  {
    id: "football-outdoor",
    name: "Open-air Football Pitch",
    activity: "football",
    setting: "outdoor",
    opensAt: 8,
    closesAt: 24,
    capacity: null,
  },
  {
    id: "football-indoor",
    name: "Indoor Football Arena",
    activity: "football",
    setting: "indoor",
    opensAt: 8,
    closesAt: 24,
    capacity: null,
  },
  {
    id: "cafe-outdoor",
    name: "Open-air Coffee Terrace",
    activity: "cafe",
    setting: "outdoor",
    opensAt: 8,
    closesAt: 24,
    capacity: 8,
  },
  {
    id: "cafe-indoor",
    name: "Indoor Coffee Lounge",
    activity: "cafe",
    setting: "indoor",
    opensAt: 8,
    closesAt: 24,
    capacity: 8,
  },
];
