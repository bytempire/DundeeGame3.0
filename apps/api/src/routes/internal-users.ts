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
      },
      create: {
        telegramId: BigInt(body.telegramId),
        username: body.username ?? null,
        firstName: body.firstName ?? null,
        lastName: body.lastName ?? null,
      },
    });
    return reply.send({
      id: user.id,
      telegramId: user.telegramId.toString(),
      coinBalance: user.coinBalance,
    });
  });
};
