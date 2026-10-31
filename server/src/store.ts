// Guarda datos de la app (apartados, datos fiscales). Dos lugares posibles:
// - Con DATABASE_URL: en Postgres (Neon), una fila por "archivo". Es lo que usa
//   Render, porque su disco gratis se borra en cada reinicio.
// - Sin DATABASE_URL: en un archivo JSON dentro de server/data/ (desarrollo local).
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import { env } from './config/env.js';

export interface JsonStore<T> {
  load: () => Promise<T>;
  save: (next: T) => Promise<void>;
}

interface Backend {
  read: (key: string) => Promise<unknown>;
  write: (key: string, value: unknown) => Promise<void>;
}

// Archivo temporal + renombrar: si el servidor se apaga a la mitad, el archivo
// anterior queda intacto.
const fileBackend: Backend = {
  async read(key) {
    try {
      return JSON.parse(await readFile(filePath(key), 'utf8'));
    } catch {
      return undefined;
    }
  },
  async write(key, value) {
    const path = filePath(key);
    await mkdir(dirname(path), { recursive: true });
    const tmp = `${path}.tmp`;
    await writeFile(tmp, JSON.stringify(value, null, 2));
    await rename(tmp, path);
  },
};

function filePath(key: string): string {
  return fileURLToPath(new URL(`../data/${key}`, import.meta.url));
}

// Neon por HTTP: no deja conexiones abiertas, así que no importa que la base
// de datos se duerma; despierta sola en la siguiente consulta.
function postgresBackend(url: string): Backend {
  const sql = neon(url);
  let ready: Promise<unknown> | null = null;
  const table = () =>
    (ready ??= sql`CREATE TABLE IF NOT EXISTS app_store (
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`.catch((err: unknown) => {
      ready = null; // se reintenta en la siguiente llamada
      throw err;
    }));

  return {
    async read(key) {
      await table();
      const rows = await sql`SELECT value FROM app_store WHERE key = ${key}`;
      return rows[0]?.value;
    },
    async write(key, value) {
      await table();
      await sql`INSERT INTO app_store (key, value) VALUES (${key}, ${JSON.stringify(value)}::jsonb)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
    },
  };
}

const backend = env.DATABASE_URL ? postgresBackend(env.DATABASE_URL) : fileBackend;
export const storeKind = env.DATABASE_URL ? 'postgres' : 'files';

// parse convierte lo guardado (o undefined si no existe o está dañado) en
// datos válidos, por ejemplo con valores iniciales.
export function jsonStore<T>(key: string, parse: (raw: unknown) => T): JsonStore<T> {
  let loading: Promise<T> | null = null;

  // Se lee una sola vez; después se trabaja con la copia en memoria.
  function load(): Promise<T> {
    loading ??= backend.read(key).then(parse, (err: unknown) => {
      loading = null; // si la base de datos no contestó, se reintenta después
      throw err;
    });
    return loading;
  }

  // Las escrituras van en fila para que dos clics seguidos no se pisen.
  let writing = Promise.resolve();
  function save(next: T): Promise<void> {
    loading = Promise.resolve(next);
    writing = writing.catch(() => {}).then(() => backend.write(key, next));
    return writing;
  }

  return { load, save };
}
