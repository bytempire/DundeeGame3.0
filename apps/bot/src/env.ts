import { z } from "zod";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), "../../.env") });
config();

const schema = z.object({
  BOT_TOKEN: z.string().min(1),
  API_BASE_URL: z.string().url(),
  INTERNAL_API_TOKEN: z.string().min(8),
  WEBAPP_URL: z.string().url(),
  VPN_BOT_USERNAME: z.string().default("VpnDundeeBot"),
  ADMIN_TELEGRAM_IDS: z.string().default("240579504"),
});

export const env = schema.parse(process.env);

export function isAdminTelegramId(id: number | bigint | string): boolean {
  const n = BigInt(id);
  return env.ADMIN_TELEGRAM_IDS.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => BigInt(s))
    .some((a) => a === n);
}
