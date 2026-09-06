import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./env.js";
import { runRoutes } from "./routes/runs.js";
import { meRoutes } from "./routes/me.js";
import { starsRoutes } from "./routes/stars.js";
import { internalUserRoutes } from "./routes/internal-users.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.get("/health", async () => ({ ok: true, service: "dundee-game-api" }));

await app.register(runRoutes);
await app.register(meRoutes);
await app.register(starsRoutes);
await app.register(internalUserRoutes);

try {
  await app.listen({ host: env.API_HOST, port: env.API_PORT });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
