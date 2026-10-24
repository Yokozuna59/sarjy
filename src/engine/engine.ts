import type {
  Action,
  Activity,
  Booking,
  BookingInput,
  Context,
  Failure,
  Field,
  Fields,
  FlowState,
  Setting,
  Slot,
  StepResult,
  Venue,
} from "~/engine/types";
import { findOffers } from "~/engine/alternatives";
import { BOOKING_MINUTES } from "~/engine/config";
import { bookVenue } from "~/engine/flows/book-venue";
import { checkDate, checkSlot } from "~/engine/rules";
import { findVenue, settingOf } from "~/engine/venues";

export const IDLE: FlowState = {
  status: "idle",
  fields: {},
  pending: null,
  offers: [],
  draft: null,
};

// One user turn: merge what they said, check it, decide what happens next.
export async function step(
  state: FlowState,
  input: BookingInput,
  ctx: Context,
): Promise<StepResult> {
  if (state.status === "idle" && input.intent !== "booking") {
    return { state, action: { type: "none" } };
  }
  if (input.intent === "cancel") {
    return { state: IDLE, action: { type: "cancelled" } };
  }

  const said = cleanFields(input.fields);
  const saidNothing = Object.keys(said).length === 0;
  const offer = chosenOffer(state, input);

  if (saidNothing && !offer) {
    if (state.status === "confirming" && state.draft) {
      if (input.intent === "confirm") {
        return book(state.fields, state.draft, ctx);
      }
      if (input.intent === "deny") {
        return { state: IDLE, action: { type: "cancelled" } };
      }
    }
    if (state.status === "offering" && input.intent === "deny") {
      return ask("time", { ...state.fields, time: undefined });
    }
    // A side question or small talk leaves the booking where it was.
    if (input.intent !== "booking") return { state, action: { type: "none" } };
  }

  // Keep the venue the user already saw or picked, unless they change
  // the activity or the setting.
  let venueId = offer?.venueId ?? state.draft?.venueId ?? null;
  if (said.activity || said.setting) venueId = null;

  let fields: Fields = { ...state.fields };
  if (offer) {
    fields = { ...fields, date: offer.date, time: toTime(offer.hour) };
  }
  // Corrections overwrite, so "make it Thursday" just replaces the date.
  fields = { ...fields, ...said };
  if (!fields.booking_name && ctx.userName) {
    fields.booking_name = ctx.userName;
  }
  if (!fields.city && ctx.userCity) fields.city = ctx.userCity;

  if (said.city) {
    const city = await ctx.findCity(said.city);
    if (!city) {
      const failure: Failure = { rule: "unknown_city" };
      return ask("city", { ...fields, city: undefined }, failure);
    }
    fields.city = city;
  }
  if (fields.date) {
    const failure = checkDate(fields.date, ctx);
    if (failure) return ask("date", { ...fields, date: undefined }, failure);
  }
  if (fields.time && !fields.time.endsWith(":00")) {
    const failure: Failure = { rule: "not_on_hour" };
    return ask("time", { ...fields, time: undefined }, failure);
  }

  const missing = bookVenue.fields.find((field) => !fields[field.name]);
  if (missing) return ask(missing.name, fields);

  const { activity, city, date, time, group_size, booking_name } = fields;
  if (!activity || !city || !date || !time || !group_size || !booking_name) {
    throw new Error("The flow spec is missing a field");
  }

  const venue = venueId
    ? findVenue(venueId, ctx.venues)
    : pickVenue(activity, fields.setting, ctx);
  const draft: Booking = {
    venueId: venue.id,
    city,
    date,
    hour: toHour(time),
    minutes: BOOKING_MINUTES[activity],
    groupSize: group_size,
    name: booking_name,
  };
  return decide(fields, draft, ctx);
}

// The step to repeat after a side question, without checking again.
export function resume(state: FlowState): Action {
  if (state.status === "collecting" && state.pending) {
    return { type: "ask", field: state.pending, failure: null };
  }
  if (state.status === "offering") {
    return { type: "offer", offers: state.offers, failure: null };
  }
  if (state.status === "confirming" && state.draft) {
    return { type: "confirm", booking: state.draft, weather: null };
  }
  return { type: "none" };
}

