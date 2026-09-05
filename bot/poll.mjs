/**
 * Minimal Telegram bot for Dundee Mini App (long polling, resilient).
 * BOT_TOKEN=... GAME_URL=https://bytempire.github.io/DundeeGame3.0/ node bot/poll.mjs
 */

const TOKEN = process.env.BOT_TOKEN || '';
const GAME = (process.env.GAME_URL || 'https://bytempire.github.io/DundeeGame3.0/').replace(/\/?$/, '/');

if (!TOKEN) {
  console.error('BOT_TOKEN required');
  process.exit(1);
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function api(method, body, tries = 5) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 45000);
      const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const j = await res.json();
      if (!j.ok) throw new Error(`${method}: ${j.description}`);
      return j.result;
    } catch (e) {
      last = e;
      console.error(`api ${method} fail (${i + 1}/${tries}):`, e.message || e);
      await sleep(1500 * (i + 1));
    }
  }
  throw last;
}

async function greet(chatId) {
  await api('setChatMenuButton', {
    chat_id: chatId,
    menu_button: { type: 'web_app', text: 'Играть', web_app: { url: GAME } },
  }).catch(() => {});

  await api('sendMessage', {
    chat_id: chatId,
    text: '🐊 <b>Dundee</b> готов!\n\nНажми кнопку ниже, чтобы открыть игру.',
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: '🎮 Играть', web_app: { url: GAME } }]],
    },
  });

  await api('sendMessage', {
    chat_id: chatId,
    text: 'Кнопка закреплена внизу чата ↓',
    reply_markup: {
      keyboard: [[{ text: '🎮 Играть', web_app: { url: GAME } }]],
      resize_keyboard: true,
    },
  });
}

async function setup() {
  for (;;) {
    try {
      await api('deleteWebhook', { drop_pending_updates: false });
      await api('setMyCommands', {
        commands: [
          { command: 'start', description: 'Запустить игру' },
          { command: 'play', description: 'Открыть игру' },
        ],
      });
      await api('setChatMenuButton', {
        menu_button: { type: 'web_app', text: 'Играть', web_app: { url: GAME } },
      });
      console.log('ready, polling', GAME);
      return;
    } catch (e) {
      console.error('setup retry', e.message || e);
      await sleep(3000);
    }
  }
}

let offset = 0;

async function loop() {
  for (;;) {
    try {
      const updates = await api('getUpdates', {
        offset,
        timeout: 25,
        allowed_updates: ['message'],
      });
      for (const upd of updates) {
        offset = upd.update_id + 1;
        const msg = upd.message;
        if (!msg?.text) continue;
        const text = msg.text.trim();
        if (text.startsWith('/start') || text.startsWith('/play') || text === '🎮 Играть') {
          try {
            await greet(msg.chat.id);
            console.log('greeted', msg.chat.id);
          } catch (e) {
            console.error('greet fail', msg.chat.id, e.message || e);
          }
        }
      }
    } catch (e) {
      console.error('poll error', e.message || e);
      await sleep(3000);
    }
  }
}

await setup();
await loop();
