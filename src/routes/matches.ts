import { db } from "#db/db.js";
import { matches } from "#db/schema/matches.js";
import { DEFAULT_MAX_LIMIT } from "#utils/constants.js";
import { getMatchStatus } from "#utils/match-status.js";
import { createMatchSchema, listMatchesQuerySchema } from "#validation/matches.js";
import { desc } from "drizzle-orm";
import { Router } from "express";

export const matchesRouter = Router();

matchesRouter.get("/", async (req, res) => {
  const parsedData = listMatchesQuerySchema.safeParse(req.query);
  if (!parsedData.success) {
    return res.status(400).json({ success: false, message: "Invalid query parameters", error: parsedData.error.issues });
  }

  const limit = Math.min(parsedData.data.limit ?? 50, DEFAULT_MAX_LIMIT);

  try {
    const data = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(limit);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Failed to list matches", error);
    return res.status(500).json({ success: false, message: "Failed to list matches" });
  }
});

matchesRouter.post("/", async (req, res) => {
  const body = createMatchSchema.safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({ success: false, message: "Invalid payload", error: body.error.issues });
  }

  const { startTime, endTime, homeScore, awayScore } = body.data;

  try {
    const [event] = await db
      .insert(matches)
      .values({
        ...body.data,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        status: getMatchStatus(startTime, endTime),
      })
      .returning();

    if (res.app.locals.broadcastMatchCreated) {
      try {
        res.app.locals.broadcastMatchCreated(event);
      } catch (broadcastError) {
        console.warn("Failed to broadcast match_created", broadcastError);
      }
    }

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.error("Failed to create match", error);
    return res.status(500).json({ success: false, message: "Failed to create match" });
  }
});
