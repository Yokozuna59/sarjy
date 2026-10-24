import type { Activity, FieldSpec, FlowSpec } from "~/engine/types";

// Sarjy asks for the first missing field in this order. The rules each
// slot must pass are in rules.ts, since they need the whole slot.
export const BOOK_VENUE: FlowSpec = {
  fields: [
    {
      name: "activity",
      ask: {
        en:
          "What would you like to book: a padel court, a football pitch " +
          "or a coffee shop table?",
      },
    },
    { name: "city", ask: { en: "Which city should I book in?" } },
    { name: "date", ask: { en: "Which day would you like?" } },
    { name: "time", ask: { en: "What time works for you?" } },
    {
      name: "group_size",
      ask: { en: "How many people are coming?" },
      // A pitch is booked whole, so any group fits.
      skipFor: ["football"],
    },
    { name: "booking_name", ask: { en: "What name should I book it under?" } },
  ],
};

export function fieldsFor(activity: Activity | undefined): FieldSpec[] {
  return BOOK_VENUE.fields.filter(
    (field) => !activity || !field.skipFor?.includes(activity),
  );
}
