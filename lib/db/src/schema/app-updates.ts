import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const appUpdates = pgTable("app_updates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  emoji: text("emoji").notNull().default("🍒"),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AppUpdate = typeof appUpdates.$inferSelect;
export type InsertAppUpdate = typeof appUpdates.$inferInsert;
export const insertAppUpdateSchema = createInsertSchema(appUpdates);
export const selectAppUpdateSchema = createSelectSchema(appUpdates);
