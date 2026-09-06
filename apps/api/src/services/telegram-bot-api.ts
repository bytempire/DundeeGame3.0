import { env } from "../env.js";

type TgApiResult<T> = { ok: boolean; result?: T; description?: string };

async function tgApi<T>(method: string, body: unknown): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as TgApiResult<T>;
  if (!data.ok || data.result === undefined) {
    throw new Error(data.description ?? `Telegram ${method} failed`);
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
