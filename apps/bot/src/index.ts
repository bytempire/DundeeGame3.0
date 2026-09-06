import { Bot, InlineKeyboard } from "grammy";
import { env } from "./env.js";
import { gameApi } from "./api.js";

const bot = new Bot(env.BOT_TOKEN);

function playKeyboard() {
  return new InlineKeyboard()
    .webApp("🐊 Играть", env.WEBAPP_URL)
    .row()
    .url("🔐 VPN Dundee", `https://t.me/${env.VPN_BOT_USERNAME}`);
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
      "Продолжить забег можно за Telegram Stars (5→25⭐).",
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
