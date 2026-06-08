import { pgTable, varchar, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const userPlansTable = pgTable("user_plans", {
  userId: varchar("user_id", { length: 255 }).primaryKey(),
  userEmail: varchar("user_email", { length: 255 }),
  plan: varchar("plan", { length: 20 }).notNull().default("free"),
  status: varchar("status", { length: 20 }).notNull().default("trial"),
  trialStartedAt: timestamp("trial_started_at").notNull(),
  trialEndsAt: timestamp("trial_ends_at").notNull(),
  isFoundingMom: boolean("is_founding_mom").notNull().default(false),
  foundingPriceCents: integer("founding_price_cents"),
  billingSource: varchar("billing_source", { length: 30 }),
  externalSubscriptionId: varchar("external_subscription_id", { length: 255 }),
  trialRemindersSent: varchar("trial_reminders_sent", { length: 50 }),
  convertedAt: timestamp("converted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserPlan = typeof userPlansTable.$inferSelect;
export type InsertUserPlan = typeof userPlansTable.$inferInsert;
