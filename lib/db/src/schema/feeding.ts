import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const feedingEntriesTable = pgTable("feeding_entries", {
  id: serial("id").primaryKey(),
  twinId: integer("twin_id").notNull(),
  feedingType: text("feeding_type").notNull(), // "breastfeeding", "bottle", "formula", "solids"
  time: timestamp("time", { withTimezone: true }).notNull(),
  quantity: text("quantity"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFeedingEntrySchema = createInsertSchema(feedingEntriesTable).omit({ id: true, createdAt: true });
export type InsertFeedingEntry = z.infer<typeof insertFeedingEntrySchema>;
export type FeedingEntry = typeof feedingEntriesTable.$inferSelect;
