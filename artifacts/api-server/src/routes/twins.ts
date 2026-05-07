import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, twinsTable } from "@workspace/db";
import {
  CreateTwinBody,
  UpdateTwinParams,
  UpdateTwinBody,
  GetTwinParams,
  DeleteTwinParams,
  ListTwinsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/twins", async (req, res): Promise<void> => {
  const parsed = ListTwinsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const twins = await db
    .select()
    .from(twinsTable)
    .where(eq(twinsTable.userId, parsed.data.userId))
    .orderBy(twinsTable.createdAt);
  res.json(twins);
});

router.post("/twins", async (req, res): Promise<void> => {
  const parsed = CreateTwinBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [twin] = await db.insert(twinsTable).values(parsed.data).returning();
  res.status(201).json(twin);
});

router.get("/twins/:id", async (req, res): Promise<void> => {
  const params = GetTwinParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [twin] = await db.select().from(twinsTable).where(eq(twinsTable.id, params.data.id));
  if (!twin) {
    res.status(404).json({ error: "Twin not found" });
    return;
  }
  res.json(twin);
});

router.patch("/twins/:id", async (req, res): Promise<void> => {
  const params = UpdateTwinParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTwinBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.name != null) updates.name = parsed.data.name;
  if (parsed.data.gender !== undefined) updates.gender = parsed.data.gender;
  if (parsed.data.birthdate !== undefined) updates.birthdate = parsed.data.birthdate;
  if (parsed.data.profilePicture !== undefined) updates.profilePicture = parsed.data.profilePicture;
  if (parsed.data.colorTheme != null) updates.colorTheme = parsed.data.colorTheme;

  const [twin] = await db.update(twinsTable).set(updates).where(eq(twinsTable.id, params.data.id)).returning();
  if (!twin) {
    res.status(404).json({ error: "Twin not found" });
    return;
  }
  res.json(twin);
});

router.delete("/twins/:id", async (req, res): Promise<void> => {
  const params = DeleteTwinParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [twin] = await db.delete(twinsTable).where(eq(twinsTable.id, params.data.id)).returning();
  if (!twin) {
    res.status(404).json({ error: "Twin not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
