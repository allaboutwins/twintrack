import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const diaperEntriesTable = pgTable("diaper_entries", {
  id: serial("id").primaryKey(),
  twinId: integer("twin_id").notNull(),
  type: text("type").notNull(), // "wet", "dirty", "mixed"
  time: timestamp("time", { withTimezone: true }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDiaperEntrySchema = createInsertSchema(diaperEntriesTable).omit({ id: true, createdAt: true });
export type InsertDiaperEntry = z.infer<typeof insertDiaperEntrySchema>;
export type DiaperEntry = typeof diaperEntriesTable.$inferSelect;
