import { Router } from "express";
import { z } from "zod";
import { desc, eq, count } from "drizzle-orm";
import type { Request } from "express";
import { db, appUpdates } from "@workspace/db";

const SEED_UPDATES = [
  { emoji: "🍒", title: "Welcome to TwinTrack!", description: "Your all-in-one app for managing twin life — sleep, feeding, diapers, and more. Built with love for twin families everywhere.", publishedAt: new Date("2024-11-01") },
  { emoji: "💤", title: "Sleep Tracker launched", description: "Track naps and night sleep for both twins simultaneously with per-twin daily summaries and weekly averages.", publishedAt: new Date("2024-11-15") },
  { emoji: "🍼", title: "Feeding Tracker added", description: "Log breast, bottle, formula, and solids for each twin with one tap. Daily totals keep you on track even on the hardest days.", publishedAt: new Date("2024-12-01") },
  { emoji: "💧", title: "Diaper Tracker added", description: "Big, thumb-friendly Wet / Dirty / Mixed buttons make diaper logging fast even at 3am with a baby in each arm.", publishedAt: new Date("2024-12-15") },
  { emoji: "💕", title: "Milestones & Memories added", description: "Capture and celebrate your twins' first moments — smiles, steps, words, and every milestone worth remembering.", publishedAt: new Date("2025-01-10") },
  { emoji: "📚", title: "Twins Magazine Library added", description: "Browse 11 issues of Twins Magazine plus curated twin parenting resources — all in the Learn tab.", publishedAt: new Date("2025-02-01") },
  { emoji: "📊", title: "Community Polls launched", description: "Share your twin parenting experiences and see how other families navigate the beautiful chaos of raising multiples.", publishedAt: new Date("2025-03-01") },
  { emoji: "✅", title: "Routines upgraded", description: "Morning, bedtime, outing, daycare, and meal routines with progress tracking, favorites, and satisfying checkmarks.", publishedAt: new Date("2025-03-15") },
  { emoji: "✨", title: "Twin AI launched", description: "Meet your twin parenting companion — ask anything about sleep, feeding, NICU life, adjusted age, mental load, and more. Always warm, always available. 💕", publishedAt: new Date("2025-04-15") },
  { emoji: "⚡", title: "AI usage limits & feedback added", description: "To keep Twin AI sustainable for everyone, 10 questions per day per user. Rate each response 👍👎 to help us keep improving for you!", publishedAt: new Date("2025-05-19") },
  { emoji: "📱", title: "App Store & Google Play — coming soon!", description: "TwinTrack is heading to the App Store and Google Play 🍒 Native mobile apps for iPhone and Android are on the way — stay tuned, we'll be the first to tell you!", publishedAt: new Date("2026-05-24") },
];

const router = Router();

function getAdminIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

function isAdminAuth(req: Request): boolean {
  const userId = req.query.userId as string | undefined;
  const adminPassword = req.query.adminPassword as string | undefined;
  if (userId && getAdminIds().includes(userId)) return true;
  const envPw = process.env.ADMIN_PASSWORD;
  if (envPw && adminPassword && adminPassword === envPw) return true;
  return false;
}

const CreateUpdateSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(500),
  emoji: z.string().max(10).default("🍒"),
  publishedAt: z.string().datetime().optional(),
});

router.get("/app-updates", async (req, res) => {
  const [{ c }] = await db.select({ c: count() }).from(appUpdates);
  if (c === 0) {
    await db.insert(appUpdates).values(SEED_UPDATES);
  }
  const limit = Math.min(parseInt((req.query.limit as string) || "30", 10), 50);
  const updates = await db
    .select()
    .from(appUpdates)
    .orderBy(desc(appUpdates.publishedAt))
    .limit(limit);
  res.json(updates);
});

router.post("/admin/app-updates", async (req, res) => {
  if (!isAdminAuth(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = CreateUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { title, description, emoji, publishedAt } = parsed.data;
  const [created] = await db
    .insert(appUpdates)
    .values({ title, description, emoji, publishedAt: publishedAt ? new Date(publishedAt) : new Date() })
    .returning();
  res.status(201).json(created);
});

router.delete("/admin/app-updates/:id", async (req, res) => {
  if (!isAdminAuth(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db.delete(appUpdates).where(eq(appUpdates.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(204).send();
});

export default router;
