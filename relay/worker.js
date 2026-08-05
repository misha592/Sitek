/**
 * Cloudflare Worker relay for the contact form on index.html.
 *
 * The Discord webhook URL is a credential: it must live in the Worker secret
 * DISCORD_WEBHOOK_URL, never in the static page. Set the allowed origin in the
 * ALLOWED_ORIGIN variable (e.g. https://sobaka234411.github.io).
 *
 *   wrangler secret put DISCORD_WEBHOOK_URL
 *   wrangler deploy
 */

const MAX_LENGTH = 500;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;

const recentRequests = new Map();

function corsHeaders(env, origin) {
  if (!origin || origin !== env.ALLOWED_ORIGIN) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function isRateLimited(ip) {
  const now = Date.now();
  const hits = (recentRequests.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recentRequests.set(ip, hits);
  if (hits.length >= RATE_LIMIT_MAX) return true;
  hits.push(now);
  return false;
}

// Discord renders @everyone/@here and role mentions from webhook content.
function neutralizeMentions(text) {
  return text.replace(/@(everyone|here)/gi, '@\u200b$1').replace(/<@[!&]?\d+>/g, '[mention]');
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(env, origin);

    if (request.method === 'OPTIONS') {
      return cors ? new Response(null, { status: 204, headers: cors }) : new Response(null, { status: 403 });
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
    if (!cors) {
      return new Response('Forbidden', { status: 403 });
    }
    if (isRateLimited(request.headers.get('CF-Connecting-IP') || 'unknown')) {
      return new Response('Too many requests', { status: 429, headers: cors });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400, headers: cors });
    }

    const message = typeof payload.message === 'string' ? payload.message.trim() : '';
    if (!message || message.length > MAX_LENGTH) {
      return new Response('Invalid message', { status: 400, headers: cors });
    }

    const discordResponse = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: 'Новое сообщение с сайта',
            description: neutralizeMentions(message),
            color: payload.theme === 'theme-ghoul' ? 15672356 : 14456376,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    if (!discordResponse.ok) {
      return new Response('Upstream error', { status: 502, headers: cors });
    }
    return new Response(null, { status: 204, headers: cors });
  },
};
