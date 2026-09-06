import { Bot, InlineKeyboard, GrammyError } from "grammy";
import { env, isAdminTelegramId } from "./env.js";
import { gameApi } from "./api.js";

const bot = new Bot(env.BOT_TOKEN);

type Draft = {
  text?: string;
  photoFileId?: string;
};

/** Admin awaiting broadcast content */
const awaitingBroadcast = new Set<number>();
const drafts = new Map<number, Draft>();

function playKeyboard() {
  return new InlineKeyboard()
    .webApp("🐊 Играть", env.WEBAPP_URL)
    .row()
    .url("🔐 VPN Dundee", `https://t.me/${env.VPN_BOT_USERNAME}`);
}

function adminKeyboard() {
  return new InlineKeyboard()
    .text("📣 Рассылка", "admin:broadcast")
    .row()
    .text("❌ Отмена", "admin:cancel");
}

function confirmKeyboard() {
  return new InlineKeyboard()
    .text("✅ Отправить всем", "admin:send")
    .text("✏️ Заново", "admin:broadcast")
    .row()
    .text("❌ Отмена", "admin:cancel");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

bot.command("start", async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  try {
    await gameApi.upsertUser({
      telegramId: from.id,
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
    });
  } catch (err) {
    console.error("upsert failed", err);
  }

  await ctx.reply(
    [
      "🐊 *Dundee Runner*",
      "",
      "Беги, прыгай, собирай ключики — меняй их на дни VPN.",
      "Продолжить забег можно за Telegram Stars.",
      "",
      `VPN: @${env.VPN_BOT_USERNAME}`,
    ].join("\n"),
    {
      parse_mode: "Markdown",
      reply_markup: playKeyboard(),
    },
  );
});

bot.command("play", async (ctx) => {
  await ctx.reply("Открой мини-приложение:", {
    reply_markup: playKeyboard(),
  });
});

bot.command("admin", async (ctx) => {
  if (!ctx.from || !isAdminTelegramId(ctx.from.id)) {
    await ctx.reply("Нет доступа.");
    return;
  }
  awaitingBroadcast.delete(ctx.from.id);
  drafts.delete(ctx.from.id);
  await ctx.reply(
    "🛠 *Админ-панель*\n\nРассылка уйдёт всем, кто писал боту и не заблокировал его.\nМожно отправить текст и/или картинку.",
    { parse_mode: "Markdown", reply_markup: adminKeyboard() },
  );
});

bot.callbackQuery("admin:cancel", async (ctx) => {
  if (!ctx.from || !isAdminTelegramId(ctx.from.id)) return;
  awaitingBroadcast.delete(ctx.from.id);
  drafts.delete(ctx.from.id);
  await ctx.answerCallbackQuery({ text: "Отменено" });
  await ctx.editMessageText("Админ-режим выключен.");
});

bot.callbackQuery("admin:broadcast", async (ctx) => {
  if (!ctx.from || !isAdminTelegramId(ctx.from.id)) return;
  awaitingBroadcast.add(ctx.from.id);
  drafts.delete(ctx.from.id);
  await ctx.answerCallbackQuery();
  await ctx.reply(
    "Пришли сообщение для рассылки:\n• только текст\n• или фото с подписью\n\nПотом подтвердишь отправку.",
  );
});

