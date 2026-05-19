import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const twinAiMessages = pgTable("twin_ai_messages", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  question: text("question").notNull(),
  category: text("category"),
  helpful: boolean("helpful"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TwinAiMessage = typeof twinAiMessages.$inferSelect;
export type InsertTwinAiMessage = typeof twinAiMessages.$inferInsert;
export const insertTwinAiMessageSchema = createInsertSchema(twinAiMessages);
export const selectTwinAiMessageSchema = createSelectSchema(twinAiMessages);
