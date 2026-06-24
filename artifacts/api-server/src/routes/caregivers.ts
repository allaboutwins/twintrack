import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, caregivers } from "@workspace/db";
import { randomUUID } from "crypto";
import { z } from "zod/v4";
import { sendCaregiverInvite } from "../lib/email";

const router: IRouter = Router();

const InviteCaregiverBody = z.object({
  ownerId: z.string().min(1),
  caregiverEmail: z.string().email(),
  role: z.enum(["Dad", "Partner", "Grandparent", "Nanny", "Other"]).default("Other"),
  displayName: z.string().optional(),
  parentName: z.string().optional(),
  twinNames: z.array(z.string()).optional(),
  appBaseUrl: z.string().optional(),
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
  const { ownerId, caregiverEmail, role, displayName, parentName, twinNames, appBaseUrl } = parsed.data;

  const inviteToken = randomUUID();
  const [row] = await db
    .insert(caregivers)
    .values({ ownerId, caregiverEmail, role, displayName, inviteToken, status: "pending" })
    .returning();

  // Always use the configured production URL for invite links so caregiver
  // emails never contain a Replit dev-preview URL (which triggers an interstitial).
  // Client-provided appBaseUrl is ignored for email purposes.
  const base = process.env.APP_URL ?? "https://twintrack.allaboutwins.com";
  const inviteLink = `${base}/invite?token=${inviteToken}`;

  // Send branded invitation email (non-blocking — failure never blocks the invite creation)
  const emailResult = await sendCaregiverInvite({
    to: caregiverEmail,
    parentName: parentName ?? "A TwinTrack parent",
    twinNames: twinNames ?? [],
    role,
    inviteLink,
  });

  if (emailResult.ok) {
    req.log.info({ caregiverEmail, emailId: emailResult.id }, "caregiver invite email sent");
  } else {
    req.log.warn({ caregiverEmail, error: emailResult.error }, "caregiver invite email failed — invite still created");
  }

  res.status(201).json({
    ...row,
    inviteToken,
    emailSent: emailResult.ok,
    emailError: emailResult.ok ? undefined : emailResult.error,
  });
});

// POST /caregivers/accept — caregiver accepts invite (links their userId)
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

  // Analytics: invite accepted
  req.log.info(
    { event: "invite_accepted", ownerId: found.ownerId, caregiverId: userId, caregiverEmail: found.caregiverEmail, role: found.role },
    "caregiver invite accepted",
  );

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