bot.callbackQuery("admin:send", async (ctx) => {
  if (!ctx.from || !isAdminTelegramId(ctx.from.id)) return;
  const draft = drafts.get(ctx.from.id);
  if (!draft?.text && !draft?.photoFileId) {
    await ctx.answerCallbackQuery({ text: "Нет черновика" });
    return;
  }
  await ctx.answerCallbackQuery({ text: "Отправляю…" });
  await ctx.reply("Рассылка началась…");

  let targets: Array<{ telegramId: string }> = [];
  try {
    const res = await gameApi.broadcastTargets();
    targets = res.users;
  } catch (err) {
    await ctx.reply(`Не удалось получить список: ${(err as Error).message}`);
    return;
  }

  let sent = 0;
  let blocked = 0;
  let failed = 0;

  for (const u of targets) {
    try {
      if (draft.photoFileId) {
        await bot.api.sendPhoto(u.telegramId, draft.photoFileId, {
          caption: draft.text || undefined,
        });
      } else {
        await bot.api.sendMessage(u.telegramId, draft.text!);
      }
      sent += 1;
    } catch (err) {
      const blockedByUser =
        err instanceof GrammyError &&
        (err.error_code === 403 ||
          /blocked|deactivated|chat not found/i.test(err.description));
      if (blockedByUser) {
        blocked += 1;
        try {
          await gameApi.markBlocked(u.telegramId);
        } catch {
          /* ignore */
        }
      } else {
        failed += 1;
        console.error("broadcast fail", u.telegramId, err);
      }
    }
    await sleep(35);
  }

  drafts.delete(ctx.from.id);
  awaitingBroadcast.delete(ctx.from.id);

  await ctx.reply(
    `Готово.\nВсего: ${targets.length}\n✅ Отправлено: ${sent}\n🚫 Заблокировали: ${blocked}\n⚠️ Ошибки: ${failed}`,
    { reply_markup: adminKeyboard() },
  );
});

bot.on("message", async (ctx, next) => {
  const from = ctx.from;
  if (!from || !isAdminTelegramId(from.id) || !awaitingBroadcast.has(from.id)) {
    return next();
  }

  // Don't steal commands
  if (ctx.message.text?.startsWith("/")) return next();

  const photo = ctx.message.photo?.at(-1);
  const text =
    (ctx.message.caption ?? ctx.message.text ?? "").trim() || undefined;

  if (!photo && !text) {
    await ctx.reply("Нужен текст или фото.");
    return;
  }

  const draft: Draft = {
    text,
    photoFileId: photo?.file_id,
  };
  drafts.set(from.id, draft);
  awaitingBroadcast.delete(from.id);

  const preview =
    (draft.photoFileId ? "🖼 фото + " : "") +
    (draft.text ? `текст (${draft.text.length} симв.)` : "без текста");

  if (draft.photoFileId) {
    await ctx.replyWithPhoto(draft.photoFileId, {
      caption: `Черновик: ${preview}\n\n${draft.text ?? ""}`.slice(0, 1024),
      reply_markup: confirmKeyboard(),
    });
  } else {
    await ctx.reply(`Черновик:\n\n${draft.text}\n\nОтправить всем?`, {
      reply_markup: confirmKeyboard(),
    });
  }
});

bot.on("pre_checkout_query", async (ctx) => {
  const q = ctx.preCheckoutQuery;
  try {
    if (q.currency !== "XTR") {
      await ctx.answerPreCheckoutQuery(false, {
        error_message: "Только Stars (XTR).",
      });
      return;
    }
    const check = await gameApi.starsPreCheckout({
      payload: q.invoice_payload,
      telegramId: q.from.id,
      totalAmount: q.total_amount,
    });
    if (!check.ok) {
      await ctx.answerPreCheckoutQuery(false, {
        error_message: "Счёт недействителен. Попробуй снова.",
      });
      return;
    }
    await ctx.answerPreCheckoutQuery(true);
  } catch {
    await ctx.answerPreCheckoutQuery(false, {
      error_message: "Временно нельзя принять оплату.",
    });
  }
});

bot.on("message:successful_payment", async (ctx) => {
  const sp = ctx.message.successful_payment;
  if (sp.currency !== "XTR") return;
  try {
    const result = await gameApi.completeStars({
      payload: sp.invoice_payload,
      telegramId: ctx.from!.id,
      telegramPaymentChargeId: sp.telegram_payment_charge_id,
      totalAmount: sp.total_amount,
    });
    await ctx.reply(
      `Оплата получена! +${result.packSize ?? result.extraRevives ?? "?"} попыток. Вернись в игру и нажми «Продолжить».`,
    );
  } catch (err) {
    await ctx.reply(
      `Оплата прошла, но revive не применился. Код: ${sp.telegram_payment_charge_id}\n${(err as Error).message}`,
    );
  }
});

bot.start();
console.log("Dundee Runner bot started");
