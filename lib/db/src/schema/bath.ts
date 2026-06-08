import { pgTable, serial, integer, timestamp, text } from "drizzle-orm/pg-core";

export const bathEntriesTable = pgTable("bath_entries", {
  id: serial("id").primaryKey(),
  twinId: integer("twin_id").notNull(),
  notedAt: timestamp("noted_at", { withTimezone: false }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
});
