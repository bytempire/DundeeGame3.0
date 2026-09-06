import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma, RedeemStatus, LedgerKind } from "@dundee/db";
import { randomUUID } from "node:crypto";
import { requireUser } from "../plugins/auth.js";
import { ECONOMY, env } from "../env.js";
import { debitCoins } from "../services/wallet.js";
import { vpnAddDays } from "../services/vpn.js";

const redeemSchema = z.object({
  days: z.union([z.literal(1), z.literal(3)]),
});

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfUtcWeek(d = new Date()): Date {
  const day = d.getUTCDay(); // 0 Sun
  const diff = (day + 6) % 7; // Monday start
  const start = startOfUtcDay(d);
  start.setUTCDate(start.getUTCDate() - diff);
  return start;
}

async function daysGrantedSince(userId: string, since: Date): Promise<number> {
  const rows = await prisma.redeemOrder.findMany({
    where: {
      userId,
      status: RedeemStatus.DONE,
      createdAt: { gte: since },
    },
    select: { days: true },
  });
  return rows.reduce((s, r) => s + r.days, 0);
}

export const meRoutes: FastifyPluginAsync = async (app) => {
  app.get("/me", async (request, reply) => {
    const user = await requireUser(request);
    const dayUsed = await daysGrantedSince(user.id, startOfUtcDay());
    const weekUsed = await daysGrantedSince(user.id, startOfUtcWeek());
    return reply.send({
      telegramId: user.telegramId.toString(),
      username: user.username,
      coinBalance: user.coinBalance,
      limits: {
        dayUsed,
        dayMax: ECONOMY.maxVpnDaysPerDay,
        weekUsed,
        weekMax: ECONOMY.maxVpnDaysPerWeek,
      },
      shop: {
        oneDayCoins: ECONOMY.redeemOneDayCoins,
        threeDayCoins: ECONOMY.redeemThreeDayCoins,
      },
      vpnBotUsername: env.VPN_BOT_USERNAME,
      vpnBotUrl: `https://t.me/${env.VPN_BOT_USERNAME}`,
    });
  });

  app.post("/redeem", async (request, reply) => {
    const user = await requireUser(request);
    const { days } = redeemSchema.parse(request.body);
    const cost =
      days === 1 ? ECONOMY.redeemOneDayCoins : ECONOMY.redeemThreeDayCoins;

    const dayUsed = await daysGrantedSince(user.id, startOfUtcDay());
    const weekUsed = await daysGrantedSince(user.id, startOfUtcWeek());
    if (dayUsed + days > ECONOMY.maxVpnDaysPerDay) {
      return reply.code(400).send({
        error: "daily_limit",
        message: `Лимит ${ECONOMY.maxVpnDaysPerDay} дн./сутки`,
        dayUsed,
      });
    }
    if (weekUsed + days > ECONOMY.maxVpnDaysPerWeek) {
      return reply.code(400).send({
        error: "weekly_limit",
        message: `Лимит ${ECONOMY.maxVpnDaysPerWeek} дн./неделя`,
        weekUsed,
      });
    }

    if (user.coinBalance < cost) {
      return reply.code(400).send({ error: "insufficient_coins" });
    }

    const idempotencyKey = `game-redeem-${user.id}-${randomUUID()}`;
    const order = await prisma.redeemOrder.create({
      data: {
        userId: user.id,
        days,
        coinsSpent: cost,
        status: RedeemStatus.PENDING,
        idempotencyKey,
      },
    });

    try {
      await debitCoins(user.id, cost, LedgerKind.REDEEM, {
        refType: "redeem",
        refId: order.id,
      });

      const vpn = await vpnAddDays({
        telegramId: user.telegramId,
        days,
        reason: `game:redeem:${order.id}`,
        idempotencyKey,
      });

      if (!vpn.ok) {
        await creditBack(user.id, cost, order.id);
        await prisma.redeemOrder.update({
          where: { id: order.id },
          data: {
            status: RedeemStatus.FAILED,
            errorMessage: vpn.error ?? "vpn failed",
          },
        });
        return reply.code(502).send({ error: "vpn_failed", message: vpn.error });
      }

      const updated = await prisma.redeemOrder.update({
        where: { id: order.id },
        data: {
          status: RedeemStatus.DONE,
          vpnExpiresAt: vpn.expiresAt ? new Date(vpn.expiresAt) : null,
        },
      });

      const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      return reply.send({
        ok: true,
        days,
        coinsSpent: cost,
        coinBalance: fresh.coinBalance,
        vpnExpiresAt: updated.vpnExpiresAt?.toISOString() ?? null,
        vpnBotUrl: `https://t.me/${env.VPN_BOT_USERNAME}`,
        message: `Открой @${env.VPN_BOT_USERNAME} → Моя подписка`,
      });
    } catch (err) {
      await prisma.redeemOrder.update({
        where: { id: order.id },
        data: {
          status: RedeemStatus.FAILED,
          errorMessage: (err as Error).message,
        },
      });
      return reply.code(400).send({ error: (err as Error).message });
    }
  });
};

async function creditBack(userId: string, amount: number, redeemId: string) {
  const { creditCoins } = await import("../services/wallet.js");
  await creditCoins(userId, amount, LedgerKind.ADJUST, {
    refType: "redeem_refund",
    refId: redeemId,
    note: "vpn failed refund",
  });
}
