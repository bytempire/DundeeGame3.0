import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma, RunStatus, LedgerKind } from "@dundee/db";
import { randomBytes } from "node:crypto";
import { requireUser } from "../plugins/auth.js";
import { ECONOMY, ANTI_CHEAT, env } from "../env.js";
import { creditCoins } from "../services/wallet.js";

const finishSchema = z.object({
  runId: z.string().min(1),
  distance: z.number().int().min(0).max(1_000_000),
  pickupCoins: z.number().int().min(0).max(50_000),
  durationMs: z.number().int().min(0),
  clientMaxSpeed: z.number().min(0).max(500).optional(),
});

function computeReward(distance: number, pickupCoins: number): number {
  return Math.floor(distance / ECONOMY.coinsPerDistanceUnit) + pickupCoins;
}

export const runRoutes: FastifyPluginAsync = async (app) => {
  app.post("/runs/start", async (request, reply) => {
    const user = await requireUser(request);
    // abandon previous active runs
    await prisma.run.updateMany({
      where: { userId: user.id, status: RunStatus.ACTIVE },
      data: { status: RunStatus.ABANDONED, finishedAt: new Date() },
    });

    const seed = randomBytes(16).toString("hex");
    const run = await prisma.run.create({
      data: {
        userId: user.id,
        seed,
        status: RunStatus.ACTIVE,
      },
    });

    return reply.send({
      runId: run.id,
      seed: run.seed,
      startedAt: run.startedAt.toISOString(),
      freeRevives: ECONOMY.freeRevivesPerRun,
      maxPackSize: ECONOMY.maxPackSize,
      starsPerAttempt: ECONOMY.starsPerAttempt,
      economy: {
        coinsPerDistanceUnit: ECONOMY.coinsPerDistanceUnit,
        redeemOneDayCoins: ECONOMY.redeemOneDayCoins,
        redeemThreeDayCoins: ECONOMY.redeemThreeDayCoins,
        freeRevivesPerRun: ECONOMY.freeRevivesPerRun,
        maxPackSize: ECONOMY.maxPackSize,
        starsPerAttempt: ECONOMY.starsPerAttempt,
      },
      vpnBotUsername: env.VPN_BOT_USERNAME,
    });
  });

  app.post("/runs/finish", async (request, reply) => {
    const user = await requireUser(request);
    const body = finishSchema.parse(request.body);

    const run = await prisma.run.findUnique({ where: { id: body.runId } });
    if (!run || run.userId !== user.id) {
      return reply.code(404).send({ error: "run not found" });
    }
    if (run.status === RunStatus.FINISHED) {
      return reply.send({
        ok: true,
        alreadyFinished: true,
        rewardCoins: run.rewardCoins,
        coinBalance: user.coinBalance,
        distance: run.distance,
        pickupCoins: run.pickupCoins,
        reviveCount: run.reviveCount,
        extraRevives: run.extraRevives,
        freeLeft: Math.max(0, ECONOMY.freeRevivesPerRun - run.reviveCount),
      });
    }
    if (run.status !== RunStatus.ACTIVE) {
      return reply.code(400).send({ error: "run not active" });
    }

    const durationMs = Math.max(
      body.durationMs,
      Date.now() - run.startedAt.getTime(),
    );

    if (durationMs < ANTI_CHEAT.minDurationMs && body.distance > 50) {
      return reply.code(400).send({ error: "unrealistic duration" });
    }
    if (durationMs > ANTI_CHEAT.maxDurationMs) {
      return reply.code(400).send({ error: "run too long" });
    }

    const seconds = Math.max(durationMs / 1000, 0.5);
    const speed = body.distance / seconds;
    if (speed > ANTI_CHEAT.maxDistancePerSecond) {
      return reply.code(400).send({ error: "unrealistic speed" });
    }
    if (
      body.clientMaxSpeed != null &&
      body.clientMaxSpeed > ANTI_CHEAT.maxDistancePerSecond * 1.5
    ) {
      return reply.code(400).send({ error: "unrealistic client speed" });
    }

    const rewardCoins = computeReward(body.distance, body.pickupCoins);

    const updated = await prisma.run.update({
      where: { id: run.id },
      data: {
        status: RunStatus.FINISHED,
        distance: body.distance,
        pickupCoins: body.pickupCoins,
        rewardCoins,
        durationMs,
        clientMaxSpeed: body.clientMaxSpeed ?? null,
        finishedAt: new Date(),
      },
    });

    const credited = await creditCoins(user.id, rewardCoins, LedgerKind.RUN_REWARD, {
      refType: "run",
      refId: run.id,
    });

    return reply.send({
      ok: true,
      rewardCoins,
      coinBalance: credited.coinBalance,
      distance: updated.distance,
      pickupCoins: updated.pickupCoins,
      reviveCount: updated.reviveCount,
      extraRevives: updated.extraRevives,
      freeLeft: Math.max(0, ECONOMY.freeRevivesPerRun - updated.reviveCount),
      vpnBotUsername: env.VPN_BOT_USERNAME,
    });
  });

  /** After death UI: get revive state for an active run. */
  app.get("/runs/:id", async (request, reply) => {
    const user = await requireUser(request);
    const { id } = request.params as { id: string };
    const run = await prisma.run.findUnique({ where: { id } });
    if (!run || run.userId !== user.id) {
      return reply.code(404).send({ error: "run not found" });
    }
    const freeLeft = Math.max(0, ECONOMY.freeRevivesPerRun - run.reviveCount);
    return reply.send({
      runId: run.id,
      status: run.status,
      distance: run.distance,
      pickupCoins: run.pickupCoins,
      rewardCoins: run.rewardCoins,
      reviveCount: run.reviveCount,
      extraRevives: run.extraRevives,
      freeLeft,
      freeRevivesPerRun: ECONOMY.freeRevivesPerRun,
      maxPackSize: ECONOMY.maxPackSize,
      starsPerAttempt: ECONOMY.starsPerAttempt,
      canContinue: freeLeft > 0 || run.extraRevives > 0,
    });
  });
};
