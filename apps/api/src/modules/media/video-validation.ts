import { createHash } from 'node:crypto';
import { Transform, type TransformCallback } from 'node:stream';
import { sanitizeDisplayFilename, UploadValidationError } from '../uploads/validation.js';

// Inspect top-level ISO BMFF boxes without buffering the video in memory.
export class PropertyVideoValidationTransform extends Transform {
  private readonly hash = createHash('sha256');
  private readonly filename: string;
  private bytes = 0;
  private header = Buffer.alloc(0);
  private head = Buffer.alloc(0);
  private remaining = 0;
  private toEnd = false;
  private readonly boxes = new Set<string>();

  constructor(filename: string) {
    super();
    this.filename = sanitizeDisplayFilename(filename);
    // Phone exports commonly contain dotted timestamps. Reject executable
    // double extensions while allowing normal MP4 display names.
    if (!/^.+\.mp4$/iu.test(this.filename) || /\.(?:exe|com|bat|cmd|ps1|js|mjs|html?|svg|php|sh)\.mp4$/iu.test(this.filename)) throw new UploadValidationError('FILE_TYPE_NOT_ALLOWED');
  }

  override _transform(chunk: Buffer | string, encoding: BufferEncoding, callback: TransformCallback): void {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
    this.bytes += buffer.length;
    if (this.bytes > 10 * 1024 * 1024) { callback(new UploadValidationError('FILE_TOO_LARGE')); return; }
    this.hash.update(buffer);
    if (this.head.length < 64) this.head = Buffer.concat([this.head, buffer]).subarray(0, 64);
    try {
      let offset = 0;
      while (offset < buffer.length && !this.toEnd) {
        if (this.remaining) {
          const size = Math.min(this.remaining, buffer.length - offset);
          this.remaining -= size; offset += size; continue;
        }
        const headerSize = this.header.length >= 8 && this.header.readUInt32BE(0) === 1 ? 16 : 8;
        const needed = Math.min(headerSize - this.header.length, buffer.length - offset);
        this.header = Buffer.concat([this.header, buffer.subarray(offset, offset + needed)]);
        offset += needed;
        if (this.header.length < headerSize) continue;
        const shortSize = this.header.readUInt32BE(0);
        if (shortSize === 1 && headerSize === 8) continue;
        const size = shortSize === 1 ? Number(this.header.readBigUInt64BE(8)) : shortSize;
        const type = this.header.toString('ascii', 4, 8);
        if (!/^[a-zA-Z0-9 ]{4}$/u.test(type) || (!this.boxes.size && type !== 'ftyp') || (size !== 0 && (size < headerSize || size > 10 * 1024 * 1024))) throw new UploadValidationError('INVALID_FILE_SIGNATURE');
        if (size === 0 && type !== 'mdat') throw new UploadValidationError('INVALID_FILE_SIGNATURE');
        this.boxes.add(type);
        this.remaining = size === 0 ? 0 : size - headerSize;
        this.toEnd = size === 0;
        this.header = Buffer.alloc(0);
      }
      callback(null, buffer);
    } catch (error) { callback(error as Error); }
  }

  result() {
    const brand = this.head.toString('ascii', 8, 12);
    if (this.remaining || this.header.length || !this.boxes.has('moov') || !this.boxes.has('mdat') || !['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V ', 'MSNV', 'iso5', 'iso6'].includes(brand)) throw new UploadValidationError('INVALID_FILE_SIGNATURE');
    return { originalFilename: this.filename, detectedMime: 'video/mp4' as const, byteSize: this.bytes, sha256: this.hash.digest('hex') };
  }
}
