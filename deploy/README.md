# Deploy Dundee Runner

## 1. Infra

- Postgres для game DB
- Node 20+ host (или отдельные unit'ы) для `apps/api` и `apps/bot`
- Static host / nginx для `apps/web` build (`pnpm --filter @dundee/web build`)
- HTTPS обязателен для Telegram Web App

Пример nginx:

```nginx
server {
  server_name game.example.com;
  root /var/www/dundee-runner;
  index index.html;
  location / {
    try_files $uri /index.html;
  }
  location /api/ {
    proxy_pass http://127.0.0.1:3100/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

Собери web с `VITE_API_URL=https://game.example.com/api` (или отдельный api host).

## 2. BotFather

1. Создай отдельного бота (не VpnDundeeBot).
2. `/setmenubutton` → Web App → `https://game.example.com`
3. Включи платежи Stars (если ещё не).
4. Пропиши `BOT_TOKEN`, `WEBAPP_URL` в `.env`.

## 3. Env checklist

```
DATABASE_URL=...
BOT_TOKEN=...
INTERNAL_API_TOKEN=...
PUBLIC_API_URL=https://game-api.example.com
WEBAPP_URL=https://game.example.com
VPN_API_URL=https://vpn-api.example.com
VPN_INTERNAL_TOKEN=...   # same as VPN INTERNAL_API_TOKEN
VPN_BOT_USERNAME=VpnDundeeBot
API_BASE_URL=https://game-api.example.com
```

## 4. VPN side

- `pnpm db:push` (или migrate) после добавления `GameRewardGrant`
- Задеплой API с `POST /internal/subscriptions/add-days`
- В VPN-боте кнопка «Играть» / ссылка на игрового бота (см. CTA в коде)

## 5. Smoke test

1. `/start` в game-боте → открыть WebApp
2. Забег → game over → revive invoice (тест в Telegram)
3. Забрать монеты → redeem 1 день → открыть VpnDundeeBot → Моя подписка
