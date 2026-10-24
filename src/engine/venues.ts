import type { Setting, Venue } from "~/engine/types";

export function settingOf(venue: Venue): Setting {
  return venue.outdoor ? "outdoor" : "indoor";
}

// Fictional sample venues, shown as "Sample venue" in the UI. Every city
// has the same six, so the city's weather is what changes the booking.
export const VENUES: Venue[] = [
  {
    id: "padel-outdoor",
    name: "Open-air Padel Courts",
    activity: "padel",
    outdoor: true,
    opensAt: 8,
    closesAt: 24,
    capacity: 4,
  },
  {
    id: "padel-indoor",
    name: "Indoor Padel Club",
    activity: "padel",
    outdoor: false,
    opensAt: 8,
    closesAt: 24,
    capacity: 4,
  },
  {
    id: "football-outdoor",
    name: "Open-air Football Pitch",
    activity: "football",
    outdoor: true,
    opensAt: 8,
    closesAt: 24,
    capacity: 12,
  },
  {
    id: "football-indoor",
    name: "Indoor Football Arena",
    activity: "football",
    outdoor: false,
    opensAt: 8,
    closesAt: 24,
    capacity: 12,
  },
  {
    id: "cafe-outdoor",
    name: "Open-air Coffee Terrace",
    activity: "cafe",
    outdoor: true,
    opensAt: 8,
    closesAt: 24,
    capacity: 8,
  },
  {
    id: "cafe-indoor",
    name: "Indoor Coffee Lounge",
    activity: "cafe",
    outdoor: false,
    opensAt: 8,
    closesAt: 24,
    capacity: 8,
  },
];
