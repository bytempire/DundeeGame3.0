import { env } from "../env.js";

type TgApiResult<T> = {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
};

export class TelegramApiError extends Error {
  constructor(
    message: string,
    readonly errorCode?: number,
  ) {
    super(message);
    this.name = "TelegramApiError";
  }

  get blockedByUser(): boolean {
    return (
      this.errorCode === 403 ||
      /blocked|deactivated|user is deactivated|chat not found/i.test(this.message)
    );
  }
}

async function tgApi<T>(method: string, body: unknown): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as TgApiResult<T>;
  if (!data.ok || data.result === undefined) {
    throw new TelegramApiError(
      data.description ?? `Telegram ${method} failed`,
      data.error_code,
    );
  }
  return data.result;
}

export async function createStarsInvoiceLink(input: {
  title: string;
  description: string;
  payload: string;
  amountStars: number;
}): Promise<string> {
  return tgApi<string>("createInvoiceLink", {
    title: input.title,
    description: input.description,
    payload: input.payload,
    currency: "XTR",
    prices: [{ label: input.title, amount: input.amountStars }],
  });
}

export async function sendTelegramText(chatId: string | number, text: string) {
  return tgApi("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

export async function sendTelegramPhoto(input: {
  chatId: string | number;
  photo: string;
  caption?: string;
}) {
  return tgApi("sendPhoto", {
    chat_id: input.chatId,
    photo: input.photo,
    caption: input.caption,
  });
}

export async function sendTelegramPhotoBuffer(input: {
  chatId: string | number;
  bytes: Buffer;
  filename: string;
  caption?: string;
}) {
  const form = new FormData();
  form.set("chat_id", String(input.chatId));
  if (input.caption) form.set("caption", input.caption);
  form.set(
    "photo",
    new Blob([new Uint8Array(input.bytes)]),
    input.filename || "image.jpg",
  );

  const res = await fetch(
    `https://api.telegram.org/bot${env.BOT_TOKEN}/sendPhoto`,
    { method: "POST", body: form },
  );
  const data = (await res.json()) as TgApiResult<unknown>;
  if (!data.ok) {
    throw new TelegramApiError(
      data.description ?? "sendPhoto failed",
      data.error_code,
    );
  }
  return data.result;
}
