import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, onboardingTable } from "@workspace/db";
import { SaveOnboardingBody } from "@workspace/api-zod";
import { appendOnboardingRow } from "../sheets";

const router: IRouter = Router();

router.get("/onboarding/:userId", async (req, res): Promise<void> => {
  const { userId } = req.params;
  const [record] = await db.select().from(onboardingTable).where(eq(onboardingTable.userId, userId));
  if (!record) {
    res.status(404).json({ error: "Onboarding not found" });
    return;
  }
  res.json(record);
});

router.post("/onboarding/:userId", async (req, res): Promise<void> => {
  const { userId } = req.params;
  const parsed = SaveOnboardingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(onboardingTable).where(eq(onboardingTable.userId, userId));
  let record;
  if (existing) {
    const [updated] = await db
      .update(onboardingTable)
      .set({ ...parsed.data, completedAt: new Date() })
      .where(eq(onboardingTable.userId, userId))
      .returning();
    record = updated;
    res.json(updated);
  } else {
    const [created] = await db
      .insert(onboardingTable)
      .values({ userId, ...parsed.data, completedAt: new Date() })
      .returning();
    record = created;
    res.status(201).json(created);
  }

  // Fire-and-forget Google Sheets sync
  appendOnboardingRow({
    userId: record.userId,
    multipleType: record.multipleType,
    babyAgeGroup: record.babyAgeGroup,
    isPremature: record.isPremature,
    gestationalAgeWeeks: record.gestationalAgeWeeks,
    hadNicu: record.hadNicu,
    wantsAdjustedAge: record.wantsAdjustedAge,
    biggestChallenge: record.biggestChallenge,
    featureInterest: record.featureInterest,
    discoverySource: record.discoverySource,
    instagramHandle: record.instagramHandle,
    isAmbassador: record.isAmbassador,
    email: record.email,
    newsletterConsent: record.newsletterConsent,
    completedAt: record.completedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  }).catch((err: unknown) => req.log.warn({ err }, "sheets: fire-and-forget failed"));
});

export default router;
