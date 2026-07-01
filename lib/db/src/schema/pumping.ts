import { pgTable, serial, varchar, real, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const pumpEntriesTable = pgTable("pump_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  durationMinutes: integer("duration_minutes"),
  amountMl: real("amount_ml"),
  side: varchar("side", { length: 10 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pumpRemindersTable = pgTable("pump_reminders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().unique(),
  intervalHours: real("interval_hours").notNull().default(3),
  isEnabled: boolean("is_enabled").notNull().default(true),
  nextReminderAt: timestamp("next_reminder_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PumpEntry = typeof pumpEntriesTable.$inferSelect;
export type InsertPumpEntry = typeof pumpEntriesTable.$inferInsert;
export type PumpReminder = typeof pumpRemindersTable.$inferSelect;
