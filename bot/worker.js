/**
 * Cloudflare Worker webhook for DundeeGameBot.
 * Secrets: BOT_TOKEN
 * Env: GAME_URL (optional)
 */
const GAME_DEFAULT = 'https://bytempire.github.io/DundeeGame3.0/';

async function tg(token, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function greet(token, chatId, gameUrl) {
  await tg(token, 'setChatMenuButton', {
    chat_id: chatId,
    menu_button: { type: 'web_app', text: 'Играть', web_app: { url: gameUrl } },
  });
  await tg(token, 'sendMessage', {
    chat_id: chatId,
    text: '🐊 <b>Dundee</b> готов!\n\nНажми кнопку ниже, чтобы открыть игру.',
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: '🎮 Играть', web_app: { url: gameUrl } }]],
    },
  });
  await tg(token, 'sendMessage', {
    chat_id: chatId,
    text: 'Кнопка закреплена внизу чата ↓',
    reply_markup: {
      keyboard: [[{ text: '🎮 Играть', web_app: { url: gameUrl } }]],
      resize_keyboard: true,
    },
  });
}

export default {
  async fetch(request, env) {
    const token = env.BOT_TOKEN;
    const gameUrl = (env.GAME_URL || GAME_DEFAULT).replace(/\/?$/, '/');
    if (!token) return new Response('BOT_TOKEN missing', { status: 500 });

    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/') {
      return new Response('Dundee bot ok', { status: 200 });
    }

    if (request.method === 'POST' && url.pathname === '/webhook') {
      const update = await request.json();
      const msg = update.message;
      if (msg?.text) {
        const t = msg.text.trim();
        if (t.startsWith('/start') || t.startsWith('/play') || t === '🎮 Играть') {
          await greet(token, msg.chat.id, gameUrl);
        }
      }
      return new Response('ok');
    }

    if (request.method === 'POST' && url.pathname === '/setup') {
      await tg(token, 'setMyCommands', {
        commands: [
          { command: 'start', description: 'Запустить игру' },
          { command: 'play', description: 'Открыть игру' },
        ],
      });
      await tg(token, 'setChatMenuButton', {
        menu_button: { type: 'web_app', text: 'Играть', web_app: { url: gameUrl } },
      });
      const hook = `${url.origin}/webhook`;
      const r = await tg(token, 'setWebhook', { url: hook, allowed_updates: ['message'] });
      return Response.json({ hook, result: r });
    }

    return new Response('not found', { status: 404 });
  },
};
