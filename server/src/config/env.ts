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

  PAYPAL_ENV: z.enum(['sandbox', 'live']).default('sandbox'),
  PAYPAL_CLIENT_ID: z.string().min(1, 'PAYPAL_CLIENT_ID es obligatorio'),
  PAYPAL_CLIENT_SECRET: z.string().min(1, 'PAYPAL_CLIENT_SECRET es obligatorio'),
  PAYPAL_WEBHOOK_ID: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY es obligatorio'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Solo se muestran nombres de variables, nunca sus valores.
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`Configuración inválida. Revisa tu .env (ver .env.example):\n${issues}`);
  process.exit(1);
}

if (parsed.data.NODE_ENV === 'production' && parsed.data.PAYPAL_ENV === 'live') {
  // Salvaguarda: este proyecto es de hackathon y solo debe operar en Sandbox.
  console.error('PAYPAL_ENV=live no está permitido en este proyecto.');
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
