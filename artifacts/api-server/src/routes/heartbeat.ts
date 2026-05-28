import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.put("/heartbeat", async (req, res): Promise<void> => {
  const { userId, page } = req.body as { userId?: unknown; page?: unknown };
  if (typeof userId !== "string" || !userId) {
    res.status(400).json({ error: "userId required" });
    return;
  }
  const safePage = typeof page === "string" ? page.slice(0, 100) : "/";

  await db.execute(
    sql`INSERT INTO user_heartbeats (user_id, last_seen, current_page, updated_at)
        VALUES (${userId}, NOW(), ${safePage}, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET last_seen = NOW(), current_page = ${safePage}, updated_at = NOW()`,
  );

  res.status(204).end();
});

export default router;
