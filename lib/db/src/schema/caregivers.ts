import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const caregivers = pgTable("caregivers", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  caregiverEmail: text("caregiver_email").notNull(),
  caregiverId: text("caregiver_id"),
  role: text("role").notNull().default("Other"),
  displayName: text("display_name"),
  inviteToken: text("invite_token").notNull().unique(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Caregiver = typeof caregivers.$inferSelect;
export type InsertCaregiver = typeof caregivers.$inferInsert;
export const insertCaregiverSchema = createInsertSchema(caregivers);
export const selectCaregiverSchema = createSelectSchema(caregivers);
