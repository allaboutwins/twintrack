import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const onboardingTable = pgTable("onboarding", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  parentStatus: text("parent_status"),
  multipleType: text("multiple_type"),
  babyAgeGroup: text("baby_age_group"),
  isPremature: boolean("is_premature"),
  gestationalAgeWeeks: integer("gestational_age_weeks"),
  hadNicu: boolean("had_nicu"),
  wantsAdjustedAge: boolean("wants_adjusted_age"),
  biggestChallenge: text("biggest_challenge"),
  featureInterest: text("feature_interest"),
  discoverySource: text("discovery_source"),
  instagramHandle: text("instagram_handle"),
  isAmbassador: boolean("is_ambassador"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOnboardingSchema = createInsertSchema(onboardingTable).omit({ id: true, createdAt: true });
export type InsertOnboarding = z.infer<typeof insertOnboardingSchema>;
export type Onboarding = typeof onboardingTable.$inferSelect;
