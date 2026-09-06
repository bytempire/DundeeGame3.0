import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "@dundee/db";
import { requireInternal } from "../plugins/auth.js";

const upsertSchema = z.object({
  telegramId: z.union([z.string(), z.number()]),
  username: z.string().optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
});

export const internalUserRoutes: FastifyPluginAsync = async (app) => {
  app.post("/internal/users/upsert", async (request, reply) => {
    requireInternal(request);
    const body = upsertSchema.parse(request.body);
    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(body.telegramId) },
      update: {
        username: body.username ?? undefined,
        firstName: body.firstName ?? undefined,
        lastName: body.lastName ?? undefined,
        botBlocked: false,
      },
      create: {
        telegramId: BigInt(body.telegramId),
        username: body.username ?? null,
        firstName: body.firstName ?? null,
        lastName: body.lastName ?? null,
        botBlocked: false,
      },
    });
    return reply.send({
      id: user.id,
      telegramId: user.telegramId.toString(),
      coinBalance: user.coinBalance,
    });
  });

  /** Recipients for bot-side broadcast (not blocked). */
  app.get("/internal/users/broadcast-targets", async (request, reply) => {
    requireInternal(request);
    const users = await prisma.user.findMany({
      where: { botBlocked: false },
      select: { id: true, telegramId: true, firstName: true },
    });
    return reply.send({
      users: users.map((u) => ({
        id: u.id,
        telegramId: u.telegramId.toString(),
        firstName: u.firstName,
      })),
    });
  });

  app.post("/internal/users/mark-blocked", async (request, reply) => {
    requireInternal(request);
    const body = z
      .object({ telegramId: z.union([z.string(), z.number()]) })
      .parse(request.body);
    await prisma.user.updateMany({
      where: { telegramId: BigInt(body.telegramId) },
      data: { botBlocked: true },
    });
    return reply.send({ ok: true });
  });
};
