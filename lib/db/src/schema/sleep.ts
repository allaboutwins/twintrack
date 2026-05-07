import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sleepEntriesTable = pgTable("sleep_entries", {
  id: serial("id").primaryKey(),
  twinId: integer("twin_id").notNull(),
  type: text("type").notNull(), // "nap" or "night"
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),
  durationMinutes: integer("duration_minutes"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSleepEntrySchema = createInsertSchema(sleepEntriesTable).omit({ id: true, createdAt: true });
export type InsertSleepEntry = z.infer<typeof insertSleepEntrySchema>;
export type SleepEntry = typeof sleepEntriesTable.$inferSelect;
