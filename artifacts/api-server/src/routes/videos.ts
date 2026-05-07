import { Router, type IRouter } from "express";
import { eq, and, ilike, or } from "drizzle-orm";
import { db, videosTable, videoBookmarksTable, videoNotesTable } from "@workspace/db";
import {
  CreateVideoBody,
  GetVideoParams,
  BookmarkVideoParams,
  BookmarkVideoBody,
  ListVideosQueryParams,
  ListBookmarkedVideosQueryParams,
  ListVideoNotesQueryParams,
  UpsertVideoNoteBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/videos/bookmarks", async (req, res): Promise<void> => {
  const parsed = ListBookmarkedVideosQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const bookmarks = await db
    .select({ videoId: videoBookmarksTable.videoId })
    .from(videoBookmarksTable)
    .where(eq(videoBookmarksTable.userId, parsed.data.userId));

  const videoIds = bookmarks.map((b) => b.videoId);
  if (videoIds.length === 0) {
    res.json([]);
    return;
  }

  const videos = await db
    .select()
    .from(videosTable)
    .where(
      or(...videoIds.map((id) => eq(videosTable.id, id))),
    );
  res.json(videos.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })));
});

router.get("/videos", async (req, res): Promise<void> => {
  const parsed = ListVideosQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const conditions = [];
  if (parsed.data.category) {
    conditions.push(eq(videosTable.category, parsed.data.category));
  }
  if (parsed.data.search) {
    conditions.push(
      or(
        ilike(videosTable.title, `%${parsed.data.search}%`),
        ilike(videosTable.description ?? "", `%${parsed.data.search}%`),
      ),
    );
  }

  const videos =
    conditions.length > 0
      ? await db
          .select()
          .from(videosTable)
          .where(and(...conditions))
          .orderBy(videosTable.createdAt)
      : await db.select().from(videosTable).orderBy(videosTable.createdAt);

  res.json(videos.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })));
});

router.post("/videos", async (req, res): Promise<void> => {
  const parsed = CreateVideoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [video] = await db
    .insert(videosTable)
    .values({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      category: parsed.data.category,
      sourceType: parsed.data.sourceType,
      url: parsed.data.url,
      thumbnailUrl: parsed.data.thumbnailUrl ?? null,
      durationSeconds: parsed.data.durationSeconds ?? null,
    })
    .returning();
  res.status(201).json({ ...video, createdAt: video.createdAt.toISOString() });
});

router.get("/videos/:id", async (req, res): Promise<void> => {
  const params = GetVideoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [video] = await db.select().from(videosTable).where(eq(videosTable.id, params.data.id));
  if (!video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }
  res.json({ ...video, createdAt: video.createdAt.toISOString() });
});

router.get("/videos/:id/notes", async (req, res): Promise<void> => {
  const params = GetVideoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = ListVideoNotesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const notes = await db
    .select()
    .from(videoNotesTable)
    .where(and(eq(videoNotesTable.videoId, params.data.id), eq(videoNotesTable.userId, parsed.data.userId)));
  res.json(notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() })));
});

router.post("/videos/:id/notes", async (req, res): Promise<void> => {
  const params = GetVideoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpsertVideoNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { userId, note } = parsed.data;
  const videoId = params.data.id;

  const existing = await db
    .select()
    .from(videoNotesTable)
    .where(and(eq(videoNotesTable.videoId, videoId), eq(videoNotesTable.userId, userId)));

  let result;
  if (existing.length > 0) {
    [result] = await db
      .update(videoNotesTable)
      .set({ note })
      .where(and(eq(videoNotesTable.videoId, videoId), eq(videoNotesTable.userId, userId)))
      .returning();
  } else {
    [result] = await db.insert(videoNotesTable).values({ videoId, userId, note }).returning();
  }
  res.json({ ...result, createdAt: result.createdAt.toISOString(), updatedAt: result.updatedAt.toISOString() });
});

router.post("/videos/:id/bookmark", async (req, res): Promise<void> => {
  const params = BookmarkVideoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = BookmarkVideoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { userId, bookmarked } = parsed.data;
  const videoId = params.data.id;

  if (bookmarked) {
    const existing = await db
      .select()
      .from(videoBookmarksTable)
      .where(and(eq(videoBookmarksTable.videoId, videoId), eq(videoBookmarksTable.userId, userId)));
    if (existing.length === 0) {
      await db.insert(videoBookmarksTable).values({ videoId, userId });
    }
  } else {
    await db
      .delete(videoBookmarksTable)
      .where(and(eq(videoBookmarksTable.videoId, videoId), eq(videoBookmarksTable.userId, userId)));
  }

  res.json({ videoId, userId, bookmarked });
});

export default router;
