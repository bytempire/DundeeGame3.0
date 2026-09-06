import { env } from "./env.js";

async function api<T>(
  path: string,
  init?: RequestInit & { internal?: boolean },
): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (init?.internal !== false) {
    headers["x-internal-token"] = env.INTERNAL_API_TOKEN;
  }
  const res = await fetch(`${env.API_BASE_URL}${path}`, {
    ...init,
    headers,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (body as { message?: string; error?: string }).message ??
        (body as { error?: string }).error ??
        `HTTP ${res.status}`,
    );
  }
  return body as T;
}

export const gameApi = {
  upsertUser(input: {
    telegramId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
  }) {
    return api<{ id: string; coinBalance: number }>("/internal/users/upsert", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  starsPreCheckout(input: {
    payload: string;
    telegramId: number;
    totalAmount: number;
  }) {
    return api<{ ok: boolean }>("/internal/stars/pre-checkout", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  completeStars(input: {
    payload: string;
    telegramId: number;
    telegramPaymentChargeId: string;
    totalAmount: number;
  }) {
    return api<{
      ok: boolean;
      reviveCount?: number;
      extraRevives?: number;
      packSize?: number;
      runId?: string;
    }>("/internal/stars/complete", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
