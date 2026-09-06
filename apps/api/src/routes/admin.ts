import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "@dundee/db";
import { requireUser } from "../plugins/auth.js";
import { isAdminTelegramId } from "../env.js";
import {
  sendTelegramPhoto,
  sendTelegramPhotoBuffer,
  sendTelegramText,
  TelegramApiError,
} from "../services/telegram-bot-api.js";

const broadcastSchema = z.object({
  text: z.string().max(4000).optional().default(""),
  /** Telegram file_id (preferred) or https URL */
  photo: z.string().min(1).optional(),
  /** data URL or raw base64 from web admin */
  photoBase64: z.string().min(1).optional(),
  photoFilename: z.string().optional(),
});

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function requireAdmin(request: Parameters<typeof requireUser>[0]) {
  const user = await requireUser(request);
  if (!isAdminTelegramId(user.telegramId)) {
    const err = new Error("Forbidden") as Error & { statusCode: number };
    err.statusCode = 403;
    throw err;
  }
  return user;
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get("/admin/me", async (request, reply) => {
    const user = await requireUser(request);
    return reply.send({
      isAdmin: isAdminTelegramId(user.telegramId),
      telegramId: user.telegramId.toString(),
    });
  });

  app.get("/admin/stats", async (request, reply) => {
    await requireAdmin(request);
    const [total, active, blocked] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { botBlocked: false } }),
      prisma.user.count({ where: { botBlocked: true } }),
    ]);
    return reply.send({ total, active, blocked });
  });

  app.post("/admin/broadcast", async (request, reply) => {
    await requireAdmin(request);
    const body = broadcastSchema.parse(request.body ?? {});
    const text = (body.text ?? "").trim();
    if (!text && !body.photo && !body.photoBase64) {
      return reply.code(400).send({ error: "empty", message: "Нужен текст или картинка" });
    }

    const targets = await prisma.user.findMany({
      where: { botBlocked: false },
      select: { id: true, telegramId: true },
    });

    let sent = 0;
    let blocked = 0;
    let failed = 0;

    let photoBytes: Buffer | null = null;
    let photoFilename = body.photoFilename ?? "image.jpg";
    if (body.photoBase64) {
      const raw = body.photoBase64.replace(/^data:[^;]+;base64,/, "");
      photoBytes = Buffer.from(raw, "base64");
      const mime = body.photoBase64.match(/^data:([^;]+);/);
      if (mime?.[1]?.includes("png")) photoFilename = "image.png";
      if (mime?.[1]?.includes("webp")) photoFilename = "image.webp";
    }

    for (const u of targets) {
      const chatId = u.telegramId.toString();
      try {
        if (photoBytes) {
          await sendTelegramPhotoBuffer({
            chatId,
            bytes: photoBytes,
            filename: photoFilename,
            caption: text || undefined,
          });
        } else if (body.photo) {
          await sendTelegramPhoto({
            chatId,
            photo: body.photo,
            caption: text || undefined,
          });
        } else {
          await sendTelegramText(chatId, text);
        }
        sent += 1;
      } catch (err) {
        if (err instanceof TelegramApiError && err.blockedByUser) {
          blocked += 1;
          await prisma.user.update({
            where: { id: u.id },
            data: { botBlocked: true },
          });
        } else {
          failed += 1;
          console.error("broadcast fail", chatId, err);
        }
      }
      await sleep(35);
    }

    return reply.send({
      ok: true,
      targets: targets.length,
      sent,
      blocked,
      failed,
    });
  });
};
