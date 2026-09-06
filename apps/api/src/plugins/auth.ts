import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { prisma, type User } from "@dundee/db";
import { env } from "../env.js";
import { validateInitData } from "../services/telegram-auth.js";

export type AuthedRequest = FastifyRequest & { user: User };

async function upsertFromTelegram(user: {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}): Promise<User> {
  return prisma.user.upsert({
    where: { telegramId: BigInt(user.id) },
    update: {
      username: user.username ?? null,
      firstName: user.first_name ?? null,
      lastName: user.last_name ?? null,
    },
    create: {
      telegramId: BigInt(user.id),
      username: user.username ?? null,
      firstName: user.first_name ?? null,
      lastName: user.last_name ?? null,
    },
  });
}

export async function requireUser(request: FastifyRequest): Promise<User> {
  const initData =
    (request.headers["x-telegram-init-data"] as string | undefined) ??
    (typeof request.body === "object" &&
    request.body &&
    "initData" in request.body
      ? String((request.body as { initData?: string }).initData ?? "")
      : "");

  if (!initData) {
    const err = new Error("Missing initData") as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  const validated = validateInitData(initData, env.BOT_TOKEN);
  if (!validated.ok) {
    const err = new Error(validated.error) as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  return upsertFromTelegram(validated.user);
}

/** Internal service auth (bot → api). */
export function requireInternal(request: FastifyRequest): void {
  const token = request.headers["x-internal-token"];
  if (token !== env.INTERNAL_API_TOKEN) {
    const err = new Error("Unauthorized") as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }
}

export const authPlugin: FastifyPluginAsync = async () => {
  // marker plugin — helpers exported above
};
