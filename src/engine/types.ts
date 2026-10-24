export type Activity = "padel" | "football" | "cafe";
export type Setting = "indoor" | "outdoor";
export type Field =
  | "activity"
  | "city"
  | "date"
  | "time"
  | "group_size"
  | "booking_name";

export interface Venue {
  id: string;
  name: string;
  activity: Activity;
  setting: Setting;
  opensAt: number;
  closesAt: number;
  capacity: number;
}

// What the user has told us so far. The keys are snake_case because the
// LLM writes them and reads them back every turn. Dates are YYYY-MM-DD,
// times HH:MM.
export interface Fields {
  activity?: Activity;
  city?: string;
  date?: string;
  time?: string;
  group_size?: number;
  booking_name?: string;
  setting?: Setting;
}

// The flow as data: the fields to collect, in order, and how to ask.
export interface FieldSpec {
  name: Field;
  ask: { en: string };
}

export interface FlowSpec {
  fields: FieldSpec[];
}

// One bookable hour at one venue in one city.
export interface Slot {
  venueId: string;
  city: string;
  date: string;
  hour: number;
}

// A slot someone booked, or the draft waiting for their yes.
export interface Booking extends Slot {
  minutes: number;
  groupSize: number;
  name: string;
}

export interface HourWeather {
  apparentTemperature: number;
  windSpeed: number;
  rainChance: number;
}

export interface FlowState {
  status: "idle" | "collecting" | "offering" | "confirming";
  fields: Fields;
  pending: Field | null;
  offers: Slot[];
  draft: Booking | null;
}

// The booking part of what the LLM understood from one message.
// offer_index counts from 0.
export interface BookingInput {
  intent: "booking" | "choose_offer" | "confirm" | "deny" | "cancel" | "other";
  fields: {
    activity: Activity | null;
    city: string | null;
    date: string | null;
    time: string | null;
    group_size: number | null;
    booking_name: string | null;
    setting: Setting | null;
  };
  offer_index: number | null;
}

// Everything from the outside world, so the engine runs without a network.
export interface Context {
  // Riyadh's date, for the forecast window and "today" in replies.
  today: string;
  // The date and hour now in the city, to tell if a slot has passed.
  nowIn: (city: string) => Promise<{ date: string; hour: number }>;
  venues: Venue[];
  bookings: Booking[];
  userName: string | null;
  userCity: string | null;
  // The city's proper name, or null if there's no such place.
  findCity: (name: string) => Promise<string | null>;
  // Hours are local to the city.
  getWeather: (
    city: string,
    date: string,
    hour: number,
  ) => Promise<HourWeather | null>;
}

export type Failure =
  | { rule: "unknown_city" }
  | { rule: "past" }
  | { rule: "too_far" }
  | { rule: "not_on_hour" }
  | { rule: "too_many"; capacity: number }
  | { rule: "closed"; opensAt: number; closesAt: number }
  | { rule: "taken" }
  | { rule: "heat" | "cold" | "wind" | "rain"; weather: HourWeather }
  | { rule: "no_forecast" };

export type Action =
  | { type: "ask"; field: Field; failure: Failure | null }
  | { type: "offer"; offers: Slot[]; failure: Failure | null }
  | { type: "confirm"; booking: Booking; weather: HourWeather | null }
  | { type: "booked"; booking: Booking }
  | { type: "cancelled" }
  | { type: "none" };

export interface StepResult {
  state: FlowState;
  action: Action;
}
