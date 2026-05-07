import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const milestonesTable = pgTable("milestones", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  twinId: integer("twin_id").notNull(),
  category: text("category").notNull(), // "first-smile", "first-laugh", "rolled-over", etc.
  title: text("title").notNull(),
  achievedDate: text("achieved_date").notNull(), // ISO date string
  photoUrl: text("photo_url"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMilestoneSchema = createInsertSchema(milestonesTable).omit({ id: true, createdAt: true });
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Milestone = typeof milestonesTable.$inferSelect;
