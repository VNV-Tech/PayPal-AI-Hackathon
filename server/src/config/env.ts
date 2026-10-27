import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// El .env vive en la raíz del monorepo. En Render las variables vienen del
// panel, así que el archivo es opcional.
const rootEnvPath = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(rootEnvPath)) {
  loadDotenv({ path: rootEnvPath, quiet: true });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  // Orígenes permitidos para CORS en desarrollo (Vite). En producción el
  // cliente se sirve desde el mismo origen y no se necesita CORS.
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),

  // Salvaguarda: este proyecto es de hackathon y solo opera en Sandbox, en
  // cualquier entorno (local o Render). No existe forma de apuntar a live.
  PAYPAL_ENV: z
    .literal('sandbox', { error: 'solo se permite "sandbox" (live está bloqueado en este proyecto)' })
    .default('sandbox'),
  PAYPAL_CLIENT_ID: z.string().min(1, 'PAYPAL_CLIENT_ID es obligatorio'),
  PAYPAL_CLIENT_SECRET: z.string().min(1, 'PAYPAL_CLIENT_SECRET es obligatorio'),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  // Solo para pruebas locales sin webhook registrado. Nunca activarlo en Render.
  PAYPAL_SKIP_WEBHOOK_VERIFY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY es obligatorio'),
  // Modelo del chat. Cambiarlo aquí no requiere tocar código.
  ANTHROPIC_MODEL: z.string().default('claude-opus-5-5'),
  // Tope diario de llamadas a Claude para proteger los créditos (la demo
  // queda pública para el jurado). Se reinicia cada día (UTC).
  CHAT_DAILY_LIMIT: z.coerce.number().int().positive().default(200),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Solo se muestran nombres de variables, nunca sus valores.
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`Configuración inválida. Revisa tu .env (ver .env.example):\n${issues}`);
  process.exit(1);
}

if (parsed.data.NODE_ENV === 'production' && parsed.data.PAYPAL_SKIP_WEBHOOK_VERIFY) {
  console.error('PAYPAL_SKIP_WEBHOOK_VERIFY=true no está permitido en producción.');
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
