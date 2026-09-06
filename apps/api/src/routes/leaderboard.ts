import type { FastifyPluginAsync } from "fastify";
import { prisma, RunStatus } from "@dundee/db";

/** Top-10 best finished distances; display name = firstName (not username). */
export const leaderboardRoutes: FastifyPluginAsync = async (app) => {
  app.get("/leaderboard", async (_request, reply) => {
    const grouped = await prisma.run.groupBy({
      by: ["userId"],
      where: { status: RunStatus.FINISHED, distance: { gt: 0 } },
      _max: { distance: true },
      orderBy: { _max: { distance: "desc" } },
      take: 10,
    });

    const userIds = grouped.map((g) => g.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    const entries = grouped.map((g, i) => {
      const u = byId.get(g.userId);
      const name = (u?.firstName ?? "").trim() || "Игрок";
      return {
        rank: i + 1,
        name,
        distance: g._max.distance ?? 0,
      };
    });

    return reply.send({ entries });
  });
};
