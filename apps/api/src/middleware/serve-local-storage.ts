import { readFile } from 'fs/promises';
import { join } from 'path';
import { Context } from 'hono';

const ROOT = join(process.cwd(), 'storage');

export async function getContent(path: string, _c: Context) {
  try {
    return await readFile(path);
  } catch {
    return null;
  }
}

export { ROOT };