// A wrong time or group size is asked again. Bad weather or a taken slot
// gets the nearest slots that work, never a silent switch of venue.
async function decide(
  fields: Fields,
  draft: Booking,
  ctx: Context,
): Promise<StepResult> {
  const failure = await checkSlot(draft, draft.groupSize, ctx);
  if (!failure) return confirm(fields, draft, ctx);
  if (failure.rule === "too_many") {
    return ask("group_size", { ...fields, group_size: undefined }, failure);
  }
  if (failure.rule === "past" || failure.rule === "closed") {
    return ask("time", { ...fields, time: undefined }, failure);
  }

  const { venueId, city, date, hour } = draft;
  const offers = await findOffers(
    { venueId, city, date, hour },
    draft.groupSize,
    fields.setting,
    ctx,
  );
  // Nothing works that day, so ask for another one.
  if (offers.length === 0) {
    return ask("date", { ...fields, date: undefined }, failure);
  }
  return {
    state: { status: "offering", fields, pending: null, offers, draft: null },
    action: { type: "offer", offers, failure },
  };
}

async function confirm(
  fields: Fields,
  booking: Booking,
  ctx: Context,
): Promise<StepResult> {
  const venue = findVenue(booking.venueId, ctx.venues);
  const weather = venue.outdoor
    ? await ctx.getWeather(booking.city, booking.date, booking.hour)
    : null;
  return {
    state: {
      status: "confirming",
      fields,
      pending: null,
      offers: [],
      draft: booking,
    },
    action: { type: "confirm", booking, weather },
  };
}

// Check again before booking, in case the slot was taken or the
// forecast changed since the user saw it.
async function book(
  fields: Fields,
  draft: Booking,
  ctx: Context,
): Promise<StepResult> {
  const failure = await checkSlot(draft, draft.groupSize, ctx);
  if (failure) return decide(fields, draft, ctx);
  return { state: IDLE, action: { type: "booked", booking: draft } };
}

function ask(
  field: Field,
  fields: Fields,
  failure: Failure | null = null,
): StepResult {
  return {
    state: {
      status: "collecting",
      fields,
      pending: field,
      offers: [],
      draft: null,
    },
    action: { type: "ask", field, failure },
  };
}

function chosenOffer(state: FlowState, input: BookingInput): Slot | undefined {
  if (state.status !== "offering") return undefined;
  if (input.intent === "choose_offer" && input.offer_index !== null) {
    return state.offers[input.offer_index];
  }
  // A plain "yes" takes the offer when there's only one.
  if (input.intent === "confirm" && state.offers.length === 1) {
    return state.offers[0];
  }
  return undefined;
}

// Outdoor unless the user asked for indoor: these are outdoor plans, and
// the weather decides.
function pickVenue(
  activity: Activity,
  setting: Setting | undefined,
  ctx: Context,
): Venue {
  const wanted = setting ?? "outdoor";
  const venue = ctx.venues.find(
    (each) => each.activity === activity && settingOf(each) === wanted,
  );
  if (!venue) throw new Error(`No ${wanted} venue for ${activity}`);
  return venue;
}

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const TIME_FORMAT = /^([01]\d|2[0-3]):[0-5]\d$/;

// Keeps only the values the user actually gave, in a format we trust.
function cleanFields(input: BookingInput["fields"]): Fields {
  const fields: Fields = {};
  if (input.activity) fields.activity = input.activity;
  if (input.city) fields.city = input.city;
  if (input.date && DATE_FORMAT.test(input.date)) fields.date = input.date;
  if (input.time && TIME_FORMAT.test(input.time)) fields.time = input.time;
  if (Number.isInteger(input.group_size) && Number(input.group_size) > 0) {
    fields.group_size = Number(input.group_size);
  }
  if (input.booking_name) fields.booking_name = input.booking_name;
  if (input.setting) fields.setting = input.setting;
  return fields;
}

function toHour(time: string) {
  return Number(time.slice(0, 2));
}

function toTime(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}
