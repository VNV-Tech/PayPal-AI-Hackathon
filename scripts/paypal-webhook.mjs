// Registra el webhook de PayPal Sandbox para una URL pública (el túnel de
// cloudflared en local, o la URL de Render) y guarda PAYPAL_WEBHOOK_ID en .env.
// Uso: npm run paypal:webhook -- https://algo.trycloudflare.com
// Los túneles de prueba cambian de URL cada vez; los webhooks viejos que
// apuntan a trycloudflare.com se borran para no llegar al límite de PayPal.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const BASE_URL = 'https://api-m.sandbox.paypal.com'; // solo Sandbox
const ENV_PATH = new URL('../.env', import.meta.url);
const EVENT_TYPES = [
  'INVOICING.INVOICE.PAID',
  'INVOICING.INVOICE.CANCELLED',
  'INVOICING.INVOICE.REFUNDED',
  'INVOICING.INVOICE.UPDATED',
  'PAYMENT.CAPTURE.COMPLETED',
];

const publicUrl = process.argv[2]?.replace(/\/+$/, '');
if (!publicUrl?.startsWith('https://')) {
  console.error('Falta la URL pública (https). Ejemplo: npm run paypal:webhook -- https://algo.trycloudflare.com');
  process.exit(1);
}
const webhookUrl = `${publicUrl}/webhooks/paypal`;

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;
if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  console.error('Faltan PAYPAL_CLIENT_ID o PAYPAL_CLIENT_SECRET en .env');
  process.exit(1);
}

async function paypal(path, init = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const detail = body?.details?.[0]?.description ?? body?.message ?? 'error desconocido';
    throw new Error(`PayPal ${init.method ?? 'GET'} ${path} falló (${res.status}): ${detail}`);
  }
  return body;
}

const tokenRes = await fetch(`${BASE_URL}/v1/oauth2/token`, {
  method: 'POST',
  headers: {
    Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: 'grant_type=client_credentials',
});
const { access_token: token } = await tokenRes.json();
if (!tokenRes.ok || !token) {
  console.error(`PayPal rechazó las credenciales (${tokenRes.status})`);
  process.exit(1);
}

const { webhooks = [] } = await paypal('/v1/notifications/webhooks');
let webhookId = webhooks.find((w) => w.url === webhookUrl)?.id;

for (const w of webhooks) {
  if (w.id !== webhookId && new URL(w.url).hostname.endsWith('.trycloudflare.com')) {
    await paypal(`/v1/notifications/webhooks/${w.id}`, { method: 'DELETE' });
    console.log(`Borrado webhook viejo: ${w.url}`);
  }
}

if (webhookId) {
  console.log(`Ya estaba registrado: ${webhookUrl}`);
} else {
  const created = await paypal('/v1/notifications/webhooks', {
    method: 'POST',
    body: JSON.stringify({ url: webhookUrl, event_types: EVENT_TYPES.map((name) => ({ name })) }),
  });
  webhookId = created.id;
  console.log(`Registrado: ${webhookUrl}`);
}

// Reemplaza (o agrega) la línea PAYPAL_WEBHOOK_ID en .env.
const envText = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : '';
const line = `PAYPAL_WEBHOOK_ID=${webhookId}`;
const updated = /^PAYPAL_WEBHOOK_ID=.*$/m.test(envText)
  ? envText.replace(/^PAYPAL_WEBHOOK_ID=.*$/m, line)
  : `${envText.replace(/\n?$/, '\n')}${line}\n`;
writeFileSync(ENV_PATH, updated);

console.log('OK: PAYPAL_WEBHOOK_ID guardado en .env.');
console.log('Reinicia el servidor (Ctrl+C y npm run dev) para que lo lea.');
