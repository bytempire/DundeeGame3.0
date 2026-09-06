import crypto from "node:crypto";

export type TelegramWebAppUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

function timingSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/** Validate Telegram Mini App initData (HMAC-SHA256). */
export function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSec = 86400,
): { ok: true; user: TelegramWebAppUser; authDate: number } | { ok: false; error: string } {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, error: "missing hash" };

  const entries: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    entries.push(`${key}=${value}`);
  }
  entries.sort();
  const dataCheckString = entries.join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const computed = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (!timingSafeEqual(computed, hash)) {
    return { ok: false, error: "bad hash" };
  }

  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Math.abs(Date.now() / 1000 - authDate) > maxAgeSec) {
    return { ok: false, error: "expired" };
  }

  const userRaw = params.get("user");
  if (!userRaw) return { ok: false, error: "missing user" };
  let user: TelegramWebAppUser;
  try {
    user = JSON.parse(userRaw) as TelegramWebAppUser;
  } catch {
    return { ok: false, error: "bad user json" };
  }
  if (!user?.id) return { ok: false, error: "bad user id" };

  return { ok: true, user, authDate };
}
