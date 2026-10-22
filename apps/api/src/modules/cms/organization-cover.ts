import { Readable } from 'node:stream';
import sharp from 'sharp';

/** Remove substantial uniform image padding for display; never change stored originals. */
export function createOrganizationCoverPreview() {
  const previews = new Map<string, Buffer>();
  let cacheBytes = 0;
  return async (key: string, load: () => Promise<Readable>): Promise<Readable> => {
    let image = previews.get(key);
    if (!image) {
      const chunks: Buffer[] = []; let bytes = 0;
      for await (const chunk of await load()) {
        const buffer = Buffer.from(chunk); bytes += buffer.length;
        if (bytes > 10 * 1024 * 1024) throw new Error('ORGANIZATION_COVER_TOO_LARGE');
        chunks.push(buffer);
      }
      image = Buffer.concat(chunks);
      try {
        const processor = sharp(image, { limitInputPixels: 4_000_000, failOn: 'warning' });
        const original = await processor.metadata();
        const cropped = await processor.trim({ threshold: 8 }).webp({ lossless: true }).toBuffer({ resolveWithObject: true });
        // Ordinary photographs and minor edge differences keep their original framing.
        if (original.width && original.height && cropped.info.width >= 32 && cropped.info.height >= 32
          && cropped.info.width * cropped.info.height <= original.width * original.height * 0.75) image = await sharp(cropped.data)
          .extend({ top: 16, bottom: 16, left: 16, right: 16, background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp({ lossless: true }).toBuffer();
      } catch { /* A blank image or unsupported legacy file keeps its original display. */ }
      // Photo storage keys are immutable. Access checks run before every cache lookup.
      const previous = previews.get(key);
      if (previous) cacheBytes -= previous.length;
      previews.set(key, image); cacheBytes += image.length;
      while (previews.size > 32 || cacheBytes > 16 * 1024 * 1024) {
        const oldest = previews.keys().next().value;
        if (!oldest) break;
        cacheBytes -= previews.get(oldest)!.length; previews.delete(oldest);
      }
    }
    return Readable.from(image);
  };
}
