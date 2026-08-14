import path from 'node:path';
import { createHash } from 'node:crypto';
import { Transform, type TransformCallback } from 'node:stream';
import type { ProviderDocumentMime } from '@sadat-real-estate/contracts';

export const MAX_PROVIDER_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_PROVIDER_DOCUMENT_FILENAME = 120;

export interface ValidatedProviderDocument {
  originalFilename: string;
  normalizedExtension: '.pdf' | '.jpg' | '.jpeg' | '.png';
  detectedMime: ProviderDocumentMime;
  byteSize: number;
  sha256: string;
}

export class UploadValidationError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'UploadValidationError';
  }
}

const signatures = {
  pdf: Buffer.from('%PDF-', 'ascii'),
  jpeg: Buffer.from([0xff, 0xd8, 0xff]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  pngEnd: Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82])
} as const;

function startsWith(buffer: Buffer, prefix: Buffer): boolean {
  return buffer.byteLength >= prefix.byteLength && buffer.subarray(0, prefix.byteLength).equals(prefix);
}

export function sanitizeDisplayFilename(value: string): string {
  const withoutControls = value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\\/g, '/');
  const basename = path.posix.basename(withoutControls).trim();
  const extension = path.extname(basename);
  const filename = basename.length <= MAX_PROVIDER_DOCUMENT_FILENAME
    ? basename
    : `${basename.slice(0, MAX_PROVIDER_DOCUMENT_FILENAME - extension.length)}${extension}`;
  if (!filename) throw new UploadValidationError('INVALID_FILENAME');
  return filename;
}

export function validateFilenameAndType(
  filenameInput: string,
  declaredMime: string
): Pick<ValidatedProviderDocument, 'originalFilename' | 'normalizedExtension' | 'detectedMime'> {
  const originalFilename = sanitizeDisplayFilename(filenameInput);
  const normalizedExtension = path.extname(originalFilename).toLowerCase();
  const stem = originalFilename.slice(0, -normalizedExtension.length);
  if (!stem || stem.includes('.')) throw new UploadValidationError('DOUBLE_EXTENSION_REJECTED');

  const mapping: Record<string, ProviderDocumentMime | undefined> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png'
  };
  const expectedMime = mapping[normalizedExtension];
  if (!expectedMime || declaredMime.toLowerCase() !== expectedMime) {
    throw new UploadValidationError('FILE_TYPE_NOT_ALLOWED');
  }
  return {
    originalFilename,
    normalizedExtension: normalizedExtension as '.pdf' | '.jpg' | '.jpeg' | '.png',
    detectedMime: expectedMime
  };
}

export class ProviderDocumentValidationTransform extends Transform {
  private readonly hash = createHash('sha256');
  private readonly expected: ReturnType<typeof validateFilenameAndType>;
  private head = Buffer.alloc(0);
  private tail = Buffer.alloc(0);
  private inspectionTail = Buffer.alloc(0);
  private encryptedPdf = false;
  private bytes = 0;

  constructor(filename: string, declaredMime: string) {
    super();
    this.expected = validateFilenameAndType(filename, declaredMime);
  }

  override _transform(chunk: Buffer | string, encoding: BufferEncoding, callback: TransformCallback): void {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
    this.bytes += buffer.byteLength;
    if (this.bytes > MAX_PROVIDER_DOCUMENT_BYTES) {
      callback(new UploadValidationError('FILE_TOO_LARGE'));
      return;
    }
    this.hash.update(buffer);
    if (this.head.byteLength < 16) {
      this.head = Buffer.concat([this.head, buffer]).subarray(0, 16);
    }
    this.tail = Buffer.concat([this.tail, buffer]).subarray(-4_096);
    const inspection = Buffer.concat([this.inspectionTail, buffer]);
    if (inspection.includes(Buffer.from('/Encrypt', 'ascii'))) this.encryptedPdf = true;
    this.inspectionTail = inspection.subarray(-16);
    callback(null, buffer);
  }

  result(): ValidatedProviderDocument {
    if (this.bytes === 0) throw new UploadValidationError('EMPTY_FILE');
    const { detectedMime } = this.expected;
    if (detectedMime === 'application/pdf') {
      const trimmed = this.tail.toString('latin1').trimEnd();
      if (!startsWith(this.head, signatures.pdf) || !trimmed.endsWith('%%EOF') || this.encryptedPdf) {
        throw new UploadValidationError(this.encryptedPdf ? 'ENCRYPTED_PDF_REJECTED' : 'INVALID_FILE_SIGNATURE');
      }
    } else if (detectedMime === 'image/jpeg') {
      if (!startsWith(this.head, signatures.jpeg) || !this.tail.subarray(-2).equals(Buffer.from([0xff, 0xd9]))) {
        throw new UploadValidationError('INVALID_FILE_SIGNATURE');
      }
    } else if (!startsWith(this.head, signatures.png) || !this.tail.subarray(-12).equals(signatures.pngEnd)) {
      throw new UploadValidationError('INVALID_FILE_SIGNATURE');
    }
    return {
      ...this.expected,
      byteSize: this.bytes,
      sha256: this.hash.digest('hex')
    };
  }
}
