export type TgWebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
  themeParams?: Record<string, string>;
  openInvoice?: (
    url: string,
    cb?: (status: "paid" | "cancelled" | "failed" | "pending") => void,
  ) => void;
  openTelegramLink?: (url: string) => void;
  HapticFeedback?: { impactOccurred: (style: string) => void };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export function getWebApp(): TgWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function getInitData(): string {
  return getWebApp()?.initData ?? "";
}

/** Empty / unset = offline gameplay (GitHub Pages without public API). */
const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export function isApiEnabled(): boolean {
  return Boolean(API_BASE) && !API_BASE.includes("localhost");
}

export async function api<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  if (!API_BASE) {
    throw new Error("API offline");
  }
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-telegram-init-data": getInitData(),
    ...(init?.headers as Record<string, string> | undefined),
  };
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    });
  } catch {
    throw new Error("API unreachable");
  }
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
