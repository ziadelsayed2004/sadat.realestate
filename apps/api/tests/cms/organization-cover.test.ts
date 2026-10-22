import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import { createOrganizationCoverPreview } from '../../src/modules/cms/organization-cover.js';

async function bytes(stream: Readable) {
  const parts: Buffer[] = [];
  for await (const part of stream) parts.push(Buffer.from(part));
  return Buffer.concat(parts);
}
test('enlarges a padded square logo for cover display while retaining its whole colored content', async () => {
  const logo = await sharp({ create: { width: 1600, height: 1600, channels: 3, background: '#f7f7f7' } }).composite([{ input: await sharp({ create: { width: 1000, height: 400, channels: 3, background: '#17574a' } }).png().toBuffer(), left: 300, top: 600 }]).webp({ lossless: true }).toBuffer();
  const preview = createOrganizationCoverPreview(); let reads = 0;
  const load = async () => { reads++; return Readable.from(logo); };
  const rendered = await bytes(await preview('immutable-padded-logo', load));
  const meta = await sharp(rendered).metadata();
  assert.equal(meta.width, 1032); assert.equal(meta.height, 432);
  const content = await sharp(rendered).extract({ left: 16, top: 16, width: 1000, height: 400 }).png().toBuffer();
  const stats = await sharp(content).stats(); assert.equal(stats.channels[0]?.min, 23); assert.equal(stats.channels[1]?.min, 87);
  assert.deepEqual(await bytes(await preview('immutable-padded-logo', load)), rendered); assert.equal(reads, 1);
  assert.equal((await sharp(logo).metadata()).height, 1600);
});
test('keeps blank images, photographs without uniform padding, and small edge changes intact', async () => {
  const preview = createOrganizationCoverPreview();
  const blank = await sharp({ create: { width: 300, height: 200, channels: 3, background: '#17574a' } }).webp().toBuffer();
  const photograph = await sharp(Buffer.from('<svg width="600" height="300"><defs><linearGradient id="g"><stop stop-color="#17233d"/><stop offset="1" stop-color="#d1a044"/></linearGradient></defs><rect width="600" height="300" fill="url(#g)"/></svg>')).webp().toBuffer();
  const slightPadding = await sharp(blank).extend({ top: 2, bottom: 2, left: 2, right: 2, background: 'white' }).webp().toBuffer();
  for (const [key, image] of [['blank', blank], ['photograph', photograph], ['minor-padding', slightPadding]] as const) assert.deepEqual(await bytes(await preview(key, async () => Readable.from(image))), image);
});
test('rejects oversized stored input before decoding and bounds the number of cached covers', async () => {
  const preview = createOrganizationCoverPreview();
  await assert.rejects(preview('oversized', async () => Readable.from(Buffer.alloc(10 * 1024 * 1024 + 1))), /TOO_LARGE/);
  const image = await sharp({ create: { width: 40, height: 40, channels: 3, background: 'white' } }).webp().toBuffer();
  let reads = 0;
  for (let n = 0; n < 33; n++) await bytes(await preview(String(n), async () => { reads++; return Readable.from(image); }));
  await bytes(await preview('0', async () => { reads++; return Readable.from(image); }));
  assert.equal(reads, 34);
});
