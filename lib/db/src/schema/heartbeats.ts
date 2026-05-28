import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const userHeartbeatsTable = pgTable("user_heartbeats", {
  userId: text("user_id").primaryKey(),
  lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  currentPage: text("current_page").notNull().default("/"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserHeartbeat = typeof userHeartbeatsTable.$inferSelect;
