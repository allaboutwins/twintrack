import { pgTable, text, varchar, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const twinsTable = pgTable("twins", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  label: text("label").notNull(),
  name: text("name").notNull(),
  gender: text("gender"),
  birthdate: text("birthdate"),
  profilePicture: text("profile_picture"),
  colorTheme: text("color_theme").notNull().default("#da5a9f"),
  isPremature: boolean("is_premature"),
  gestationalAgeWeeks: integer("gestational_age_weeks"),
  hadNicu: boolean("had_nicu"),
  wantsAdjustedAge: boolean("wants_adjusted_age"),
  birthSet: integer("birth_set"),
  childType: varchar("child_type", { length: 10 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTwinSchema = createInsertSchema(twinsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTwin = z.infer<typeof insertTwinSchema>;
export type Twin = typeof twinsTable.$inferSelect;
