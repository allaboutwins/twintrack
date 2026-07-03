import { pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

export const trialReminderLogsTable = pgTable(
  "trial_reminder_logs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    milestone: text("milestone").notNull(),
    sentAt: timestamp("sent_at").notNull().defaultNow(),
  },
  (table) => ({
    userMilestoneUnique: unique().on(table.userId, table.milestone),
  }),
);

export type TrialReminderLog = typeof trialReminderLogsTable.$inferSelect;
export type InsertTrialReminderLog = typeof trialReminderLogsTable.$inferInsert;
