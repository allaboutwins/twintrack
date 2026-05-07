import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const routinesTable = pgTable("routines", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(), // "morning", "bedtime", "outing", "daycare", "meal"
  isFavorite: boolean("is_favorite").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const routineTasksTable = pgTable("routine_tasks", {
  id: serial("id").primaryKey(),
  routineId: integer("routine_id").notNull(),
  text: text("text").notNull(),
  completed: boolean("completed").notNull().default(false),
  order: integer("order").notNull().default(0),
});

export const insertRoutineSchema = createInsertSchema(routinesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRoutineTaskSchema = createInsertSchema(routineTasksTable).omit({ id: true });
export type InsertRoutine = z.infer<typeof insertRoutineSchema>;
export type Routine = typeof routinesTable.$inferSelect;
export type InsertRoutineTask = z.infer<typeof insertRoutineTaskSchema>;
export type RoutineTask = typeof routineTasksTable.$inferSelect;
