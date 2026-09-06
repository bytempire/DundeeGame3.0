import { z } from "zod";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), "../../.env") });
config();

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  INTERNAL_API_TOKEN: z.string().min(8),
  BOT_TOKEN: z.string().min(1),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().default(3100),
  PUBLIC_API_URL: z.string().url(),
  WEBAPP_URL: z.string().url(),
  VPN_BOT_USERNAME: z.string().default("VpnDundeeBot"),
  VPN_API_URL: z.string().url(),
  VPN_INTERNAL_TOKEN: z.string().min(8),
});

export const env = schema.parse(process.env);

export const ECONOMY = {
  /** Keys come only from pickups (no distance bonus) */
  coinsPerDistanceUnit: 0,
  redeemOneDayCoins: 800,
  redeemThreeDayCoins: 2000,
  maxVpnDaysPerDay: 2,
  maxVpnDaysPerWeek: 7,
  /** First N continues in a run are free */
  freeRevivesPerRun: 5,
  /** After free are used, player can buy packs of 1..maxPackSize */
  maxPackSize: 5,
  starsPerAttempt: 5, // 1→5⭐, 2→10⭐, … 5→25⭐
  packStars: (count: number) => count * 5,
} as const;

/** Anti-cheat: max plausible run speed in distance units per second */
export const ANTI_CHEAT = {
  maxDistancePerSecond: 80,
  minDurationMs: 800,
  maxDurationMs: 30 * 60 * 1000,
} as const;
