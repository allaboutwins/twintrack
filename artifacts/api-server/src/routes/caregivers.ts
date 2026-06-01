import { Router, type IRouter } from "express";
import { eq, or, and } from "drizzle-orm";
import { db, caregivers } from "@workspace/db";
import { randomUUID } from "crypto";
import { z } from "zod/v4";

const router: IRouter = Router();

const InviteCaregiverBody = z.object({
  ownerId: z.string().min(1),
  caregiverEmail: z.string().email(),
  role: z.enum(["Dad", "Partner", "Grandparent", "Nanny", "Other"]).default("Other"),
  displayName: z.string().optional(),
});

// GET /caregivers?userId=xxx — list caregivers for an owner
router.get("/caregivers", async (req, res): Promise<void> => {
  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "userId required" });
    return;
  }
  const list = await db
    .select()
    .from(caregivers)
    .where(eq(caregivers.ownerId, userId))
    .orderBy(caregivers.createdAt);
  res.json(list);
});

// GET /caregivers/me?userId=xxx — check if userId is an active caregiver
router.get("/caregivers/me", async (req, res): Promise<void> => {
  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "userId required" });
    return;
  }
  const found = await db
    .select()
    .from(caregivers)
    .where(and(eq(caregivers.caregiverId, userId), eq(caregivers.status, "active")))
    .limit(1);
  if (found.length === 0) {
    res.json(null);
    return;
  }
  res.json({ ownerId: found[0].ownerId, role: found[0].role, displayName: found[0].displayName });
});

// POST /caregivers/invite — owner invites a caregiver
router.post("/caregivers/invite", async (req, res): Promise<void> => {
  const parsed = InviteCaregiverBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { ownerId, caregiverEmail, role, displayName } = parsed.data;
  const inviteToken = randomUUID();
  const [row] = await db
    .insert(caregivers)
    .values({ ownerId, caregiverEmail, role, displayName, inviteToken, status: "pending" })
    .returning();
  res.status(201).json({ ...row, inviteToken });
});

// POST /caregivers/accept?token=xxx — caregiver accepts invite (links their userId)
router.post("/caregivers/accept", async (req, res): Promise<void> => {
  const { token, userId } = z.object({ token: z.string(), userId: z.string() }).safeParse(req.body).data ?? {};
  if (!token || !userId) {
    res.status(400).json({ error: "token and userId required" });
    return;
  }
  const [found] = await db
    .select()
    .from(caregivers)
    .where(eq(caregivers.inviteToken, token))
    .limit(1);
  if (!found) {
    res.status(404).json({ error: "Invite not found or expired" });
    return;
  }
  if (found.status === "revoked") {
    res.status(410).json({ error: "Invite has been revoked" });
    return;
  }
  const [updated] = await db
    .update(caregivers)
    .set({ caregiverId: userId, status: "active", updatedAt: new Date() })
    .where(eq(caregivers.inviteToken, token))
    .returning();
  res.json(updated);
});

// DELETE /caregivers/:id — owner revokes a caregiver
router.delete("/caregivers/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .update(caregivers)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(eq(caregivers.id, id));
  res.json({ ok: true });
});

export default router;
