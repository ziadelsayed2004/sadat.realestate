import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import sharp from 'sharp';

export type ImagePreviewWidth = 320 | 960 | 1600;
const previews = new Map<string, Buffer>();
const pending = new Map<string, Promise<Buffer>>();
const MAX_CACHE_BYTES = 16 * 1024 * 1024;
let cacheBytes = 0;

/** Content hashes key derived bytes; callers must authorize the asset before using this cache. */
export async function imagePreview(open: () => Promise<Readable>, width: ImagePreviewWidth, etag?: string): Promise<Buffer> {
  const key = etag === undefined ? undefined : `${etag}:${width}:webp-v1`;
  const cached = key === undefined ? undefined : previews.get(key);
  if (cached !== undefined) {
    previews.delete(key!);
    previews.set(key!, cached);
    return cached;
  }
  const existing = key === undefined ? undefined : pending.get(key);
  if (existing !== undefined) return existing;
  const work = (async () => {
    const source = await open();
    const transform = sharp({ limitInputPixels: 40_000_000 }).rotate()
      .resize({ width, height: width, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 });
    const [bytes] = await Promise.all([transform.toBuffer(), pipeline(source, transform)]);
    if (key !== undefined && bytes.length <= MAX_CACHE_BYTES) {
      while (previews.size > 0 && (cacheBytes + bytes.length > MAX_CACHE_BYTES || previews.size >= 64)) {
        const oldest = previews.keys().next().value!;
        cacheBytes -= previews.get(oldest)!.length;
        previews.delete(oldest);
      }
      previews.set(key, bytes);
      cacheBytes += bytes.length;
    }
    return bytes;
  })();
  if (key !== undefined) pending.set(key, work);
  try { return await work; }
  finally { if (key !== undefined) pending.delete(key); }
}

export function previewContentEtag(etag: string | undefined, width: ImagePreviewWidth | undefined): string | undefined {
  return width === undefined ? etag : etag?.replace(/"$/u, `-preview-${width}-v1"`);
}
