// Guarda datos de la app en un archivo JSON dentro de server/data/ (sin base
// de datos todavía). En Render el disco se borra al redesplegar; aceptable
// para la demo.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface JsonStore<T> {
  load: () => Promise<T>;
  save: (next: T) => Promise<void>;
}

// parse convierte lo leído del archivo (o undefined si no existe o está
// dañado) en datos válidos, por ejemplo con valores iniciales.
export function jsonStore<T>(fileName: string, parse: (raw: unknown) => T): JsonStore<T> {
  const path = fileURLToPath(new URL(`../data/${fileName}`, import.meta.url));
  let data: T | null = null;

  async function load(): Promise<T> {
    if (data) return data;
    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(path, 'utf8'));
    } catch {
      raw = undefined;
    }
    data = parse(raw);
    return data;
  }

  // Las escrituras van en fila para que dos clics seguidos no se pisen.
  let writing = Promise.resolve();
  function save(next: T): Promise<void> {
    data = next;
    writing = writing.then(async () => {
      await mkdir(dirname(path), { recursive: true });
      // Archivo temporal + renombrar: si el servidor se apaga a la mitad, el
      // archivo anterior queda intacto.
      const tmp = `${path}.tmp`;
      await writeFile(tmp, JSON.stringify(next, null, 2));
      await rename(tmp, path);
    });
    return writing;
  }

  return { load, save };
}
