import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, onboardingTable } from "@workspace/db";
import { SaveOnboardingBody } from "@workspace/api-zod";

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
  if (existing) {
    const [updated] = await db
      .update(onboardingTable)
      .set({ ...parsed.data, completedAt: new Date() })
      .where(eq(onboardingTable.userId, userId))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db
      .insert(onboardingTable)
      .values({ userId, ...parsed.data, completedAt: new Date() })
      .returning();
    res.status(201).json(created);
  }
});

export default router;
