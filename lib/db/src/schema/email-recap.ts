import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const monthlyRecapLogsTable = pgTable("monthly_recap_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  month: text("month").notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  statsJson: text("stats_json"),
});
