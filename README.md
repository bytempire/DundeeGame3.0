# Dundee Runner

Telegram Mini App: endless runner с крокодилом Dundee. Монеты → дни VPN через API Dundee. Revive за Stars (5/10/15/20/25⭐, макс 5 за забег).

## Структура

```
apps/web     Phaser 3 TMA
apps/api     Fastify (initData, runs, wallet, redeem, stars)
apps/bot     grammY (/start, WebApp, Stars precheckout)
packages/db  Prisma + Postgres
```

## Локальный запуск

```bash
cp .env.example .env
# BOT_TOKEN = токен игрового бота
# VPN_INTERNAL_TOKEN / VPN_API_URL = как в VPN проекте
# INTERNAL_API_TOKEN = общий секрет game bot ↔ game api

docker compose up -d
pnpm install
pnpm db:generate
pnpm db:push

# терминалы:
pnpm dev:api
pnpm dev:bot
pnpm dev:web
```

Postgres игры: `localhost:5434`.

В BotFather у игрового бота: Menu Button / Web App URL → `WEBAPP_URL` (для локалки — туннель, например ngrok/cloudflared на :5173).

## Связка с VPN

Game API вызывает:

`POST {VPN_API_URL}/internal/subscriptions/add-days`  
с `x-internal-token` и `idempotencyKey`.

В репозитории VPN должен быть задеплоен этот эндпоинт (см. `GameRewardGrant` в Prisma).

## Экономика

- Монеты: `floor(distance/10) + pickups`
- 1 день VPN = 800 монет, 3 дня = 2000
- Лимит free-play: 2 дня/сутки, 7 дней/неделя
- Stars только на revive

## Деплой

См. [deploy/README.md](deploy/README.md).
