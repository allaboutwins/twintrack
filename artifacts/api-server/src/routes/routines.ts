import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, routinesTable, routineTasksTable } from "@workspace/db";
import {
  CreateRoutineBody,
  UpdateRoutineParams,
  UpdateRoutineBody,
  GetRoutineParams,
  DeleteRoutineParams,
  ListRoutinesQueryParams,
  UpdateRoutineTaskParams,
  UpdateRoutineTaskBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getRoutineWithTasks(id: number) {
  const [routine] = await db.select().from(routinesTable).where(eq(routinesTable.id, id));
  if (!routine) return null;
  const tasks = await db
    .select()
    .from(routineTasksTable)
    .where(eq(routineTasksTable.routineId, id))
    .orderBy(routineTasksTable.order);
  return { ...routine, tasks };
}

router.get("/routines", async (req, res): Promise<void> => {
  const parsed = ListRoutinesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const routines = await db
    .select()
    .from(routinesTable)
    .where(eq(routinesTable.userId, parsed.data.userId))
    .orderBy(routinesTable.createdAt);

  const results = await Promise.all(routines.map((r) => getRoutineWithTasks(r.id)));
  res.json(results.filter(Boolean));
});

router.post("/routines", async (req, res): Promise<void> => {
  const parsed = CreateRoutineBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [routine] = await db
    .insert(routinesTable)
    .values({
      userId: parsed.data.userId,
      title: parsed.data.title,
      category: parsed.data.category,
      isFavorite: parsed.data.isFavorite ?? false,
    })
    .returning();

  if (parsed.data.tasks && parsed.data.tasks.length > 0) {
    await db.insert(routineTasksTable).values(
      parsed.data.tasks.map((t) => ({
        routineId: routine.id,
        text: t.text,
        completed: false,
        order: t.order,
      })),
    );
  }

  const result = await getRoutineWithTasks(routine.id);
  res.status(201).json(result);
});

router.get("/routines/:id", async (req, res): Promise<void> => {
  const params = GetRoutineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await getRoutineWithTasks(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Routine not found" });
    return;
  }
  res.json(result);
});

router.patch("/routines/:id", async (req, res): Promise<void> => {
  const params = UpdateRoutineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateRoutineBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.title != null) updates.title = parsed.data.title;
  if (parsed.data.category != null) updates.category = parsed.data.category;
  if (parsed.data.isFavorite != null) updates.isFavorite = parsed.data.isFavorite;

  await db.update(routinesTable).set(updates).where(eq(routinesTable.id, params.data.id));
  const result = await getRoutineWithTasks(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Routine not found" });
    return;
  }
  res.json(result);
});

router.delete("/routines/:id", async (req, res): Promise<void> => {
  const params = DeleteRoutineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(routineTasksTable).where(eq(routineTasksTable.routineId, params.data.id));
  const [routine] = await db.delete(routinesTable).where(eq(routinesTable.id, params.data.id)).returning();
  if (!routine) {
    res.status(404).json({ error: "Routine not found" });
    return;
  }
  res.sendStatus(204);
});

router.patch("/routines/:id/tasks/:taskId", async (req, res): Promise<void> => {
  const params = UpdateRoutineTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateRoutineTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Record<string, unknown> = { completed: parsed.data.completed };
  if (parsed.data.text != null) updates.text = parsed.data.text;

  const [task] = await db
    .update(routineTasksTable)
    .set(updates)
    .where(and(eq(routineTasksTable.id, params.data.taskId), eq(routineTasksTable.routineId, params.data.id)))
    .returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(task);
});

export default router;
