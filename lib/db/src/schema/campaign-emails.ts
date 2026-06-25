import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const campaignEmailsTable = pgTable("campaign_emails", {
  email: varchar("email", { length: 255 }).notNull(),
  campaignId: varchar("campaign_id", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  sentAt: timestamp("sent_at"),
});

export type CampaignEmail = typeof campaignEmailsTable.$inferSelect;
