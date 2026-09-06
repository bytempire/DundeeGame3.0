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
});

export const env = schema.parse(process.env);
