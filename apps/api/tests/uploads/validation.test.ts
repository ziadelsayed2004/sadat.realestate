import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';
import {
  ProviderDocumentValidationTransform,
  UploadValidationError,
  validateFilenameAndType
} from '../../src/modules/uploads/validation.js';

async function validate(bytes: Buffer, filename: string, mime: string) {
  const validator = new ProviderDocumentValidationTransform(filename, mime);
  Readable.from([bytes]).pipe(validator);
  for await (const chunk of validator) void chunk;
  return validator.result();
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82])
]);

test('streams and fingerprints valid PDF, JPEG, and PNG signatures', async () => {
  const pdf = await validate(Buffer.from('%PDF-1.7\nsynthetic\n%%EOF'), 'identity.pdf', 'application/pdf');
  assert.equal(pdf.detectedMime, 'application/pdf');
  assert.equal(pdf.sha256.length, 64);
  assert.equal((await validate(Buffer.from([0xff, 0xd8, 0xff, 0x00, 0xff, 0xd9]), 'photo.jpeg', 'image/jpeg')).detectedMime, 'image/jpeg');
  assert.equal((await validate(png, 'image.png', 'image/png')).byteSize, png.byteLength);
});

test('rejects mismatch, double extension, active formats, truncation, encryption, and empty files', async () => {
  assert.throws(() => validateFilenameAndType('identity.pdf.exe', 'application/pdf'), UploadValidationError);
  assert.throws(() => validateFilenameAndType('identity.svg', 'image/svg+xml'), UploadValidationError);
  await assert.rejects(validate(Buffer.from('%PDF-1.7\n%%EOF'), 'identity.jpg', 'image/jpeg'), UploadValidationError);
  await assert.rejects(validate(Buffer.from('%PDF-1.7\n/Encrypt\n%%EOF'), 'identity.pdf', 'application/pdf'), /ENCRYPTED_PDF_REJECTED/);
  await assert.rejects(validate(Buffer.alloc(0), 'identity.pdf', 'application/pdf'), /EMPTY_FILE/);
});
