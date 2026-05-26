import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationPrefsTable = pgTable("notification_prefs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  feedingReminders: boolean("feeding_reminders").notNull().default(true),
  sleepReminders: boolean("sleep_reminders").notNull().default(true),
  pumpingReminders: boolean("pumping_reminders").notNull().default(false),
  medicationReminders: boolean("medication_reminders").notNull().default(false),
  milestoneReminders: boolean("milestone_reminders").notNull().default(true),
  twinAiTips: boolean("twin_ai_tips").notNull().default(true),
  weeklyInsights: boolean("weekly_insights").notNull().default(true),
  dailyLogReminder: boolean("daily_log_reminder").notNull().default(true),
  feedingIntervalMinutes: integer("feeding_interval_minutes").notNull().default(180),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationHistoryTable = pgTable("notification_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  icon: text("icon"),
  url: text("url"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  isRead: boolean("is_read").notNull().default(false),
});

export type PushSubscription = typeof pushSubscriptionsTable.$inferSelect;
export type NotificationPrefs = typeof notificationPrefsTable.$inferSelect;
export type NotificationHistory = typeof notificationHistoryTable.$inferSelect;
