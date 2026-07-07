/**
 * Font loader — fetches Inter TTF files from /public/fonts/ (local only, no CDN).
 * Results are cached in module scope so repeated calls are free.
 */

const cache = new Map<string, Uint8Array>();

async function fetchFont(relativePath: string): Promise<Uint8Array> {
  const base = import.meta.env.BASE_URL;
  const url = `${base}fonts/${relativePath}`;
  const cached = cache.get(url);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load font "${relativePath}": ${res.status} ${res.statusText}`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  cache.set(url, bytes);
  return bytes;
}

export async function loadInterRegular(): Promise<Uint8Array> {
  return fetchFont('Inter-Regular.ttf');
}

export async function loadInterBold(): Promise<Uint8Array> {
  return fetchFont('Inter-Bold.ttf');
}

/** Pre-warm both fonts (call on app start for faster first export). */
export async function prefetchFonts(): Promise<void> {
  await Promise.all([loadInterRegular(), loadInterBold()]);
}
