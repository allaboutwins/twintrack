import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const foodsIntroducedTable = pgTable("foods_introduced", {
  id: serial("id").primaryKey(),
  twinId: integer("twin_id").notNull(),
  foodName: text("food_name").notNull(),
  category: text("category").notNull().default("other"), // "fruits", "vegetables", "proteins", "dairy", "grains", "other"
  firstIntroduced: text("first_introduced").notNull(), // YYYY-MM-DD
  reaction: text("reaction"), // "none" | "mild" | "moderate" | "severe"
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFoodIntroducedSchema = createInsertSchema(foodsIntroducedTable).omit({ id: true, createdAt: true });
export type InsertFoodIntroduced = z.infer<typeof insertFoodIntroducedSchema>;
export type FoodIntroduced = typeof foodsIntroducedTable.$inferSelect;
