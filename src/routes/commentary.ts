import { db } from "#db/db.js";
import { commentary } from "#db/schema/commentary.js";
import { DEFAULT_MAX_LIMIT } from "#utils/constants.js";
import { createCommentarySchema, listCommentaryQuerySchema } from "#validation/commentary.js";
import { matchIdParamSchema } from "#validation/matches.js";
import { desc, eq } from "drizzle-orm";
import { Router } from "express";

export const commentaryRouter = Router({ mergeParams: true });

commentaryRouter.get("/", async (req, res) => {
  const parsedParams = matchIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({ success: false, message: "Invalid parameters", error: parsedParams.error.issues });
  }

  const parsedQuery = listCommentaryQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).json({ success: false, message: "Invalid query parameters", error: parsedQuery.error.issues });
  }

  const limit = Math.min(parsedQuery.data.limit ?? 10, DEFAULT_MAX_LIMIT);
  const { id: matchId } = parsedParams.data;

  try {
    const data = await db.select().from(commentary).where(eq(commentary.matchId, matchId)).orderBy(desc(commentary.createdAt)).limit(limit);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Failed to list commentary", error);
    return res.status(500).json({ success: false, message: "Failed to list commentary" });
  }
});

commentaryRouter.post("/", async (req, res) => {
  const parsedParams = matchIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({ success: false, message: "Invalid parameters", error: parsedParams.error.issues });
  }

  const parsedBody = createCommentarySchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ success: false, message: "Invalid payload", error: parsedBody.error.issues });
  }

  const { id } = parsedParams.data;
  const { minute, sequence, period, eventType, actor, team, message, metadata, tags } = parsedBody.data;

  try {
    const [result] = await db
      .insert(commentary)
      .values({ matchId: id, minute, sequence, period, eventType, actor, team, message, metadata, tags })
      .returning();

    if (res.app.locals.broadcastCommentary) {
      try {
        res.app.locals.broadcastCommentary(result.matchId.toString(), result);
      } catch (broadcastError) {
        console.warn("Failed to broadcast commentary", broadcastError);
      }
    }

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("Failed to create commentary", error);
    res.status(500).json({ success: false, message: "Failed to create commentary" });
  }
});
