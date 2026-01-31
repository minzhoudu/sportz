import { Match } from "#db/schema/matches.js";

declare global {
  namespace Express {
    interface Locals {
      brodcastMatchCreated?: (match: Match) => void;
    }
  }
}
