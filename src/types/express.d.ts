import { Match } from "#db/schema/matches.js";

declare global {
  namespace Express {
    interface Locals {
      broadcastMatchCreated?: (match: Match) => void;
    }
  }
}
