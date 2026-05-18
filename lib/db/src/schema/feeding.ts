import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const feedingEntriesTable = pgTable("feeding_entries", {
  id: serial("id").primaryKey(),
  twinId: integer("twin_id").notNull(),
  feedingType: text("feeding_type").notNull(), // "breastfeeding", "bottle", "formula", "solids"
  side: text("side"), // "left" | "right" — breastfeeding only
  durationMinutes: integer("duration_minutes"), // breastfeeding duration
  amountMl: real("amount_ml"), // bottle/formula amount in ml
  foodName: text("food_name"), // solids: name of food
  time: timestamp("time", { withTimezone: true }).notNull(),
  quantity: text("quantity"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFeedingEntrySchema = createInsertSchema(feedingEntriesTable).omit({ id: true, createdAt: true });
export type InsertFeedingEntry = z.infer<typeof insertFeedingEntrySchema>;
export type FeedingEntry = typeof feedingEntriesTable.$inferSelect;
