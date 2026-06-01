import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const communityQuestions = pgTable("community_questions", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  question: text("question").notNull(),
  authorName: text("author_name"),
  status: text("status").notNull().default("pending"),
  isAdminAdded: boolean("is_admin_added").notNull().default(false),
  pinnedAnswerId: integer("pinned_answer_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const communityAnswers = pgTable("community_answers", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull(),
  userId: text("user_id"),
  authorName: text("author_name"),
  answerText: text("answer_text").notNull(),
  likes: integer("likes").notNull().default(0),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communityAnswerLikes = pgTable("community_answer_likes", {
  id: serial("id").primaryKey(),
  answerId: integer("answer_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CommunityQuestion = typeof communityQuestions.$inferSelect;
export type InsertCommunityQuestion = typeof communityQuestions.$inferInsert;
export type CommunityAnswer = typeof communityAnswers.$inferSelect;
export type InsertCommunityAnswer = typeof communityAnswers.$inferInsert;

export const insertCommunityQuestionSchema = createInsertSchema(communityQuestions);
export const selectCommunityQuestionSchema = createSelectSchema(communityQuestions);
export const insertCommunityAnswerSchema = createInsertSchema(communityAnswers);
export const selectCommunityAnswerSchema = createSelectSchema(communityAnswers);
