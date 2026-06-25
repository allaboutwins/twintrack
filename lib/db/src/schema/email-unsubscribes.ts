import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const emailUnsubscribesTable = pgTable("email_unsubscribes", {
  email: varchar("email", { length: 255 }).primaryKey(),
  unsubscribedAt: timestamp("unsubscribed_at").notNull().defaultNow(),
  source: varchar("source", { length: 100 }).default("link"),
});

export type EmailUnsubscribe = typeof emailUnsubscribesTable.$inferSelect;
