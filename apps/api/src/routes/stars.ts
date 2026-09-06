import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  prisma,
  RunStatus,
  StarPaymentKind,
  StarPaymentStatus,
} from "@dundee/db";
import { randomBytes } from "node:crypto";
import { requireUser, requireInternal } from "../plugins/auth.js";
import { ECONOMY } from "../env.js";
import { createStarsInvoiceLink } from "../services/telegram-bot-api.js";

const packInvoiceSchema = z.object({
  runId: z.string().min(1),
  count: z.number().int().min(1).max(ECONOMY.maxPackSize),
});

const preCheckoutSchema = z.object({
  payload: z.string().min(1),
  telegramId: z.union([z.string(), z.number()]),
  totalAmount: z.number().int().positive(),
});

const completeSchema = z.object({
  payload: z.string().min(1),
  telegramId: z.union([z.string(), z.number()]),
  telegramPaymentChargeId: z.string().min(1),
  totalAmount: z.number().int().positive(),
});

function freeLeft(reviveCount: number) {
  return Math.max(0, ECONOMY.freeRevivesPerRun - reviveCount);
}

function canContinue(run: { reviveCount: number; extraRevives: number }) {
  return freeLeft(run.reviveCount) > 0 || run.extraRevives > 0;
}

export const starsRoutes: FastifyPluginAsync = async (app) => {
  /** Use one free or purchased continue (no Stars charge). */
  app.post("/runs/continue", async (request, reply) => {
    const user = await requireUser(request);
    const { runId } = z.object({ runId: z.string().min(1) }).parse(request.body);

    const run = await prisma.run.findUnique({ where: { id: runId } });
    if (!run || run.userId !== user.id) {
      return reply.code(404).send({ error: "run not found" });
    }
    if (run.status !== RunStatus.ACTIVE) {
      return reply.code(400).send({ error: "run not active" });
    }

    const free = freeLeft(run.reviveCount);
    if (free > 0) {
      const updated = await prisma.run.update({
        where: { id: run.id },
        data: { reviveCount: { increment: 1 } },
      });
      return reply.send({
        ok: true,
        source: "free",
        reviveCount: updated.reviveCount,
        freeLeft: freeLeft(updated.reviveCount),
        extraRevives: updated.extraRevives,
      });
    }

    if (run.extraRevives <= 0) {
      return reply.code(400).send({ error: "need_purchase" });
    }

    const updated = await prisma.run.update({
      where: { id: run.id },
      data: {
        reviveCount: { increment: 1 },
        extraRevives: { decrement: 1 },
      },
    });
    return reply.send({
      ok: true,
      source: "paid",
      reviveCount: updated.reviveCount,
      freeLeft: 0,
      extraRevives: updated.extraRevives,
    });
  });

  /** Buy 1..5 continue credits with Stars. */
  app.post("/stars/revive-invoice", async (request, reply) => {
    const user = await requireUser(request);
    const { runId, count } = packInvoiceSchema.parse(request.body);

    const run = await prisma.run.findUnique({ where: { id: runId } });
    if (!run || run.userId !== user.id) {
      return reply.code(404).send({ error: "run not found" });
    }
    if (run.status !== RunStatus.ACTIVE) {
      return reply.code(400).send({ error: "run not active" });
    }
    if (freeLeft(run.reviveCount) > 0) {
      return reply.code(400).send({ error: "free_remaining" });
    }

    const amountStars = ECONOMY.packStars(count);
    const payload = `revivepack:${run.id}:${count}:${randomBytes(8).toString("hex")}`;

    const payment = await prisma.starPayment.create({
      data: {
        userId: user.id,
        runId: run.id,
        kind: StarPaymentKind.REVIVE,
        status: StarPaymentStatus.PENDING,
        amountStars,
        packSize: count,
        payload,
      },
    });

    try {
      const invoiceLink = await createStarsInvoiceLink({
        title: `Попытки ×${count}`,
        description: `Dundee Runner: +${count} продолжений (${amountStars}⭐)`,
        payload,
        amountStars,
      });
      await prisma.starPayment.update({
        where: { id: payment.id },
        data: { invoiceLink },
      });
      return reply.send({
        invoiceLink,
        amountStars,
        count,
        payload,
      });
    } catch (err) {
      await prisma.starPayment.update({
        where: { id: payment.id },
        data: { status: StarPaymentStatus.FAILED },
      });
      return reply.code(502).send({ error: (err as Error).message });
    }
  });

  app.post("/internal/stars/pre-checkout", async (request, reply) => {
    requireInternal(request);
    const body = preCheckoutSchema.parse(request.body);
    const payment = await prisma.starPayment.findUnique({
      where: { payload: body.payload },
      include: { run: true, user: true },
    });
    if (!payment || payment.status !== StarPaymentStatus.PENDING) {
      return reply.send({ ok: false });
    }
    if (payment.user.telegramId.toString() !== String(body.telegramId)) {
      return reply.send({ ok: false });
    }
    if (payment.amountStars !== body.totalAmount) {
      return reply.send({ ok: false });
    }
    if (!payment.run || payment.run.status !== RunStatus.ACTIVE) {
      return reply.send({ ok: false });
    }
    const pack = payment.packSize ?? 1;
    if (pack < 1 || pack > ECONOMY.maxPackSize) {
      return reply.send({ ok: false });
    }
    return reply.send({ ok: true });
  });

  app.post("/internal/stars/complete", async (request, reply) => {
    requireInternal(request);
    const body = completeSchema.parse(request.body);

    const payment = await prisma.starPayment.findUnique({
      where: { payload: body.payload },
      include: { run: true, user: true },
    });
    if (!payment) {
      return reply.code(404).send({ error: "payment not found" });
    }
    if (payment.status === StarPaymentStatus.PAID) {
      return reply.send({
        ok: true,
        alreadyPaid: true,
        runId: payment.runId,
        reviveCount: payment.run?.reviveCount ?? null,
        extraRevives: payment.run?.extraRevives ?? null,
      });
    }
    if (payment.user.telegramId.toString() !== String(body.telegramId)) {
      return reply.code(403).send({ error: "wrong user" });
    }
    if (payment.amountStars !== body.totalAmount) {
      return reply.code(400).send({ error: "amount mismatch" });
    }
    if (!payment.run || payment.run.status !== RunStatus.ACTIVE) {
      return reply.code(400).send({ error: "run not active" });
    }

    const pack = payment.packSize ?? 1;
    const [updatedPayment, updatedRun] = await prisma.$transaction([
      prisma.starPayment.update({
        where: { id: payment.id },
        data: {
          status: StarPaymentStatus.PAID,
          telegramPaymentChargeId: body.telegramPaymentChargeId,
          paidAt: new Date(),
        },
      }),
      prisma.run.update({
        where: { id: payment.run.id },
        data: { extraRevives: { increment: pack } },
      }),
    ]);

    return reply.send({
      ok: true,
      runId: updatedRun.id,
      reviveCount: updatedRun.reviveCount,
      extraRevives: updatedRun.extraRevives,
      packSize: pack,
      canContinue: canContinue(updatedRun),
      paymentId: updatedPayment.id,
    });
  });
};
