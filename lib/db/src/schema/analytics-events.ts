import { pgTable, serial, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";

export const analyticsEventsTable = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  event: varchar("event", { length: 100 }).notNull(),
  userId: varchar("user_id", { length: 255 }),
  properties: jsonb("properties").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AnalyticsEvent = typeof analyticsEventsTable.$inferSelect;
