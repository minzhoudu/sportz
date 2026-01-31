import { db } from "#db/db.js";
import { matches } from "#db/schema/matches.js";
import { DEFAULT_MAX_LIMIT } from "#utils/constants.js";
import { getMatchStatus } from "#utils/match-status.js";
import { createMatchSchema, listMatchesQuerySchema } from "#validation/matches.js";
import { desc } from "drizzle-orm";
import { Router } from "express";
import z from "zod";

export const matchesRouter = Router();

matchesRouter.get("/", async (req, res) => {
  const parsedData = listMatchesQuerySchema.safeParse(req.query);
  if (!parsedData.success) {
    return res.status(400).json({ success: false, message: "Invalid query parameters", error: z.treeifyError(parsedData.error) });
  }

  const limit = Math.min(parsedData.data.limit ?? 50, DEFAULT_MAX_LIMIT);

  try {
    const data = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(limit);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to list matches", error: JSON.stringify(error) });
  }
});

matchesRouter.post("/", async (req, res) => {
  const body = createMatchSchema.safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({ success: false, message: "Invalid payload", error: z.treeifyError(body.error) });
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

    res.status(201).json({ data: event });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create match", error: JSON.stringify(error) });
  }
});
