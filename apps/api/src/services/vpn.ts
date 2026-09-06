import { env } from "../env.js";

export type VpnAddDaysResult = {
  ok: boolean;
  expiresAt?: string;
  subscriptionId?: string;
  alreadyApplied?: boolean;
  error?: string;
};

export async function vpnAddDays(input: {
  telegramId: string | number | bigint;
  days: number;
  reason: string;
  idempotencyKey: string;
}): Promise<VpnAddDaysResult> {
  const res = await fetch(`${env.VPN_API_URL}/internal/subscriptions/add-days`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-token": env.VPN_INTERNAL_TOKEN,
    },
    body: JSON.stringify({
      telegramId: String(input.telegramId),
      days: input.days,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as VpnAddDaysResult & {
    message?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      error: body.message ?? body.error ?? `VPN HTTP ${res.status}`,
    };
  }

  return {
    ok: true,
    expiresAt: body.expiresAt,
    subscriptionId: body.subscriptionId,
    alreadyApplied: body.alreadyApplied,
  };
}
