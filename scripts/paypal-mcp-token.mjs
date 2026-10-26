// Genera un access token de PayPal Sandbox y lo guarda en ~/.claude/settings.json
// (env.PAYPAL_SANDBOX_ACCESS_TOKEN) para el plugin PayPal AI Toolkit de Claude Code.
// Uso: npm run paypal:token   (el token nunca se imprime en pantalla)
import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;
if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  console.error('Faltan PAYPAL_CLIENT_ID o PAYPAL_CLIENT_SECRET en .env');
  process.exit(1);
}

const res = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
  method: 'POST',
  headers: {
    Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: 'grant_type=client_credentials',
});
const data = await res.json();
if (!res.ok || !data.access_token) {
  console.error(`PayPal rechazó las credenciales (${res.status}): ${data.error ?? 'error desconocido'}`);
  process.exit(1);
}

const settingsPath = join(homedir(), '.claude', 'settings.json');
const settings = existsSync(settingsPath) ? JSON.parse(readFileSync(settingsPath, 'utf8')) : {};
settings.env = { ...settings.env, PAYPAL_SANDBOX_ACCESS_TOKEN: data.access_token };
writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
chmodSync(settingsPath, 0o600);

console.log(`OK: token guardado en ${settingsPath} (expira en ~${Math.round(data.expires_in / 3600)} h).`);
console.log('Cierra Claude Code por completo y vuelve a abrirlo; luego ejecuta /paypal:setup.');
