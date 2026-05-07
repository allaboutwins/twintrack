import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const videosTable = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  sourceType: text("source_type").notNull(), // "youtube", "upload"
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  durationSeconds: integer("duration_seconds"),
  tags: text("tags"), // comma-separated
  ageRangeMin: integer("age_range_min"), // months
  ageRangeMax: integer("age_range_max"), // months
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const videoBookmarksTable = pgTable("video_bookmarks", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const videoNotesTable = pgTable("video_notes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  videoId: integer("video_id").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertVideoSchema = createInsertSchema(videosTable).omit({ id: true, createdAt: true });
export const insertVideoBookmarkSchema = createInsertSchema(videoBookmarksTable).omit({ id: true, createdAt: true });
export const insertVideoNoteSchema = createInsertSchema(videoNotesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videosTable.$inferSelect;
export type InsertVideoBookmark = z.infer<typeof insertVideoBookmarkSchema>;
export type VideoBookmark = typeof videoBookmarksTable.$inferSelect;
export type InsertVideoNote = z.infer<typeof insertVideoNoteSchema>;
export type VideoNote = typeof videoNotesTable.$inferSelect;
