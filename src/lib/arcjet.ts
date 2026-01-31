import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";
import { NextFunction, Request, Response } from "express";

const arcjetKey = process.env.ARCJET_API_KEY;
const arcjetMode = process.env.ARCJET_MODE === "DRY_RUN" ? "DRY_RUN" : "LIVE";

if (!arcjetKey) throw new Error("ARCJET_API_KEY environment variable is not defined");

export const httpArcjet = arcjet({
  key: arcjetKey,
  rules: [
    shield({ mode: arcjetMode }),
    detectBot({ mode: arcjetMode, allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"] }),
    slidingWindow({ mode: arcjetMode, interval: "20s", max: 50 }),
  ],
});

export const wsArcjet = arcjet({
  key: arcjetKey,
  rules: [
    shield({ mode: arcjetMode }),
    detectBot({ mode: arcjetMode, allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"] }),
    slidingWindow({ mode: arcjetMode, interval: "2s", max: 5 }),
  ],
});

export const securityMiddleware = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const decision = await httpArcjet.protect(req);

      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          return res.status(429).json({ error: "Too Many Requests" });
        }

        return res.status(403).json({ error: "Forbidden" });
      }

      next();
    } catch (error) {
      console.error("Arcjet middleware error", error);
      return res.status(503).json({ error: "Service Unavailable" });
    }
  };
};
