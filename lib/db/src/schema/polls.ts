import { pgTable, text, serial, timestamp, boolean, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pollsTable = pgTable("polls", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  category: text("category").notNull(),
  options: text("options").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pollResponsesTable = pgTable(
  "poll_responses",
  {
    id: serial("id").primaryKey(),
    pollId: integer("poll_id").notNull(),
    userId: text("user_id").notNull(),
    optionKey: text("option_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("poll_user_unique").on(t.pollId, t.userId)],
);

export const insertPollSchema = createInsertSchema(pollsTable).omit({ id: true, createdAt: true });
export const insertPollResponseSchema = createInsertSchema(pollResponsesTable).omit({ id: true, createdAt: true });
export type Poll = typeof pollsTable.$inferSelect;
export type InsertPoll = z.infer<typeof insertPollSchema>;
export type PollResponse = typeof pollResponsesTable.$inferSelect;
export type InsertPollResponse = z.infer<typeof insertPollResponseSchema>;
